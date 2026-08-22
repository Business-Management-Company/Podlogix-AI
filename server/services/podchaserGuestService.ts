import { getCachedSearch, saveCachedSearch, saveCachedPodcasts, saveCachedCreators, logPodchaserUsage } from "./podchaserCache";

const PODCHASER_API_BASE = "https://developers.podchaser.com/api/rest/v1";

interface PodchaserCreatorRaw {
  pcid?: string | number;
  name?: string;
  informalName?: string;
  pronouns?: string;
  subtitle?: string;
  location?: string;
  bio?: string;
  url?: string;
  imageUrl?: string;
  episodeAppearanceCount?: number;
  followerCount?: number;
  socialLinks?: {
    twitter?: string;
    wikipedia?: string;
  };
  modifiedDate?: string;
}

interface PodchaserRoleRaw {
  code?: string;
  title?: string;
}

interface PodchaserEpisodeRaw {
  id?: string | number;
  title?: string;
  airDate?: string;
}

interface PodchaserPodcastRaw {
  id?: string | number;
  applePodcastsId?: string;
  spotifyId?: string;
  rssUrl?: string;
  title?: string;
  description?: string;
  webUrl?: string;
  imageUrl?: string;
  language?: string;
  numberOfEpisodes?: number;
  avgEpisodeLength?: number;
  daysBetweenEpisodes?: number;
  episodeFrequency?: number;
  followerCount?: number;
  ratingCount?: number;
  ratingAverage?: number;
  reviewCount?: number;
  startDate?: string;
  latestEpisodeDate?: string;
  categories?: Array<{ title?: string; slug?: string }>;
  hasGuests?: boolean;
  isExplicit?: boolean;
  explicit?: boolean;
  status?: string;
  author?: { name?: string; email?: string };
  socialLinks?: PodchaserSocialLinksRaw;
  socialFollowerCounts?: PodchaserSocialFollowerCountsRaw;
  modifiedDate?: string;
}

interface PodchaserSocialLinksRaw {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  tiktok?: string;
  patreon?: string;
  twitch?: string;
}

interface PodchaserSocialFollowerCountsRaw {
  twitter?: number;
  facebook?: number;
  instagram?: number;
  youtube?: number;
  linkedin?: number;
  tiktok?: number;
  patreon?: number;
  twitch?: number;
}

interface PodchaserPodcastCreditListRaw {
  creator?: PodchaserCreatorRaw;
  role?: PodchaserRoleRaw;
  episodeCount?: number;
  lastEpisode?: PodchaserEpisodeRaw & { role?: string };
}

interface PodchaserEpisodeCreditRaw {
  id?: string | number;
  episode?: PodchaserEpisodeRaw;
  podcast?: PodchaserPodcastRaw;
  role?: PodchaserRoleRaw;
  characters?: Array<{ name?: string }>;
}

interface PodchaserPodcastCreditRaw {
  id?: string | number;
  podcast?: PodchaserPodcastRaw;
  role?: PodchaserRoleRaw;
  episodeCount?: number;
  lastEpisode?: PodchaserEpisodeRaw;
}

interface PodchaserPaginationRaw {
  page?: number;
  per_page?: number;
  total_results?: number;
  total_pages?: number;
  has_more?: boolean;
}

interface PodchaserPaginatedRaw<T> {
  data?: T[];
  pagination?: PodchaserPaginationRaw;
  restricted_fields?: string[];
}

interface PodchaserObjectEnvelope<T> {
  data?: T;
  restricted_fields?: string[];
}

interface PodchaserPodcastSocialsRaw {
  socialLinks?: PodchaserSocialLinksRaw;
  socialFollowers?: PodchaserSocialFollowerCountsRaw;
}

interface PodchaserUsageRaw {
  tier?: string;
  quota?: number | null;
  used?: number;
  remaining?: number | null;
  cycle_start?: string;
  cycle_end?: string;
}

interface PodchaserUsageEnvelope {
  data?: PodchaserUsageRaw;
}

