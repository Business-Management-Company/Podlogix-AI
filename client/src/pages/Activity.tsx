import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Check,
  Clock3,
  Link2,
  Mic,
  Pause,
  Play,
  Plus,
  Radio,
  Rss,
  Share2,
  Shield,
  Sparkles,
  TrendingUp,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import heroPhoto from "@/assets/images/podlogix-hero-photo.jpg";

interface DashboardData {
  profile: {
    id: string;
    slug: string;
    displayName: string;
    isPublished: boolean;
  } | null;
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

interface SetupStep {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const quickActions = [
  { label: "Import show", hint: "Connect an RSS feed", href: "/dashboard/rss", icon: Rss },
  { label: "Create with AI", hint: "Show notes and clips", href: "/dashboard/ai", icon: Sparkles },
  { label: "Schedule social", hint: "Publish everywhere", href: "/dashboard/social-hub", icon: Share2 },
  { label: "Protect your voice", hint: "Certify your identity", href: "/identity", icon: Shield },
];

const platformNames: Record<string, string> = {
  spotify: "Spotify",
  apple: "Apple Podcasts",
  youtube: "YouTube",
  amazon: "Amazon Music",
  google: "Google",
  iheartradio: "iHeartRadio",
};

const platformColors: Record<string, string> = {
  spotify: "#d8f34c",
  apple: "#ff71a8",
  youtube: "#ff6548",
  amazon: "#63d8ef",
  google: "#75b6ff",
  iheartradio: "#ff8969",
};

function greeting(name?: string | null) {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name}` : salutation;
}

function setupSteps(data?: DashboardData): SetupStep[] {
  return [
    {
      id: "profile",
      label: "Publish your Link Page",
      hint: "Give listeners one place to find you",
      href: "/dashboard/profile",
      done: Boolean(data?.profile),
      icon: Link2,
    },
    {
      id: "rss",
      label: "Connect your first show",
      hint: "Import episodes from your podcast host",
      href: "/dashboard/rss",
      done: Boolean(data?.hasRssFeed),
      icon: Rss,
    },
    {
      id: "distribution",
      label: "Go live everywhere",
      hint: "Submit to every major listening platform",
      href: "/dashboard/distribution",
      done: Object.values(data?.distributionStatus ?? {}).some(
        (status) => status === "submitted" || status === "approved",
      ),
      icon: Radio,
    },
    {
      id: "voice",
      label: "Protect your voice identity",
      hint: "Create a verifiable voice certificate",
      href: "/dashboard/certify",
      done: false,
      icon: Shield,
    },
  ];
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-podlogix-display text-sm font-bold uppercase tracking-[0.12em] text-[#eadbd4]">
        {children}
      </h2>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-full bg-[#170b0d] p-6 lg:p-7">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Skeleton className="h-[330px] rounded-[22px] bg-white/10" />
          <Skeleton className="h-64 rounded-[18px] bg-white/10" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-[18px] bg-white/10" />
          <Skeleton className="h-56 rounded-[18px] bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function Activity() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const steps = useMemo(() => setupSteps(data), [data]);
  const doneCount = steps.filter((step) => step.done).length;
  const showCount = data?.podcasts.length ?? 0;
  const platformEntries = Object.entries(data?.distributionStatus ?? {});
  const liveCount = platformEntries.filter(([, status]) => status === "approved").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="podlogix-dashboard min-h-full overflow-y-auto bg-[#170b0d] text-[#fff8ed]">
      <div className="mx-auto w-full max-w-[1480px] p-4 sm:p-5 lg:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff8056]">
              Your creative command center
            </p>
            <h1 className="font-podlogix-display text-2xl font-bold tracking-tight text-[#fff8ed] sm:text-3xl">
              {greeting(user?.firstName)}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#a98d88]">
            <span className="h-2 w-2 rounded-full bg-[#7de5c8] shadow-[0_0_0_5px_rgba(125,229,200,0.08)]" />
            Your workspace is live
          </div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <section
              className="relative min-h-[330px] overflow-hidden rounded-[22px] bg-cover bg-center shadow-[0_24px_70px_rgba(0,0,0,0.25)] sm:min-h-[365px]"
              style={{ backgroundImage: `url(${heroPhoto})` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(54,13,12,0.62)_0%,rgba(87,27,19,0.26)_43%,rgba(0,0,0,0)_64%)]" />
              <div className="relative z-10 flex min-h-[330px] max-w-[560px] flex-col items-start justify-center p-6 sm:min-h-[365px] sm:p-9 lg:p-11">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#51251f]">
                  Podlogix creator spotlight
                </p>
                <h2 className="max-w-[500px] font-podlogix-display text-[44px] font-extrabold uppercase leading-[0.84] tracking-[-0.035em] text-white sm:text-[60px] lg:text-[68px]">
                  Ideas worth hearing twice.
                </h2>
                <p className="mt-5 max-w-[370px] text-sm leading-relaxed text-white/80">
                  Turn one honest conversation into a week of content—without losing the voice that made it yours.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button
                    className="h-12 rounded-xl bg-white px-3 text-[#291214] shadow-xl hover:bg-[#fff7ec]"
                    onClick={() => navigate("/dashboard/ai")}
                  >
                    <span className="mr-3 grid h-8 w-8 place-items-center rounded-lg bg-[#ff6031] text-white">
                      <WandSparkles className="h-4 w-4" />
                    </span>
                    <span className="text-left">
                      <span className="block font-podlogix-display text-base font-bold leading-none">Create from an episode</span>
                      <span className="mt-1 block text-[9px] font-medium text-[#8c7470]">Clips, notes, posts and more</span>
                    </span>
                    <ArrowRight className="ml-4 h-4 w-4 text-[#ff6031]" />
                  </Button>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <section>
                <SectionTitle>Move faster</SectionTitle>
                <div className="grid grid-cols-2 gap-2.5">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.href}
                        type="button"
                        onClick={() => navigate(action.href)}
                        className={`group flex min-h-[126px] flex-col justify-between rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                          index === 2
                            ? "border-transparent bg-[linear-gradient(145deg,#98efdc,#43bfe0)] text-[#153135]"
                            : "border-white/[0.045] bg-[#2a1417] text-[#fff8ed] hover:border-white/10 hover:bg-[#32181b]"
                        }`}
                      >
                        <Icon className="h-5 w-5 opacity-85" />
                        <span>
                          <strong className="block font-podlogix-display text-xl font-bold leading-[0.9]">{action.label}</strong>
                          <small className={`mt-1 block text-[9px] ${index === 2 ? "text-[#244f53]" : "text-[#9d817e]"}`}>
                            {action.hint}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="min-w-0">
                <SectionTitle
                  action={
                    <Link href="/podcasts" className="flex items-center gap-1 text-[10px] font-semibold text-[#9f817d] transition hover:text-white">
                      All shows <ArrowRight className="h-3 w-3" />
                    </Link>
                  }
                >
                  Your shows
                </SectionTitle>

                {showCount > 0 ? (
                  <div className="grid min-h-[264px] grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {(data?.podcasts ?? []).slice(0, 6).map((podcast, index) => (
                      <Link key={podcast.id} href={`/podcasts/${podcast.id}`}>
                        <div
                          className={`group flex h-full min-h-[126px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-white/10 ${
                            index === 0
                              ? "bg-[linear-gradient(180deg,#ff6031,#ff9270)] text-white"
                              : "bg-[#2a1417] text-[#fff8ed]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-podlogix-display text-2xl font-bold">{index === 0 ? "LIVE" : `0${index + 1}`}</span>
                            <Mic className="h-4 w-4 opacity-70" />
                          </div>
                          <div>
                            <p className="line-clamp-2 font-podlogix-display text-lg font-bold leading-[0.95]">{podcast.title}</p>
                            <p className={`mt-2 text-[9px] ${index === 0 ? "text-white/70" : "text-[#987d79]"}`}>Open workspace</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {Array.from({ length: Math.max(0, 6 - showCount) }).map((_, index) => (
                      <button
                        key={`empty-${index}`}
                        type="button"
                        onClick={() => navigate("/dashboard/rss")}
                        className="flex min-h-[126px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-[#211013] text-[#795f5f] transition hover:border-[#ff6031]/50 hover:text-[#ff8056]"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-[10px] font-semibold">Add a show</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[264px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#211013] p-7 text-center">
                    <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#ff6031]/10 text-[#ff7045]">
                      <Mic className="h-5 w-5" />
                    </span>
                    <h3 className="font-podlogix-display text-xl font-bold">Bring your first show in</h3>
                    <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[#967c78]">Connect an RSS feed and Podlogix will organize your episodes automatically.</p>
                    <Button onClick={() => navigate("/dashboard/rss")} size="sm" className="mt-5 rounded-xl bg-[#ff6031] hover:bg-[#ff7045]">
                      <Plus className="mr-2 h-3.5 w-3.5" /> Add podcast
                    </Button>
                  </div>
                )}
              </section>
            </div>
          </div>

          <aside className="space-y-5">
            <section>
              <SectionTitle>Today&apos;s run</SectionTitle>
              <div className="overflow-hidden rounded-[18px] border border-white/[0.045] bg-[#251215]">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={step.done}
                      onClick={() => navigate(step.href)}
                      className="group grid w-full grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-3 border-b border-white/[0.045] px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.035] disabled:cursor-default disabled:opacity-55"
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-xl ${
                          index === 0 ? "bg-[#d8f34c] text-[#28300d]" : index === 1 ? "bg-[#ef5b97] text-white" : index === 2 ? "bg-[#7461dc] text-white" : "bg-[#3a2023] text-[#c9aca6]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate font-podlogix-display text-sm font-semibold text-[#fff5e9]">{step.label}</strong>
                        <small className="mt-0.5 block truncate text-[8px] text-[#866e6c]">{step.done ? "Complete" : step.hint}</small>
                      </span>
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? "bg-[#7de5c8]/10 text-[#7de5c8]" : "text-[#8c7270] group-hover:bg-[#ff6031] group-hover:text-white"}`}>
                        {step.done ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[18px] border border-white/[0.05] bg-[linear-gradient(140deg,#34181b,#452024)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-podlogix-display text-lg font-bold">Workspace setup</h3>
                  <p className="mt-0.5 text-[9px] text-[#a38782]">{doneCount} of {steps.length} essentials complete</p>
                </div>
                <span className="font-podlogix-display text-2xl font-bold text-[#ff8056]">{progress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#ff6031,#ff9a62)] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="rounded-[18px] bg-[linear-gradient(155deg,#9aefdd_0%,#42bddb_72%,#2b8fc4_100%)] p-3.5 text-[#173237] shadow-[0_18px_40px_rgba(49,162,196,0.14)]">
              <div className="rounded-[14px] bg-[#171316] p-4 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">Content engine</p>
                    <h3 className="mt-2 font-podlogix-display text-2xl font-bold leading-none">Your voice.<br />Everywhere.</h3>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff6031]">
                    <Zap className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 flex h-9 items-center gap-1" aria-hidden="true">
                  {[10, 24, 16, 30, 19, 35, 14, 27, 20, 33, 15, 23, 31, 12, 26, 18, 34, 21, 11, 29].map((height, index) => (
                    <span key={index} className="w-1 rounded-full bg-white/65" style={{ height }} />
                  ))}
                </div>
              </div>
              <div className="px-1 pb-1 pt-3">
                <h3 className="font-podlogix-display text-xl font-bold leading-none">Ready for your next episode</h3>
                <p className="mt-1 text-[9px] text-[#285159]">Generate clips, notes, newsletters and posts.</p>
                <div className="mt-3 flex h-12 items-center rounded-xl bg-[#201113] px-3 text-white">
                  <span className="mr-auto text-[8px] font-bold uppercase tracking-[0.14em] text-[#9c817d]">Start creating</span>
                  <button type="button" aria-label="Previous" className="grid h-8 w-8 place-items-center rounded-full text-white/75 hover:bg-white/10">
                    <TrendingUp className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    aria-label={isPlaying ? "Pause preview" : "Play preview"}
                    onClick={() => setIsPlaying((value) => !value)}
                    className="mx-1 grid h-8 w-8 place-items-center rounded-full bg-white text-[#211214] transition hover:scale-105"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                  </button>
                  <button type="button" onClick={() => navigate("/dashboard/ai")} aria-label="Open AI studio" className="grid h-8 w-8 place-items-center rounded-full text-white/75 hover:bg-white/10">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </section>

            {platformEntries.length > 0 && (
              <section>
                <SectionTitle
                  action={<span className="text-[9px] font-semibold text-[#8d7370]">{liveCount} live</span>}
                >
                  Distribution
                </SectionTitle>
                <div className="rounded-[18px] border border-white/[0.045] bg-[#251215] p-2">
                  {platformEntries.slice(0, 5).map(([platform, status]) => (
                    <Link key={platform} href="/dashboard/distribution" className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-white/[0.035]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status === "approved" ? platformColors[platform] ?? "#ff8056" : "#543438" }} />
                      <span className="flex-1 text-xs font-medium text-[#eadbd4]">{platformNames[platform] ?? platform}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-wide ${status === "approved" ? "text-[#7de5c8]" : "text-[#73595a]"}`}>
                        {status === "approved" ? "Live" : status === "submitted" ? "Pending" : "Connect"}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/[0.045] bg-[#251215] p-3">
                <Mic className="mb-2 h-4 w-4 text-[#ff8056]" />
                <strong className="font-podlogix-display text-xl">{showCount}</strong>
                <p className="text-[8px] text-[#856d6a]">Shows</p>
              </div>
              <div className="rounded-xl border border-white/[0.045] bg-[#251215] p-3">
                <Radio className="mb-2 h-4 w-4 text-[#7de5c8]" />
                <strong className="font-podlogix-display text-xl">{liveCount}</strong>
                <p className="text-[8px] text-[#856d6a]">Live</p>
              </div>
              <div className="rounded-xl border border-white/[0.045] bg-[#251215] p-3">
                <Clock3 className="mb-2 h-4 w-4 text-[#77cbe0]" />
                <strong className="font-podlogix-display text-xl">{doneCount}</strong>
                <p className="text-[8px] text-[#856d6a]">Ready</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
