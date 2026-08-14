import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Circle,
  Link2,
  Mail,
  Mic,
  Radio,
  Rss,
  Share2,
  Shield,
  Sparkles,
} from "lucide-react";
import { Card, CardRow, EmptyState, SectionHeader, StatusPill, TopStat } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Episode } from "@shared/schema";
import heroPhoto from "@/assets/images/podlogix-hero-photo.jpg";

interface DashboardData {
  profile: { id: string; slug: string; displayName: string; isPublished: boolean } | null;
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

interface AccountAnalytics {
  followers: number;
}

interface SetupStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const quickLinks = [
  { label: "Social Hub", hint: "Schedule across platforms", href: "/dashboard/social-hub", icon: Share2 },
  { label: "Email Hub", hint: "Newsletters and drips", href: "/dashboard/email", icon: Mail },
  { label: "Analytics", hint: "Audience and performance", href: "/listener/analytics", icon: BarChart3 },
  { label: "AI Studio", hint: "Notes, clips and posts", href: "/dashboard/ai", icon: Sparkles },
];

function greeting(name?: string | null) {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name}` : salutation;
}

function todayString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function setupSteps(data?: DashboardData): SetupStep[] {
  return [
    { id: "profile", label: "Publish your Link Page", href: "/dashboard/profile", done: Boolean(data?.profile), icon: Link2 },
    { id: "rss", label: "Connect your first show", href: "/dashboard/rss", done: Boolean(data?.hasRssFeed), icon: Rss },
    {
      id: "distribution",
      label: "Go live everywhere",
      href: "/dashboard/distribution",
      done: Object.values(data?.distributionStatus ?? {}).some((s) => s === "submitted" || s === "approved"),
      icon: Radio,
    },
    { id: "voice", label: "Protect your voice identity", href: "/dashboard/certify", done: false, icon: Shield },
  ];
}

function ProgressRing({ percent, size = 84, stroke = 9, color = "#10b981" }: { percent: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f4f4f5" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-950">
        {Math.round(percent)}%
      </div>
    </div>
  );
}

export default function Activity() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ["/api/dashboard"] });
  const podcast = data?.podcasts?.[0];

  const { data: episodes, isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", podcast?.id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${podcast!.id}/episodes`);
      return res.json();
    },
    enabled: !!podcast,
  });

  const { data: promotion } = useQuery<{ accounts: AccountAnalytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts"],
    retry: false,
  });

  const steps = useMemo(() => setupSteps(data), [data]);
  const doneCount = steps.filter((s) => s.done).length;
  const setupPercent = (doneCount / steps.length) * 100;

  const publishedCount = episodes?.filter((e) => e.status === "published").length ?? 0;
  const liveCount = Object.values(data?.distributionStatus ?? {}).filter((s) => s === "approved").length;
  const totalFollowers = promotion?.accounts?.reduce((sum, a) => sum + (a.followers || 0), 0) ?? 0;

  const recentEpisodes = useMemo(
    () =>
      [...(episodes ?? [])]
        .sort((a, b) => {
          const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 5),
    [episodes]
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] space-y-6 px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-base font-semibold text-zinc-500">
              {user?.firstName?.[0]?.toUpperCase() ?? "P"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{greeting(user?.firstName)}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{todayString()}</p>
          </div>
        </div>
        <StatusPill tone="success" pulse>
          Workspace live
        </StatusPill>
      </div>

      <section className="mb-6">
        <div
          className="relative min-h-[210px] overflow-hidden rounded-[22px] bg-cover bg-center shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:min-h-[230px]"
          style={{ backgroundImage: `url(${heroPhoto})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(54,13,12,0.62)_0%,rgba(87,27,19,0.26)_43%,rgba(0,0,0,0)_64%)]" />
          <div className="relative z-10 flex min-h-[210px] max-w-[560px] flex-col items-start justify-center p-6 sm:min-h-[230px] sm:p-8 lg:p-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#51251f]">
              Podlogix creator spotlight
            </p>
            <h2 className="font-podlogix-display max-w-[500px] text-[44px] font-extrabold uppercase leading-[0.84] tracking-[-0.035em] text-white sm:text-[60px] lg:text-[68px]">
              Ideas worth hearing twice.
            </h2>
            <p className="mt-5 max-w-[370px] text-sm leading-relaxed text-white/80">
              Turn one honest conversation into a week of content—without losing the voice that made it yours.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <Card className="grid grid-cols-2 divide-x divide-y divide-zinc-100 overflow-hidden sm:grid-cols-4 sm:divide-y-0">
          <TopStat label="Episodes" value={String(episodes?.length ?? 0)} icon={Mic} href="/episodes" />
          <TopStat label="Published" value={String(publishedCount)} icon={CheckCircle2} href="/episodes" />
          <TopStat label="Live channels" value={String(liveCount)} icon={Radio} href="/dashboard/distribution" />
          <TopStat label="Followers" value={totalFollowers.toLocaleString()} icon={Share2} href="/audience" />
        </Card>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section>
            <SectionHeader title="Interview scheduling" />
            <EmptyState
              icon={CalendarClock}
              title="Coming soon: schedule guest interviews"
              description="Connect Google Calendar so guests can book time directly, and every session shows up here automatically. This feature is being scoped now."
            />
          </section>

          <section>
            <SectionHeader title="Recent episodes" action={{ label: "All episodes", href: "/episodes" }} />
            {episodesLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : recentEpisodes.length === 0 ? (
              <EmptyState
                icon={Mic}
                title="No episodes yet"
                description="Import an RSS feed or upload your first episode to see it here."
                action={{ label: "Add episodes", href: "/dashboard/rss" }}
              />
            ) : (
              <Card className="divide-y divide-zinc-100 overflow-hidden">
                {recentEpisodes.map((ep) => (
                  <Link key={ep.id} href={`/episodes/${ep.id}`}>
                    <CardRow className="cursor-pointer px-4 py-3 hover:bg-zinc-50/60">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
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

          <section>
            <SectionHeader title="Quick access" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Card interactive padding="md" className="flex h-full flex-col gap-2">
                      <Icon size={16} className="text-zinc-400" strokeWidth={1.75} />
                      <div>
                        <p className="text-sm font-medium text-zinc-950">{item.label}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{item.hint}</p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <SectionHeader title="Workspace setup" />
            <Card padding="lg">
              <div className="flex items-center gap-4">
                <ProgressRing percent={setupPercent} />
                <div>
                  <p className="text-sm font-medium text-zinc-950">
                    {doneCount} of {steps.length} essentials
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">Complete these to go fully live.</p>
                </div>
              </div>
              <div className="mt-4 space-y-1 border-t border-zinc-100 pt-4">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const row = (
                    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-zinc-50/60">
                      {step.done ? (
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                      ) : (
                        <Circle size={15} className="shrink-0 text-zinc-200" />
                      )}
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${step.done ? "text-zinc-300" : "text-zinc-400"}`} />
                      <span className={`flex-1 text-xs font-medium ${step.done ? "text-zinc-400 line-through" : "text-zinc-950"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                  return step.done ? (
                    <div key={step.id}>{row}</div>
                  ) : (
                    <Link key={step.id} href={step.href}>
                      {row}
                    </Link>
                  );
                })}
              </div>
            </Card>
          </section>

          {data?.profile && (
            <Link
              href={`/p/${data.profile.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
              View your Link Page <ArrowRight size={12} />
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
