import { useId, useState } from "react";
import { ChevronDown, Loader2, Mic2, PlayCircle, Video } from "lucide-react";
import { Card, CardRow, SectionHeader } from "@/components/kit";
import { useGuestPodcastPlayback } from "@/hooks/use-guest-podcast-playback";
import type { GuestPlayableEpisode } from "@/hooks/use-guest-podcast-playback";

export interface GuestEpisodeAppearance {
  creditId: string | null;
  episodeId: string;
  episodeTitle: string;
  airDate: string | null;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
}

export interface GuestPodcastAppearance {
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  webUrl?: string | null;
  socialLinks?: Record<string, string | null | undefined>;
  episodeCount: number;
}

export interface GuestAppearanceResult {
  creatorId: string;
  guestEpisodes: GuestEpisodeAppearance[];
  guestPodcasts: GuestPodcastAppearance[];
  hostedPodcasts: GuestPodcastAppearance[];
  pagination: {
    guestEpisodesTotal: number;
    guestPodcastsTotal: number;
    hostedPodcastsTotal: number;
  };
}

interface GuestAppearanceHistoryProps {
  guestName: string;
  appearances?: GuestAppearanceResult;
  isLoading: boolean;
  error: Error | null;
}

function formatCount(value: number | null | undefined): string {
  const number = value ?? 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(value: number | null): string | null {
  if (!value || value <= 0) return null;
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function PlayableEpisode({ episode }: { episode: GuestPlayableEpisode }) {
  const details = [formatDate(episode.publishedAt), formatDuration(episode.durationSeconds)].filter(Boolean).join(" · ");
  return (
    <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          {episode.mediaKind === "video" ? <Video className="h-4 w-4 text-zinc-600" /> : <PlayCircle className="h-4 w-4 text-zinc-600" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-zinc-950">{episode.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{details}</p>
        </div>
      </div>
      {episode.mediaKind === "video" ? (
        <video controls playsInline preload="metadata" className="w-full rounded-lg bg-black" aria-label={`Play ${episode.title}`}>
          <source src={episode.mediaUrl} type={episode.mimeType ?? undefined} />
        </video>
      ) : (
        <audio controls preload="none" className="w-full" aria-label={`Play ${episode.title}`}>
          <source src={episode.mediaUrl} type={episode.mimeType ?? undefined} />
        </audio>
      )}
    </article>
  );
}

function PodcastHistoryRow({ creatorId, guestName, podcast }: { creatorId: string; guestName: string; podcast: GuestPodcastAppearance }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const playback = useGuestPodcastPlayback(creatorId, podcast.podcastId, guestName, isOpen);

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((value) => !value)}
      >
        {podcast.podcastImageUrl ? (
          <img src={podcast.podcastImageUrl} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
            <Mic2 size={15} className="text-zinc-400" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-950">{podcast.podcastTitle}</p>
          <p className="text-xs text-zinc-500">
            {podcast.episodeCount} guest episode{podcast.episodeCount === 1 ? "" : "s"} · Listen here
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div id={contentId} className="space-y-3 border-t border-zinc-100 bg-zinc-50/70 px-4 py-4">
          <p className="text-xs text-zinc-500">Publisher RSS media · playback stays inside Podlogix</p>
          {playback.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading playable episodes…</p>
          ) : playback.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{playback.error.message}</p>
          ) : playback.data?.playbackAvailable ? (
            <>
              {playback.data.episodes.map((episode) => <PlayableEpisode key={episode.id} episode={episode} />)}
              {playback.data.episodes.length < playback.data.expectedGuestEpisodes ? (
                <p className="text-xs leading-5 text-zinc-500">
                  {playback.data.episodes.length} of {playback.data.expectedGuestEpisodes} credited episode{playback.data.expectedGuestEpisodes === 1 ? "" : "s"} currently have a matching playable RSS enclosure.
                </p>
              ) : null}
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
              {playback.data?.message ?? "No playable RSS episode is available for this show."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function GuestAppearanceHistory({ guestName, appearances, isLoading, error }: GuestAppearanceHistoryProps) {
  const repeatPodcastCount = appearances?.guestPodcasts.filter((podcast) => podcast.episodeCount > 1).length ?? 0;
  const latestGuestEpisode = appearances?.guestEpisodes
    .filter((episode) => Boolean(episode.airDate))
    .reduce<GuestEpisodeAppearance | null>((latest, episode) => {
      if (!latest?.airDate) return episode;
      return new Date(episode.airDate!).getTime() > new Date(latest.airDate).getTime() ? episode : latest;
    }, null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-2xl font-semibold text-zinc-950">
            {isLoading ? "—" : formatCount(appearances?.pagination.guestEpisodesTotal)}
          </p>
          <p className="text-xs text-zinc-500">Guest episodes</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-2xl font-semibold text-zinc-950">
            {isLoading ? "—" : formatCount(appearances?.pagination.guestPodcastsTotal)}
          </p>
          <p className="text-xs text-zinc-500">Podcasts appeared on</p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      ) : isLoading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading guest history…
        </p>
      ) : appearances ? (
        <>
          <section>
            <SectionHeader title="Why this guest may be a fit" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-950">Demonstrated guest experience</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {appearances.pagination.guestEpisodesTotal > 0
                    ? `${formatCount(appearances.pagination.guestEpisodesTotal)} verified guest episodes across ${formatCount(appearances.pagination.guestPodcastsTotal)} podcasts.`
                    : "No verified guest-only credits are available yet."}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-950">Booking evidence</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {repeatPodcastCount > 0
                    ? `Invited back by ${repeatPodcastCount} podcast${repeatPodcastCount === 1 ? "" : "s"}; repeat bookings are a strong quality signal.`
                    : latestGuestEpisode
                      ? `Latest verified guest appearance: ${formatDate(latestGuestEpisode.airDate)}.`
                      : "Repeat-booking evidence is not available yet."}
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader title="Podcast history" />
            {appearances.guestPodcasts.length > 0 ? (
              <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">
                {appearances.guestPodcasts.map((podcast) => (
                  <PodcastHistoryRow
                    key={`${podcast.podcastId}-${podcast.podcastTitle}`}
                    creatorId={appearances.creatorId}
                    guestName={guestName}
                    podcast={podcast}
                  />
                ))}
              </Card>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                No guest-only podcast history is available yet.
              </p>
            )}
          </section>

          <section>
            <SectionHeader title="Recent guest episodes" />
            {appearances.guestEpisodes.length > 0 ? (
              <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">
                {appearances.guestEpisodes.map((episode) => (
                  <CardRow key={`${episode.creditId}-${episode.episodeId}`}>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-zinc-950">{episode.episodeTitle}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {episode.podcastTitle} · {formatDate(episode.airDate)}
                      </p>
                    </div>
                  </CardRow>
                ))}
              </Card>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                No recent guest episodes are available yet.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