interface PodchaserErrorEnvelope {
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface PodchaserCreatorCandidate {
  id: string;
  name: string;
  informalName: string | null;
  pronouns: string | null;
  subtitle: string | null;
  location: string | null;
  bio: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  episodeAppearanceCount: number | null;
  followerCount: number | null;
  socialLinks: {
    twitter: string | null;
    wikipedia: string | null;
  };
  modifiedAt: string | null;
}

export interface PodchaserGuestEpisode {
  creditId: string | null;
  episodeId: string;
  episodeTitle: string;
  airDate: string | null;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  podcastRssUrl: string | null;
  roleCode: string;
  roleTitle: string;
  characters: string[];
}

export interface PodchaserGuestPodcast {
  creditId: string | null;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  webUrl: string | null;
  rssUrl: string | null;
  socialLinks: Record<keyof PodchaserSocialLinksRaw, string | null>;
  roleCode: string;
  roleTitle: string;
  episodeCount: number;
  numberOfEpisodes: number | null;
  latestEpisodeDate: string | null;
  status: string | null;
  author: { name: string | null; email: string | null };
  latestEpisode: {
    id: string;
    title: string;
    airDate: string | null;
  } | null;
}

export interface PodchaserQuota {
  tier: string;
  quota: number | null;
  used: number;
  remaining: number | null;
  cycleStart: string | null;
  cycleEnd: string | null;
}

export interface PodchaserGuestProbeResult {
  personQuery: string;
  identityConfidence: "exact" | "possible" | "not-found";
  creatorCandidates: PodchaserCreatorCandidate[];
  selectedCreator: PodchaserCreatorCandidate | null;
  guestEpisodes: PodchaserGuestEpisode[];
  guestPodcasts: PodchaserGuestPodcast[];
  hostedPodcasts: PodchaserGuestPodcast[];
  pagination: {
    guestEpisodesTotal: number;
    guestPodcastsTotal: number;
    hostedPodcastsTotal: number;
  };
  quota: PodchaserQuota;
  requestsConsumed: number;
}

export interface PodchaserCreatorSearchResult {
  personQuery: string;
  creatorCandidates: PodchaserCreatorCandidate[];
  pagination: PodchaserSearchPagination;
  suggestedQuery: string | null;
  restrictedFields: string[];
}

export interface PodchaserSearchPagination {
  page: number;
  perPage: number;
  totalResults: number;
  totalPages: number;
  hasMore: boolean;
}

export type PodchaserCreatorSort = "relevance" | "alphabetical" | "recent_episode" | "appearance_count";
export type PodchaserPodcastSort = "relevance" | "alphabetical" | "date_of_first_episode" | "power_score";

export interface PodchaserPodcastCandidate {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  language: string | null;
  webUrl: string | null;
  rssUrl: string | null;
  numberOfEpisodes: number | null;
  avgEpisodeLength: number | null;
  daysBetweenEpisodes: number | null;
  followerCount: number | null;
  ratingCount: number | null;
  ratingAverage: number | null;
  reviewCount: number | null;
  startDate: string | null;
  latestEpisodeDate: string | null;
  categories: Array<{ title: string; slug: string }>;
  hasGuests: boolean | null;
  explicit: boolean | null;
  status: string | null;
  author: { name: string | null; email: string | null };
  socialLinks: Record<keyof PodchaserSocialLinksRaw, string | null>;
  socialFollowerCounts: Record<keyof PodchaserSocialFollowerCountsRaw, number | null>;
}

export interface PodchaserPodcastSearchResult {
  podcastQuery: string;
  podcastCandidates: PodchaserPodcastCandidate[];
  pagination: PodchaserSearchPagination;
  suggestedQuery: string | null;
  restrictedFields: string[];
}

export interface PodchaserPodcastCredit {
  creator: PodchaserCreatorCandidate;
  roleCode: string;
  roleTitle: string;
  episodeCount: number;
  latestEpisode: { id: string; title: string; airDate: string | null } | null;
}

export interface PodchaserPodcastCreditsResult {
  podcastId: string;
  credits: PodchaserPodcastCredit[];
  pagination: PodchaserSearchPagination;
}

export interface PodchaserGuestAppearancesResult {
  creatorId: string;
  guestEpisodes: PodchaserGuestEpisode[];
  guestPodcasts: PodchaserGuestPodcast[];
  hostedPodcasts: PodchaserGuestPodcast[];
  pagination: {
    guestEpisodesTotal: number;
    guestPodcastsTotal: number;
    hostedPodcastsTotal: number;
  };
}

export class PodchaserError extends Error {
  readonly httpStatus: number | null;
  readonly code: "NOT_CONFIGURED" | "AUTH_FAILED" | "TIER_RESTRICTED" | "RATE_LIMITED" | "PROVIDER_ERROR";

