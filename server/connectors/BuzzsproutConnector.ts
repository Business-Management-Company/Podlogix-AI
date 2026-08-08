import { PodcastHostConnector } from "./PodcastHostConnector";
import {
  ConnectorError,
  type PodcastHostCapabilities,
  type ConnectorCredentials,
  type ConnectorProvider,
  type SyncResult,
  type ConnectorEpisodeUpdate,
  type PublishEpisodeInput,
  type AnalyticsParams,
  type ConnectorAnalytics,
} from "./types";
import type { Podcast } from "@shared/models/Podcast";
import type { Episode, EpisodeStatus } from "@shared/models/Episode";

/**
 * Buzzsprout connector — read-only, end-to-end.
 *
 * Implements real authentication and real reads against Buzzsprout's actual
 * REST API (https://github.com/buzzsprout/buzzsprout-api): token auth,
 * GET /podcasts.json, GET /:podcast_id/episodes.json, and single-episode
 * lookup. Every response is mapped into the canonical `Podcast`/`Episode`
 * objects from `shared/models/` before it leaves this file — nothing
 * outside this connector ever sees a Buzzsprout field name.
 *
 * Deliberately excluded this milestone (still NOT_IMPLEMENTED stubs):
 * publishEpisode, updateEpisode, getAnalytics, sync. This connector reads
 * and maps only — it does not write to Buzzsprout, and per this milestone's
 * scope it does not write to Podlogix's own database either. The `Podcast`/
 * `Episode` objects it returns are not yet persisted, so their `id` (and
 * `Episode.podcastId`) are synthesized placeholders, not real Podlogix
 * UUIDs — see `mapPodcast`/`mapEpisode` below.
 */
export class BuzzsproutConnector extends PodcastHostConnector {
  readonly provider: ConnectorProvider = "buzzsprout";

  readonly capabilities: PodcastHostCapabilities = {
    canSync: true,
    canPublish: true,
    canUpdateEpisodes: true,
    canFetchAnalytics: true,
  };

  private apiToken: string | null = null;

  // ─── Auth ───────────────────────────────────────────────────────────────

  protected async authenticate(credentials: ConnectorCredentials): Promise<void> {
    const apiToken = credentials.apiToken;
    if (typeof apiToken !== "string" || apiToken.trim().length === 0) {
      throw new ConnectorError(
        this.provider,
        "AUTH_FAILED",
        "Buzzsprout has no OAuth flow — connecting requires the account's API token (found in Buzzsprout under Settings > API), passed as credentials.apiToken."
      );
    }
    // Optimistically set the token, then prove it works with a real call.
    // If the call fails, roll back so the connector isn't left "connected"
    // with a token Buzzsprout has already rejected.
    this.apiToken = apiToken;
    try {
      await this.request<unknown>("/podcasts.json");
    } catch (error) {
      this.apiToken = null;
      throw error;
    }
  }

  protected async teardown(): Promise<void> {
    // Buzzsprout API tokens are long-lived account credentials, not
    // short-lived OAuth grants — there is nothing to revoke on disconnect.
    this.apiToken = null;
  }

  // ─── Reads ──────────────────────────────────────────────────────────────

  async getPodcasts(): Promise<Podcast[]> {
    this.ensureConnected();
    const raw = await this.request<BuzzsproutPodcastRaw[]>("/podcasts.json");
    return raw.map((podcast) => mapPodcast(podcast, this.userId));
  }

  async getPodcast(externalId: string): Promise<Podcast | null> {
    this.ensureConnected();
    // Buzzsprout's API has no single-podcast-by-id endpoint — only the
    // account-wide list — so this is a filter over getPodcasts().
    const podcasts = await this.getPodcasts();
    return podcasts.find((podcast) => podcast.connections.some((c) => c.externalId === externalId)) ?? null;
  }

  async getEpisodes(podcastExternalId: string): Promise<Episode[]> {
    this.ensureConnected();
    const raw = await this.request<BuzzsproutEpisodeRaw[]>(`/${encodeURIComponent(podcastExternalId)}/episodes.json`);
    return raw.map((episode) => mapEpisode(episode, podcastExternalId));
  }

