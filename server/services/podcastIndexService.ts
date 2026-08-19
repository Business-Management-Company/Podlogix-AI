import crypto from "crypto";

const PODCAST_INDEX_API_BASE = "https://api.podcastindex.org/api/1.0";
const PODCAST_INDEX_USER_AGENT = "Podlogix/1.0 (+https://podlogix.io)";

type PodcastIndexAuthMode = "legacy-key-secret";

interface PodcastIndexEnvelope {
  status?: boolean | string;
  description?: string;
}

interface PodcastIndexFeedRaw {
  id?: number | string;
  podcastGuid?: string;
  title?: string;
  url?: string;
  originalUrl?: string;
  link?: string;
  description?: string;
  author?: string;
  ownerName?: string;
  image?: string;
  artwork?: string;
  itunesId?: number | string;
  language?: string;
  explicit?: boolean | number;
  medium?: string;
  dead?: boolean | number;
  episodeCount?: number;
  categories?: Record<string, string> | string[];
  newestItemPubdate?: number;
  newestItemPublishTime?: number;
  trendScore?: number;
}

interface PodcastIndexTranscriptRaw {
  url?: string;
  type?: string;
}

interface PodcastIndexPersonRaw {
  id?: number | string;
  name?: string;
  role?: string;
  group?: string;
  href?: string;
  img?: string;
}

interface PodcastIndexSocialRaw {
  uri?: string;
  protocol?: string;
  accountId?: string;
  accountUrl?: string;
}

interface PodcastIndexEpisodeRaw {
  id?: number | string;
  title?: string;
  link?: string;
  description?: string;
  guid?: string;
  datePublished?: number;
  enclosureUrl?: string;
  enclosureType?: string;
  enclosureLength?: number;
  duration?: number;
  explicit?: boolean | number;
  episode?: number;
  episodeType?: string;
  season?: number;
  image?: string;
  feedId?: number | string;
  feedUrl?: string;
  feedTitle?: string;
  feedAuthor?: string;
  feedLanguage?: string;
  chaptersUrl?: string;
  transcriptUrl?: string;
  transcripts?: PodcastIndexTranscriptRaw[];
  persons?: PodcastIndexPersonRaw[];
  socialInteract?: PodcastIndexSocialRaw[];
  soundbites?: unknown[];
  value?: unknown;
}

interface PodcastSearchResponse extends PodcastIndexEnvelope {
  feeds?: PodcastIndexFeedRaw[];
  count?: number;
}

interface PodcastEpisodesResponse extends PodcastIndexEnvelope {
  items?: PodcastIndexEpisodeRaw[];
  count?: number;
}

interface PodcastTrendingResponse extends PodcastIndexEnvelope {
  feeds?: PodcastIndexFeedRaw[];
  count?: number;
}

interface PodcastCategoriesResponse extends PodcastIndexEnvelope {
  feeds?: Array<{ id?: number; name?: string }>;
  count?: number;
}

export interface PodcastIndexPodcastSummary {
  id: string;
  podcastGuid: string | null;
  title: string;
  description: string | null;
  author: string | null;
  ownerName: string | null;
  feedUrl: string | null;
  websiteUrl: string | null;
  artworkUrl: string | null;
  itunesId: string | null;
  language: string | null;
  medium: string | null;
  explicit: boolean;
  dead: boolean;
  episodeCount: number | null;
  categories: string[];
  newestEpisodeAt: string | null;
  trendScore: number | null;
}

export interface PodcastIndexEpisodeSummary {
  id: string;
  feedId: string | null;
  feedTitle: string | null;
  feedAuthor: string | null;
  title: string;
  description: string | null;
  guid: string | null;
  publishedAt: string | null;
  audioUrl: string | null;
  audioType: string | null;
  audioBytes: number | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  episodeType: string | null;
  artworkUrl: string | null;
  chaptersUrl: string | null;
  transcripts: Array<{ url: string; type: string | null }>;
  people: Array<{ name: string; role: string | null; group: string | null; href: string | null; imageUrl: string | null }>;
  socialLinks: Array<{ url: string; protocol: string | null; accountId: string | null; accountUrl: string | null }>;
  hasSoundbites: boolean;
  hasValueBlock: boolean;
}

export interface PodcastIndexProbeResult {
  authMode: PodcastIndexAuthMode;
  query: string;
  personQuery: string;
  podcasts: PodcastIndexPodcastSummary[];
  sampleEpisodes: PodcastIndexEpisodeSummary[];
  personAppearances: PodcastIndexEpisodeSummary[];
  trending: PodcastIndexPodcastSummary[];
  categories: Array<{ id: number | null; name: string }>;
  coverage: {
    podcastsWithOwnerName: number;
    podcastsWithWebsite: number;
    episodesWithTranscripts: number;
    episodesWithChapters: number;
    episodesWithPeople: number;
    episodesWithSocialLinks: number;
    episodesWithAudio: number;
  };
}

