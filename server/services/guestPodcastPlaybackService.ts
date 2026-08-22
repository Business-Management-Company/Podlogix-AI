import {
  getPodchaserGuestAppearances,
  type PodchaserCreatorCandidate,
  type PodchaserGuestEpisode,
} from "./podchaserGuestService";
import {
  parseFeed,
  searchRssFeedByName,
  type RssEpisode,
} from "./rssService";

export interface GuestPlayableEpisode {
  id: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  imageUrl: string | null;
  mediaUrl: string;
  mimeType: string | null;
  mediaKind: "audio" | "video";
  matchType: "verified-credit" | "rss-name-match";
}

export interface GuestPodcastPlaybackResult {
  creatorId: string;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  feedTitle: string | null;
  feedUrl: string | null;
  expectedGuestEpisodes: number;
  playbackAvailable: boolean;
  message: string | null;
  episodes: GuestPlayableEpisode[];
}

export async function getGuestPodcastPlayback(
  creatorId: string,
  podcastId: string,
  guestName: string,
  userId?: string,
): Promise<GuestPodcastPlaybackResult> {
  const creator = { name: guestName, informalName: null };
  const appearances = await getPodchaserGuestAppearances(creatorId, 10, userId);
  const podcast = appearances.guestPodcasts.find((item) => item.podcastId === podcastId);
  const verifiedEpisodes = appearances.guestEpisodes.filter((episode) => episode.podcastId === podcastId);
  const podcastTitle = podcast?.podcastTitle ?? verifiedEpisodes[0]?.podcastTitle ?? "Unknown podcast";
  const podcastImageUrl = podcast?.podcastImageUrl ?? verifiedEpisodes[0]?.podcastImageUrl ?? null;
  const expectedGuestEpisodes = podcast?.episodeCount ?? verifiedEpisodes.length;
  const feedUrl = podcast?.rssUrl
    ?? verifiedEpisodes.find((episode) => episode.podcastRssUrl)?.podcastRssUrl
    ?? await searchRssFeedByName(podcastTitle);

  if (!feedUrl) {
    return unavailableResult({
      creatorId,
      podcastId,
      podcastTitle,
      podcastImageUrl,
      expectedGuestEpisodes,
      message: "The publisher does not expose a usable RSS feed for this show.",
    });
  }

  try {
    const feed = await parseFeed(feedUrl);
    const episodes = matchGuestEpisodesToRss(
      creator,
      verifiedEpisodes,
      feed.episodes,
      Math.min(Math.max(expectedGuestEpisodes, verifiedEpisodes.length, 1), 25),
    );
    return {
      creatorId,
      podcastId,
      podcastTitle,
      podcastImageUrl,
      feedTitle: feed.title,
      feedUrl,
      expectedGuestEpisodes,
      playbackAvailable: episodes.length > 0,
      message: episodes.length > 0
        ? null
        : "No playable publisher RSS enclosure could be matched to this guest's verified appearances.",
      episodes,
    };
  } catch {
    return unavailableResult({
      creatorId,
      podcastId,
      podcastTitle,
      podcastImageUrl,
      expectedGuestEpisodes,
      feedUrl,
      message: "The publisher's RSS feed could not be read right now.",
    });
  }
}

export function matchGuestEpisodesToRss(
  creator: Pick<PodchaserCreatorCandidate, "name" | "informalName">,
  verifiedEpisodes: PodchaserGuestEpisode[],
  rssEpisodes: RssEpisode[],
  limit = 10,
): GuestPlayableEpisode[] {
  const unmatchedCredits = [...verifiedEpisodes];
  const nameVariants = creatorNameVariants(creator);
  const matches: GuestPlayableEpisode[] = [];

  for (const episode of rssEpisodes) {
    if (!episode.mediaUrl || !episode.mediaKind) continue;
    const creditIndex = bestCreditMatchIndex(episode, unmatchedCredits);
    const isVerified = creditIndex >= 0;
    const searchableText = normalizeWords(`${episode.title} ${episode.description}`);
    if (!isVerified && !nameVariants.some((variant) => searchableText.includes(variant))) continue;

    if (isVerified) unmatchedCredits.splice(creditIndex, 1);
    matches.push({
      id: episode.guid || episode.mediaUrl,
      title: episode.title,
      description: episode.description.trim() || null,
      publishedAt: validDateToIso(episode.publishedAt),
      durationSeconds: episode.duration,
      imageUrl: episode.imageUrl,
      mediaUrl: episode.mediaUrl,
      mimeType: episode.mimeType,
      mediaKind: episode.mediaKind,
      matchType: isVerified ? "verified-credit" : "rss-name-match",
    });
    if (matches.length >= limit) break;
  }

  return matches.sort((left, right) => (right.publishedAt ?? "").localeCompare(left.publishedAt ?? ""));
}

function bestCreditMatchIndex(rssEpisode: RssEpisode, credits: PodchaserGuestEpisode[]): number {
  const rssTitle = normalizeWords(rssEpisode.title);
  let bestIndex = -1;
  let bestScore = 0;
  for (let index = 0; index < credits.length; index += 1) {
    const credit = credits[index];
    const creditTitle = normalizeWords(credit.episodeTitle);
    const titleScore = wordSimilarity(rssTitle, creditTitle);
    const datesClose = datesWithinDays(rssEpisode.publishedAt, credit.airDate, 3);
    const score = titleScore + (datesClose ? 0.2 : 0);
    if ((titleScore >= 0.82 || (titleScore >= 0.58 && datesClose)) && score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return bestIndex;
}

function wordSimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftWords = new Set(left.split(" "));
  const rightWords = new Set(right.split(" "));
  let overlap = 0;
  for (const word of leftWords) if (rightWords.has(word)) overlap += 1;
  return overlap / Math.max(leftWords.size, rightWords.size);
}

function datesWithinDays(left: Date | null, right: string | null, days: number): boolean {
  if (!left || !right) return false;
  const rightDate = new Date(right);
  if (Number.isNaN(left.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return Math.abs(left.getTime() - rightDate.getTime()) <= days * 24 * 60 * 60 * 1000;
}

function creatorNameVariants(creator: Pick<PodchaserCreatorCandidate, "name" | "informalName">): string[] {
  const variants = [creator.name, creator.informalName]
    .filter((value): value is string => Boolean(value))
    .map(normalizeWords)
    .filter((value) => value.length >= 5);
  const fullNameWords = normalizeWords(creator.name).split(" ").filter(Boolean);
  const surname = fullNameWords.at(-1);
  if (surname && surname.length >= 6) variants.push(surname);
  return [...new Set(variants)];
}

function normalizeWords(value: string): string {
  const ignored = new Set(["dr", "doctor", "mr", "mrs", "ms", "prof", "professor", "phd", "md"]);
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word && !ignored.has(word))
    .join(" ");
}

function validDateToIso(value: Date | null): string | null {
  return value && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

function unavailableResult(input: {
  creatorId: string;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  expectedGuestEpisodes: number;
  message: string;
  feedUrl?: string | null;
}): GuestPodcastPlaybackResult {
  return {
    creatorId: input.creatorId,
    podcastId: input.podcastId,
    podcastTitle: input.podcastTitle,
    podcastImageUrl: input.podcastImageUrl,
    feedTitle: null,
    feedUrl: input.feedUrl ?? null,
    expectedGuestEpisodes: input.expectedGuestEpisodes,
    playbackAvailable: false,
    message: input.message,
    episodes: [],
  };
}
