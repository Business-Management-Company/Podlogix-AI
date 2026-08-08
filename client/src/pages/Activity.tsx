import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardRow,
  SectionHeader,
  StatusPill,
  StatTile,
  EmptyState,
  SkeletonRows,
  staggerContainer,
  staggerItem,
} from "@/components/kit";
import { status as statusTokens } from "@/lib/design-tokens";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Mic,
  Calendar,
  TrendingUp,
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttentionItem {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

interface FeedEvent {
  id: string;
  category: "episode" | "audience" | "revenue" | "campaign" | "system";
  title: string;
  time: string;
  href?: string;
}

interface UpcomingItem {
  id: string;
  type: "episode" | "campaign" | "task";
  title: string;
  date: string;
  show?: string;
}

interface ActivityData {
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ─── Attention card ───────────────────────────────────────────────────────────

const ATTENTION_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function AttentionCard({ item }: { item: AttentionItem }) {
  const Icon = ATTENTION_ICONS[item.type];
  const c = statusTokens[item.type];

  return (
    <motion.div variants={staggerItem}>
      <Card
        padding="md"
        className="flex items-start gap-3"
        style={{ background: c.bg, borderColor: c.border, borderLeft: `3px solid ${c.dot}` }}
      >
        <Icon size={15} style={{ color: c.dot, flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-950">{item.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{item.description}</p>
          {item.action && (
            <Link href={item.action.href}>
              <span className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-950 underline underline-offset-2">
                {item.action.label}
                <ArrowRight size={11} />
              </span>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Feed event dot color ─────────────────────────────────────────────────────

const FEED_COLORS: Record<string, string> = {
  episode: "#10b981",
  audience: "#8b5cf6",
  revenue: "#f59e0b",
  campaign: "#3b82f6",
  system: "#a1a1aa",
};

// ─── Stub data builders (replace with real API data) ─────────────────────────

function buildAttentionItems(data: ActivityData | undefined): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (!data?.hasRssFeed) {
    items.push({
      id: "no-rss",
      type: "warning",
      title: "No podcast connected",
      description: "Connect your podcast host to start managing episodes, audience, and distribution.",
      action: { label: "Connect your podcast", href: "/podcasts" },
    });
  }

  if ((data?.podcasts?.length ?? 0) === 0 && data?.hasRssFeed) {
    items.push({
      id: "no-shows",
      type: "info",
      title: "Import your episodes",
      description: "Your RSS feed is connected. Import episodes to see them in Podlogix.",
      action: { label: "Go to Podcasts", href: "/podcasts" },
    });
  }

  return items;
}

const STUB_FEED: FeedEvent[] = [
  { id: "1", category: "episode",  title: "Episode 48 published to all platforms",       time: "2 hours ago" },
  { id: "2", category: "audience", title: "+312 new downloads this week",                time: "6 hours ago" },
  { id: "3", category: "campaign", title: "LinkedIn post scheduled for tomorrow at 9am",  time: "Yesterday" },
  { id: "4", category: "revenue",  title: "Sponsor invoice sent — Acme Co. ($1,200)",     time: "2 days ago" },
  { id: "5", category: "episode",  title: "Episode 47 reached 1,000 downloads",           time: "3 days ago" },
  { id: "6", category: "system",   title: "Spotify connection refreshed",                 time: "4 days ago" },
];

const STUB_UPCOMING: UpcomingItem[] = [
  { id: "1", type: "episode",  title: "Ep 49 — The Delegation Trap", date: "Tomorrow, 9am", show: "Build in Public" },
  { id: "2", type: "campaign", title: "Newsletter — August recap",   date: "Aug 14, 10am",  show: "Build in Public" },
  { id: "3", type: "task",     title: "Record Episode 50 intro",     date: "Aug 16" },
];

const UPCOMING_ICONS = {
  episode: Radio,
  campaign: Megaphone,
  task: CheckCircle2,
};

const UPCOMING_COLORS = {
  episode: "#10b981",
  campaign: "#3b82f6",
  task: "#a1a1aa",
};

// ─── Loading state ──────────────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="mx-auto max-w-[680px] space-y-7 px-8 pb-16 pt-10">
      <Skeleton className="h-[132px] w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded" />
        <SkeletonRows count={2} />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16 rounded" />
        <SkeletonRows count={3} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Activity() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<ActivityData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) return <ActivitySkeleton />;

  const attentionItems = buildAttentionItems(data);
  const hasShows = (data?.podcasts?.length ?? 0) > 0;
  const firstName = user?.firstName ?? "there";

  const focusLine =
    attentionItems.length > 0
      ? `${attentionItems.length} thing${attentionItems.length > 1 ? "s" : ""} need${attentionItems.length > 1 ? "" : "s"} your attention`
      : "You're all caught up — nothing urgent today.";

  const stats = [
    { label: "Downloads this week", value: "4,312", icon: TrendingUp, color: "#10b981" },
    { label: "Active podcasts", value: String(data?.podcasts?.length ?? 0), icon: Mic, color: "#8b5cf6" },
    { label: "Audience growth", value: "+8.2%", icon: Users, color: "#3b82f6" },
  ];

  return (
    <div className="mx-auto max-w-[680px] px-8 pb-16 pt-10">
      {/* ── Briefing hero ──────────────────────────────────────────────────── */}
      <Card
        tone="default"
        padding="lg"
        className="mb-8"
        style={{
          background:
            "linear-gradient(135deg, rgba(16,185,129,0.045) 0%, rgba(14,165,233,0.02) 100%)",
          borderColor: "rgba(16,185,129,0.12)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.03em] text-zinc-950">
              {getGreeting()}, {firstName}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
              <Calendar size={12} />
              {getTodayString()}
            </p>
          </div>
          <StatusPill tone={attentionItems.length > 0 ? "warning" : "success"} pulse>
            {focusLine}
          </StatusPill>
        </div>

        {hasShows && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mt-5 flex gap-7 border-t pt-4"
            style={{ borderColor: "rgba(16,185,129,0.1)" }}
          >
            {stats.map((s) => (
              <StatTile key={s.label} {...s} />
            ))}
          </motion.div>
        )}
      </Card>

      {/* ── Attention items ─────────────────────────────────────────────────── */}
      {attentionItems.length > 0 && (
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mb-8 flex flex-col gap-2"
        >
          {attentionItems.map((item) => (
            <AttentionCard key={item.id} item={item} />
          ))}
        </motion.section>
      )}

      {/* ── My Podcasts ─────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader title="Podcasts" action={{ label: "View all", href: "/podcasts" }} />

        {hasShows ? (
          <Card tone="default" padding="none" className="divide-y divide-zinc-100 overflow-hidden">
            {(data?.podcasts ?? []).slice(0, 3).map((podcast) => (
              <Link key={podcast.id} href={`/podcasts/${podcast.id}`}>
                <CardRow className="cursor-pointer transition-colors hover:bg-zinc-50">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-200"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(14,165,233,0.12) 100%)",
                    }}
                  >
                    <Mic size={15} className="text-emerald-600" />
                  </div>
                  <p className="flex-1 truncate text-[13px] font-medium text-zinc-950">
                    {podcast.title}
                  </p>
                  <ArrowRight size={13} className="flex-shrink-0 text-zinc-300" />
                </CardRow>
              </Link>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={Mic}
            title="No podcasts yet"
            description="Connect your podcast host or create a new show to get started."
            action={{ label: "Add your first podcast", href: "/podcasts" }}
          />
        )}
      </section>

      {/* ── Upcoming ────────────────────────────────────────────────────────── */}
      {hasShows && (
        <section className="mb-8">
          <SectionHeader title="Upcoming" />
          <Card tone="default" padding="none" className="divide-y divide-zinc-100 overflow-hidden">
            {STUB_UPCOMING.map((item) => {
              const Icon = UPCOMING_ICONS[item.type];
              const dotColor = UPCOMING_COLORS[item.type];
              return (
                <CardRow key={item.id}>
                  <div
                    className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${dotColor}12` }}
                  >
                    <Icon size={13} style={{ color: dotColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-zinc-950">{item.title}</p>
                    {item.show && <p className="mt-px text-[11px] text-zinc-400">{item.show}</p>}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <Clock size={11} className="text-zinc-300" />
                    <span className="text-[11px] text-zinc-400">{item.date}</span>
                  </div>
                </CardRow>
              );
            })}
          </Card>
        </section>
      )}

      {/* ── Live activity feed ─────────────────────────────────────────────────── */}
      {hasShows && (
        <section>
          <SectionHeader
            title="Recent"
            right={
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            }
          />
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {STUB_FEED.map((event) => (
              <motion.div
                key={event.id}
                variants={staggerItem}
                className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-b-0"
              >
                <span
                  className="ml-1 h-[7px] w-[7px] flex-shrink-0 rounded-full"
                  style={{ background: FEED_COLORS[event.category] ?? "#a1a1aa" }}
                />
                <p className="flex-1 text-[13px] text-zinc-950">{event.title}</p>
                <span className="flex-shrink-0 text-[11px] text-zinc-400">{event.time}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </div>
  );
}