  constructor(code: PodchaserError["code"], message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "PodchaserError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isPodchaserConfigured(): boolean {
  return Boolean(process.env.PODCHASER_API_KEY?.trim());
}

const SEARCH_CACHE_TTL_MS = 15 * 60 * 1000;
const APPEARANCE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;
const creatorDetailCache = new Map<string, { expiresAt: number; value: PodchaserCreatorCandidate }>();
const creatorSearchCache = new Map<string, { expiresAt: number; value: PodchaserCreatorSearchResult }>();
const podcastSearchCache = new Map<string, { expiresAt: number; value: PodchaserPodcastSearchResult }>();
const podcastCreditsCache = new Map<string, { expiresAt: number; value: PodchaserPodcastCreditsResult }>();
const guestAppearanceCache = new Map<string, { expiresAt: number; value: PodchaserGuestAppearancesResult }>();

export async function getPodchaserCreator(creatorId: string): Promise<PodchaserCreatorCandidate> {
  const normalizedCreatorId = creatorId.trim();
  const cached = getCached(creatorDetailCache, normalizedCreatorId);
  if (cached) return cached;
  // Single-object Podchaser responses may arrive enveloped as { data: {...} },
  // same as /podcasts/{id} — without unwrapping, every field silently reads as
  // undefined and normalizeCreator falls back to "Unknown creator" with a
  // blank id, which then fails guest-prospect validation downstream.
  const response = await requestPodchaser<PodchaserCreatorRaw | PodchaserObjectEnvelope<PodchaserCreatorRaw>>(
    `/creators/${encodeURIComponent(normalizedCreatorId)}`,
  );
  const value = normalizeCreator(extractObject(response));
  setCached(creatorDetailCache, normalizedCreatorId, value, APPEARANCE_CACHE_TTL_MS);
  return value;
}

export async function searchPodchaserCreators(
  personQuery: string,
  max = 10,
  page = 1,
  sort: PodchaserCreatorSort = "appearance_count",
): Promise<PodchaserCreatorSearchResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const requestedPage = Math.max(Math.trunc(page), 1);
  const normalizedQuery = personQuery.trim();
  const cacheKey = `${normalizedQuery.toLowerCase()}::${limit}::${requestedPage}::${sort}`;
  const cached = getCached(creatorSearchCache, cacheKey);
  if (cached) return cached;
  const dbCached = await getCachedSearch<PodchaserCreatorSearchResult>(`creator::${cacheKey}`);
  if (dbCached) {
    setCached(creatorSearchCache, cacheKey, dbCached, SEARCH_CACHE_TTL_MS);
    return dbCached;
  }

  let creatorResponse = await requestPodchaser<PodchaserCreatorRaw[] | PodchaserPaginatedRaw<PodchaserCreatorRaw>>(
    "/search/creators",
    creatorSearchQuery(normalizedQuery, limit, requestedPage, sort),
  );
  let candidates = extractData(creatorResponse).map(normalizeCreator);
  let suggestedQuery: string | null = null;

  // A single controlled fallback helps with a misspelled surname while keeping
  // each debounced search term to at most one spelling-recovery request.
  if (requestedPage === 1 && candidates.length === 0) {
    const fallbackQuery = fallbackSearchTerm(normalizedQuery);
    if (fallbackQuery) {
      creatorResponse = await requestPodchaser<PodchaserCreatorRaw[] | PodchaserPaginatedRaw<PodchaserCreatorRaw>>(
        "/search/creators",
        creatorSearchQuery(fallbackQuery, limit, 1, sort),
      );
      candidates = rankCreatorSuggestions(normalizedQuery, extractData(creatorResponse).map(normalizeCreator));
      suggestedQuery = candidates[0]?.name ?? null;
    }
  }

  const value = {
    personQuery: normalizedQuery,
    creatorCandidates: candidates,
    pagination: normalizePagination(creatorResponse, requestedPage, limit, candidates.length),
    suggestedQuery,
    restrictedFields: extractRestrictedFields(creatorResponse),
  };
  setCached(creatorSearchCache, cacheKey, value, SEARCH_CACHE_TTL_MS);
  await saveCachedSearch(`creator::${cacheKey}`, "creator", value);
  await saveCachedCreators(candidates.map((c) => ({ id: c.id, name: c.name, imageUrl: c.imageUrl })));
  return value;
}

export async function searchPodchaserPodcasts(
  podcastQuery: string,
  max = 10,
  page = 1,
  sort: PodchaserPodcastSort = "relevance",
): Promise<PodchaserPodcastSearchResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const requestedPage = Math.max(Math.trunc(page), 1);
  const normalizedQuery = podcastQuery.trim();
  const cacheKey = `${normalizedQuery.toLowerCase()}::${limit}::${requestedPage}::${sort}`;
  const cached = getCached(podcastSearchCache, cacheKey);
  if (cached) return cached;
  const dbCached = await getCachedSearch<PodchaserPodcastSearchResult>(`podcast::${cacheKey}`);
  if (dbCached) {
    setCached(podcastSearchCache, cacheKey, dbCached, SEARCH_CACHE_TTL_MS);
    return dbCached;
  }

  let response = await requestPodchaser<PodchaserPodcastRaw[] | PodchaserPaginatedRaw<PodchaserPodcastRaw>>(
    "/search/podcasts",
    {
      q: normalizedQuery,
      page: String(requestedPage),
      per_page: String(limit),
      sort,
      sort_direction: sort === "alphabetical" ? "asc" : "desc",
    },
  );
  let candidates = extractData(response).map(normalizePodcast);
  let suggestedQuery: string | null = null;

  if (requestedPage === 1 && candidates.length === 0) {
    const fallbackQuery = fallbackSearchTerm(normalizedQuery);
    if (fallbackQuery) {
      response = await requestPodchaser<PodchaserPodcastRaw[] | PodchaserPaginatedRaw<PodchaserPodcastRaw>>(
        "/search/podcasts",
        { q: fallbackQuery, page: "1", per_page: String(limit), sort, sort_direction: sort === "alphabetical" ? "asc" : "desc" },
      );
      candidates = rankPodcastSuggestions(normalizedQuery, extractData(response).map(normalizePodcast));
      suggestedQuery = candidates[0]?.title ?? null;
    }
  }

