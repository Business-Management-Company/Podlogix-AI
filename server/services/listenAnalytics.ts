import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { listenEvents } from "@shared/schema";

/**
 * Download + feed analytics for Podlogix-hosted podcasts.
 *
 * Counting model (IAB-lite):
 * - A "download" is a GET for an episode enclosure that requests the start of
 *   the file (no Range header, or a range beginning at byte 0). Podcast apps
 *   often issue HEAD probes and mid-file range requests while streaming; those
 *   are not counted.
 * - "Unique listeners" = distinct listener_hash over the window. The hash is
 *   sha256(ip + user-agent + UTC day), so the same phone counts once per day
 *   and raw IPs are never stored anywhere.
 */

const KNOWN_APPS: Array<[RegExp, string]> = [
  [/apple\s?podcasts|itms|podcasts\/.*cfnetwork/i, "Apple Podcasts"],
  [/spotify/i, "Spotify"],
  [/overcast/i, "Overcast"],
  [/pocket\s?casts/i, "Pocket Casts"],
  [/castbox/i, "Castbox"],
  [/podcast\s?addict/i, "Podcast Addict"],
  [/antennapod/i, "AntennaPod"],
  [/castro/i, "Castro"],
  [/amazon\s?music|bonfire/i, "Amazon Music"],
  [/iheart/i, "iHeartRadio"],
  [/pandora/i, "Pandora"],
  [/tunein/i, "TuneIn"],
  [/deezer/i, "Deezer"],
  [/youtube|google\s?podcasts/i, "YouTube Music"],
  [/watchos|apple\s?watch/i, "Apple Watch"],
  [/itunes/i, "iTunes"],
  [/chrome|firefox|safari|edg\//i, "Web Browser"],
];

export function parseListeningApp(userAgent: string | undefined): string {
  if (!userAgent) return "Unknown";
  for (const [pattern, name] of KNOWN_APPS) {
    if (pattern.test(userAgent)) return name;
  }
  return "Other";
}

export function listenerHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${userAgent}|${day}`).digest("hex");
}

/** True when this request should count as a download (fresh fetch of the file start). */
export function isCountableDownload(method: string, rangeHeader: string | undefined): boolean {
  if (method !== "GET") return false;
  if (!rangeHeader) return true;
  return /^bytes=0-/.test(rangeHeader.trim());
}

/** Fire-and-forget insert — tracking must never slow down or break a redirect. */
export function recordListenEvent(event: {
  podcastId: string;
  episodeId?: string | null;
  kind: "download" | "feed";
  ip: string;
  userAgent: string | undefined;
}): void {
  const ua = (event.userAgent || "").slice(0, 500);
  db.insert(listenEvents)
    .values({
      podcastId: event.podcastId,
      episodeId: event.episodeId ?? null,
      kind: event.kind,
      app: parseListeningApp(ua),
      userAgent: ua || null,
      listenerHash: listenerHash(event.ip, ua),
    })
    .catch((err: unknown) => console.error("listen_events insert failed:", err));
}

export interface PodcastStats {
  windowDays: number;
  totals: {
    downloads: number;
    uniqueListeners: number;
    feedHits: number;
    prevDownloads: number; // same-length window immediately before, for deltas
  };
  byDay: Array<{ day: string; downloads: number }>;
  byApp: Array<{ app: string; downloads: number }>;
  byEpisode: Array<{ episodeId: string; downloads: number; uniqueListeners: number }>;
}

export async function getPodcastStats(podcastId: string, windowDays: number): Promise<PodcastStats> {
  const days = Math.min(Math.max(windowDays, 1), 365);
  const since = sql`now() - make_interval(days => ${days})`;
  const prevSince = sql`now() - make_interval(days => ${days * 2})`;

  const [totalsRow] = (
    await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE kind = 'download' AND created_at >= ${since})::int AS downloads,
        count(DISTINCT listener_hash) FILTER (WHERE kind = 'download' AND created_at >= ${since})::int AS unique_listeners,
        count(*) FILTER (WHERE kind = 'feed' AND created_at >= ${since})::int AS feed_hits,
        count(*) FILTER (WHERE kind = 'download' AND created_at >= ${prevSince} AND created_at < ${since})::int AS prev_downloads
      FROM listen_events
      WHERE podcast_id = ${podcastId}
    `)
  ).rows as any[];

  const byDay = (
    await db.execute(sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS downloads
      FROM listen_events
      WHERE podcast_id = ${podcastId} AND kind = 'download' AND created_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `)
  ).rows as any[];

  const byApp = (
    await db.execute(sql`
      SELECT coalesce(app, 'Unknown') AS app, count(*)::int AS downloads
      FROM listen_events
      WHERE podcast_id = ${podcastId} AND kind = 'download' AND created_at >= ${since}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    `)
  ).rows as any[];

  const byEpisode = (
    await db.execute(sql`
      SELECT episode_id, count(*)::int AS downloads, count(DISTINCT listener_hash)::int AS unique_listeners
      FROM listen_events
      WHERE podcast_id = ${podcastId} AND kind = 'download' AND episode_id IS NOT NULL
      GROUP BY 1
    `)
  ).rows as any[];

  return {
    windowDays: days,
    totals: {
      downloads: totalsRow?.downloads ?? 0,
      uniqueListeners: totalsRow?.unique_listeners ?? 0,
      feedHits: totalsRow?.feed_hits ?? 0,
      prevDownloads: totalsRow?.prev_downloads ?? 0,
    },
    byDay: byDay.map((r) => ({ day: r.day, downloads: r.downloads })),
    byApp: byApp.map((r) => ({ app: r.app, downloads: r.downloads })),
    byEpisode: byEpisode.map((r) => ({
      episodeId: r.episode_id,
      downloads: r.downloads,
      uniqueListeners: r.unique_listeners,
    })),
  };
}
