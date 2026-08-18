import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  CalendarClock, CalendarRange, Loader2, PenSquare, Repeat, Send, Save, Sparkles, Upload, X as XIcon,
} from "lucide-react";
import {
  SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiTiktok, SiX, SiThreads,
  SiReddit, SiPinterest, SiBluesky, SiDiscord, SiTelegram,
} from "react-icons/si";

interface UploadPostAccount {
  id: string;
  platform: string;
  platformUsername: string;
  isConnected: boolean;
  reauthRequired?: boolean;
}

interface LocalPost {
  id: string;
  platforms: string[];
  content: string;
  mediaUrls: string[] | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

const ALL_PLATFORMS = [
  "instagram", "youtube", "facebook", "linkedin", "x", "tiktok",
  "threads", "reddit", "pinterest", "bluesky", "discord", "telegram",
];

/** Platforms that reject text-only posts — they need a photo or video attached. */
const MEDIA_REQUIRED = new Set(["instagram", "youtube", "tiktok", "pinterest"]);

/**
 * Per-platform photo size caps in MB (support-confirmed). Oversize uploads die
 * at Upload-Post's proxy as an unexplained 413, so we block them client-side
 * with a reason instead. X also caps at 4 images.
 */
const PHOTO_LIMIT_MB: Record<string, number> = {
  facebook: 10, linkedin: 8, instagram: 8, threads: 8, x: 5,
};

/** Video caps in MB — Instagram Reels 300MB/15min and Threads 100MB/5min are the tight ones. */
const VIDEO_LIMIT_MB: Record<string, number> = {
  instagram: 300, threads: 100,
};

function mediaSizeConflicts(platforms: string[], sizeMB: number, type: "photo" | "video"): string[] {
  const limits = type === "photo" ? PHOTO_LIMIT_MB : VIDEO_LIMIT_MB;
  return platforms.filter((p) => limits[p] !== undefined && sizeMB > limits[p]);
}

function readablePostError(status: number | undefined, fallback: string): string {
  switch (status) {
    case 413: return "That file is too large for one of the selected platforms — try a smaller file.";
    case 401:
    case 403: return "A connected account needs to be reconnected before posting.";
    case 429: return "Posting too fast — give it a minute and try again.";
    default:
      if (status && status >= 500) return "Upload-Post is having trouble right now — your content is safe, try again shortly.";
      return fallback;
  }
}

const PLATFORM_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: "Instagram", icon: SiInstagram },
  youtube: { label: "YouTube", icon: SiYoutube },
  facebook: { label: "Facebook", icon: SiFacebook },
  linkedin: { label: "LinkedIn", icon: SiLinkedin },
  x: { label: "X", icon: SiX },
  tiktok: { label: "TikTok", icon: SiTiktok },
  threads: { label: "Threads", icon: SiThreads },
  reddit: { label: "Reddit", icon: SiReddit },
  pinterest: { label: "Pinterest", icon: SiPinterest },
  bluesky: { label: "Bluesky", icon: SiBluesky },
  discord: { label: "Discord", icon: SiDiscord },
  telegram: { label: "Telegram", icon: SiTelegram },
};

type ComposerTab = "single" | "campaign" | "cadence";