  const value = {
    podcastQuery: normalizedQuery,
    podcastCandidates: candidates,
    pagination: normalizePagination(response, requestedPage, limit, candidates.length),
    suggestedQuery,
    restrictedFields: extractRestrictedFields(response),
  };
  setCached(podcastSearchCache, cacheKey, value, SEARCH_CACHE_TTL_MS);
  await saveCachedSearch(`podcast::${cacheKey}`, "podcast", value);
  await saveCachedPodcasts(candidates.map((c) => ({ id: c.id, title: c.title, imageUrl: c.imageUrl, rssUrl: c.rssUrl })));
  return value;
}

export async function getPodchaserPodcastCredits(
  podcastId: string,
  max = 25,
): Promise<PodchaserPodcastCreditsResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const normalizedPodcastId = podcastId.trim();
  const cacheKey = `${normalizedPodcastId}::${limit}`;
  const cached = getCached(podcastCreditsCache, cacheKey);
  if (cached) return cached;

  const response = await requestPodchaser<PodchaserPaginatedRaw<PodchaserPodcastCreditListRaw>>(
    `/podcasts/${encodeURIComponent(normalizedPodcastId)}/credits`,
    { per_page: String(limit), sort: "relevance", sort_direction: "desc" },
  );
  const credits = extractData(response)
    .map(normalizePodcastCreditListItem)
    .filter((credit) => Boolean(credit.creator.id));
  const value = {
    podcastId: normalizedPodcastId,
    credits,
    pagination: normalizePagination(response, 1, limit, credits.length),
  };
  setCached(podcastCreditsCache, cacheKey, value, APPEARANCE_CACHE_TTL_MS);
  return value;
}

export async function getPodchaserGuestAppearances(
  creatorId: string,
  max = 10,
): Promise<PodchaserGuestAppearancesResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const normalizedCreatorId = creatorId.trim();
  const cacheKey = `${normalizedCreatorId}::${limit}`;
  const cached = getCached(guestAppearanceCache, cacheKey);
  if (cached) return cached;

  const [episodeResponse, podcastResponse, hostedPodcastResponse] = await Promise.all([
    requestPodchaser<PodchaserPaginatedRaw<PodchaserEpisodeCreditRaw>>(
      `/creators/${encodeURIComponent(normalizedCreatorId)}/episodes`,
      { role: "guest", per_page: String(limit), sort: "air_date", sort_direction: "desc" },
    ),
    requestPodchaser<PodchaserPaginatedRaw<PodchaserPodcastCreditRaw>>(
      `/creators/${encodeURIComponent(normalizedCreatorId)}/podcasts`,
      { role: "guest", per_page: String(limit), sort: "date", sort_direction: "desc" },
    ),
    requestPodchaser<PodchaserPaginatedRaw<PodchaserPodcastCreditRaw>>(
      `/creators/${encodeURIComponent(normalizedCreatorId)}/podcasts`,
      { role: "host", per_page: "5", sort: "relevance", sort_direction: "desc" },
    ),
  ]);
  const hostedPodcasts = extractData(hostedPodcastResponse).map(normalizePodcastCredit);
  const primaryHostedPodcast = hostedPodcasts[0];
  if (primaryHostedPodcast?.podcastId) {
    const podcastId = encodeURIComponent(primaryHostedPodcast.podcastId);
    const [detailResult, socialsResult] = await Promise.allSettled([
      requestPodchaser<PodchaserPodcastRaw | PodchaserObjectEnvelope<PodchaserPodcastRaw>>(`/podcasts/${podcastId}`),
      requestPodchaser<PodchaserPodcastSocialsRaw | PodchaserObjectEnvelope<PodchaserPodcastSocialsRaw>>(`/podcasts/${podcastId}/socials`),
    ]);
    const detail = detailResult.status === "fulfilled" ? extractObject(detailResult.value) : null;
    const socials = socialsResult.status === "fulfilled" ? extractObject(socialsResult.value) : null;
    hostedPodcasts[0] = mergeHostedPodcast(primaryHostedPodcast, detail, socials);
  }

  const value = {
    creatorId: normalizedCreatorId,
    guestEpisodes: extractData(episodeResponse).map(normalizeEpisodeCredit),
    guestPodcasts: extractData(podcastResponse).map(normalizePodcastCredit),
    hostedPodcasts,
    pagination: {
      guestEpisodesTotal: numberOrZero(episodeResponse.pagination?.total_results),
      guestPodcastsTotal: numberOrZero(podcastResponse.pagination?.total_results),
      hostedPodcastsTotal: numberOrZero(hostedPodcastResponse.pagination?.total_results),
    },
  };
  setCached(guestAppearanceCache, cacheKey, value, APPEARANCE_CACHE_TTL_MS);
  return value;
}