  async getEpisode(episodeExternalId: string): Promise<Episode | null> {
    this.ensureConnected();

    // Buzzsprout's single-episode endpoint is scoped by podcast id
    // (/:podcast_id/episodes/:id.json) — there's no bare "get episode by
    // id" across the whole account. If this connector instance was
    // configured with a podcastId, use it directly (one request).
    if (this.podcastId) {
      try {
        const raw = await this.request<BuzzsproutEpisodeRaw>(
          `/${encodeURIComponent(this.podcastId)}/episodes/${encodeURIComponent(episodeExternalId)}.json`
        );
        return mapEpisode(raw, this.podcastId);
      } catch (error) {
        if (error instanceof ConnectorError && error.code === "NOT_FOUND") return null;
        throw error;
      }
    }

    // No podcast scope configured — fall back to searching every podcast on
    // the account. Slower, but correct: this connector was told which
    // account to talk to, not which show, so there's no cheaper path.
    const podcasts = await this.getPodcasts();
    for (const podcast of podcasts) {
      const origin = podcast.connections.find((c) => c.provider === this.provider);
      if (!origin) continue;
      const episodes = await this.getEpisodes(origin.externalId);
      const match = episodes.find((episode) => episode.connections.some((c) => c.externalId === episodeExternalId));
      if (match) return match;
    }
    return null;
  }

  // ─── Out of scope this milestone ───────────────────────────────────────

  async sync(): Promise<SyncResult> {
    this.ensureConnected();
    throw this.notImplemented("sync");
  }

  async updateEpisode(_episodeExternalId: string, _updates: ConnectorEpisodeUpdate): Promise<Episode> {
    this.ensureConnected();
    this.ensureSupported("canUpdateEpisodes");
    throw this.notImplemented("updateEpisode");
  }

  async publishEpisode(_input: PublishEpisodeInput): Promise<Episode> {
    this.ensureConnected();
    this.ensureSupported("canPublish");
    throw this.notImplemented("publishEpisode");
  }

  async getAnalytics(_params: AnalyticsParams): Promise<ConnectorAnalytics> {
    this.ensureConnected();
    this.ensureSupported("canFetchAnalytics");
    throw this.notImplemented("getAnalytics");
  }

  // ─── Buzzsprout HTTP plumbing (private — nothing above this line leaks) ──

