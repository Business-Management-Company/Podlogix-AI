import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clapperboard,
  FolderOpen,
  GalleryVerticalEnd,
  Mail,
  Mic,
  PenSquare,
  Plus,
  Radio,
  Rss,
  Scissors,
  Share2,
  Sparkles,
  UserPlus,
  Video,
  Gem,
} from "lucide-react";
import {
  SiGooglecalendar, SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiTiktok, SiX, SiThreads,
} from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Episode, LiveSession } from "@shared/schema";

/**
 * /today — the command center. A dense, dark, premium dashboard in three
 * layers: operational cards (Studio · Podcast · Studio activity), the
 * business/activity layer (social · schedule · calendar · releases), and
 * supporting intelligence (recent activity · episodes · quick actions).
 *
 * House rule carried over from the Refiner: every number here is measured
 * from real data — nothing is invented, and empty states earn a CTA
 * instead of a blank card.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardData {
  profile: { id: string; slug: string; displayName: string; isPublished: boolean } | null;
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

interface ConnectedSocialAccount {
  platform: string;
  platformUsername: string | null;
  profilePictureUrl: string | null;
  isConnected: boolean;
}

interface GoogleCalendarStatus {
  connected: boolean;
  email?: string | null;
}

interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
  meetingLink: string | null;
}

interface MediaItem {
  id: string;
  platform: string;
  caption: string | null;
  mediaType: string | null;
  postedAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const compact = (n: number) => Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtRuntime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const SOCIAL_META: Record<string, { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string; label: string }> = {
  instagram: { Icon: SiInstagram, color: "#E4405F", label: "Instagram" },
  youtube: { Icon: SiYoutube, color: "#FF0000", label: "YouTube" },
  facebook: { Icon: SiFacebook, color: "#1877F2", label: "Facebook" },
  linkedin: { Icon: SiLinkedin, color: "#0A66C2", label: "LinkedIn" },
  tiktok: { Icon: SiTiktok, color: "#8a8a8a", label: "TikTok" },
  x: { Icon: SiX, color: "#8a8a8a", label: "X (Twitter)" },
  twitter: { Icon: SiX, color: "#8a8a8a", label: "X (Twitter)" },
  threads: { Icon: SiThreads, color: "#8a8a8a", label: "Threads" },
};

const HOSTING_META: Record<string, { label: string; color: string }> = {
  spotify: { label: "Spotify", color: "#1DB954" },
  apple: { label: "Apple Podcasts", color: "#bc55e6" },
  youtube: { label: "YouTube", color: "#FF0000" },
  amazon: { label: "Amazon Music", color: "#00A8E1" },
  google: { label: "Google", color: "#4285F4" },
  iheartradio: { label: "iHeartRadio", color: "#CC0000" },
};

// ─── Building blocks ─────────────────────────────────────────────────────────

function DashCard({
  title,
  action,
  elevated = false,
  className = "",
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  elevated?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl p-4 ring-1 ${
        elevated
          ? "bg-zinc-900 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-white/10"
          : "bg-zinc-900/60 ring-white/[0.06]"
      } ${className}`}
    >
      {(title || action) && (
        <header className="mb-2.5 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-[13px] font-medium text-red-400 transition-colors hover:text-red-300">
      {children}
    </Link>
  );
}

/** Real measured area chart — minutes on the air per day. */
function ActivityChart({ points }: { points: Array<{ label: string; minutes: number }> }) {
  const w = 300;
  const h = 80;
  const max = Math.max(...points.map((p) => p.minutes), 1);
  const step = w / Math.max(points.length - 1, 1);
  const y = (v: number) => h - 6 - (v / max) * (h - 14);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p.minutes).toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-14 w-full">
      <defs>
        <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#dash-area)" />
      <path d={line} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Month grid with real event dots — no external calendar widget. */