export async function probePodchaserGuest(personQuery: string, max = 10): Promise<PodchaserGuestProbeResult> {
  const usageBefore = normalizeUsage(await requestPodchaser<PodchaserUsageRaw | PodchaserUsageEnvelope>("/usage"));
  const { creatorCandidates } = await searchPodchaserCreators(personQuery, max);
  const selectedCreator = selectCreator(personQuery, creatorCandidates);

  if (!selectedCreator) {
    const quota = normalizeUsage(await requestPodchaser<PodchaserUsageRaw | PodchaserUsageEnvelope>("/usage"));
    return {
      personQuery,
      identityConfidence: "not-found",
      creatorCandidates,
      selectedCreator: null,
      guestEpisodes: [],
      guestPodcasts: [],
      hostedPodcasts: [],
      pagination: { guestEpisodesTotal: 0, guestPodcastsTotal: 0, hostedPodcastsTotal: 0 },
      quota,
      requestsConsumed: Math.max(0, quota.used - usageBefore.used),
    };
  }

  const appearances = await getPodchaserGuestAppearances(selectedCreator.id, max);
  const quota = normalizeUsage(await requestPodchaser<PodchaserUsageRaw | PodchaserUsageEnvelope>("/usage"));

  return {
    personQuery,
    identityConfidence: classifyIdentityConfidence(personQuery, creatorCandidates, selectedCreator),
    creatorCandidates,
    selectedCreator,
    guestEpisodes: appearances.guestEpisodes,
    guestPodcasts: appearances.guestPodcasts,
    hostedPodcasts: appearances.hostedPodcasts,
    pagination: appearances.pagination,
    quota,
    requestsConsumed: Math.max(0, quota.used - usageBefore.used),
  };
}

// Turns a raw Podchaser path (+ query) into a short, stable label for
// podchaser_usage_log — this is what answers "what triggered these
// requests" without having to thread caller context through six exported
// functions and every one of their call sites in routes.ts.
function actionLabelFor(path: string, query: Record<string, string>): string {
  if (path === "/usage") return "usage_check";
  if (path === "/search/creators") return "creator_search";
  if (path === "/search/podcasts") return "podcast_search";
  if (/^\/podcasts\/[^/]+\/credits$/.test(path)) return "podcast_credits";
  if (/^\/podcasts\/[^/]+\/socials$/.test(path)) return "podcast_socials";
  if (/^\/podcasts\/[^/]+$/.test(path)) return "podcast_detail";
  if (/^\/creators\/[^/]+\/episodes$/.test(path)) return "guest_episodes";
  if (/^\/creators\/[^/]+\/podcasts$/.test(path)) return query.role === "host" ? "hosted_podcasts" : "guest_podcasts";
  if (/^\/creators\/[^/]+$/.test(path)) return "creator_detail";
  return "other";
}

async function requestPodchaser<T>(path: string, query: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.PODCHASER_API_KEY?.trim();
  if (!apiKey) throw new PodchaserError("NOT_CONFIGURED", "Podchaser is not configured.");

  const url = new URL(`${PODCHASER_API_BASE}${path}`);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "x-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new PodchaserError("PROVIDER_ERROR", `Could not reach Podchaser: ${message}`);
  }

  // The fetch above is the only place a real request against the
  // 1,000/month budget happens (every exported function above this line
  // checks its cache first) — log it here, once, regardless of outcome, so
  // podchaser_usage_log always matches what Podchaser actually billed us for.
  void logPodchaserUsage(actionLabelFor(path, query), path, query, response.status);

  if (response.status === 401) {
    throw new PodchaserError("AUTH_FAILED", "Podchaser rejected the configured API key.", response.status);
  }
  if (response.status === 403) {
    throw new PodchaserError("TIER_RESTRICTED", "The Podchaser account cannot access this Starter endpoint.", response.status);
  }
  if (response.status === 429) {
    throw new PodchaserError("RATE_LIMITED", "Podchaser rate or monthly request limit exceeded.", response.status);
  }
  if (!response.ok) {
    let providerMessage: string | null = null;
    try {
      const body = await response.json() as PodchaserErrorEnvelope;
      providerMessage = body.error?.message || body.message || null;
    } catch {
      providerMessage = null;
    }
    throw new PodchaserError(
      "PROVIDER_ERROR",
      providerMessage ? `Podchaser returned HTTP ${response.status}: ${providerMessage}` : `Podchaser returned HTTP ${response.status}.`,
      response.status,
    );
  }

  try {
    return await response.json() as T;
  } catch {
    throw new PodchaserError("PROVIDER_ERROR", "Podchaser returned an invalid JSON response.", response.status);
  }
}

function extractData<T>(response: T[] | PodchaserPaginatedRaw<T>): T[] {
  if (Array.isArray(response)) return response;
  return Array.isArray(response.data) ? response.data : [];
}

