import { useQuery } from "@tanstack/react-query";

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
  expectedGuestEpisodes: number;
  playbackAvailable: boolean;
  message: string | null;
  episodes: GuestPlayableEpisode[];
}

async function fetchGuestPodcastPlayback(
  creatorId: string,
  podcastId: string,
  guestName: string,
): Promise<GuestPodcastPlaybackResult> {
  const search = new URLSearchParams({ guestName });
  const response = await fetch(
    `/api/guest-discovery/creators/${encodeURIComponent(creatorId)}/podcasts/${encodeURIComponent(podcastId)}/playback?${search}`,
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Episode playback is unavailable");
  return body as GuestPodcastPlaybackResult;
}

export function useGuestPodcastPlayback(
  creatorId: string,
  podcastId: string,
  guestName: string,
  enabled: boolean,
) {
  return useQuery<GuestPodcastPlaybackResult>({
    queryKey: ["/api/guest-discovery/creators", creatorId, "podcasts", podcastId, "playback", guestName],
    queryFn: () => fetchGuestPodcastPlayback(creatorId, podcastId, guestName),
    enabled: enabled && Boolean(creatorId) && Boolean(podcastId) && Boolean(guestName),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
