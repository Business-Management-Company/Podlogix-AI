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
  title?: string;
  imageUrl?: string;
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

interface PodchaserUsageRaw {
  tier?: string;
  quota?: number | null;
  used?: number;
  remaining?: number | null;
  cycle_start?: string;
  cycle_end?: string;
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
  roleCode: string;
  roleTitle: string;
  characters: string[];
}

export interface PodchaserGuestPodcast {
  creditId: string | null;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  roleCode: string;
  roleTitle: string;
  episodeCount: number;
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
  pagination: {
    guestEpisodesTotal: number;
    guestPodcastsTotal: number;
  };
  quota: PodchaserQuota;
  requestsConsumed: number;
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

export async function probePodchaserGuest(personQuery: string, max = 10): Promise<PodchaserGuestProbeResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const usageBefore = normalizeUsage(await requestPodchaser<PodchaserUsageRaw>("/usage"));
  const creatorResponse = await requestPodchaser<PodchaserCreatorRaw[] | PodchaserPaginatedRaw<PodchaserCreatorRaw>>(
    "/search/creators",
    {
      q: personQuery,
      per_page: String(limit),
      sort: "appearance_count",
      sort_direction: "desc",
    },
  );
  const creatorCandidates = extractData(creatorResponse).map(normalizeCreator);
  const selectedCreator = selectCreator(personQuery, creatorCandidates);

  if (!selectedCreator) {
    const quota = normalizeUsage(await requestPodchaser<PodchaserUsageRaw>("/usage"));
    return {
      personQuery,
      identityConfidence: "not-found",
      creatorCandidates,
      selectedCreator: null,
      guestEpisodes: [],
      guestPodcasts: [],
      pagination: { guestEpisodesTotal: 0, guestPodcastsTotal: 0 },
      quota,
      requestsConsumed: Math.max(0, quota.used - usageBefore.used),
    };
  }

  const [episodeResponse, podcastResponse] = await Promise.all([
    requestPodchaser<PodchaserPaginatedRaw<PodchaserEpisodeCreditRaw>>(
      `/creators/${encodeURIComponent(selectedCreator.id)}/episodes`,
      { role: "guest", per_page: String(limit), sort: "air_date", sort_direction: "desc" },
    ),
    requestPodchaser<PodchaserPaginatedRaw<PodchaserPodcastCreditRaw>>(
      `/creators/${encodeURIComponent(selectedCreator.id)}/podcasts`,
      { role: "guest", per_page: String(limit), sort: "date", sort_direction: "desc" },
    ),
  ]);
  const quota = normalizeUsage(await requestPodchaser<PodchaserUsageRaw>("/usage"));

  return {
    personQuery,
    identityConfidence: canonicalName(selectedCreator.name) === canonicalName(personQuery) ? "exact" : "possible",
    creatorCandidates,
    selectedCreator,
    guestEpisodes: extractData(episodeResponse).map(normalizeEpisodeCredit),
    guestPodcasts: extractData(podcastResponse).map(normalizePodcastCredit),
    pagination: {
      guestEpisodesTotal: numberOrZero(episodeResponse.pagination?.total_results),
      guestPodcastsTotal: numberOrZero(podcastResponse.pagination?.total_results),
    },
    quota,
    requestsConsumed: Math.max(0, quota.used - usageBefore.used),
  };
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

function selectCreator(query: string, candidates: PodchaserCreatorCandidate[]): PodchaserCreatorCandidate | null {
  const canonicalQuery = canonicalName(query);
  return candidates.find((candidate) => canonicalName(candidate.name) === canonicalQuery)
    ?? candidates.find((candidate) => canonicalName(candidate.name).includes(canonicalQuery))
    ?? candidates[0]
    ?? null;
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
    modifiedAt: podchaserDateToIso(raw.modifiedDate),
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
    roleCode: stringOrNull(raw.role?.code) ?? "guest",
    roleTitle: stringOrNull(raw.role?.title) ?? "Guest",
    episodeCount: numberOrZero(raw.episodeCount),
    latestEpisode: latestEpisodeId ? {
      id: latestEpisodeId,
      title: stringOrNull(raw.lastEpisode?.title) ?? "Untitled episode",
      airDate: podchaserDateToIso(raw.lastEpisode?.airDate),
    } : null,
  };
}

function normalizeUsage(raw: PodchaserUsageRaw): PodchaserQuota {
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
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function podchaserDateToIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.includes("T") ? value : `${value.trim().replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString();
}