function MonthCalendar({
  eventDays,
  month,
  onMonth,
  selected,
  onSelect,
}: {
  eventDays: Set<string>;
  month: Date;
  onMonth: (delta: number) => void;
  selected: Date | null;
  onSelect: (d: Date | null) => void;
}) {
  const today = new Date();
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const isToday = (d: number) => d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
  const isSelected = (d: number) =>
    !!selected && d === selected.getDate() && m === selected.getMonth() && y === selected.getFullYear();
  const key = (d: number) => `${y}-${m}-${d}`;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-zinc-300">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button onClick={() => onMonth(-1)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Previous month">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => onMonth(1)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Next month">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}${i}`} className="text-[11px] font-semibold uppercase text-zinc-600">{d}</span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`b${i}`} />
          ) : (
            <span key={d} className="flex flex-col items-center">
              <button
                onClick={() => onSelect(isSelected(d) ? null : new Date(y, m, d))}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors ${
                  isSelected(d)
                    ? "bg-zinc-100 font-semibold text-zinc-900"
                    : isToday(d)
                      ? "bg-red-600 font-semibold text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {d}
              </button>
              <span className={`h-1 w-1 rounded-full ${eventDays.has(key(d)) ? "bg-red-400" : "bg-transparent"}`} />
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function ReadyRow({ ok, label, detail }: { ok: boolean | null; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-zinc-600" />
      )}
      <span className="text-[13px] font-medium text-zinc-200">{label}</span>
      {detail && <span className="truncate text-xs text-zinc-500">{detail}</span>}
    </div>
  );
}

// ─── The page ────────────────────────────────────────────────────────────────