export class PodcastIndexError extends Error {
  readonly httpStatus: number | null;
  readonly code: "NOT_CONFIGURED" | "AUTH_FAILED" | "RATE_LIMITED" | "PROVIDER_ERROR";

  constructor(
    code: PodcastIndexError["code"],
    message: string,
    httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "PodcastIndexError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isPodcastIndexConfigured(): boolean {
  return Boolean(
    process.env.PODCAST_INDEX_API_KEY?.trim()
      && process.env.PODCAST_INDEX_API_SECRET?.trim(),
  );
}

export function getPodcastIndexAuthMode(): PodcastIndexAuthMode {
  return "legacy-key-secret";
}

export async function searchPodcastIndexPersonAppearances(
  personQuery: string,
  max = 10,
): Promise<PodcastIndexEpisodeSummary[]> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 25);
  const response = await requestPodcastIndex<PodcastEpisodesResponse>("/search/byperson", {
    q: personQuery,
    max: String(limit),
  });
  return (response.items ?? []).map(normalizeEpisode);
}

export async function probePodcastIndex(
  query: string,
  personQuery: string,
  max = 5,
): Promise<PodcastIndexProbeResult> {
  const limit = Math.min(Math.max(Math.trunc(max), 1), 10);
  const search = await requestPodcastIndex<PodcastSearchResponse>("/search/byterm", {
    q: query,
    max: String(limit),
  });
  const podcasts = (search.feeds ?? []).map(normalizePodcast);
  const firstFeedId = podcasts[0]?.id;

  const [episodesResult, personAppearances, trendingResult, categoriesResult] = await Promise.all([
    firstFeedId
      ? requestPodcastIndex<PodcastEpisodesResponse>("/episodes/byfeedid", { id: firstFeedId, max: String(limit) })
      : Promise.resolve<PodcastEpisodesResponse>({ items: [] }),
    searchPodcastIndexPersonAppearances(personQuery, limit),
    requestPodcastIndex<PodcastTrendingResponse>("/podcasts/trending", { max: String(limit) }),
    requestPodcastIndex<PodcastCategoriesResponse>("/categories/list"),
  ]);

  const sampleEpisodes = (episodesResult.items ?? []).map(normalizeEpisode);
  const inspectedEpisodes = [...sampleEpisodes, ...personAppearances];

  return {
    authMode: getPodcastIndexAuthMode(),
    query,
    personQuery,
    podcasts,
    sampleEpisodes,
    personAppearances,
    trending: (trendingResult.feeds ?? []).map(normalizePodcast),
    categories: (categoriesResult.feeds ?? [])
      .filter((category) => typeof category.name === "string" && category.name.trim().length > 0)
      .map((category) => ({ id: typeof category.id === "number" ? category.id : null, name: category.name!.trim() })),
    coverage: {
      podcastsWithOwnerName: podcasts.filter((podcast) => Boolean(podcast.ownerName)).length,
      podcastsWithWebsite: podcasts.filter((podcast) => Boolean(podcast.websiteUrl)).length,
      episodesWithTranscripts: inspectedEpisodes.filter((episode) => episode.transcripts.length > 0).length,
      episodesWithChapters: inspectedEpisodes.filter((episode) => Boolean(episode.chaptersUrl)).length,
      episodesWithPeople: inspectedEpisodes.filter((episode) => episode.people.length > 0).length,
      episodesWithSocialLinks: inspectedEpisodes.filter((episode) => episode.socialLinks.length > 0).length,
      episodesWithAudio: inspectedEpisodes.filter((episode) => Boolean(episode.audioUrl)).length,
    },
  };
}

async function requestPodcastIndex<T extends PodcastIndexEnvelope>(
  path: string,
  query: Record<string, string> = {},
): Promise<T> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY?.trim();
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new PodcastIndexError(
      "NOT_CONFIGURED",
      "Podcast Index API v1 requires both an API key and an API secret.",
    );
  }

  const url = new URL(`${PODCAST_INDEX_API_BASE}${path}`);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: buildAuthHeaders(apiKey, apiSecret),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new PodcastIndexError("PROVIDER_ERROR", `Could not reach Podcast Index: ${message}`);
  }

  if (response.status === 401 || response.status === 403) {
    const mode = getPodcastIndexAuthMode();
    throw new PodcastIndexError(
      "AUTH_FAILED",
      `Podcast Index rejected the configured ${mode} credential (HTTP ${response.status}).`,
      response.status,
    );
  }
  if (response.status === 429) {
    throw new PodcastIndexError("RATE_LIMITED", "Podcast Index rate limit exceeded.", response.status);
  }
  if (!response.ok) {
    throw new PodcastIndexError("PROVIDER_ERROR", `Podcast Index returned HTTP ${response.status}.`, response.status);
  }

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new PodcastIndexError("PROVIDER_ERROR", "Podcast Index returned an invalid JSON response.", response.status);
  }

  if (data.status === false || data.status === "false") {
    throw new PodcastIndexError("PROVIDER_ERROR", data.description || "Podcast Index reported a failed request.", response.status);
  }
  return data;
}

