import { unstable_cache } from "next/cache";
import { creatorsSeed, trendingSeed } from "./data";
import type { Creator, Podcast } from "./types";

const TRENDING_COUNT = 5;
const CREATOR_COUNT = 10;

/**
 * Homepage content, in priority order:
 *   1. the Podlogix feed: shows an admin featured, then Podchaser's most
 *      followed shows and their hosts, fetched by the app with its own key
 *   2. Podchaser directly, only if this deployment carries a key of its own
 *   3. seed content, so both sections are always full
 * Cached for an hour so the page stays fast and stays inside API quotas.
 */
export const getHomeContent = unstable_cache(
  async (): Promise<{ trending: Podcast[]; creators: Creator[] }> => {
    const [registered, chart] = await Promise.all([fetchRegistered(), fetchPodchaserTrending()]);
    const trending = dedupe([...registered.trending, ...chart, ...trendingSeed]).slice(0, TRENDING_COUNT);
    const creators = dedupe([...registered.creators, ...creatorsSeed]).slice(0, CREATOR_COUNT);
    return { trending, creators };
  },
  ["home-content"],
  { revalidate: 3600 },
);

function dedupe<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

/* ---------- Podlogix registered content ---------- */

/**
 * The app's public feed (`/api/public/landing`), in the same shape as the seed
 * data: an array of Podcast and an array of Creator, featured shows first.
 */
async function fetchRegistered(): Promise<{ trending: Podcast[]; creators: Creator[] }> {
  const url = process.env.PODLOGIX_CONTENT_URL;
  if (!url) return { trending: [], creators: [] };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { trending: [], creators: [] };
    const json = (await res.json()) as { trending?: Podcast[]; creators?: Creator[] };
    return { trending: json.trending ?? [], creators: json.creators ?? [] };
  } catch {
    return { trending: [], creators: [] };
  }
}

/* ---------- Podchaser REST API ---------- */

/** Podcast object as documented at developers.podchaser.com (REST v1). */
type PodchaserPodcast = {
  id?: string | number;
  title?: string;
  description?: string;
  imageUrl?: string;
  webUrl?: string;
  categories?: Array<{ title?: string; slug?: string }>;
  numberOfEpisodes?: number;
  avgEpisodeLength?: number;
  latestEpisodeDate?: string;
  /** Chart rows wrap the podcast alongside its position. */
  podcast?: PodchaserPodcast;
  position?: number;
};

async function fetchPodchaserTrending(): Promise<Podcast[]> {
  const key = process.env.PODCHASER_API_KEY;
  if (!key) return [];
  const base = "https://developers.podchaser.com/api/rest/v1";
  const headers = { "x-api-key": key, accept: "application/json" };
  const platform = process.env.PODCHASER_CHART_PLATFORM ?? "apple_podcasts";
  try {
    // Charts need the Professional tier; fall through to search on lower tiers.
    let rows: PodchaserPodcast[] = [];
    const charts = await fetch(`${base}/charts?platform=${platform}&category=top-podcasts&country=us&per_page=10`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (charts.ok) {
      const json = (await charts.json()) as { data?: PodchaserPodcast[] };
      rows = json.data ?? [];
    } else {
      const search = await fetch(`${base}/search/podcasts?q=business&per_page=10`, { headers, next: { revalidate: 3600 } });
      if (search.ok) {
        const json = (await search.json()) as { data?: PodchaserPodcast[] };
        rows = json.data ?? [];
      }
    }
    return rows.map(toPodcast).filter((p): p is Podcast => Boolean(p));
  } catch {
    return [];
  }
}

function toPodcast(row: PodchaserPodcast): Podcast | null {
  const p = row.podcast ?? row;
  if (!p.id || !p.title || !p.imageUrl) return null;
  const category = p.categories?.[0]?.title ?? "Podcast";
  const minutes = p.avgEpisodeLength ? Math.round(p.avgEpisodeLength / 60) : 0;
  const description = (p.description ?? "").replace(/<[^>]+>/g, "").trim();
  return {
    id: `podchaser-${p.id}`,
    title: p.title,
    category,
    episodeLabel: p.numberOfEpisodes ? `${p.numberOfEpisodes} episodes` : "Latest episode",
    description: description.length > 130 ? `${description.slice(0, 127).trimEnd()}...` : description,
    durationLabel: minutes ? `${minutes} Mins` : "New",
    listenersLabel: row.position ? `#${row.position} this week` : "Trending now",
    artwork: p.imageUrl,
    url: p.webUrl,
  };
}