export default function Activity() {
  const { user } = useAuth();
  const firstName = user?.firstName || "there";

  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ["/api/dashboard"] });
  const podcast = data?.podcasts?.[0];

  const { data: episodesData } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", podcast?.id, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${podcast!.id}/episodes`);
      return res.json();
    },
    enabled: !!podcast,
  });
  const episodes = useMemo(() => (Array.isArray(episodesData) ? episodesData : []), [episodesData]);

  const { data: socialAccounts } = useQuery<{ accounts: ConnectedSocialAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const connectedSocials = (socialAccounts?.accounts ?? []).filter((a) => a.isConnected);
  const connectedPlatformKeys = connectedSocials.map((a) => a.platform.toLowerCase());

  const { data: uploadPostAnalytics } = useQuery<Record<string, { followers?: number }>>({
    queryKey: ["/api/upload-post/analytics", connectedPlatformKeys.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/upload-post/analytics?platforms=${connectedPlatformKeys.join(",")}`);
      if (!res.ok) throw new Error("analytics unavailable");
      return res.json();
    },
    enabled: connectedPlatformKeys.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: calendarStatus } = useQuery<GoogleCalendarStatus>({ queryKey: ["/api/calendar/google/status"] });
  const { data: calendarEvents } = useQuery<{ events: GoogleCalendarEvent[] }>({
    queryKey: ["/api/calendar/google/events"],
    enabled: !!calendarStatus?.connected,
  });

  const { data: sessionsData } = useQuery<{ sessions: LiveSession[] }>({ queryKey: ["/api/live/sessions"], retry: false });
  const sessions = sessionsData?.sessions ?? [];

  const { data: libraryData } = useQuery<{ items: MediaItem[] }>({ queryKey: ["/api/media-library"], retry: false });
  const mediaItems = libraryData?.items ?? [];

  // ── Device readiness — actually enumerated, not decorative ──
  const [devices, setDevices] = useState<{ cam: boolean; mic: boolean } | null>(null);
  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices?.()
      .then((list) =>
        setDevices({
          cam: list.some((d) => d.kind === "videoinput"),
          mic: list.some((d) => d.kind === "audioinput"),
        }),
      )
      .catch(() => setDevices(null));
  }, []);

  const pickedChannels = useMemo(() => {
    try {
      return Object.entries(JSON.parse(localStorage.getItem("podlogix.channels.workspace") || "{}"))
        .filter(([, v]) => v)
        .map(([k]) => k);
    } catch {
      return [] as string[];
    }
  }, []);

  // ── Derived, all measured ──
  const publishedEpisodes = useMemo(
    () =>
      episodes
        .filter((e) => e.status === "published")
        .sort((a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()),
    [episodes],
  );
  const draftEpisodes = useMemo(
    () =>
      episodes
        .filter((e) => e.status !== "published")
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [episodes],
  );
  const totalRuntime = episodes.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0);

  const liveNow = sessions.find((s) => s.startedAt && !s.endedAt);
  const upcomingEvents = useMemo(
    () =>
      (calendarEvents?.events ?? [])
        .filter((e) => e.start && new Date(e.start).getTime() > Date.now() - 5 * 60_000)
        .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime()),
    [calendarEvents],
  );
  const nextEvent = upcomingEvents[0];
  const minsToNext = nextEvent?.start ? Math.round((new Date(nextEvent.start).getTime() - Date.now()) / 60_000) : null;
  const freshEpisode =
    publishedEpisodes[0]?.publishedAt &&
    Date.now() - new Date(publishedEpisodes[0].publishedAt).getTime() < 48 * 3600_000
      ? publishedEpisodes[0]
      : null;

  // Studio hero mode: live > about-to-record > just-published > ready.
  const studioMode: "live" | "soon" | "published" | "ready" = liveNow
    ? "live"
    : minsToNext !== null && minsToNext <= 60
      ? "soon"
      : freshEpisode
        ? "published"
        : "ready";

  const last30 = Date.now() - 30 * 86_400_000;
  const streams30 = sessions.filter((s) => s.startedAt && new Date(s.startedAt).getTime() >= last30);
  const minutes30 = streams30.reduce((sum, s) => {
    if (!s.startedAt || !s.endedAt) return sum;
    return sum + Math.max(0, (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000);
  }, 0);
  const totalFollowers = Object.values(uploadPostAnalytics ?? {}).reduce(
    (sum, v) => sum + (typeof v?.followers === "number" ? v.followers : 0),
    0,
  );
  const clipsCount = mediaItems.filter((m) => m.platform === "live" || m.platform === "media-lab").length;

  const chartPoints = useMemo(() => {
    const days: Array<{ label: string; minutes: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day.getTime() + 86_400_000);
      const minutes = sessions.reduce((sum, s) => {
        if (!s.startedAt || !s.endedAt) return sum;
        const st = new Date(s.startedAt).getTime();
        if (st < day.getTime() || st >= next.getTime()) return sum;
        return sum + Math.max(0, (new Date(s.endedAt).getTime() - st) / 60_000);
      }, 0);
      days.push({ label: day.toLocaleDateString(undefined, { day: "numeric" }), minutes });
    }
    return days;
  }, [sessions]);

  // Calendar month state + event-day dots
  const [calMonth, setCalMonth] = useState(() => new Date());
  // Clicking a calendar date turns the Schedule card into that day's agenda.
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const dayEvents = useMemo(() => {
    if (!selectedDay) return null;
    return (calendarEvents?.events ?? [])
      .filter((e) => {
        if (!e.start) return false;
        const d = new Date(e.start);
        return (
          d.getFullYear() === selectedDay.getFullYear() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getDate() === selectedDay.getDate()
        );
      })
      .sort((a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime());
  }, [calendarEvents, selectedDay]);
  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of calendarEvents?.events ?? []) {
      if (!e.start) continue;
      const d = new Date(e.start);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [calendarEvents]);

  // Recent activity — merged from real streams of events
  const activity = useMemo(() => {
    const items: Array<{ at: Date; icon: React.ComponentType<{ size?: number | string; className?: string }>; text: string; tint: string }> = [];
    for (const e of publishedEpisodes.slice(0, 5)) {
      if (e.publishedAt) items.push({ at: new Date(e.publishedAt), icon: Mic, text: `Episode published — ${e.title}`, tint: "text-red-400 bg-red-500/10" });
    }
    for (const s of sessions.slice(0, 6)) {
      if (s.endedAt && s.startedAt) {
        const mins = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60_000);
        items.push({ at: new Date(s.endedAt), icon: Radio, text: `Live stream ended — ${mins} min on the air`, tint: "text-violet-400 bg-violet-500/10" });
      }
    }
    for (const m of mediaItems.slice(0, 8)) {
      if (!m.postedAt) continue;
      if (m.platform === "media-lab") items.push({ at: new Date(m.postedAt), icon: Gem, text: `Refined — ${m.caption || "untitled"}`, tint: "text-amber-400 bg-amber-500/10" });
      else if (m.platform === "live") items.push({ at: new Date(m.postedAt), icon: Scissors, text: `Clip cut — ${m.caption || "untitled"}`, tint: "text-emerald-400 bg-emerald-500/10" });
    }
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 4);
  }, [publishedEpisodes, sessions, mediaItems]);

  const hosting = Object.entries(data?.distributionStatus ?? {});
  const maxDuration = Math.max(...publishedEpisodes.slice(0, 4).map((e) => e.durationSeconds ?? 0), 1);

  if (isLoading) {
    return (
      <div className="min-h-full w-full bg-gradient-to-b from-[#101014] to-[#0a0a0d]">
        <div className="mx-auto w-full max-w-[1600px] px-5 pb-4 pt-3">
          <Skeleton className="mb-6 h-8 w-64 bg-zinc-800" />
          <div className="grid gap-3 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl bg-zinc-800" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#101014] to-[#0a0a0d]">
      <div className="mx-auto w-full max-w-[1600px] px-5 pb-4 pt-3">
        {/* ═══ Level 2 — primary operational cards ═══ */}
        <div className="mb-3 grid gap-3 lg:grid-cols-3">
          {/* Studio — alive, adaptive */}
          <DashCard elevated title="Studio" action={<CardLink href="/studio/live">Go to Studio <ArrowRight size={12} /></CardLink>}>
            <div className="relative overflow-hidden rounded-xl bg-[radial-gradient(120%_140%_at_10%_0%,#3b1219_0%,#18181b_55%,#101014_100%)] p-4 ring-1 ring-white/[0.06]">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-red-600/20 blur-3xl"
                aria-hidden
              />
              {studioMode === "live" && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> On air
                  </span>
                  <p className="mt-2 text-base font-semibold leading-snug text-white">You're live right now</p>
                  {liveNow?.startedAt && (
                    <p className="mt-1 text-[13px] text-zinc-400">Started {timeAgo(new Date(liveNow.startedAt))}</p>
                  )}
                  <Link href="/studio/live" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Enter Studio <ArrowRight size={14} />
                  </Link>
                </>
              )}
              {studioMode === "soon" && nextEvent && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Up next
                  </span>
                  <p className="mt-2 text-base font-semibold leading-snug text-white">
                    {minsToNext !== null && minsToNext <= 1 ? "Starting now" : `In ${minsToNext} minutes`}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-zinc-400">{nextEvent.title}</p>
                  <div className="mt-3 space-y-1.5">
                    <ReadyRow ok={devices?.cam ?? null} label="Camera" detail={devices?.cam ? "detected" : "not found"} />
                    <ReadyRow ok={devices?.mic ?? null} label="Mic" detail={devices?.mic ? "detected" : "not found"} />
                    {pickedChannels.length > 0 && <ReadyRow ok label="Channels" detail={pickedChannels.join(" + ")} />}
                  </div>
                  <Link href="/studio/live" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Enter Studio <ArrowRight size={14} />
                  </Link>
                </>
              )}
              {studioMode === "published" && freshEpisode && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Just shipped
                  </span>
                  <p className="mt-3 line-clamp-2 text-lg font-semibold leading-snug text-white">{freshEpisode.title}</p>
                  <p className="mt-1 text-[13px] text-zinc-400">
                    Published {freshEpisode.publishedAt ? timeAgo(new Date(freshEpisode.publishedAt)) : ""}
                    {freshEpisode.durationSeconds ? ` · ${fmtRuntime(freshEpisode.durationSeconds)}` : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link href="/dashboard/social-hub" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                      <Share2 size={13} /> Promote it
                    </Link>
                    <Link href="/episodes" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500">
                      View episodes
                    </Link>
                  </div>
                </>
              )}
              {studioMode === "ready" && (
                <>
                  <p className="text-lg font-semibold leading-snug text-white">Ready to record?</p>
                  <p className="mt-1 text-[13px] text-zinc-400">High-quality recordings in one click.</p>
                  <div className="mt-3 space-y-1.5">
                    <ReadyRow ok={devices?.cam ?? null} label="Camera" detail={devices?.cam ? "detected" : "not found yet"} />
                    <ReadyRow ok={devices?.mic ?? null} label="Mic" detail={devices?.mic ? "detected" : "not found yet"} />
                    {pickedChannels.length > 0 && <ReadyRow ok label="Channels" detail={pickedChannels.join(" + ")} />}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href="/studio/live" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700">
                      <span className="h-2 w-2 rounded-full bg-white" /> Start Recording
                    </Link>
                    <Link href="/studio/live" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500">
                      <Radio size={13} /> Go Live
                    </Link>
                  </div>
                </>
              )}
            </div>
            {upcomingEvents.length > 0 && studioMode !== "soon" && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                <CalendarClock size={12} />
                Next on the calendar: <span className="truncate text-zinc-400">{upcomingEvents[0].title}</span>
              </p>
            )}
          </DashCard>

          {/* Podcast overview */}
          <DashCard elevated title="Podcast Overview" action={<CardLink href="/episodes">View all episodes <ArrowRight size={12} /></CardLink>}>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {([
                [String(episodes.length), "Total episodes"],
                [String(publishedEpisodes.length), "Published"],
                [totalRuntime > 0 ? fmtRuntime(totalRuntime) : "—", "Total runtime"],
              ] as const).map(([value, label]) => (
                <div key={label} className="rounded-xl bg-zinc-950/70 px-3 py-1.5 ring-1 ring-white/[0.05]">
                  <p className="text-base font-bold tabular-nums text-white">{value}</p>
                  <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Hosting &amp; links</p>
            <div className="space-y-1">
              {hosting.length === 0 && !data?.hasRssFeed ? (
                <Link href="/shows" className="block rounded-xl border border-dashed border-zinc-700 px-3 py-3 text-center text-[13px] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300">
                  Connect your podcast host to light this up →
                </Link>
              ) : (
                <>
                  {hosting.map(([platform, status]) => {
                    const meta = HOSTING_META[platform] ?? { label: platform, color: "#71717a" };
                    const live = status === "approved";
                    return (
                      <div key={platform} className="flex items-center gap-2.5 rounded-lg bg-zinc-950/50 px-3 py-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: live ? meta.color : "#3f3f46" }} />
                        <span className="flex-1 text-[13px] font-medium text-zinc-200">{meta.label}</span>
                        <span className={`text-xs ${live ? "font-medium text-emerald-400" : "text-zinc-500"}`}>
                          {live ? "Live" : status === "submitted" ? "Pending" : "Not submitted"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2.5 rounded-lg bg-zinc-950/50 px-3 py-2">
                    <Rss size={12} className="shrink-0 text-orange-400" />
                    <span className="flex-1 text-[13px] font-medium text-zinc-200">RSS feed</span>
                    <span className={`text-xs ${data?.hasRssFeed ? "font-medium text-emerald-400" : "text-zinc-500"}`}>
                      {data?.hasRssFeed ? "Connected" : "Not connected"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </DashCard>

          {/* Studio activity — a real measured chart */}
          <DashCard elevated title="Studio Activity" action={<span className="text-xs text-zinc-500">Last 14 days</span>}>
            <ActivityChart points={chartPoints} />
            <div className="mt-1 flex justify-between text-[11px] text-zinc-600">
              <span>{chartPoints[0]?.label}</span>
              <span>minutes on the air per day</span>
              <span>{chartPoints[chartPoints.length - 1]?.label}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                [String(streams30.length), "Streams · 30d"],
                [`${Math.round(minutes30)}m`, "On air · 30d"],
                [String(clipsCount), "Clips & refined"],
                [totalFollowers > 0 ? compact(totalFollowers) : "—", "Followers"],
              ] as const).map(([value, label]) => (
                <div key={label} className="rounded-xl bg-zinc-950/70 px-3 py-1.5 ring-1 ring-white/[0.05]">
                  <p className="text-base font-bold tabular-nums text-white">{value}</p>
                  <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">Only numbers we actually measure — no estimates.</p>
          </DashCard>
        </div>

        {/* ═══ Level 3 — business & activity layer ═══ */}
        <div className="mb-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* Social performance — adaptive when nothing is connected */}
          <DashCard title="Social Performance" action={<CardLink href="/dashboard/social-hub">Manage <ArrowRight size={12} /></CardLink>}>
            {connectedSocials.length === 0 ? (
              <div className="flex h-full min-h-[110px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center">
                <Share2 className="h-6 w-6 text-zinc-600" />
                <p className="text-[13px] leading-relaxed text-zinc-500">
                  Connect your channels and this card fills with real follower numbers.
                </p>
                <Link href="/dashboard/social-hub" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-700">
                  Connect accounts
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {connectedSocials.slice(0, 4).map((account) => {
                  const key = account.platform.toLowerCase();
                  const meta = SOCIAL_META[key];
                  const followers = uploadPostAnalytics?.[key]?.followers;
                  const Icon = meta?.Icon;
                  return (
                    <div key={account.platform} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-950/60">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-950 ring-1 ring-white/[0.06]">
                        {Icon ? <Icon size={13} color={meta.color} /> : <Share2 size={13} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-200">{meta?.label ?? account.platform}</span>
                        {account.platformUsername && (
                          <span className="block truncate text-[11px] text-zinc-500">@{account.platformUsername}</span>
                        )}
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums text-zinc-300">
                        {typeof followers === "number" && followers > 0 ? compact(followers) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Weekly schedule — or the selected day's agenda when a calendar date is clicked */}
          <DashCard
            title={
              selectedDay
                ? selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
                : "Weekly Schedule"
            }
            action={
              selectedDay ? (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-400 transition-colors hover:text-red-300"
                >
                  Show week
                </button>
              ) : calendarStatus?.connected ? (
                <span className="flex items-center gap-1 text-[11px] text-zinc-500"><SiGooglecalendar size={10} /> Synced</span>
              ) : undefined
            }
          >
            {selectedDay && dayEvents ? (
              dayEvents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-[13px] text-zinc-500">
                  Nothing on the calendar this day — it's yours.
                </p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.slice(0, 3).map((event) => {
                    const start = event.start ? new Date(event.start) : null;
                    return (
                      <a
                        key={event.id}
                        href={event.htmlLink ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg bg-zinc-950/60 px-2.5 py-2 ring-1 ring-white/[0.04] transition-colors hover:ring-white/10"
                      >
                        {start && (
                          <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-white/[0.06]">
                            <span className="text-[9px] font-bold uppercase text-red-400">
                              {start.toLocaleDateString(undefined, { weekday: "short" })}
                            </span>
                            <span className="text-[13px] font-bold tabular-nums text-white">{start.getDate()}</span>
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-zinc-200">{event.title}</span>
                          {start && !event.allDay && (
                            <span className="block text-[11px] text-zinc-500">
                              {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            </span>
                          )}
                        </span>
                      </a>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <p className="px-1 text-[11px] text-zinc-500">+{dayEvents.length - 3} more this day</p>
                  )}
                </div>
              )
            ) : !calendarStatus?.connected ? (
              <div className="flex h-full min-h-[110px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center">
                <SiGooglecalendar size={20} className="text-zinc-600" />
                <p className="text-[13px] leading-relaxed text-zinc-500">Connect Google Calendar to see your recording week here.</p>
                <Link href="/connectors" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-700">
                  Connect calendar
                </Link>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-[13px] text-zinc-500">
                Nothing scheduled — a clear week is a recording week.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 3).map((event) => {
                  const start = event.start ? new Date(event.start) : null;
                  return (
                    <a
                      key={event.id}
                      href={event.htmlLink ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-lg bg-zinc-950/60 px-2.5 py-2 ring-1 ring-white/[0.04] transition-colors hover:ring-white/10"
                    >
                      {start && (
                        <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-white/[0.06]">
                          <span className="text-[9px] font-bold uppercase text-red-400">
                            {start.toLocaleDateString(undefined, { weekday: "short" })}
                          </span>
                          <span className="text-[13px] font-bold tabular-nums text-white">{start.getDate()}</span>
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-200">{event.title}</span>
                        {start && !event.allDay && (
                          <span className="block text-[11px] text-zinc-500">
                            {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Calendar */}
          <DashCard title="Calendar">
            <MonthCalendar
              eventDays={eventDays}
              month={calMonth}
              onMonth={(delta) => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))}
              selected={selectedDay}
              onSelect={setSelectedDay}
            />
          </DashCard>

          {/* Upcoming releases */}
          <DashCard title="Upcoming Releases" action={<CardLink href="/episodes">View all <ArrowRight size={12} /></CardLink>}>
            {draftEpisodes.length === 0 ? (
              <div className="flex h-full min-h-[110px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-6 text-center">
                <Clapperboard className="h-6 w-6 text-zinc-600" />
                <p className="text-[13px] leading-relaxed text-zinc-500">Nothing in the works yet — drafts land here.</p>
                <Link href="/episodes" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[13px] font-semibold text-zinc-100 hover:bg-zinc-700">
                  Start an episode
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {draftEpisodes.slice(0, 3).map((episode) => (
                  <Link key={episode.id} href="/episodes" className="flex items-center gap-2.5 rounded-lg bg-zinc-950/60 px-2.5 py-2 ring-1 ring-white/[0.04] transition-colors hover:ring-white/10">
                    {episode.artworkUrl ? (
                      <img src={episode.artworkUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/[0.06]">
                        <Mic size={13} className="text-zinc-500" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-200">{episode.title}</span>
                      <span className="block text-[11px] text-zinc-500">
                        {episode.episodeNumber ? `EP ${episode.episodeNumber} · ` : ""}
                        {episode.createdAt ? timeAgo(new Date(episode.createdAt)) : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Draft</span>
                  </Link>
                ))}
              </div>
            )}
          </DashCard>
        </div>

        {/* ═══ Level 4 — supporting intelligence ═══ */}
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Recent activity */}
          <DashCard title="Recent Activity">
            {activity.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-[13px] text-zinc-500">
                Publish an episode or go live and the trail starts here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activity.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.tint}`}>
                        <Icon size={13} />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">{item.text}</p>
                      <span className="shrink-0 text-[11px] tabular-nums text-zinc-600">{timeAgo(item.at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Latest episodes — runtime bars are measured, not listens */}
          <DashCard title="Latest Episodes" action={<span className="text-xs text-zinc-500">by runtime</span>}>
            {publishedEpisodes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-[13px] text-zinc-500">
                Published episodes and their runtimes will rank here.
              </p>
            ) : (
              <div className="space-y-3">
                {publishedEpisodes.slice(0, 3).map((episode) => (
                  <div key={episode.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-300">{episode.title}</p>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-zinc-400">
                        {episode.durationSeconds ? fmtRuntime(episode.durationSeconds) : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                        style={{ width: `${Math.max(6, ((episode.durationSeconds ?? 0) / maxDuration) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          {/* Quick actions */}
          <DashCard title="Quick Actions">
            <div className="grid grid-cols-3 gap-2">
              {([
                ["Record", Mic, "/studio/live", "bg-red-500/15 text-red-400"],
                ["Go Live", Radio, "/studio/live", "bg-violet-500/15 text-violet-400"],
                ["Refine", Gem, "/studio/refine", "bg-amber-500/15 text-amber-400"],
                ["Post", PenSquare, "/social/posts", "bg-sky-500/15 text-sky-400"],
                ["Newsletter", Mail, "/dashboard/email", "bg-emerald-500/15 text-emerald-400"],
                ["Invite Guest", UserPlus, "/guests", "bg-pink-500/15 text-pink-400"],
              ] as const).map(([label, Icon, href, tint]) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-xl bg-zinc-950/60 px-2 py-2 ring-1 ring-white/[0.05] transition-colors hover:ring-white/15"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
                    <Icon size={15} />
                  </span>
                  <span className="text-center text-xs font-medium leading-tight text-zinc-300">{label}</span>
                </Link>
              ))}
            </div>
          </DashCard>
        </div>
      </div>
    </div>
  );
}