function extractObject<T>(response: T | PodchaserObjectEnvelope<T>): T {
  if (response && typeof response === "object" && "data" in response && response.data) return response.data;
  return response as T;
}

function selectCreator(query: string, candidates: PodchaserCreatorCandidate[]): PodchaserCreatorCandidate | null {
  const canonicalQuery = canonicalName(query);
  return candidates.find((candidate) => canonicalName(candidate.name) === canonicalQuery)
    ?? candidates.find((candidate) => canonicalName(candidate.name).includes(canonicalQuery))
    ?? candidates[0]
    ?? null;
}

function classifyIdentityConfidence(
  query: string,
  candidates: PodchaserCreatorCandidate[],
  selectedCreator: PodchaserCreatorCandidate,
): "exact" | "possible" {
  const canonicalQuery = canonicalName(query);
  const exactMatches = candidates.filter((candidate) => canonicalName(candidate.name) === canonicalQuery);
  return exactMatches.length === 1 && exactMatches[0]?.id === selectedCreator.id ? "exact" : "possible";
}

function normalizeCreator(raw: PodchaserCreatorRaw): PodchaserCreatorCandidate {
  return {
    id: String(raw.pcid ?? ""),
    name: stringOrNull(raw.name) ?? "Unknown creator",
    informalName: stringOrNull(raw.informalName),
    pronouns: stringOrNull(raw.pronouns),
    subtitle: stringOrNull(raw.subtitle),
    location: stringOrNull(raw.location),
    bio: stringOrNull(raw.bio),
    profileUrl: stringOrNull(raw.url),
    imageUrl: stringOrNull(raw.imageUrl),
    episodeAppearanceCount: typeof raw.episodeAppearanceCount === "number" ? raw.episodeAppearanceCount : null,
    followerCount: typeof raw.followerCount === "number" ? raw.followerCount : null,
    socialLinks: {
      twitter: stringOrNull(raw.socialLinks?.twitter),
      wikipedia: stringOrNull(raw.socialLinks?.wikipedia),
    },
    modifiedAt: podchaserDateToIso(raw.modifiedDate),
  };
}

function normalizePodcast(raw: PodchaserPodcastRaw): PodchaserPodcastCandidate {
  const explicit = raw.isExplicit ?? raw.explicit;
  return {
    id: String(raw.id ?? ""),
    title: stringOrNull(raw.title) ?? "Untitled podcast",
    description: stringOrNull(raw.description),
    imageUrl: stringOrNull(raw.imageUrl),
    language: stringOrNull(raw.language),
    webUrl: stringOrNull(raw.webUrl),
    rssUrl: stringOrNull(raw.rssUrl),
    numberOfEpisodes: typeof raw.numberOfEpisodes === "number" ? raw.numberOfEpisodes : null,
    avgEpisodeLength: typeof raw.avgEpisodeLength === "number" ? raw.avgEpisodeLength : null,
    daysBetweenEpisodes: finiteNumberOrNull(raw.daysBetweenEpisodes ?? raw.episodeFrequency),
    followerCount: typeof raw.followerCount === "number" ? raw.followerCount : null,
    ratingCount: typeof raw.ratingCount === "number" ? raw.ratingCount : null,
    ratingAverage: typeof raw.ratingAverage === "number" ? raw.ratingAverage : null,
    reviewCount: typeof raw.reviewCount === "number" ? raw.reviewCount : null,
    startDate: podchaserDateToIso(raw.startDate),
    latestEpisodeDate: podchaserDateToIso(raw.latestEpisodeDate),
    categories: (raw.categories ?? []).map((category) => ({
      title: stringOrNull(category.title) ?? "Other",
      slug: stringOrNull(category.slug) ?? "other",
    })),
    hasGuests: typeof raw.hasGuests === "boolean" ? raw.hasGuests : null,
    explicit: typeof explicit === "boolean" ? explicit : null,
    status: stringOrNull(raw.status),
    author: {
      name: stringOrNull(raw.author?.name),
      email: stringOrNull(raw.author?.email),
    },
    socialLinks: normalizePodcastSocialLinks(raw.socialLinks),
    socialFollowerCounts: {
      twitter: finiteNumberOrNull(raw.socialFollowerCounts?.twitter),
      facebook: finiteNumberOrNull(raw.socialFollowerCounts?.facebook),
      instagram: finiteNumberOrNull(raw.socialFollowerCounts?.instagram),
      youtube: finiteNumberOrNull(raw.socialFollowerCounts?.youtube),
      linkedin: finiteNumberOrNull(raw.socialFollowerCounts?.linkedin),
      tiktok: finiteNumberOrNull(raw.socialFollowerCounts?.tiktok),
      patreon: finiteNumberOrNull(raw.socialFollowerCounts?.patreon),
      twitch: finiteNumberOrNull(raw.socialFollowerCounts?.twitch),
    },
  };
}