export default function SocialPosts() {
  const { toast } = useToast();
  const search = useSearch();
  const initialTab = (new URLSearchParams(search).get("tab") as ComposerTab) || "single";

  const [tab, setTab] = useState<ComposerTab>(initialTab);
  // Nav's Campaign/Cadence entries deep-link with ?tab= — follow it even when
  // the composer is already mounted.
  useEffect(() => setTab(initialTab), [initialTab]);
  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [timing, setTiming] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [subreddit, setSubreddit] = useState("");
  const [pinterestBoardId, setPinterestBoardId] = useState("");
  const [mediaSizeMB, setMediaSizeMB] = useState<number | null>(null);

  const { data: accountsData } = useQuery<{ accounts: UploadPostAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const connected = new Set(
    (accountsData?.accounts ?? []).filter((a) => a.isConnected && !a.reauthRequired).map((a) => a.platform.toLowerCase())
  );

  const { data: postsData } = useQuery<{ posts: LocalPost[] }>({
    queryKey: ["/api/upload-post/posts"],
    retry: false,
  });
  const drafts = (postsData?.posts ?? []).filter((p) => p.status === "draft");

  const wantsReddit = selected.includes("reddit");
  const wantsPinterest = selected.includes("pinterest");

  const { data: boardsData } = useQuery<{ boards?: { id: string; name: string }[] }>({
    queryKey: ["/api/upload-post/pinterest/boards"],
    enabled: wantsPinterest,
    retry: false,
  });
  const pinterestBoards = boardsData?.boards ?? [];

  interface ScheduledJob {
    job_id: string;
    title?: string;
    platform?: string[] | string;
    scheduled_date?: string;
  }
  const { data: scheduledData, refetch: refetchScheduled } = useQuery<{ jobs: ScheduledJob[] }>({
    queryKey: ["/api/upload-post/scheduled"],
    retry: false,
  });
  const scheduledJobs = scheduledData?.jobs ?? [];

  const cancelScheduledMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("DELETE", `/api/upload-post/scheduled/${jobId}`);
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      refetchScheduled();
      queryClient.invalidateQueries({ queryKey: ["/api/upload-post/posts"] });
      toast({ title: "Scheduled post cancelled" });
    },
    onError: () => toast({ title: "Couldn't cancel", variant: "destructive" }),
  });

  // Every connected platform is always selectable — content requirements are
  // surfaced as warnings at post time, not by locking chips.
  const platformDisabledReason = (platform: string): string | null =>
    connected.has(platform) ? null : "Not connected";

  const effectiveSelected = useMemo(
    () => selected.filter((p) => connected.has(p)),
    [selected, accountsData]
  );

  /** Why the selected platforms can't take this post yet (empty = good to go). */
  const contentIssues = useMemo(() => {
    const issues: string[] = [];
    if (effectiveSelected.includes("youtube") && mediaType !== "video") {
      issues.push("YouTube only takes video posts — attach a video or unselect it");
    }
    const needMedia = effectiveSelected.filter((p) => p !== "youtube" && MEDIA_REQUIRED.has(p) && !mediaUrl);
    if (needMedia.length > 0) {
      issues.push(`${needMedia.map((p) => PLATFORM_META[p].label).join(" and ")} need${needMedia.length === 1 ? "s" : ""} a photo or video attached`);
    }
    if (mediaUrl && mediaType && mediaSizeMB !== null) {
      for (const p of mediaSizeConflicts(effectiveSelected, mediaSizeMB, mediaType)) {
        const limit = (mediaType === "photo" ? PHOTO_LIMIT_MB : VIDEO_LIMIT_MB)[p];
        issues.push(`Your file is over ${PLATFORM_META[p].label}'s ${limit}MB limit`);
      }
    }
    return issues;
  }, [effectiveSelected, mediaUrl, mediaType, mediaSizeMB]);

  const togglePlatform = (platform: string) => {
    if (platformDisabledReason(platform)) return;
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const resetComposer = () => {
    setContent("");
    setMediaUrl(null);
    setMediaType(null);
    setSelected([]);
    setTiming("now");
    setScheduledAt("");
  };

  const postMutation = useMutation({
    mutationFn: async ({ draft }: { draft: boolean }) => {
      const res = await apiRequest("POST", "/api/upload-post/posts", {
        platforms: effectiveSelected,
        content: content.trim(),
        mediaUrl,
        mediaType,
        scheduledAt: timing === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        draft,
        subreddit: wantsReddit ? subreddit : undefined,
        pinterestBoardId: wantsPinterest ? pinterestBoardId : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(readablePostError(res.status, data.message || "Something went wrong — try again."));
      }
      return res.json();
    },
    onSuccess: (_data, { draft }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/upload-post/posts"] });
      toast({
        title: draft
          ? "Draft saved"
          : timing === "schedule"
            ? "Post scheduled"
            : `Posted to ${effectiveSelected.length} platform${effectiveSelected.length === 1 ? "" : "s"}`,
      });
      resetComposer();
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't post", description: err.message, variant: "destructive" });
    },
  });

  const loadDraft = (draft: LocalPost) => {
    setTab("single");
    setContent(draft.content);
    setSelected(draft.platforms);
    setMediaUrl(draft.mediaUrls?.[0] ?? null);
    setMediaType(draft.mediaUrls?.[0]?.match(/\.(mp4|mov|webm)($|\?)/i) ? "video" : draft.mediaUrls?.[0] ? "photo" : null);
    if (draft.scheduledAt) {
      setTiming("schedule");
      setScheduledAt(draft.scheduledAt.slice(0, 16));
    }
    toast({ title: "Draft loaded" });
  };

  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const canSubmit = effectiveSelected.length > 0 && (content.trim() || mediaUrl) && !postMutation.isPending
    && (timing === "now" || scheduledAt)
    && contentIssues.length === 0
    && (!wantsReddit || subreddit.trim().length > 0)
    && (!wantsPinterest || pinterestBoardId.length > 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Posts</h1>
        <p className="mt-1 text-sm text-zinc-500">Publish everywhere at once — now, scheduled, or on a rhythm.</p>
      </div>

      {/* Composer mode tabs */}
      <div className="mb-6 flex items-center gap-2">
        {([
          ["single", "Single Post", PenSquare],
          ["campaign", "Campaign", CalendarRange],
          ["cadence", "Cadence", Repeat],
        ] as [ComposerTab, string, React.ComponentType<{ size?: number; className?: string }>][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-500 hover:border-zinc-300"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab !== "single" ? (
        <EmptyState
          icon={tab === "campaign" ? CalendarRange : Repeat}
          title={tab === "campaign" ? "Campaigns are coming soon" : "Cadences are coming soon"}
          description={
            tab === "campaign"
              ? "Run a date-to-date push around one theme — a launch, an event, a promotion — with every post planned across the range."
              : "Set a weekly rhythm — Monday/Wednesday/Friday, themes or calls-to-action per day — and let your channels stay active on autopilot."
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {/* Platform picker */}
            <Card padding="lg">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Post to</p>
              <div className="flex flex-wrap gap-2">
                {ALL_PLATFORMS.map((platform) => {
                  const meta = PLATFORM_META[platform];
                  const reason = platformDisabledReason(platform);
                  const active = effectiveSelected.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      disabled={!!reason}
                      title={reason ?? undefined}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : reason
                            ? "cursor-not-allowed border-zinc-100 text-zinc-300"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                      data-testid={`platform-${platform}`}
                    >
                      <meta.icon className="h-3 w-3" />
                      {meta.label}
                      {reason && <span className="text-[10px] font-normal">· {reason}</span>}
                    </button>
                  );
                })}
              </div>

              {(wantsReddit || wantsPinterest) && (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-zinc-100 pt-3">
                  {wantsReddit && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500">r/</span>
                      <Input
                        placeholder="subreddit"
                        value={subreddit}
                        onChange={(e) => setSubreddit(e.target.value)}
                        className="h-8 w-44 text-xs"
                      />
                    </div>
                  )}
                  {wantsPinterest && (
                    <select
                      value={pinterestBoardId}
                      onChange={(e) => setPinterestBoardId(e.target.value)}
                      className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-700"
                    >
                      <option value="">Choose a Pinterest board…</option>
                      {pinterestBoards.map((board) => (
                        <option key={board.id} value={board.id}>{board.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </Card>

            {/* Content */}
            <Card padding="lg">
              <Textarea
                rows={6}
                placeholder="What do you want to share today?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
                data-testid="input-post-content"
              />
              <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2">
                <p className="text-[11px] text-zinc-400">
                  {content.length} characters{effectiveSelected.includes("x") && content.length > 280 ? " · over X's 280 limit" : ""}
                </p>
              </div>
            </Card>

            {/* Media */}
            <Card padding="lg">
              {mediaUrl ? (
                <div className="flex items-center gap-3">
                  {mediaType === "video" ? (
                    <video src={mediaUrl} controls className="h-24 w-40 rounded-lg bg-black object-cover" />
                  ) : (
                    <img src={mediaUrl} alt="" className="h-24 w-40 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize text-zinc-900">{mediaType} attached</p>
                    <button
                      onClick={() => { setMediaUrl(null); setMediaType(null); }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-500"
                    >
                      <XIcon size={12} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <ObjectUploader
                  maxFileSize={100 * 1024 * 1024}
                  onGetUploadParameters={getUploadParams}
                  onComplete={(r) => {
                    const file = r.successful[0];
                    if (!file) return;
                    setMediaUrl(file.uploadURL);
                    setMediaType(file.type.startsWith("video/") ? "video" : "photo");
                    setMediaSizeMB(file.size / (1024 * 1024));
                  }}
                  buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-8 !text-zinc-500 hover:!bg-zinc-50"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">Add media</span>
                  <span className="text-[11px] text-zinc-400">Photo or video · required for Instagram, YouTube, TikTok, Pinterest</span>
                </ObjectUploader>
              )}
            </Card>

            {/* Timing */}
            <Card padding="lg" className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-full border border-zinc-200 p-1">
                {([["now", "Post immediately"], ["schedule", "Schedule for later"]] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTiming(id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                      timing === id ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {timing === "schedule" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-auto"
                  min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                />
              )}
            </Card>

            {/* Content requirements the current selection doesn't meet yet */}
            {contentIssues.length > 0 && (
              <Card padding="md" className="border-amber-200 bg-amber-50/60">
                {contentIssues.map((issue) => (
                  <p key={issue} className="text-xs leading-relaxed text-amber-800">• {issue}</p>
                ))}
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={(!content.trim() && !mediaUrl) || postMutation.isPending}
                onClick={() => postMutation.mutate({ draft: true })}
              >
                <Save className="mr-1.5 h-4 w-4" /> Save Draft
              </Button>
              <Button disabled={!canSubmit} onClick={() => postMutation.mutate({ draft: false })} data-testid="button-post-now">
                {postMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : timing === "schedule" ? (
                  <CalendarClock className="mr-1.5 h-4 w-4" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {timing === "schedule" ? "Schedule" : "Post Now"}
              </Button>
            </div>

            {/* Scheduled — live from Upload-Post, cancellable */}
            {scheduledJobs.length > 0 && (
              <section className="pt-2">
                <SectionHeader title={`Scheduled (${scheduledJobs.length})`} />
                <Card padding="none" className="divide-y divide-zinc-100">
                  {scheduledJobs.map((job) => (
                    <div key={job.job_id} className="flex items-center gap-3 px-4 py-3">
                      <CalendarClock size={14} className="shrink-0 text-zinc-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-700">{job.title || "(untitled post)"}</p>
                        <p className="text-[11px] text-zinc-400">
                          {Array.isArray(job.platform) ? job.platform.join(", ") : job.platform}
                          {job.scheduled_date && ` · ${new Date(job.scheduled_date).toLocaleString()}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-red-500 hover:text-red-600"
                        onClick={() => cancelScheduledMutation.mutate(job.job_id)}
                        disabled={cancelScheduledMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {/* Drafts */}
            {drafts.length > 0 && (
              <section className="pt-2">
                <SectionHeader title={`Drafts (${drafts.length})`} />
                <Card padding="none" className="divide-y divide-zinc-100">
                  {drafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => loadDraft(draft)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
                    >
                      <Sparkles size={14} className="shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                        {draft.content || "(media only)"}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-400">
                        {draft.platforms.join(", ")}
                      </span>
                    </button>
                  ))}
                </Card>
              </section>
            )}
          </div>

          {/* Live preview */}
          <div className="hidden lg:block">
            <SectionHeader title="Preview" />
            <Card padding="lg">
              <div className="mx-auto w-full max-w-[240px] rounded-[2rem] border-[6px] border-zinc-900 bg-white p-3">
                <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-zinc-200" />
                {content || mediaUrl ? (
                  <div className="space-y-2">
                    {mediaUrl && (
                      mediaType === "video" ? (
                        <video src={mediaUrl} className="aspect-square w-full rounded-lg bg-black object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
                      )
                    )}
                    {content && <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-800">{content}</p>}
                    {effectiveSelected.length > 0 && (
                      <p className="text-[10px] text-zinc-400">→ {effectiveSelected.map((p) => PLATFORM_META[p].label).join(" · ")}</p>
                    )}
                  </div>
                ) : (
                  <p className="py-16 text-center text-[11px] text-zinc-400">Start writing to see your preview</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
