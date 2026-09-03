import { unstable_cache } from "next/cache";
import { categories as categoriesSeed, creatorsSeed, trendingSeed } from "./data";
import type { Category, Creator, Podcast } from "./types";

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

/* ---------- Categories ---------- */

/** The app's categories feed row, as shipped in the public API. */
type CategoryRow = { slug?: string; label?: string; icon?: string; shows?: number | null };

/** Their Lucide icon names, mapped onto the site's icon set. */
const ICONS: Record<string, string> = {
  "heart-pulse": "heart-pulse",
  "briefcase-business": "suitcase",
  cpu: "chip",
  "flask-conical": "flask",
  "graduation-cap": "graduation-cap",
  "messages-square": "comments",
  laugh: "smile",
  newspaper: "newspaper",
  trophy: "trophy",
  "shield-alert": "shield",
  music: "music",
  landmark: "landmark",
  palette: "palette",
  "globe-2": "globe",
  medal: "medal",
};

/** Apple's podcast genre ids, keyed by the feed's category slugs. */
const GENRES: Record<string, number> = {
  "health-wellness": 1512,
  business: 1321,
  technology: 1318,
  science: 1533,
  education: 1304,
  "society-culture": 1324,
  comedy: 1303,
  news: 1489,
  sports: 1545,
  "true-crime": 1488,
  music: 1310,
  history: 1487,
  arts: 1301,
  spirituality: 1314,
};

const formatK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n));

const publicApi = () => (process.env.PODLOGIX_CONTENT_URL ?? "https://podlogix.io/api/public/landing").replace(/\/landing$/, "");

/**
 * The category rail: labels and real show counts from the app's feed, cover
 * artwork from the top of Apple's chart for each genre (skipping explicit
 * shows and covers already used). Card heights stay the design's stagger,
 * and the seed carries a full snapshot, so the rail never renders bare.
 */
export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const rows = await fetchCategoryRows();
    const merged = categoriesSeed.map((seed, i) => {
      const row = rows[i];
      if (!row) return seed;
      return {
        ...seed,
        slug: row.slug ?? seed.slug,
        name: row.label ?? seed.name,
        showsLabel: row.shows == null ? (rows.length ? null : seed.showsLabel) : `${formatK(row.shows)} Shows`,
        icon: (row.icon && ICONS[row.icon]) || seed.icon,
      };
    });
    const art = await fetchCategoryArt(merged.map((c) => c.slug));
    return merged.map((c) => ({ ...c, art: art.get(c.slug) ?? c.art }));
  },
  ["home-categories"],
  { revalidate: 86400 },
);

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  try {
    const res = await fetch(`${publicApi()}/categories`, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const json = (await res.json()) as { categories?: CategoryRow[] };
    const rows = json.categories ?? [];
    return rows.length === categoriesSeed.length ? rows : [];
  } catch {
    return [];
  }
}

type ChartRow = { collectionId?: number; collectionExplicitness?: string; artworkUrl600?: string };

async function fetchCategoryArt(slugs: string[]): Promise<Map<string, string>> {
  const art = new Map<string, string>();
  const headers = { "user-agent": "Mozilla/5.0" };
  const charts = await Promise.all(
    slugs.map(async (slug): Promise<[string, ChartRow[]]> => {
      const genre = GENRES[slug];
      if (!genre) return [slug, []];
      try {
        const feed = await fetch(`https://itunes.apple.com/us/rss/toppodcasts/limit=8/genre=${genre}/json`, { headers, next: { revalidate: 86400 } });
        if (!feed.ok) return [slug, []];
        const json = (await feed.json()) as { feed?: { entry?: Array<{ id?: { attributes?: { "im:id"?: string } } }> } };
        const ids = (json.feed?.entry ?? []).map((e) => e.id?.attributes?.["im:id"]).filter(Boolean) as string[];
        if (!ids.length) return [slug, []];
        const look = await fetch(`https://itunes.apple.com/lookup?id=${ids.join(",")}`, { headers, next: { revalidate: 86400 } });
        if (!look.ok) return [slug, []];
        const found = (await look.json()) as { results?: ChartRow[] };
        const by = new Map((found.results ?? []).map((r) => [String(r.collectionId), r]));
        return [slug, ids.map((id) => by.get(id)).filter(Boolean) as ChartRow[]];
      } catch {
        return [slug, []];
      }
    }),
  );
  const used = new Set<string>(categoriesSeed.filter((c) => !GENRES[c.slug] && c.art).map((c) => c.art as string));
  for (const [slug, rows] of charts) {
    const pick = rows.find((r) => r.artworkUrl600 && r.collectionExplicitness !== "explicit" && !used.has(r.artworkUrl600));
    if (pick?.artworkUrl600) {
      art.set(slug, pick.artworkUrl600);
      used.add(pick.artworkUrl600);
    }
  }
  return art;
}
