import type { Express, Request, Response } from "express";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { isAdmin, isAuthenticated } from "./replit_integrations/auth";
import { episodes, landingFeaturedPodcasts, listenEvents, podcasts, profiles } from "@shared/schema";
import { saveCachedSearch } from "./services/podchaserCache";
import {
  getPodchaserPodcastCredits,
  isPodchaserConfigured,
  searchPodchaserPodcasts,
  type PodchaserPodcastCandidate,
} from "./services/podchaserGuestService";

/**
 * Public feed for the marketing site, in the landing page's own shape: the
 * hosted shows an admin has featured first, then Podchaser's most followed
 * shows with their hosts, so the page carries real artwork from day one. The
 * feature list lives in its own table, so this ships without touching
 * `podcasts`. The edge caches the response for an hour and the Podchaser part
 * is kept for a week, which holds the feed to a handful of API calls a week.
 */
const LIMIT = 10;
const CHART_HOSTS = 10;
/** Hosts come from the first few shows, at most two per show, so the list reads as a mix. */
const HOST_SOURCES = 6;
const HOSTS_PER_SHOW = 2;
const CHART_QUERY = process.env.LANDING_PODCHASER_QUERY?.trim() || "podcast";
const CHART_CACHE_KEY = "landing::podchaser";
const CHART_CACHE_DAYS = 7;
const CHART_MEMO_MS = 6 * 60 * 60 * 1000;

type FeedItem = Record<string, string>;
type Feed = { trending: FeedItem[]; creators: FeedItem[] };

const EMPTY: Feed = { trending: [], creators: [] };

const formatCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

const plain = (text: string | null | undefined, max: number) => {
  const t = (text || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
};

function publicBaseUrl(req: Request) {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

/** Audio downloads recorded for a show, the closest thing to listens. */
async function countListens(podcastId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listenEvents)
    .where(and(eq(listenEvents.podcastId, podcastId), eq(listenEvents.kind, "download")));
  return Number(row?.n ?? 0);
}

/* ---------- Featured hosted shows ---------- */

async function featuredFeed(base: string): Promise<Feed> {
  if (!db) return EMPTY;
  const rows = await db
    .select({ show: podcasts })
    .from(landingFeaturedPodcasts)
    .innerJoin(podcasts, eq(podcasts.id, landingFeaturedPodcasts.podcastId))
    .where(isNotNull(podcasts.artworkUrl))
    .orderBy(desc(landingFeaturedPodcasts.createdAt))
    .limit(LIMIT);
  const trending: FeedItem[] = [];
  const creators = new Map<string, FeedItem>();
  for (const { show } of rows) {
    const [stats] = await db
      .select({
        count: sql<number>`count(*)::int`,
        avg: sql<number>`coalesce(avg(${episodes.durationSeconds}), 0)::int`,
      })
      .from(episodes)
      .where(and(eq(episodes.podcastId, show.id), eq(episodes.status, "published")));
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, show.userId)).limit(1);
    const listens = await countListens(show.id);
    const creatorUrl = profile?.slug ? `${base}/p/${profile.slug}` : base;
    trending.push({
      id: `podlogix-${show.id}`,
      title: show.title,
      category: show.category || "Podcast",
      episodeLabel: `${stats?.count ?? 0} episodes`,
      description: plain(show.description, 160),
      durationLabel: `${Math.max(1, Math.round((stats?.avg ?? 0) / 60))} Mins`,
      listenersLabel: `${formatCount(listens)} Listeners`,
      artwork: show.artworkUrl as string,
      url: show.websiteUrl || creatorUrl,
    });
    if (profile?.isPublished && profile.avatarUrl && !creators.has(profile.id)) {
      creators.set(profile.id, {
        id: `podlogix-${profile.id}`,
        name: profile.displayName || show.author || show.ownerName || show.title,
        listenersLabel: `${formatCount(listens)} Listener`,
        photo: profile.avatarUrl,
        url: creatorUrl,
      });
    }
  }
  return { trending, creators: Array.from(creators.values()) };
}

/* ---------- Podchaser's most followed shows and their hosts ---------- */