  private async request<T>(path: string): Promise<T> {
    if (!this.apiToken) {
      throw new ConnectorError(this.provider, "NOT_CONNECTED", "Buzzsprout connector is not connected.");
    }

    let response: Response;
    try {
      response = await fetch(`${BUZZSPROUT_API_BASE}${path}`, {
        headers: {
          // Buzzsprout's only auth mechanism: a static account API token,
          // found in the user's Buzzsprout account settings. Not OAuth —
          // Buzzsprout's API does not offer an OAuth flow.
          Authorization: `Token token=${this.apiToken}`,
          Accept: "application/json",
          // Buzzsprout's docs call this out explicitly: requests without a
          // real User-Agent are blocked as bot traffic.
          "User-Agent": "Podlogix/1.0 (+https://podlogix.co)",
        },
      });
    } catch (error) {
      throw new ConnectorError(
        this.provider,
        "PROVIDER_ERROR",
        `Could not reach Buzzsprout: ${this.describeError(error)}`,
        true
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ConnectorError(this.provider, "AUTH_FAILED", `Buzzsprout rejected this API token (HTTP ${response.status}).`);
    }
    if (response.status === 404) {
      throw new ConnectorError(this.provider, "NOT_FOUND", `Buzzsprout resource not found: ${path}`);
    }
    if (response.status === 429) {
      throw new ConnectorError(this.provider, "RATE_LIMITED", "Buzzsprout API rate limit exceeded.", true);
    }
    if (!response.ok) {
      throw new ConnectorError(this.provider, "PROVIDER_ERROR", `Buzzsprout API error (HTTP ${response.status}).`, true);
    }

    return (await response.json()) as T;
  }

  private notImplemented(method: string): ConnectorError {
    return new ConnectorError(
      this.provider,
      "NOT_IMPLEMENTED",
      `BuzzsproutConnector.${method}() is out of scope for the read-only milestone — Buzzsprout supports it, this connector just doesn't call it yet.`
    );
  }
}

// ─── Buzzsprout's raw API shapes ─────────────────────────────────────────
// Exactly what buzzsprout.com/api returns, field-for-field. Private to this
// file on purpose — this is the one place in the whole application allowed
// to know Buzzsprout uses `main_category` instead of `category`, or
// `audio_url` instead of `audioUrl`.

const BUZZSPROUT_API_BASE = "https://www.buzzsprout.com/api";

interface BuzzsproutPodcastRaw {
  id: number;
  title: string;
  author: string;
  description: string | null;
  website_address: string | null;
  contact_email: string | null;
  keywords: string | null;
  explicit: boolean;
  main_category: string | null;
  sub_category: string | null;
  language: string | null;
  timezone: string | null;
  artwork_url: string | null;
  background_url: string | null;
}

interface BuzzsproutEpisodeRaw {
  id: number;
  title: string;
  audio_url: string | null;
  artwork_url: string | null;
  description: string | null;
  summary: string | null;
  artist: string | null;
  tags: string | null;
  /** ISO 8601 with offset, e.g. "2019-09-12T03:00:00.000-04:00". */
  published_at: string | null;
  /** Seconds. */
  duration: number | null;
  hq?: boolean;
  magic_mastering?: boolean;
  guid: string;
  inactive_at: string | null;
  episode_number: number | null;
  season_number: number | null;
  explicit: boolean;
  private: boolean;
  total_plays?: number;
}

// ─── Mapping layer: Buzzsprout raw JSON -> canonical Podlogix objects ─────

function mapPodcast(raw: BuzzsproutPodcastRaw, userId: string): Podcast {
  const now = new Date().toISOString();
  const externalId = String(raw.id);
  return {
    // Not a real Podlogix UUID — this object has never been persisted.
    // A future import/sync step assigns the real id and reconciles this
    // record against it using `connections[0].externalId`.
    id: `buzzsprout-${externalId}`,
    userId,
    title: raw.title,
    description: raw.description,
    artworkUrl: raw.artwork_url,
    websiteUrl: raw.website_address,
    // Buzzsprout's /podcasts.json does not expose a public RSS feed URL.
    feedUrl: null,
    language: raw.language,
    category: raw.main_category,
    isExplicit: raw.explicit,
    // Buzzsprout reports no podcast-level status; anything the API returns
    // is a live show on the account.
    status: "active",
    // Not reported on this resource. A sync pass can backfill the real
    // count from getEpisodes(...).length once this podcast is persisted.
    episodeCount: 0,
    connections: [{ provider: "buzzsprout", externalId, lastSyncedAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

function mapEpisode(raw: BuzzsproutEpisodeRaw, podcastExternalId: string): Episode {
  const now = new Date().toISOString();
  const externalId = String(raw.id);
  return {
    id: `buzzsprout-${externalId}`,
    // Matches the placeholder id mapPodcast() would produce for the same
    // Buzzsprout podcast, so episodes and podcasts returned in the same
    // batch still join correctly before either is persisted.
    podcastId: `buzzsprout-${podcastExternalId}`,
    title: raw.title,
    // Buzzsprout's `summary` is the short blurb; `description` is the
    // full show-notes content shown in podcast apps — the reverse of what
    // the field names might suggest, hence the swap here.
    description: raw.summary,
    showNotes: raw.description,
    audioUrl: raw.audio_url,
    artworkUrl: raw.artwork_url,
    durationSeconds: raw.duration,
    episodeNumber: raw.episode_number,
    seasonNumber: raw.season_number,
    // Buzzsprout doesn't classify episodes as full/trailer/bonus.
    episodeType: "full",
    isExplicit: raw.explicit,
    status: mapEpisodeStatus(raw),
    publishedAt: raw.published_at,
    // Buzzsprout has no concept of guests or sponsors.
    guestIds: [],
    sponsorIds: [],
    connections: [{ provider: "buzzsprout", externalId, lastSyncedAt: now }],
    createdAt: now,
    updatedAt: now,
  };
}

function mapEpisodeStatus(raw: BuzzsproutEpisodeRaw): EpisodeStatus {
  if (raw.inactive_at) return "archived";
  if (!raw.published_at) return "draft";
  return new Date(raw.published_at).getTime() > Date.now() ? "scheduled" : "published";
}