function normalizePodcastCreditListItem(raw: PodchaserPodcastCreditListRaw): PodchaserPodcastCredit {
  const latestEpisodeId = raw.lastEpisode?.id == null ? null : String(raw.lastEpisode.id);
  return {
    creator: normalizeCreator(raw.creator ?? {}),
    roleCode: stringOrNull(raw.role?.code) ?? "contributor",
    roleTitle: stringOrNull(raw.role?.title) ?? "Contributor",
    episodeCount: numberOrZero(raw.episodeCount),
    latestEpisode: latestEpisodeId ? {
      id: latestEpisodeId,
      title: stringOrNull(raw.lastEpisode?.title) ?? "Untitled episode",
      airDate: podchaserDateToIso(raw.lastEpisode?.airDate),
    } : null,
  };
}

function normalizeEpisodeCredit(raw: PodchaserEpisodeCreditRaw): PodchaserGuestEpisode {
  return {
    creditId: raw.id == null ? null : String(raw.id),
    episodeId: String(raw.episode?.id ?? ""),
    episodeTitle: stringOrNull(raw.episode?.title) ?? "Untitled episode",
    airDate: podchaserDateToIso(raw.episode?.airDate),
    podcastId: String(raw.podcast?.id ?? ""),
    podcastTitle: stringOrNull(raw.podcast?.title) ?? "Untitled podcast",
    podcastImageUrl: stringOrNull(raw.podcast?.imageUrl),
    podcastRssUrl: stringOrNull(raw.podcast?.rssUrl),
    roleCode: stringOrNull(raw.role?.code) ?? "guest",
    roleTitle: stringOrNull(raw.role?.title) ?? "Guest",
    characters: (raw.characters ?? []).map((character) => stringOrNull(character.name)).filter((name): name is string => Boolean(name)),
  };
}

function normalizePodcastCredit(raw: PodchaserPodcastCreditRaw): PodchaserGuestPodcast {
  const latestEpisodeId = raw.lastEpisode?.id == null ? null : String(raw.lastEpisode.id);
  return {
    creditId: raw.id == null ? null : String(raw.id),
    podcastId: String(raw.podcast?.id ?? ""),
    podcastTitle: stringOrNull(raw.podcast?.title) ?? "Untitled podcast",
    podcastImageUrl: stringOrNull(raw.podcast?.imageUrl),
    webUrl: stringOrNull(raw.podcast?.webUrl),
    rssUrl: stringOrNull(raw.podcast?.rssUrl),
    socialLinks: normalizePodcastSocialLinks(raw.podcast?.socialLinks),
    roleCode: stringOrNull(raw.role?.code) ?? "guest",
    roleTitle: stringOrNull(raw.role?.title) ?? "Guest",
    episodeCount: numberOrZero(raw.episodeCount),
    numberOfEpisodes: finiteNumberOrNull(raw.podcast?.numberOfEpisodes),
    latestEpisodeDate: podchaserDateToIso(raw.podcast?.latestEpisodeDate ?? raw.lastEpisode?.airDate),
    status: stringOrNull(raw.podcast?.status),
    author: {
      name: stringOrNull(raw.podcast?.author?.name),
      email: stringOrNull(raw.podcast?.author?.email),
    },
    latestEpisode: latestEpisodeId ? {
      id: latestEpisodeId,
      title: stringOrNull(raw.lastEpisode?.title) ?? "Untitled episode",
      airDate: podchaserDateToIso(raw.lastEpisode?.airDate),
    } : null,
  };
}

function mergeHostedPodcast(
  podcast: PodchaserGuestPodcast,
  detail: PodchaserPodcastRaw | null,
  socials: PodchaserPodcastSocialsRaw | null,
): PodchaserGuestPodcast {
  const detailSocials = normalizePodcastSocialLinks(detail?.socialLinks);
  const endpointSocials = normalizePodcastSocialLinks(socials?.socialLinks);
  return {
    ...podcast,
    podcastTitle: stringOrNull(detail?.title) ?? podcast.podcastTitle,
    podcastImageUrl: stringOrNull(detail?.imageUrl) ?? podcast.podcastImageUrl,
    webUrl: stringOrNull(detail?.webUrl) ?? podcast.webUrl,
    rssUrl: stringOrNull(detail?.rssUrl) ?? podcast.rssUrl,
    socialLinks: Object.fromEntries(
      Object.keys(podcast.socialLinks).map((platform) => [
        platform,
        endpointSocials[platform as keyof PodchaserSocialLinksRaw]
          ?? detailSocials[platform as keyof PodchaserSocialLinksRaw]
          ?? podcast.socialLinks[platform as keyof PodchaserSocialLinksRaw],
      ]),
    ) as PodchaserGuestPodcast["socialLinks"],
    numberOfEpisodes: finiteNumberOrNull(detail?.numberOfEpisodes) ?? podcast.numberOfEpisodes,
    latestEpisodeDate: podchaserDateToIso(detail?.latestEpisodeDate) ?? podcast.latestEpisodeDate,
    status: stringOrNull(detail?.status) ?? podcast.status,
    author: {
      name: stringOrNull(detail?.author?.name) ?? podcast.author.name,
      email: stringOrNull(detail?.author?.email) ?? podcast.author.email,
    },
  };
}

