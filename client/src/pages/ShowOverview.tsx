import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mic, Radio, CheckCircle2, ArrowRight, Share2, UserPlus } from "lucide-react";
import { Card, CardRow, SectionHeader, TopStat, EmptyState } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { Episode, DistributionChannel, ChannelSubmission, Podcast } from "@shared/schema";

interface AccountAnalytics {
  followers: number;
}

export default function ShowOverview() {
  const { id } = useParams<{ id: string }>();
  // "buzzsprout" is the synced host show, not a native podcast row — its
  // identity and episodes come from the connector endpoints instead.
  const isHostSynced = id === "buzzsprout";

  const { data: podcast } = useQuery<Podcast>({
    queryKey: ["/api/podcasts", id],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id && !isHostSynced,
    retry: false,
  });

  const { data: hostStatus } = useQuery<{
    connected: boolean;
    connection?: { id: string; podcastTitle?: string | null; podcastArtworkUrl?: string | null };
  }>({
    queryKey: ["/api/connectors/buzzsprout/status"],
    enabled: isHostSynced,
    retry: false,
  });

  const { data: hostEpisodes } = useQuery<{ episodes: Array<{ id: string; title: string; publishedAt: string | null; artworkUrl?: string | null }> }>({
    queryKey: ["/api/connectors/buzzsprout/episodes"],
    enabled: isHostSynced,
    retry: false,
  });

  const { data: nativeEpisodes, isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/episodes`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id && !isHostSynced,
    retry: false,
  });

  // Error payloads must never reach the render as non-arrays.
  const episodes: Episode[] = isHostSynced
    ? ((hostEpisodes?.episodes ?? []) as unknown as Episode[])
    : Array.isArray(nativeEpisodes) ? nativeEpisodes : [];
  const showTitle = isHostSynced ? hostStatus?.connection?.podcastTitle : podcast?.title;
  const showArtwork = isHostSynced ? hostStatus?.connection?.podcastArtworkUrl : podcast?.artworkUrl;
  const guestShowId = isHostSynced
    ? hostStatus?.connection?.id ? `buzzsprout:${hostStatus.connection.id}` : ""
    : id ?? "";

  const { data: channels } = useQuery<DistributionChannel[]>({
    queryKey: ["/api/distribution/channels"],
  });

  const { data: submissions } = useQuery<ChannelSubmission[]>({
    queryKey: ["/api/podcasts", id, "distribution"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/distribution`);
      return res.json();
    },
    enabled: !!id,
  });

  const { data: guestPipeline } = useQuery<Array<{ id: string }>>({
    queryKey: ["/api/podcasts", guestShowId, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${encodeURIComponent(guestShowId)}/guests`);
      if (!res.ok) throw new Error("guest pipeline unavailable");
      return res.json();
    },
    enabled: Boolean(guestShowId),
    retry: false,
  });

  // Best-effort — analytics may not be configured for this workspace; that's fine,
  // the followers stat just won't render.
  const { data: promotion } = useQuery<{ accounts: AccountAnalytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts-cached"],
    retry: false,
  });

  const recentEpisodes = useMemo(
    () =>
      [...episodes]
        .sort((a, b) => {
          const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 5),
    [episodes]
  );

  const publishedCount = isHostSynced ? episodes.length : episodes.filter((e) => e.status === "published").length;
  const liveChannels = (Array.isArray(submissions) ? submissions : []).filter((s) => s.status === "approved").length;
  const totalFollowers = promotion?.accounts?.reduce((sum, a) => sum + (a.followers || 0), 0) ?? 0;

  const isLoading = episodesLoading;

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <div className="flex items-center gap-3.5">
        {showArtwork ? (
          <img
            src={showArtwork}
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100">
            <Mic size={18} className="text-zinc-400" strokeWidth={1.75} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{showTitle || "Overview"}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Performance at a glance for this show.</p>
        </div>
      </div>

      <section className="mt-6">
        <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 overflow-hidden sm:grid-cols-4 sm:divide-y-0">
          <TopStat label="Episodes" value={String(episodes.length)} icon={Mic} href={`/shows/${id}/episodes`} />
          <TopStat label="Published" value={String(publishedCount)} icon={CheckCircle2} href={`/shows/${id}/episodes`} />
          <TopStat label="Live channels" value={String(liveChannels)} icon={Radio} href={`/shows/${id}/distribution`} />
          <TopStat label="Followers" value={totalFollowers.toLocaleString()} icon={Share2} href={`/shows/${id}/promotion`} />
        </Card>
      </section>

      {guestShowId ? (
        <section className="mt-6">
          <SectionHeader title="Guests" action={{ label: "Open pipeline", href: `/guests?showId=${encodeURIComponent(guestShowId)}` }} />
          <Card padding="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <UserPlus size={17} className="text-orange-600" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-950">{guestPipeline?.length ?? 0} guest{guestPipeline?.length === 1 ? "" : "s"} in this show's pipeline</p>
                <p className="text-xs text-zinc-500">Research candidates before spending IC credits on social enrichment.</p>
              </div>
            </div>
            <Link href={`/social/discover?showId=${encodeURIComponent(guestShowId)}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Find guests →
            </Link>
          </Card>
        </section>
      ) : null}

      <section className="mt-6">
        <SectionHeader title="Recent episodes" action={{ label: "All episodes", href: `/shows/${id}/episodes` }} />
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : recentEpisodes.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No episodes yet"
            description="Import an RSS feed or upload your first episode to see it here."
            action={{ label: "Add episodes", href: `/shows/${id}/episodes` }}
          />
        ) : (
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {recentEpisodes.map((ep) => (
              <Link key={ep.id} href={`/episodes/${ep.id}`}>
                <CardRow className="cursor-pointer px-4 py-3 hover:bg-zinc-50/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
                    {ep.artworkUrl ? (
                      <img src={ep.artworkUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Mic size={14} className="text-zinc-400" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950">{ep.title}</p>
                    <p className="text-xs text-zinc-500">
                      {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString() : "Draft"}
                    </p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 text-zinc-300" />
                </CardRow>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-6">
        <SectionHeader title="Distribution" action={{ label: "Manage", href: `/shows/${id}/distribution` }} />
        {!channels || !submissions ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <Card padding="lg">
            <p className="text-sm text-zinc-500">
              Live on <span className="font-medium text-zinc-950">{liveChannels}</span> of{" "}
              <span className="font-medium text-zinc-950">{channels.length}</span> platforms.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