function buildAuthHeaders(apiKey: string, apiSecret: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const authorization = crypto.createHash("sha1").update(`${apiKey}${apiSecret}${timestamp}`).digest("hex");
  return {
    Accept: "application/json",
    Authorization: authorization,
    "X-Auth-Date": timestamp,
    "X-Auth-Key": apiKey,
    "User-Agent": PODCAST_INDEX_USER_AGENT,
  };
}

function normalizePodcast(raw: PodcastIndexFeedRaw): PodcastIndexPodcastSummary {
  const newest = raw.newestItemPubdate ?? raw.newestItemPublishTime;
  return {
    id: String(raw.id ?? ""),
    podcastGuid: stringOrNull(raw.podcastGuid),
    title: raw.title?.trim() || "Untitled podcast",
    description: stringOrNull(raw.description),
    author: stringOrNull(raw.author),
    ownerName: stringOrNull(raw.ownerName),
    feedUrl: stringOrNull(raw.url ?? raw.originalUrl),
    websiteUrl: stringOrNull(raw.link),
    artworkUrl: stringOrNull(raw.artwork ?? raw.image),
    itunesId: raw.itunesId == null ? null : String(raw.itunesId),
    language: stringOrNull(raw.language),
    medium: stringOrNull(raw.medium),
    explicit: raw.explicit === true || raw.explicit === 1,
    dead: raw.dead === true || raw.dead === 1,
    episodeCount: typeof raw.episodeCount === "number" ? raw.episodeCount : null,
    categories: normalizeCategories(raw.categories),
    newestEpisodeAt: epochToIso(newest),
    trendScore: typeof raw.trendScore === "number" ? raw.trendScore : null,
  };
}

function normalizeEpisode(raw: PodcastIndexEpisodeRaw): PodcastIndexEpisodeSummary {
  const transcripts = Array.isArray(raw.transcripts) ? raw.transcripts : [];
  const fallbackTranscript = stringOrNull(raw.transcriptUrl);
  const normalizedTranscripts = transcripts
    .filter((transcript) => typeof transcript.url === "string" && transcript.url.trim().length > 0)
    .map((transcript) => ({ url: transcript.url!.trim(), type: stringOrNull(transcript.type) }));
  if (fallbackTranscript && !normalizedTranscripts.some((transcript) => transcript.url === fallbackTranscript)) {
    normalizedTranscripts.push({ url: fallbackTranscript, type: null });
  }

  return {
    id: String(raw.id ?? ""),
    feedId: raw.feedId == null ? null : String(raw.feedId),
    feedTitle: stringOrNull(raw.feedTitle),
    feedAuthor: stringOrNull(raw.feedAuthor),
    title: raw.title?.trim() || "Untitled episode",
    description: stringOrNull(raw.description),
    guid: stringOrNull(raw.guid),
    publishedAt: epochToIso(raw.datePublished),
    audioUrl: stringOrNull(raw.enclosureUrl),
    audioType: stringOrNull(raw.enclosureType),
    audioBytes: typeof raw.enclosureLength === "number" ? raw.enclosureLength : null,
    durationSeconds: typeof raw.duration === "number" ? raw.duration : null,
    episodeNumber: typeof raw.episode === "number" ? raw.episode : null,
    seasonNumber: typeof raw.season === "number" ? raw.season : null,
    episodeType: stringOrNull(raw.episodeType),
    artworkUrl: stringOrNull(raw.image),
    chaptersUrl: stringOrNull(raw.chaptersUrl),
    transcripts: normalizedTranscripts,
    people: (Array.isArray(raw.persons) ? raw.persons : [])
      .filter((person) => typeof person.name === "string" && person.name.trim().length > 0)
      .map((person) => ({
        name: person.name!.trim(),
        role: stringOrNull(person.role),
        group: stringOrNull(person.group),
        href: stringOrNull(person.href),
        imageUrl: stringOrNull(person.img),
      })),
    socialLinks: (Array.isArray(raw.socialInteract) ? raw.socialInteract : [])
      .filter((social) => typeof social.uri === "string" && social.uri.trim().length > 0)
      .map((social) => ({
        url: social.uri!.trim(),
        protocol: stringOrNull(social.protocol),
        accountId: stringOrNull(social.accountId),
        accountUrl: stringOrNull(social.accountUrl),
      })),
    hasSoundbites: Array.isArray(raw.soundbites) && raw.soundbites.length > 0,
    hasValueBlock: raw.value != null,
  };
}

function normalizeCategories(categories: PodcastIndexFeedRaw["categories"]): string[] {
  if (Array.isArray(categories)) return categories.filter((category) => typeof category === "string" && category.trim()).map((category) => category.trim());
  if (!categories || typeof categories !== "object") return [];
  return Object.values(categories).filter((category) => typeof category === "string" && category.trim()).map((category) => category.trim());
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function epochToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}
