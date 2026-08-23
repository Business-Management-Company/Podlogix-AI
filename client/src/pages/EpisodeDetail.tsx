/**
 * EpisodeDetail — the Episode as a first-class object (v2 Phase 3).
 *
 * Routes: /shows/:showId/episodes/:episodeId and /episodes/:episodeId
 *
 * Works for BOTH native episodes (raw id → GET /api/episodes/:id) and
 * Buzzsprout-synced episodes (id prefixed "bz-" → GET /api/connectors/buzzsprout/episodes/:id,
 * where the id is the buzzsprout_episodes DB row id).
 *
 * All tabs are read-only in v1 — no save flows this phase.
 *
 * Long-term six-tab lifecycle model: Plan / Content / Publish / Promote / Sponsors / Results.
 * Plan and Sponsors are deferred; add them to TABS below when their workspaces land.
 */

import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mic2,
  Play,
  CalendarDays,
  Clock,
  FileText,
  Sparkles,
  Share2,
  BarChart3,
} from "lucide-react";
import { Card, EmptyState, SectionHeader, StatusPill, StatTile } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/design-tokens";
import type { Episode as NativeEpisode } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuzzsproutEpisode {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  showNotes: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  totalPlays?: number | null;
  status: string;
  publishedAt: string | null;
  isExplicit: boolean | null;
}