function chartShow(p: PodchaserPodcastCandidate): FeedItem {
  const minutes = p.avgEpisodeLength ? Math.round(p.avgEpisodeLength / 60) : 0;
  return {
    id: `podchaser-${p.id}`,
    title: p.title,
    category: p.categories[0]?.title || "Podcast",
    episodeLabel: p.numberOfEpisodes ? `${p.numberOfEpisodes} episodes` : "Latest episode",
    description: plain(p.description, 130),
    durationLabel: minutes ? `${minutes} Mins` : "New",
    listenersLabel: p.followerCount ? `${formatCount(p.followerCount)} Followers` : "Trending now",
    artwork: p.imageUrl as string,
    url: p.webUrl || `https://www.podchaser.com/podcasts/${p.id}`,
  };
}

let chartMemo: { at: number; value: Feed } | null = null;

/** The stored chart, read with a longer window than the search cache's day. */
async function readChartCache(): Promise<Feed | null> {
  if (!db) return null;
  const result = await db.execute(sql`
    SELECT payload FROM podchaser_search_cache
    WHERE cache_key = ${CHART_CACHE_KEY} AND fetched_at > now() - interval '1 day' * ${CHART_CACHE_DAYS}
  `);
  const row = (result as { rows?: Array<{ payload: unknown }> }).rows?.[0];
  if (!row) return null;
  return (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as Feed;
}

async function podchaserFeed(): Promise<Feed> {
  if (!isPodchaserConfigured()) return EMPTY;
  if (chartMemo && Date.now() - chartMemo.at < CHART_MEMO_MS) return chartMemo.value;
  const cached = await readChartCache().catch(() => null);
  if (cached) {
    chartMemo = { at: Date.now(), value: cached };
    return cached;
  }
  // Podchaser's power score ranks shows by reach, so the top of a broad
  // search reads as a chart without the charts endpoint's higher tier.
  const result = await searchPodchaserPodcasts(CHART_QUERY, LIMIT, 1, "power_score");
  const shows = result.podcastCandidates.filter((p) => p.id && p.title && p.imageUrl);
  const trending = shows.map(chartShow);
  const creators = new Map<string, FeedItem>();
  for (const show of shows.slice(0, HOST_SOURCES)) {
    if (creators.size >= CHART_HOSTS) break;
    try {
      const { credits } = await getPodchaserPodcastCredits(show.id, 10);
      const hosts = credits.filter((c) => /host/i.test(`${c.roleCode} ${c.roleTitle}`));
      let added = 0;
      for (const { creator } of hosts.length ? hosts : credits) {
        if (!creator.imageUrl || creators.has(creator.id)) continue;
        creators.set(creator.id, {
          id: `podchaser-${creator.id}`,
          name: creator.name,
          listenersLabel: creator.followerCount
            ? `${formatCount(creator.followerCount)} Followers`
            : creator.episodeAppearanceCount
              ? `${formatCount(creator.episodeAppearanceCount)} Episodes`
              : "Podcast host",
          photo: creator.imageUrl,
          url: creator.profileUrl || `https://www.podchaser.com/creators/${creator.id}`,
        });
        if (++added >= HOSTS_PER_SHOW || creators.size >= CHART_HOSTS) break;
      }
    } catch (error) {
      console.error("Landing feed: podcast credits failed:", error);
    }
  }
  const value = { trending, creators: Array.from(creators.values()) };
  chartMemo = { at: Date.now(), value };
  await saveCachedSearch(CHART_CACHE_KEY, "podcast", value).catch(() => undefined);
  return value;
}

export function registerLandingRoutes(app: Express) {
  app.get("/api/public/landing", async (req: Request, res: Response) => {
    res.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    const [featured, chart] = await Promise.all([
      featuredFeed(publicBaseUrl(req)).catch((error) => {
        console.error("Landing feed: featured shows failed:", error);
        return EMPTY;
      }),
      podchaserFeed().catch((error) => {
        console.error("Landing feed: Podchaser failed:", error);
        return EMPTY;
      }),
    ]);
    res.json({
      trending: [...featured.trending, ...chart.trending],
      creators: [...featured.creators, ...chart.creators],
    });
  });

  /** Admins choose which hosted shows the landing page may feature. Body: { featured: boolean }. */
  app.patch("/api/admin/podcasts/:id/landing", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    const podcastId = String(req.params.id);
    const podcast = await storage.getPodcast(podcastId);
    if (!podcast) return res.status(404).json({ message: "Podcast not found" });
    const featured = Boolean(req.body?.featured);
    if (featured) await db.insert(landingFeaturedPodcasts).values({ podcastId }).onConflictDoNothing();
    else await db.delete(landingFeaturedPodcasts).where(eq(landingFeaturedPodcasts.podcastId, podcastId));
    res.json({ podcastId, featured });
  });
}