function normalizePodcastSocialLinks(
  socialLinks?: PodchaserSocialLinksRaw,
): Record<keyof PodchaserSocialLinksRaw, string | null> {
  return {
    twitter: stringOrNull(socialLinks?.twitter),
    facebook: stringOrNull(socialLinks?.facebook),
    instagram: stringOrNull(socialLinks?.instagram),
    youtube: stringOrNull(socialLinks?.youtube),
    linkedin: stringOrNull(socialLinks?.linkedin),
    tiktok: stringOrNull(socialLinks?.tiktok),
    patreon: stringOrNull(socialLinks?.patreon),
    twitch: stringOrNull(socialLinks?.twitch),
  };
}

function normalizeUsage(response: PodchaserUsageRaw | PodchaserUsageEnvelope): PodchaserQuota {
  // Podchaser's OpenAPI describes a flat object, while some deployments return
  // the same object under `data`. Accept both without weakening the public shape.
  const raw: PodchaserUsageRaw = "data" in response && response.data && typeof response.data === "object"
    ? response.data
    : response as PodchaserUsageRaw;
  return {
    tier: stringOrNull(raw.tier) ?? "unknown",
    quota: typeof raw.quota === "number" ? raw.quota : null,
    used: numberOrZero(raw.used),
    remaining: typeof raw.remaining === "number" ? raw.remaining : null,
    cycleStart: podchaserDateToIso(raw.cycle_start),
    cycleEnd: podchaserDateToIso(raw.cycle_end),
  };
}

function canonicalName(value: string): string {
  const ignoredHonorifics = new Set(["dr", "doctor", "mr", "mrs", "ms", "prof", "professor", "phd", "md"]);
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !ignoredHonorifics.has(token))
    .join("");
}

function creatorSearchQuery(
  query: string,
  limit: number,
  page: number,
  sort: PodchaserCreatorSort,
): Record<string, string> {
  return {
    q: query,
    page: String(page),
    per_page: String(limit),
    sort,
    sort_direction: sort === "alphabetical" ? "asc" : "desc",
  };
}

function normalizePagination<T>(
  response: T[] | PodchaserPaginatedRaw<T>,
  requestedPage: number,
  requestedPerPage: number,
  fallbackCount: number,
): PodchaserSearchPagination {
  if (Array.isArray(response)) {
    return { page: requestedPage, perPage: requestedPerPage, totalResults: fallbackCount, totalPages: 1, hasMore: false };
  }
  const totalResults = numberOrZero(response.pagination?.total_results) || fallbackCount;
  const perPage = numberOrZero(response.pagination?.per_page) || requestedPerPage;
  const totalPages = numberOrZero(response.pagination?.total_pages) || Math.max(1, Math.ceil(totalResults / perPage));
  return {
    page: numberOrZero(response.pagination?.page) || requestedPage,
    perPage,
    totalResults,
    totalPages,
    hasMore: response.pagination?.has_more ?? requestedPage < totalPages,
  };
}

function fallbackSearchTerm(query: string): string | null {
  const tokens = query
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["the", "show", "podcast", "with"].includes(token.toLowerCase()));
  if (tokens.length < 2) return null;
  return [...tokens].sort((left, right) => left.length - right.length)[0] ?? null;
}

function rankCreatorSuggestions(query: string, candidates: PodchaserCreatorCandidate[]): PodchaserCreatorCandidate[] {
  return [...candidates].sort((left, right) => suggestionDistance(query, left.name) - suggestionDistance(query, right.name));
}

function rankPodcastSuggestions(query: string, candidates: PodchaserPodcastCandidate[]): PodchaserPodcastCandidate[] {
  return [...candidates].sort((left, right) => suggestionDistance(query, left.title) - suggestionDistance(query, right.title));
}

function suggestionDistance(query: string, candidate: string): number {
  const left = canonicalName(query);
  const right = canonicalName(candidate);
  if (!left || !right) return Number.MAX_SAFE_INTEGER;
  if (right.includes(left) || left.includes(right)) return Math.abs(right.length - left.length);
  return levenshtein(left, right);
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? left.length;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function finiteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractRestrictedFields<T>(response: T[] | PodchaserPaginatedRaw<T>): string[] {
  return Array.isArray(response) ? [] : response.restricted_fields ?? [];
}

function podchaserDateToIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.includes("T") ? value : `${value.trim().replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString();
}

function getCached<T>(cache: Map<string, { expiresAt: number; value: T }>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached<T>(
  cache: Map<string, { expiresAt: number; value: T }>,
  key: string,
  value: T,
  ttlMs: number,
): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
}
