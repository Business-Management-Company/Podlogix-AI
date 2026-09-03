import { getCachedSearch, saveCachedSearch } from "./podchaserCache";
import { isPodchaserConfigured, searchPodchaserPodcasts } from "./podchaserGuestService";

/**
 * Podcast categories with real show counts, for the marketing landing page's
 * "15+ podcast & show categories" section (and anywhere else that wants to say
 * "N shows" honestly instead of a placeholder).
 *
 * The list mirrors the Discover page's topics. Counts come from Podchaser: one
 * podcast search per category, reading `total_results` — 15 requests, cached
 * for a week, so this costs ~60 requests a month against the 1,000 budget.
 * Icons are Lucide names so any client (our React app, the Next landing) can
 * map them to its own icon set; colours are the same hues the Discover tiles use.
 */

export interface CategoryCount {
  slug: string;
  label: string;
  /** The Podchaser search that defines the category. */
  query: string;
  /** Lucide icon name. */
  icon: string;
  /** Hex accent, matching the Discover tiles. */
  color: string;
  /** Podchaser's total matching shows; null when the count couldn't be fetched. */
  shows: number | null;
}

export const CATEGORIES: Array<Omit<CategoryCount, "shows">> = [
  { slug: "health-wellness", label: "Health & wellness", query: "health wellness", icon: "heart-pulse", color: "#10b981" },
  { slug: "business", label: "Business", query: "business entrepreneurship", icon: "briefcase-business", color: "#2563eb" },
  { slug: "technology", label: "Technology", query: "technology", icon: "cpu", color: "#6366f1" },
  { slug: "science", label: "Science", query: "science", icon: "flask-conical", color: "#0891b2" },
  { slug: "education", label: "Education", query: "education", icon: "graduation-cap", color: "#d97706" },
  { slug: "society-culture", label: "Society & culture", query: "society culture", icon: "messages-square", color: "#e11d48" },
  { slug: "comedy", label: "Comedy", query: "comedy", icon: "laugh", color: "#eab308" },
  { slug: "news", label: "News", query: "news", icon: "newspaper", color: "#dc2626" },
  { slug: "sports", label: "Sports", query: "sports", icon: "trophy", color: "#ea580c" },
  { slug: "true-crime", label: "True crime", query: "true crime", icon: "shield-alert", color: "#475569" },
  { slug: "music", label: "Music", query: "music", icon: "music", color: "#c026d3" },
  { slug: "history", label: "History", query: "history", icon: "landmark", color: "#a16207" },
  { slug: "arts", label: "Arts", query: "arts", icon: "palette", color: "#db2777" },
  { slug: "spirituality", label: "Spirituality", query: "spirituality religion", icon: "globe-2", color: "#0d9488" },
  // "veteran" alone, not "military veterans" — the combined phrase pulls in a
  // much broader, noisier set (same choice as the Discover page).
  { slug: "military-veterans", label: "Military & veterans", query: "veteran", icon: "medal", color: "#4d7c0f" },
];

const CACHE_KEY = "landing::category-counts";
const CACHE_DAYS = 7;
const MEMO_MS = 6 * 60 * 60 * 1000;

let memo: { at: number; value: CategoryCount[] } | null = null;

/** Categories with no counts — what callers get when Podchaser isn't configured. */
function withoutCounts(): CategoryCount[] {
  return CATEGORIES.map((c) => ({ ...c, shows: null }));
}

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;

  const cached = await getCachedSearch<CategoryCount[]>(CACHE_KEY, CACHE_DAYS * 24).catch(() => null);
  if (cached && cached.length === CATEGORIES.length) {
    memo = { at: Date.now(), value: cached };
    return cached;
  }

  if (!isPodchaserConfigured()) return withoutCounts();

  // Sequential on purpose: 15 near-simultaneous searches trip Podchaser's rate limit.
  const value: CategoryCount[] = [];
  let fetchedAny = false;
  for (const c of CATEGORIES) {
    try {
      const result = await searchPodchaserPodcasts(c.query, 1, 1, "power_score");
      const shows = result.pagination?.totalResults ?? null;
      value.push({ ...c, shows: typeof shows === "number" && shows > 0 ? shows : null });
      fetchedAny = fetchedAny || shows != null;
    } catch (error) {
      console.error(`Category count failed for "${c.label}":`, error);
      value.push({ ...c, shows: null });
    }
  }

  // Only cache a run that actually got numbers, so a rate-limited pass doesn't
  // pin "no counts" for a week.
  if (fetchedAny) {
    memo = { at: Date.now(), value };
    await saveCachedSearch(CACHE_KEY, "podcast", value).catch(() => undefined);
  }
  return value;
}
