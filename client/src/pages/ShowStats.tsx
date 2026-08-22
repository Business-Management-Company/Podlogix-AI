import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PlayCircle, TrendingUp, Users, Globe2, Mic } from "lucide-react";
import { Card, SectionHeader, EmptyState } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { Episode, Podcast } from "@shared/schema";

/**
 * /shows/:id/stats — performance analytics for this show. Podlogix doesn't
 * have listen/download tracking wired up yet, so every metric here is a
 * real, honest zero rather than invented numbers. The layout is ready for
 * real data the moment analytics ingestion exists.
 */
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

  const { data: episodes, isLoading } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/episodes`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const list = Array.isArray(episodes) ? episodes : [];
  // No listens/downloads tracking exists yet — flat zero series, not fabricated.
  const chartData = [
    { date: "Week 1", listens: 0 },
    { date: "Week 2", listens: 0 },
    { date: "Week 3", listens: 0 },
    { date: "Week 4", listens: 0 },
  ];

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
        {podcast?.title ? `${podcast.title} — Stats` : "Stats"}
      </h1>
      <p className="mt-0.5 mb-6 text-sm text-zinc-500">
        Performance metrics for this show. Listener analytics tracking isn't wired up yet — figures below are placeholders until it is.
      </p>

      <section className="mb-6">
        <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 overflow-hidden sm:grid-cols-4 sm:divide-y-0">
          <StatCell label="Total Listens" value="0" icon={PlayCircle} />
          <StatCell label="Avg. Completion" value="—" icon={TrendingUp} />
          <StatCell label="Subscribers" value="0" icon={Users} />
          <StatCell label="Countries" value="0" icon={Globe2} />
        </Card>
      </section>

      <section className="mb-6">
        <SectionHeader title="Listens Over Time" />
        <Card padding="lg">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="listens" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Episode Performance" />
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : list.length === 0 ? (
          <EmptyState icon={Mic} title="No episodes yet" description="Publish an episode to see performance data here." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Episode</th>
                  <th className="px-4 py-2.5 font-medium">Listens</th>
                  <th className="px-4 py-2.5 font-medium">Completion</th>
                  <th className="px-4 py-2.5 font-medium">New Subs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.map((ep) => (
                  <tr key={ep.id}>
                    <td className="max-w-[320px] truncate px-4 py-2.5 font-medium text-zinc-950">{ep.title}</td>
                    <td className="px-4 py-2.5 text-zinc-500">0</td>
                    <td className="px-4 py-2.5 text-zinc-500">—</td>
                    <td className="px-4 py-2.5 text-zinc-500">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCell({ label, value, icon: Icon }: { label: string; value: string; icon: typeof PlayCircle }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Icon size={13} /> {label}
      </span>
      <span className="text-xl font-semibold tracking-tight text-zinc-950">{value}</span>
    </div>
  );
}
