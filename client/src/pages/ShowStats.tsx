import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PlayCircle, TrendingUp, Users, Globe2, Mic } from "lucide-react";
import { Card, SectionHeader, EmptyState } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { Episode, Podcast } from "@shared/schema";

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

  // Honest zero series — no analytics tracking wired up yet.
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
        Listener analytics aren't wired up yet — layout is ready for real data the moment tracking is live.
      </p>

      {/* ── Stat tiles ── */}
      <section className="mb-6">
        <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 overflow-hidden sm:grid-cols-4 sm:divide-y-0">
          <StatCell label="Total Listens" value="0" delta="+0 from last month" icon={PlayCircle} />
          <StatCell label="Avg. Completion" value="—" delta="No data yet" icon={TrendingUp} />
          <StatCell label="Subscribers" value="0" delta="+0 this month" icon={Users} />
          <StatCell label="Countries" value="0" delta="Global reach" icon={Globe2} />
        </Card>
      </section>

      {/* ── Listens Over Time ── */}
      <section className="mb-6">
        <SectionHeader title="Listens Over Time" />
        <Card padding="lg">
          <p className="mb-3 text-xs text-zinc-400">Total podcast listens by week</p>
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

      {/* ── Platform Distribution ── */}
      <section className="mb-6">
        <SectionHeader title="Platform Distribution" />
        <Card padding="lg" className="flex items-center justify-center py-10 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-500">Where your listeners are coming from</p>
            <p className="mt-1 text-xs text-zinc-400">Available once listener tracking is connected.</p>
          </div>
        </Card>
      </section>

      {/* ── Top Countries ── */}
      <section className="mb-6">
        <SectionHeader title="Top Countries" />
        <Card padding="lg" className="flex items-center justify-center py-10 text-center">
          <div>
            <p className="text-sm font-medium text-zinc-500">Listener demographics by country</p>
            <p className="mt-1 text-xs text-zinc-400">Available once listener tracking is connected.</p>
          </div>
        </Card>
      </section>

      {/* ── Episode Performance ── */}
      <section>
        <SectionHeader title="Episode Performance" />
        {isLoading ? (
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
                    <th className="px-4 py-2.5 font-medium">Listens</th>
                    <th className="px-4 py-2.5 font-medium">Completion</th>
                    <th className="px-4 py-2.5 font-medium">New Subs</th>
                    <th className="px-4 py-2.5 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {list.map((ep) => (
                    <tr key={ep.id} className="hover:bg-zinc-50/50">
                      <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-zinc-950">{ep.title}</td>
                      <td className="px-4 py-2.5 text-zinc-500">0</td>
                      <td className="px-4 py-2.5 text-zinc-500">—</td>
                      <td className="px-4 py-2.5 text-zinc-500">0</td>
                      <td className="px-4 py-2.5 text-zinc-500">$0.00</td>
                    </tr>
                  ))}
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
  icon: typeof PlayCircle;
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