/** Normalized view over native + buzzsprout episodes. */
interface EpisodeView {
  source: "native" | "buzzsprout";
  title: string;
  description: string | null;
  showNotes: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  isExplicit: boolean;
  status: string;
  publishedAt: string | null;
  totalPlays: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map raw status to lifecycle label + pill tone. */
function lifecycleStatus(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case "published":
      return { label: "Published", tone: "success" };
    case "scheduled":
      return { label: "Scheduled", tone: "info" };
    case "draft":
      return { label: "In production", tone: "warning" };
    case "idea":
      return { label: "Idea", tone: "neutral" };
    case "planned":
      return { label: "Planned", tone: "neutral" };
    case "ready":
      return { label: "Ready", tone: "info" };
    case "archived":
      return { label: "Archived", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Minimal sanitization: strip <script> tags before rendering hosted-provider HTML. */
function stripScripts(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<script[^>]*\/?>/gi, "");
}

// ─── Tab config ───────────────────────────────────────────────────────────────
// Structured as an array so deferred tabs (Plan, Sponsors) drop in trivially.

const TABS = [
  { id: "content", label: "Content" },
  { id: "publish", label: "Publish" },
  { id: "promote", label: "Promote" },
  { id: "results", label: "Results" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EpisodeDetail() {
  const params = useParams<{ showId?: string; episodeId: string }>();
  const showId = params.showId;
  const rawId = params.episodeId ?? "";
  const isBuzzsprout = rawId.startsWith("bz-");
  const bzId = isBuzzsprout ? rawId.slice(3) : null;
  const [activeTab, setActiveTab] = useState<TabId>("content");

  const backHref = showId ? `/shows/${showId}/episodes` : "/episodes";

  const nativeQuery = useQuery<NativeEpisode>({
    queryKey: ["/api/episodes", rawId],
    enabled: !isBuzzsprout && !!rawId,
  });

  const bzQuery = useQuery<{ episode: BuzzsproutEpisode }>({
    queryKey: ["/api/connectors/buzzsprout/episodes", bzId],
    enabled: isBuzzsprout && !!bzId,
  });

  const isLoading = isBuzzsprout ? bzQuery.isLoading : nativeQuery.isLoading;
  const isError = isBuzzsprout ? bzQuery.isError : nativeQuery.isError;

  let episode: EpisodeView | null = null;
  if (isBuzzsprout && bzQuery.data?.episode) {
    const ep = bzQuery.data.episode;
    episode = {
      source: "buzzsprout",
      title: ep.title,
      description: ep.description,
      showNotes: ep.showNotes,
      audioUrl: ep.audioUrl,
      artworkUrl: ep.artworkUrl,
      durationSeconds: ep.durationSeconds,
      episodeNumber: ep.episodeNumber,
      seasonNumber: ep.seasonNumber,
      isExplicit: !!ep.isExplicit,
      status: ep.status,
      publishedAt: ep.publishedAt,
      totalPlays: ep.totalPlays ?? null,
    };
  } else if (!isBuzzsprout && nativeQuery.data) {
    const ep = nativeQuery.data;
    episode = {
      source: "native",
      title: ep.title,
      description: ep.description,
      showNotes: ep.showNotes,
      audioUrl: ep.audioUrl,
      artworkUrl: ep.artworkUrl,
      durationSeconds: ep.durationSeconds,
      episodeNumber: ep.episodeNumber,
      seasonNumber: ep.seasonNumber,
      isExplicit: !!ep.isExplicit,
      status: ep.status,
      publishedAt: ep.publishedAt ? new Date(ep.publishedAt).toISOString() : null,
      totalPlays: null,
    };
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl px-6 py-8 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !episode) {
    return (
      <div className="w-full max-w-5xl px-6 py-8">
        <EmptyState
          icon={Mic2}
          title="Episode not found"
          description="This episode may have been deleted, or you may not have access to it."
          action={{ label: "Back to episodes", href: backHref }}
        />
      </div>
    );
  }

  const st = lifecycleStatus(episode.status);
  const duration = formatDuration(episode.durationSeconds);
  const pubDate = formatDate(episode.publishedAt);

  return (
    <div className="w-full max-w-5xl px-6 py-8">
      {/* Header */}
      <Link href={backHref}>
        <span className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600">
          <ArrowLeft size={13} />
          Back to episodes
        </span>
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">{episode.title}</h1>

      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <StatusPill tone={st.tone}>{st.label}</StatusPill>
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
          {pubDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} />
              {pubDate}
            </span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {duration}
            </span>
          )}
          {episode.episodeNumber != null && <span>Episode {episode.episodeNumber}</span>}
          {episode.seasonNumber != null && <span>Season {episode.seasonNumber}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-1.5 border-b border-zinc-100 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-zinc-950 text-white"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            )}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto pb-0.5 text-[11px] text-zinc-300">Read-only preview</span>
      </div>

      <div className="mt-6">
        {activeTab === "content" && <ContentTab episode={episode} />}
        {activeTab === "publish" && <PublishTab episode={episode} showId={showId} />}
        {activeTab === "promote" && <PromoteTab />}
        {activeTab === "results" && <ResultsTab episode={episode} />}
      </div>
    </div>
  );
}

// ─── Content tab ──────────────────────────────────────────────────────────────

function ContentTab({ episode }: { episode: EpisodeView }) {
  const notesHtml = episode.showNotes ?? episode.description;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {episode.artworkUrl ? (
          <img src={episode.artworkUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
            <Mic2 size={22} className="text-zinc-300" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {episode.audioUrl ? (
            <audio controls src={episode.audioUrl} className="w-full" preload="none" />
          ) : (
            <p className="text-xs text-zinc-400">No audio file attached yet.</p>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Show notes" />
        <Card padding="lg">
          {notesHtml ? (
            <div
              className="prose prose-sm prose-zinc max-w-none text-[13px] leading-relaxed text-zinc-600 [&_a]:text-emerald-700 [&_a]:underline [&_p]:my-2"
              // Provider HTML (Buzzsprout show notes); <script> tags stripped before render.
              dangerouslySetInnerHTML={{ __html: stripScripts(notesHtml) }}
            />
          ) : (
            <p className="text-xs text-zinc-400">No show notes yet.</p>
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title="Transcript" />
        <Card tone="dashed" padding="lg">
          <p className="flex items-center gap-2 text-xs text-zinc-400">
            <FileText size={13} />
            Transcript — not available yet
          </p>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Sparkles size={11} className="text-emerald-600" />
        Tip: use the AI assistant (top right) to draft show notes from this episode.
      </p>
    </div>
  );
}

// ─── Publish tab ──────────────────────────────────────────────────────────────

function PublishTab({ episode, showId }: { episode: EpisodeView; showId?: string }) {
  const st = lifecycleStatus(episode.status);
  const rows: Array<[string, string]> = [
    ["Title", episode.title],
    ["Episode number", episode.episodeNumber != null ? String(episode.episodeNumber) : "—"],
    ["Season", episode.seasonNumber != null ? String(episode.seasonNumber) : "—"],
    ["Explicit", episode.isExplicit ? "Yes" : "No"],
    ["Published", formatDate(episode.publishedAt) ?? "Not yet published"],
    ["Status", st.label],
  ];
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title="Metadata" />
        <Card>
          <dl className="divide-y divide-zinc-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-xs text-zinc-400">{label}</dt>
                <dd className="truncate text-[13px] font-medium text-zinc-950">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div>
        <SectionHeader title="Destinations" />
        {showId ? (
          <Link href={`/shows/${showId}/directories`}>
            <Card interactive padding="md" className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium text-zinc-950">Manage where this show is live</p>
                <p className="mt-0.5 text-xs text-zinc-400">Spotify, Apple Podcasts, and other directories.</p>
              </div>
              <Share2 size={15} className="shrink-0 text-zinc-300" />
            </Card>
          </Link>
        ) : (
          <Card tone="subtle" padding="md">
            <p className="text-xs text-zinc-400">Open this episode from a show to manage its destinations.</p>
          </Card>
        )}
        <p className="mt-2 text-[11px] text-zinc-400">Per-episode destination control is coming.</p>
      </div>
    </div>
  );
}

// ─── Promote tab ──────────────────────────────────────────────────────────────

function PromoteTab() {
  // TODO(Phase 5): AI social generation moves here from Social Hub.
  return (
    <div className="space-y-4">
      <EmptyState
        icon={Share2}
        title="Promotion workspace coming next"
        description="Promotion workspace for this episode is coming next — clips, social posts, and newsletter drafts will live here."
        action={{ label: "Open Social Hub", href: "/dashboard/social-hub" }}
      />
    </div>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────────

function ResultsTab({ episode }: { episode: EpisodeView }) {
  if (episode.source !== "buzzsprout") {
    return (
      <EmptyState
        icon={BarChart3}
        title="No results yet"
        description="Performance appears here after publish."
      />
    );
  }
  return (
    <div>
      <SectionHeader title="Performance" />
      <Card padding="lg">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <StatTile
            label="Total plays"
            value={episode.totalPlays != null ? episode.totalPlays.toLocaleString() : "Analytics syncing"}
            icon={Play}
          />
          <StatTile label="Published" value={formatDate(episode.publishedAt) ?? "—"} icon={CalendarDays} color="#3b82f6" />
          <StatTile label="Duration" value={formatDuration(episode.durationSeconds) ?? "—"} icon={Clock} color="#f59e0b" />
        </div>
      </Card>
    </div>
  );
}
