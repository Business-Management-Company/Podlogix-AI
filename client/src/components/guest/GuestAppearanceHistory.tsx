import { Loader2, Mic2 } from "lucide-react";
import { Card, CardRow, SectionHeader } from "@/components/kit";

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
  episodeCount: number;
}

export interface GuestAppearanceResult {
  creatorId: string;
  guestEpisodes: GuestEpisodeAppearance[];
  guestPodcasts: GuestPodcastAppearance[];
  pagination: {
    guestEpisodesTotal: number;
    guestPodcastsTotal: number;
  };
}

interface GuestAppearanceHistoryProps {
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

export function GuestAppearanceHistory({ appearances, isLoading, error }: GuestAppearanceHistoryProps) {
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
                  <CardRow key={`${podcast.podcastId}-${podcast.podcastTitle}`}>
                    {podcast.podcastImageUrl ? (
                      <img
                        src={podcast.podcastImageUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-zinc-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                        <Mic2 size={15} className="text-zinc-400" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-950">{podcast.podcastTitle}</p>
                      <p className="text-xs text-zinc-500">
                        {podcast.episodeCount} guest episode{podcast.episodeCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </CardRow>
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
