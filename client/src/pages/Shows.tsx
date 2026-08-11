import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Mic, Plus } from "lucide-react";
import { Card, EmptyState, SkeletonRows } from "@/components/kit";

interface Podcast {
  id: string;
  title: string;
  description?: string | null;
  artworkUrl?: string | null;
}

interface BuzzsproutStatus {
  connected: boolean;
  connection?: {
    podcastId?: string;
    podcastTitle?: string | null;
    podcastArtworkUrl?: string | null;
    episodeCount?: number | null;
    lastSyncedAt?: string | null;
  };
}

function Artwork({ src, alt }: { src?: string | null; alt: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-14 w-14 shrink-0 rounded-lg object-cover border border-zinc-200"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200">
      <Mic size={20} className="text-zinc-400" strokeWidth={1.75} />
    </div>
  );
}

function ShowCard({
  href,
  title,
  artworkUrl,
  subtitle,
  badge,
}: {
  href: string;
  title: string;
  artworkUrl?: string | null;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <Card interactive padding="md" className="flex items-center gap-4 h-full">
        <Artwork src={artworkUrl} alt={title} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-950">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
          )}
          {badge && (
            <span className="mt-1.5 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              {badge}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function Shows() {
  const { data: podcasts, isLoading: podcastsLoading } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts"],
  });

  const { data: buzzsprout, isLoading: buzzsproutLoading } =
    useQuery<BuzzsproutStatus>({
      queryKey: ["/api/connectors/buzzsprout/status"],
    });

  const isLoading = podcastsLoading || buzzsproutLoading;
  const nativeShows = Array.isArray(podcasts) ? podcasts : [];

  // If the Buzzsprout-connected show doesn't correspond to a native podcast
  // row, surface it as its own card. Matching is by title since the connector
  // has no FK into the podcasts table yet.
  const buzzsproutConn =
    buzzsprout?.connected && buzzsprout.connection ? buzzsprout.connection : null;
  const buzzsproutMatchesNative =
    !!buzzsproutConn &&
    nativeShows.some(
      (p) =>
        p.title &&
        buzzsproutConn.podcastTitle &&
        p.title.trim().toLowerCase() ===
          buzzsproutConn.podcastTitle.trim().toLowerCase()
    );
  const showBuzzsproutCard = !!buzzsproutConn && !buzzsproutMatchesNative;

  const hasAnyShow = nativeShows.length > 0 || showBuzzsproutCard;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Shows</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every podcast in your workspace — hosted here or synced from your host.
      </p>

      <div className="mt-6">
        {isLoading ? (
          <SkeletonRows count={3} />
        ) : !hasAnyShow ? (
          <EmptyState
            icon={Mic}
            title="No shows yet"
            description="Add your first show by importing its RSS feed or connecting your podcast host."
            action={{ label: "Add a show", href: "/dashboard/rss" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showBuzzsproutCard && buzzsproutConn && (
              <ShowCard
                href="/shows/buzzsprout"
                title={buzzsproutConn.podcastTitle || "Buzzsprout show"}
                artworkUrl={buzzsproutConn.podcastArtworkUrl}
                subtitle={
                  buzzsproutConn.episodeCount != null
                    ? `${buzzsproutConn.episodeCount} episode${buzzsproutConn.episodeCount === 1 ? "" : "s"}`
                    : undefined
                }
                badge="Synced from your podcast host"
              />
            )}
            {nativeShows.map((p) => (
              <ShowCard
                key={p.id}
                href={`/shows/${p.id}`}
                title={p.title}
                artworkUrl={p.artworkUrl}
                subtitle={p.description || undefined}
              />
            ))}

            {/* Add a show */}
            <Link href="/dashboard/rss">
              <Card
                tone="dashed"
                interactive
                padding="md"
                className="flex h-full min-h-[88px] items-center justify-center gap-2 text-zinc-500 hover:text-zinc-700"
              >
                <Plus size={16} strokeWidth={1.75} />
                <span className="text-sm font-medium">Add a show</span>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
