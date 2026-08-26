import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, Users, Rss, Mic } from "lucide-react";
import { Card, SectionHeader, EmptyState } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { Episode, Podcast } from "@shared/schema";

interface PodcastStats {
  windowDays: number;
  totals: { downloads: number; uniqueListeners: number; feedHits: number; prevDownloads: number };
  byDay: Array<{ day: string; downloads: number }>;
  byApp: Array<{ app: string; downloads: number }>;
  byEpisode: Array<{ episodeId: string; downloads: number; uniqueListeners: number }>;
}

const WINDOW_DAYS = 30;

export default function ShowStats() {
  const { id } = useParams<{ id: string }>();

  const { data: podcast } = useQuery<Podcast>({
    queryKey: ["/api/podcasts", id],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const { data: episodes, isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/episodes`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<PodcastStats>({
    queryKey: ["/api/podcasts", id, "stats", WINDOW_DAYS],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/stats?days=${WINDOW_DAYS}`);
      if (!res.ok) throw new Error("stats unavailable");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const list = Array.isArray(episodes) ? episodes : [];
  const downloadsByEpisode = useMemo(() => {
    const map = new Map<string, { downloads: number; uniqueListeners: number }>();
    for (const row of stats?.byEpisode ?? []) {
      map.set(row.episodeId, { downloads: row.downloads, uniqueListeners: row.uniqueListeners });
    }
    return map;
  }, [stats]);

  // Fill the full window with zero-days so the chart has a continuous x-axis.
  const chartData = useMemo(() => {
    const byDay = new Map((stats?.byDay ?? []).map((d) => [d.day, d.downloads]));
    const out: Array<{ date: string; downloads: number }> = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        downloads: byDay.get(key) ?? 0,
      });
    }
    return out;
  }, [stats]);

  const totals = stats?.totals;
  const delta = totals ? totals.downloads - totals.prevDownloads : 0;
  const deltaLabel =
    totals == null
      ? undefined
      : delta === 0
        ? "Same as previous 30 days"
        : `${delta > 0 ? "+" : ""}${delta.toLocaleString()} vs previous 30 days`;
  const maxAppDownloads = Math.max(1, ...(stats?.byApp ?? []).map((a) => a.downloads));

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        {podcast?.title ? `${podcast.title} — Stats` : "Stats"}
      </h1>
      <p className="mt-0.5 mb-6 text-sm text-zinc-500">
        Downloads and listeners on your Podlogix-hosted feed, last {WINDOW_DAYS} days.
      </p>

      {/* ── Stat tiles ── */}
      <section className="mb-6">
        {statsLoading ? (
          <Skeleton className="h-[104px] rounded-xl" />
        ) : (
          <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 overflow-hidden sm:grid-cols-4 sm:divide-y-0">
            <StatCell
              label="Downloads"
              value={(totals?.downloads ?? 0).toLocaleString()}
              delta={deltaLabel}
              icon={Download}
            />
            <StatCell
              label="Unique Listeners"
              value={(totals?.uniqueListeners ?? 0).toLocaleString()}
              delta="Distinct devices, last 30 days"
              icon={Users}
            />
            <StatCell
              label="Feed Requests"
              value={(totals?.feedHits ?? 0).toLocaleString()}
              delta="Apps polling your RSS feed"
              icon={Rss}
            />
            <StatCell
              label="Published Episodes"
              value={String(list.filter((e) => e.status === "published").length)}
              delta={`${list.length} total`}
              icon={TrendingUp}
            />
          </Card>
        )}
      </section>

      {/* ── Downloads Over Time ── */}
      <section className="mb-6">
        <SectionHeader title="Downloads Over Time" />
        <Card padding="lg">
          <p className="mb-3 text-xs text-zinc-400">Daily downloads across all episodes</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="downloads" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* ── Listening Apps ── */}
      <section className="mb-6">
        <SectionHeader title="Listening Apps" />
        {statsLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (stats?.byApp?.length ?? 0) === 0 ? (
          <Card padding="lg" className="flex items-center justify-center py-10 text-center">
            <div>
              <p className="text-sm font-medium text-zinc-500">No downloads yet</p>
              <p className="mt-1 text-xs text-zinc-400">
                App breakdown appears once listeners start downloading episodes.
              </p>
            </div>
          </Card>
        ) : (
          <Card padding="lg" className="space-y-2.5">
            {stats!.byApp.map((row) => (
              <div key={row.app} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-zinc-700">{row.app}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(row.downloads / maxAppDownloads) * 100}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-sm text-zinc-500 [font-variant-numeric:tabular-nums]">
                  {row.downloads.toLocaleString()}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      {/* ── Top Countries ── */}
      <section className="mb-6">
        <SectionHeader title="Top Countries" />
        <Card padding="lg" className="flex items-center justify-center py-10 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-500">Listener demographics by country</p>
            <p className="mt-1 text-xs text-zinc-400">Geographic breakdowns are coming soon.</p>
          </div>
        </Card>
      </section>

      {/* ── Episode Performance ── */}
      <section>
        <SectionHeader title="Episode Performance" />
        {episodesLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : list.length === 0 ? (
          <EmptyState icon={Mic} title="No episodes yet" description="Publish an episode to see performance data here." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400">
                    <th className="px-4 py-2.5 font-medium">Episode</th>
                    <th className="px-4 py-2.5 font-medium">Downloads</th>
                    <th className="px-4 py-2.5 font-medium">Unique Listeners</th>
                    <th className="px-4 py-2.5 font-medium">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {list.map((ep) => {
                    const perf = downloadsByEpisode.get(ep.id);
                    return (
                      <tr key={ep.id} className="hover:bg-zinc-50/50">
                        <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-zinc-950">{ep.title}</td>
                        <td className="px-4 py-2.5 text-zinc-500 [font-variant-numeric:tabular-nums]">
                          {(perf?.downloads ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500 [font-variant-numeric:tabular-nums]">
                          {(perf?.uniqueListeners ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-500">
                          {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString() : "Draft"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCell({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: typeof Download;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-4">
      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Icon size={13} /> {label}
      </span>
      <span className="text-[28px] font-semibold leading-none tracking-tight text-zinc-950 [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      {delta ? <span className="mt-1 text-[11px] text-zinc-400">{delta}</span> : null}
    </div>
  );
}
