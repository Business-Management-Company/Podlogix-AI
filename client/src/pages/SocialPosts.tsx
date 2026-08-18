import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PostsCalendar, type CalendarEntry } from "@/components/PostsCalendar";
import {
  CalendarClock, CalendarRange, Check, ImagePlus, Loader2, Mic, MicOff, PenSquare,
  Repeat, Send, Save, Sparkles, Upload, Wand2, X as XIcon,
} from "lucide-react";
import {
  SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiTiktok, SiX, SiThreads,
  SiReddit, SiPinterest, SiBluesky, SiDiscord, SiTelegram,
} from "react-icons/si";

interface UploadPostAccount {
  id: string;
  platform: string;
  platformUsername: string;
  profilePictureUrl?: string | null;
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

interface MediaLibraryItem {
  id: string;
  platform: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
}

interface EpisodeSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  publishedAt: string | null;
  episodeNumber: number | null;
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

const CHAR_LIMITS: Record<string, number> = {
  x: 280, bluesky: 300, threads: 500, pinterest: 500, discord: 2000,
  instagram: 2200, tiktok: 2200, linkedin: 3000, telegram: 4096,
  youtube: 5000, reddit: 40000, facebook: 63206,
};

/** Typical high-engagement windows — heuristic, labeled as such in the UI. */
const BEST_TIMES: Record<string, string> = {
  instagram: "11 AM–1 PM", facebook: "9–11 AM", x: "9 AM–12 PM",
  linkedin: "8–10 AM", youtube: "2–4 PM", tiktok: "6–9 PM", threads: "11 AM–1 PM",
};

const FOCUS_OPTIONS = [
  { key: "show", emoji: "🎙️", label: "My Show", hint: "Promote your podcast" },
  { key: "general", emoji: "🌐", label: "General", hint: "Share tips or news" },
  { key: "personal", emoji: "👤", label: "Personal", hint: "Show your human side" },
  { key: "custom", emoji: "✏️", label: "Custom", hint: "You describe it" },
] as const;

const TONES = [
  { key: "pro", label: "Pro" },
  { key: "casual", label: "Casual" },
  { key: "funny", label: "Funny" },
  { key: "promo", label: "Promo" },
  { key: "edu", label: "Edu" },
] as const;

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

/** apiRequest throws `<status>: <raw body>` on non-ok — recover the server's message. */
function cleanApiError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    return JSON.parse(body).message || fallback;
  } catch {
    return body || fallback;
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(n)));
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
type ComposeMode = "type" | "ai" | "voice";
type ImageMode = "ai" | "library" | "upload";

export default function SocialPosts() {
  const { toast } = useToast();
  const search = useSearch();
  const initialTab = (new URLSearchParams(search).get("tab") as ComposerTab) || "single";

  const [tab, setTab] = useState<ComposerTab>(initialTab);
  // Nav's Campaign/Cadence entries deep-link with ?tab= — follow it even when
  // the composer is already mounted.
  useEffect(() => setTab(initialTab), [initialTab]);

  const [focus, setFocus] = useState<string>("show");
  const [customFocus, setCustomFocus] = useState("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [tone, setTone] = useState<string>("pro");
  const [composeMode, setComposeMode] = useState<ComposeMode>("type");
  const [aiDirection, setAiDirection] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [activeHashtags, setActiveHashtags] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [timing, setTiming] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [subreddit, setSubreddit] = useState("");
  const [pinterestBoardId, setPinterestBoardId] = useState("");
  const [mediaSizeMB, setMediaSizeMB] = useState<number | null>(null);

  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [imagePrompt, setImagePrompt] = useState("");
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<string | null>(null);

  const { data: accountsData } = useQuery<{ accounts: UploadPostAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const accounts = accountsData?.accounts ?? [];
  const accountByPlatform = new Map(accounts.map((a) => [a.platform.toLowerCase(), a]));
  const connected = new Set(
    accounts.filter((a) => a.isConnected && !a.reauthRequired).map((a) => a.platform.toLowerCase())
  );
  const connectedPlatforms = [...connected];

  // Follower counts power the reach estimate; shares Social Hub's cache key.
  const { data: analytics } = useQuery<Record<string, { followers?: number; message?: string }>>({
    queryKey: ["/api/upload-post/analytics", connectedPlatforms.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/upload-post/analytics?platforms=${connectedPlatforms.join(",")}`);
      if (!res.ok) throw new Error("analytics unavailable");
      return res.json();
    },
    enabled: connectedPlatforms.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: postsData } = useQuery<{ posts: LocalPost[] }>({
    queryKey: ["/api/upload-post/posts"],
    retry: false,
  });
  const drafts = (postsData?.posts ?? []).filter((p) => p.status === "draft");

  // "My Show" focus anchors the post to a real episode (the Ausha pattern).
  const { data: dashboardData } = useQuery<{ podcasts: Array<{ id: string; title: string }> }>({
    queryKey: ["/api/dashboard"],
    enabled: focus === "show",
  });
  const podcastId = dashboardData?.podcasts?.[0]?.id;
  const { data: episodesData } = useQuery<EpisodeSummary[]>({
    queryKey: ["/api/podcasts", podcastId, "episodes"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${podcastId}/episodes`);
      if (!res.ok) throw new Error("episodes unavailable");
      return res.json();
    },
    enabled: focus === "show" && !!podcastId,
  });
  const episodes = useMemo(
    () =>
      [...(episodesData ?? [])].sort((a, b) => {
        if (a.status !== b.status) return a.status === "published" ? -1 : 1;
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      }),
    [episodesData]
  );

  const pickEpisode = (id: string) => {
    setSelectedEpisodeId(id);
    const ep = episodes.find((e) => e.id === id);
    if (!ep) return;
    setAiDirection(`Promote the episode "${ep.title}" — hook listeners without spoiling it`);
    if (!content.trim()) {
      const firstLine = (ep.description ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?])\s/)[0]
        ?.slice(0, 200) ?? "";
      setContent(`🎙️ New episode: ${ep.title}${firstLine ? `\n\n${firstLine}` : ""}\n\nListen now — link in bio.`);
    }
  };

  const artworkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/episode-artwork", { episodeId: selectedEpisodeId });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Couldn't attach artwork");
      return body as { url: string };
    },
    onSuccess: (data) => {
      setMediaUrl(data.url);
      setMediaType("photo");
      setMediaSizeMB(null);
      toast({ title: "Artwork attached" });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't attach artwork", description: cleanApiError(err, "Couldn't attach artwork"), variant: "destructive" }),
  });

  // ---------- Campaign / Cadence planning ----------
  interface PlanPost { date: string; title: string; post: string; hashtags: string[] }
  const [planPosts, setPlanPosts] = useState<PlanPost[]>([]);
  const [campaignTheme, setCampaignTheme] = useState("");
  const [campaignStart, setCampaignStart] = useState("");
  const [campaignEnd, setCampaignEnd] = useState("");
  const [campaignCount, setCampaignCount] = useState(6);
  const [cadenceDays, setCadenceDays] = useState<number[]>([1, 3, 5]);
  const [cadenceThemes, setCadenceThemes] = useState<Record<number, string>>({});
  const [cadenceWeeks, setCadenceWeeks] = useState(2);
  const [planTime, setPlanTime] = useState("10:00");
  const [scheduleProgress, setScheduleProgress] = useState<{ done: number; total: number } | null>(null);

  const campaignSlots = () => {
    if (!campaignStart || !campaignEnd) return [];
    const start = new Date(`${campaignStart}T${planTime}`);
    const end = new Date(`${campaignEnd}T${planTime}`);
    if (Number.isNaN(start.getTime()) || end < start) return [];
    const n = Math.max(1, Math.min(30, campaignCount));
    const span = end.getTime() - start.getTime();
    return Array.from({ length: n }, (_, i) => ({
      date: new Date(start.getTime() + (n === 1 ? 0 : (span * i) / (n - 1))).toISOString(),
      theme: campaignTheme,
    }));
  };

  const cadenceSlots = () => {
    const [h, m] = planTime.split(":").map(Number);
    const slots: { date: string; theme: string }[] = [];
    for (let w = 0; w < cadenceWeeks; w++) {
      for (const dow of cadenceDays) {
        const d = new Date();
        d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7) + w * 7);
        d.setHours(h, m || 0, 0, 0);
        if (d.getTime() <= Date.now()) continue;
        slots.push({ date: d.toISOString(), theme: cadenceThemes[dow]?.trim() || campaignTheme.trim() || "general" });
      }
    }
    return slots.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 30);
  };

  const planMutation = useMutation({
    mutationFn: async (mode: "campaign" | "cadence") => {
      const slots = mode === "campaign" ? campaignSlots() : cadenceSlots();
      if (slots.length === 0) {
        throw new Error(mode === "campaign" ? "Pick a valid date range first" : "Pick at least one day of the week");
      }
      const res = await apiRequest("POST", "/api/social/ai-batch", {
        slots,
        tone,
        platforms: effectiveSelected,
        theme: campaignTheme.trim() || undefined,
        mode,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Generation failed");
      return body as { posts: PlanPost[] };
    },
    onSuccess: (data) => {
      setPlanPosts(data.posts);
      toast({ title: `${data.posts.length} posts drafted`, description: "Review and edit each one, then schedule the lot." });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't generate the plan", description: cleanApiError(err, "Generation failed"), variant: "destructive" }),
  });

  const updatePlanPost = (i: number, patch: Partial<PlanPost>) =>
    setPlanPosts((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const removePlanPost = (i: number) => setPlanPosts((prev) => prev.filter((_, j) => j !== i));

  const scheduleAllPlan = async () => {
    const total = planPosts.length;
    setScheduleProgress({ done: 0, total });
    let ok = 0;
    for (let i = 0; i < planPosts.length; i++) {
      const p = planPosts[i];
      try {
        const res = await apiRequest("POST", "/api/upload-post/posts", {
          platforms: effectiveSelected,
          content: p.hashtags.length > 0
            ? `${p.post.trim()}\n\n${p.hashtags.map((h) => `#${h}`).join(" ")}`
            : p.post.trim(),
          mediaUrl: null,
          mediaType: null,
          scheduledAt: new Date(p.date).toISOString(),
          draft: false,
          subreddit: wantsReddit ? subreddit : undefined,
          pinterestBoardId: wantsPinterest ? pinterestBoardId : undefined,
        });
        if (res.ok) ok++;
      } catch { /* counted below */ }
      setScheduleProgress({ done: i + 1, total });
    }
    setScheduleProgress(null);
    setPlanPosts([]);
    refetchScheduled();
    queryClient.invalidateQueries({ queryKey: ["/api/upload-post/posts"] });
    toast(
      ok === total
        ? { title: `All ${total} posts scheduled` }
        : { title: `${ok} of ${total} posts scheduled`, description: "The rest failed — check connections and try again.", variant: "destructive" }
    );
  };

  const { data: libraryData } = useQuery<{ items: MediaLibraryItem[] }>({
    queryKey: ["/api/media-library"],
    enabled: imageMode === "library",
    retry: false,
  });
  const libraryPhotos = (libraryData?.items ?? []).filter(
    (i) => i.mediaType !== "video" && (i.mediaUrl || i.thumbnailUrl)
  );

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

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const startEditJob = (job: ScheduledJob) => {
    setEditingJobId(job.job_id);
    setEditDate(job.scheduled_date ? job.scheduled_date.slice(0, 16) : "");
    setEditTitle(job.title ?? "");
    setEditCaption("");
  };

  // Blank fields are omitted so Upload-Post keeps the current value.
  const editScheduledMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/upload-post/scheduled/${editingJobId}`, {
        scheduledAt: editDate ? new Date(editDate).toISOString() : undefined,
        title: editTitle.trim() || undefined,
        caption: editCaption.trim() || undefined,
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      setEditingJobId(null);
      refetchScheduled();
      toast({ title: "Scheduled post updated" });
    },
    onError: () => toast({ title: "Couldn't update", variant: "destructive" }),
  });

  const platformDisabledReason = (platform: string): string | null => {
    if (!connected.has(platform)) return "Not connected";
    if (!mediaUrl && MEDIA_REQUIRED.has(platform)) return "Needs photo or video";
    if (mediaUrl && mediaType && mediaSizeMB !== null) {
      const conflicts = mediaSizeConflicts([platform], mediaSizeMB, mediaType);
      if (conflicts.length > 0) {
        const limit = (mediaType === "photo" ? PHOTO_LIMIT_MB : VIDEO_LIMIT_MB)[platform];
        return `File over ${limit}MB limit`;
      }
    }
    return null;
  };

  // Media-required platforms drop out of the selection if media is removed.
  const effectiveSelected = useMemo(
    () => selected.filter((p) => !platformDisabledReason(p)),
    [selected, mediaUrl, accountsData]
  );

  useEffect(() => {
    if (previewPlatform && !effectiveSelected.includes(previewPlatform)) {
      setPreviewPlatform(effectiveSelected[0] ?? null);
    } else if (!previewPlatform && effectiveSelected.length > 0) {
      setPreviewPlatform(effectiveSelected[0]);
    }
  }, [effectiveSelected, previewPlatform]);

  const togglePlatform = (platform: string) => {
    if (platformDisabledReason(platform)) return;
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  // ---------- AI Write ----------
  const aiWriteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/ai-write", {
        focus,
        customFocus: customFocus.trim() || undefined,
        tone,
        direction: aiDirection.trim() || undefined,
        platforms: effectiveSelected,
        episodeId: focus === "show" && selectedEpisodeId ? selectedEpisodeId : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "AI writing failed");
      return body as { post: string; hashtags: string[] };
    },
    onSuccess: (data) => {
      setContent(data.post);
      setHashtags(data.hashtags);
      setActiveHashtags(new Set(data.hashtags));
      setComposeMode("type");
      toast({ title: "Post drafted", description: "Edit it, swap hashtags, then post." });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't generate", description: cleanApiError(err, "AI writing failed"), variant: "destructive" }),
  });

  // ---------- Voice (Web Speech API dictation) ----------
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const [listening, setListening] = useState(false);
  const toggleVoice = () => {
    const SR = (window as unknown as {
      SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any;
    });
    const Ctor = SR.SpeechRecognition || SR.webkitSpeechRecognition;
    if (!Ctor) {
      toast({ title: "Voice input isn't supported in this browser", description: "Chrome and Edge support dictation.", variant: "destructive" });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      const chunk = Array.from(e.results as ArrayLike<any>)
        .slice(e.resultIndex)
        .map((r: any) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (chunk) setContent((c) => (c ? `${c} ${chunk}` : chunk));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // ---------- AI images ----------
  const aiImageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/ai-image", {
        prompt: imagePrompt.trim(), count: 2,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Image generation failed");
      return body as { urls: string[] };
    },
    onSuccess: (data) => setAiImages((prev) => [...prev, ...data.urls].slice(0, 4)),
    onError: (err: Error) =>
      toast({ title: "Couldn't generate images", description: cleanApiError(err, "Image generation failed"), variant: "destructive" }),
  });

  const resetComposer = () => {
    setContent("");
    setMediaUrl(null);
    setMediaType(null);
    setSelected([]);
    setTiming("now");
    setScheduledAt("");
    setHashtags([]);
    setActiveHashtags(new Set());
    setAiDirection("");
    setAiImages([]);
  };

  const includedHashtags = hashtags.filter((h) => activeHashtags.has(h));
  const finalContent = includedHashtags.length > 0
    ? `${content.trim()}\n\n${includedHashtags.map((h) => `#${h}`).join(" ")}`
    : content.trim();

  const postMutation = useMutation({
    mutationFn: async ({ draft }: { draft: boolean }) => {
      const res = await apiRequest("POST", "/api/upload-post/posts", {
        platforms: effectiveSelected,
        content: finalContent,
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
      refetchScheduled();
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
    && (!wantsReddit || subreddit.trim().length > 0)
    && (!wantsPinterest || pinterestBoardId.length > 0);

  // ---------- Right-rail derived data ----------
  const steps = [
    { label: "Focus", done: true },
    { label: "Create", done: content.trim().length > 0 },
    { label: "Post", done: effectiveSelected.length > 0 },
    { label: "Image", done: !!mediaUrl },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  const selectedFollowers = effectiveSelected.reduce((sum, p) => {
    const f = analytics?.[p]?.followers;
    return sum + (typeof f === "number" ? f : 0);
  }, 0);

  const charCount = finalContent.length;
  const previewAccount = previewPlatform ? accountByPlatform.get(previewPlatform) : null;

  const calendarEntries: CalendarEntry[] = [
    ...scheduledJobs
      .filter((j) => j.scheduled_date)
      .map((j) => ({ date: j.scheduled_date!, label: j.title || "Post", kind: "scheduled" as const })),
    ...planPosts.map((p) => ({ date: p.date, label: p.title || p.post.slice(0, 24), kind: "proposal" as const })),
  ];

  // Platform chips + reddit/pinterest extras — shared by all three composer tabs.
  const renderPlatformSection = () => (
    <>
      <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Post to</p>
      <div className="flex flex-wrap gap-2">
        {ALL_PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const isConnected = connected.has(platform);
          const reason = platformDisabledReason(platform);
          const active = effectiveSelected.includes(platform);
          if (!isConnected) {
            return (
              <Link
                key={platform}
                href="/connectors"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-amber-300 hover:text-zinc-600"
              >
                <meta.icon className="h-3 w-3" />
                {meta.label}
                <span className="text-[10px] font-semibold text-amber-600">Connect</span>
              </Link>
            );
          }
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
              {active && <Check className="h-3 w-3" />}
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
    </>
  );

  const renderToneChips = () => (
    <div className="flex gap-1">
      {TONES.map((t) => (
        <button
          key={t.key}
          onClick={() => setTone(t.key)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            tone === t.key ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300" : "text-zinc-400 hover:bg-zinc-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderPreviewCard = () => {
    if (!previewPlatform || !previewAccount) {
      return (
        <p className="py-12 text-center text-[11px] text-zinc-400">
          Pick a platform to see your post as followers will.
        </p>
      );
    }
    const isIg = previewPlatform === "instagram";
    const isFb = previewPlatform === "facebook";
    const isLi = previewPlatform === "linkedin";
    const name = previewAccount.platformUsername || previewPlatform;
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        {isFb && <div className="h-1.5 bg-[#1877F2]" />}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className={isIg ? "rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]" : ""}>
            {previewAccount.profilePictureUrl ? (
              <img src={previewAccount.profilePictureUrl} alt="" className="h-8 w-8 rounded-full border border-white object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                {name.replace(/^@/, "")[0]?.toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-950">
              {isFb || isLi ? name : `@${name.replace(/^@/, "")}`}
            </p>
            <p className="text-[10px] text-zinc-400">
              {isLi ? "1st · Just now" : isFb ? "Just now · 🌐" : "Just now"}
            </p>
          </div>
        </div>
        {mediaUrl && (
          mediaType === "video" ? (
            <video src={mediaUrl} className="aspect-video w-full bg-black object-cover" />
          ) : (
            <img src={mediaUrl} alt="" className="aspect-square w-full object-cover" />
          )
        )}
        {finalContent ? (
          <p className="whitespace-pre-wrap px-3 py-2.5 text-xs leading-relaxed text-zinc-800">{finalContent}</p>
        ) : (
          <p className="px-3 py-2.5 text-xs italic text-zinc-400">Your post will appear here…</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1200px] px-6 py-8">
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
        ] as [ComposerTab, string, React.ElementType][]).map(([id, label, Icon]) => (
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
        <div className="grid gap-6 lg:grid-cols-9">
          <div className="space-y-4 lg:col-span-5">
            <Card padding="lg">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  {tab === "campaign" ? "Plan a campaign" : "Set your weekly rhythm"}
                </p>
                {renderToneChips()}
              </div>
              <p className="mb-4 text-xs text-zinc-500">
                {tab === "campaign"
                  ? "A date-to-date push on one theme — a launch, an event, a promotion. AI drafts every post; you edit, then schedule the lot."
                  : "Pick your days and give each a theme or call-to-action. AI drafts the coming weeks; you edit, then schedule the lot."}
              </p>

              {tab === "campaign" ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Campaign theme — e.g. 'Season 3 launch' or 'Veteran Small Business Week'"
                    value={campaignTheme}
                    onChange={(e) => setCampaignTheme(e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="date" value={campaignStart} onChange={(e) => setCampaignStart(e.target.value)} className="w-auto" />
                    <span className="text-xs text-zinc-400">to</span>
                    <Input type="date" value={campaignEnd} onChange={(e) => setCampaignEnd(e.target.value)} className="w-auto" />
                    <select
                      value={campaignCount}
                      onChange={(e) => setCampaignCount(Number(e.target.value))}
                      className="h-9 rounded-md border border-zinc-200 px-2 text-sm text-zinc-700"
                    >
                      {[3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                        <option key={n} value={n}>{n} posts</option>
                      ))}
                    </select>
                    <Input type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="w-auto" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {([["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]] as const).map(([label, dow]) => (
                      <button
                        key={dow}
                        onClick={() =>
                          setCadenceDays((prev) =>
                            prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          cadenceDays.includes(dow)
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 text-zinc-500 hover:border-zinc-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {cadenceDays.map((dow) => (
                    <div key={dow} className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-xs font-medium text-zinc-500">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]}
                      </span>
                      <Input
                        placeholder="Theme or call-to-action for this day — e.g. 'episode highlight' or 'ask a question'"
                        value={cadenceThemes[dow] ?? ""}
                        onChange={(e) => setCadenceThemes((prev) => ({ ...prev, [dow]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={cadenceWeeks}
                      onChange={(e) => setCadenceWeeks(Number(e.target.value))}
                      className="h-9 rounded-md border border-zinc-200 px-2 text-sm text-zinc-700"
                    >
                      {[1, 2, 3, 4].map((w) => (
                        <option key={w} value={w}>next {w} week{w > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                    <Input type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="w-auto" />
                  </div>
                </div>
              )}

              {renderPlatformSection()}
              {effectiveSelected.length === 0 && (
                <p className="mt-3 text-[11px] font-medium text-amber-600">⚠ Select at least one platform before generating</p>
              )}
              <Button
                className="mt-4 w-full"
                disabled={effectiveSelected.length === 0 || planMutation.isPending}
                onClick={() => planMutation.mutate(tab as "campaign" | "cadence")}
              >
                {planMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                {planMutation.isPending
                  ? "Drafting your posts…"
                  : planPosts.length > 0
                    ? "Regenerate plan →"
                    : tab === "campaign" ? "Generate campaign →" : "Generate cadence →"}
              </Button>
            </Card>

            {planPosts.length > 0 && (
              <section>
                <SectionHeader title={`Review (${planPosts.length} posts)`} />
                <Card padding="none" className="divide-y divide-zinc-100">
                  {planPosts.map((p, i) => (
                    <div key={i} className="space-y-2 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={p.date.slice(0, 16)}
                          onChange={(e) => updatePlanPost(i, { date: e.target.value ? new Date(e.target.value).toISOString() : p.date })}
                          className="h-8 w-auto text-xs"
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-500">{p.title}</span>
                        <button
                          onClick={() => removePlanPost(i)}
                          className="shrink-0 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                          aria-label="Remove this post"
                        >
                          <XIcon size={13} />
                        </button>
                      </div>
                      <Textarea
                        value={p.post}
                        onChange={(e) => updatePlanPost(i, { post: e.target.value })}
                        rows={3}
                        className="resize-none text-sm"
                      />
                      {p.hashtags.length > 0 && (
                        <p className="text-[11px] text-zinc-400">{p.hashtags.map((h) => `#${h}`).join(" ")}</p>
                      )}
                    </div>
                  ))}
                </Card>
                <Button
                  className="mt-3 w-full"
                  disabled={scheduleProgress !== null}
                  onClick={scheduleAllPlan}
                >
                  {scheduleProgress ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Scheduling {scheduleProgress.done}/{scheduleProgress.total}…
                    </>
                  ) : (
                    <>
                      <CalendarClock className="mr-1.5 h-4 w-4" />
                      Schedule all {planPosts.length} posts
                    </>
                  )}
                </Button>
              </section>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-4">
              <PostsCalendar entries={calendarEntries} />
              {scheduledJobs.length > 0 && (
                <p className="text-[11px] text-zinc-400">
                  {scheduledJobs.length} post{scheduledJobs.length === 1 ? "" : "s"} already scheduled — manage them on the Single Post tab.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-9">
          {/* ---------------- Left column ---------------- */}
          <div className="space-y-4 lg:col-span-5">
            {/* Focus */}
            <Card padding="lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                What are you posting about?
              </p>
              <p className="mb-3 mt-0.5 text-xs text-zinc-500">Choose your focus, then create your post below</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFocus(opt.key)}
                    className={`flex h-[104px] flex-col items-center justify-center gap-1 rounded-xl border px-2 text-center transition-all ${
                      focus === opt.key
                        ? "scale-[1.02] border-zinc-950 bg-zinc-50 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-xs font-semibold text-zinc-950">{opt.label}</span>
                    <span className="text-[10px] leading-tight text-zinc-500">{opt.hint}</span>
                  </button>
                ))}
              </div>
              {focus === "custom" && (
                <Input
                  className="mt-3"
                  placeholder="What's this post about?"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                />
              )}
              {focus === "show" && (
                episodes.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-400">
                    No episodes yet — posts will promote your show in general.{" "}
                    <Link href="/episodes" className="font-medium text-zinc-600 underline">Add an episode</Link>
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={selectedEpisodeId}
                      onChange={(e) => pickEpisode(e.target.value)}
                      className="h-9 min-w-[240px] flex-1 rounded-md border border-zinc-200 px-2 text-sm text-zinc-700"
                    >
                      <option value="">Pick an episode to promote…</option>
                      {episodes.map((ep) => (
                        <option key={ep.id} value={ep.id}>
                          {ep.episodeNumber ? `#${ep.episodeNumber} · ` : ""}{ep.title}
                          {ep.status !== "published" ? " (draft)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedEpisodeId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => artworkMutation.mutate()}
                        disabled={artworkMutation.isPending}
                      >
                        {artworkMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Use artwork
                      </Button>
                    )}
                  </div>
                )
              )}

              {renderPlatformSection()}
            </Card>

            {/* Create your post */}
            <Card padding="lg">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Create your post</p>
                {renderToneChips()}
              </div>

              <div className="mb-3 flex rounded-lg bg-zinc-100 p-1">
                {([
                  ["type", "Type it", PenSquare],
                  ["ai", "AI Write", Wand2],
                  ["voice", "Voice", Mic],
                ] as [ComposeMode, string, React.ElementType][]).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => setComposeMode(id)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                      composeMode === id ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {composeMode === "ai" && (
                <div className="mb-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Give AI some direction (optional) — e.g. 'tease this week's episode about veteran entrepreneurs' or leave blank to surprise me"
                    value={aiDirection}
                    onChange={(e) => setAiDirection(e.target.value)}
                    className="resize-none text-sm"
                  />
                  {effectiveSelected.length === 0 && (
                    <p className="text-[11px] font-medium text-amber-600">⚠ Select at least one platform above before generating</p>
                  )}
                  <Button
                    className="w-full"
                    disabled={effectiveSelected.length === 0 || aiWriteMutation.isPending}
                    onClick={() => aiWriteMutation.mutate()}
                  >
                    {aiWriteMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1.5 h-4 w-4" />
                    )}
                    {aiWriteMutation.isPending ? "Writing…" : content ? "Rewrite Post →" : "Generate Post →"}
                  </Button>
                </div>
              )}

              {composeMode === "voice" && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-3">
                  <Button variant={listening ? "destructive" : "outline"} size="sm" onClick={toggleVoice}>
                    {listening ? <MicOff className="mr-1.5 h-4 w-4" /> : <Mic className="mr-1.5 h-4 w-4" />}
                    {listening ? "Stop" : "Start talking"}
                  </Button>
                  <p className="text-xs text-zinc-500">
                    {listening ? "Listening — your words land in the post below." : "Dictate your post; edit it after."}
                  </p>
                </div>
              )}

              <Textarea
                rows={6}
                placeholder="What do you want to share today?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
                data-testid="input-post-content"
              />

              {hashtags.length > 0 && (
                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    Hashtags <span className="font-normal normal-case">— tap to include</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {hashtags.map((h) => {
                      const on = activeHashtags.has(h);
                      return (
                        <button
                          key={h}
                          onClick={() =>
                            setActiveHashtags((prev) => {
                              const next = new Set(prev);
                              if (next.has(h)) next.delete(h);
                              else next.add(h);
                              return next;
                            })
                          }
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            on ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500 line-through"
                          }`}
                        >
                          #{h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Image & creative */}
            <Card padding="lg">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                Image & creative <span className="font-normal normal-case text-zinc-400">· optional</span>
              </p>

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
                      onClick={() => { setMediaUrl(null); setMediaType(null); setMediaSizeMB(null); }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-500"
                    >
                      <XIcon size={12} /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex rounded-lg bg-zinc-100 p-1">
                    {([
                      ["upload", "Upload", Upload],
                      ["library", "My Library", ImagePlus],
                      ["ai", "AI Generate", Sparkles],
                    ] as [ImageMode, string, React.ElementType][]).map(([id, label, Icon]) => (
                      <button
                        key={id}
                        onClick={() => setImageMode(id)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                          imageMode === id ? "bg-zinc-950 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                        }`}
                      >
                        <Icon size={13} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {imageMode === "upload" && (
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

                  {imageMode === "library" && (
                    libraryPhotos.length === 0 ? (
                      <p className="py-6 text-center text-xs text-zinc-400">
                        Nothing importable in your library yet —{" "}
                        <Link href="/media-library" className="font-medium text-zinc-600 underline">import from your channels</Link>.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {libraryPhotos.slice(0, 15).map((item) => {
                          const src = item.mediaUrl ?? item.thumbnailUrl!;
                          return (
                            <button
                              key={item.id}
                              onClick={() => { setMediaUrl(item.mediaUrl ?? item.thumbnailUrl); setMediaType("photo"); setMediaSizeMB(null); }}
                              className="aspect-square overflow-hidden rounded-lg border border-zinc-200 transition-transform hover:scale-[1.03]"
                            >
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}

                  {imageMode === "ai" && (
                    <div className="space-y-2.5">
                      <Input
                        placeholder="Describe your image… give AI some direction (optional)"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                      />
                      <div className="flex gap-2">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const url = aiImages[i];
                          if (url) {
                            return (
                              <button
                                key={url}
                                onClick={() => { setMediaUrl(url); setMediaType("photo"); setMediaSizeMB(null); }}
                                className="h-[82px] w-[82px] overflow-hidden rounded-lg border border-zinc-200 transition-transform hover:scale-[1.04]"
                                title="Use this image"
                              >
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </button>
                            );
                          }
                          if (aiImageMutation.isPending && i < aiImages.length + 2) {
                            return <div key={i} className="h-[82px] w-[82px] animate-pulse rounded-lg bg-zinc-100" />;
                          }
                          return (
                            <div key={i} className="flex h-[82px] w-[82px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-zinc-300">
                              +
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={aiImageMutation.isPending || !imagePrompt.trim() || aiImages.length >= 4}
                        onClick={() => aiImageMutation.mutate()}
                      >
                        {aiImageMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1.5 h-4 w-4" />
                        )}
                        {aiImageMutation.isPending ? "Generating…" : aiImages.length > 0 ? "Generate more →" : "Generate Images →"}
                      </Button>
                      <p className="text-[10px] text-zinc-400">Tap a result to attach it. Generated images land in your media storage.</p>
                    </div>
                  )}
                </>
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

            {/* Scheduled — live from Upload-Post, editable + cancellable */}
            {scheduledJobs.length > 0 && (
              <section className="pt-2">
                <SectionHeader title={`Scheduled (${scheduledJobs.length})`} />
                <Card padding="none" className="divide-y divide-zinc-100">
                  {scheduledJobs.map((job) => (
                    <div key={job.job_id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
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
                          className="shrink-0"
                          onClick={() => (editingJobId === job.job_id ? setEditingJobId(null) : startEditJob(job))}
                        >
                          {editingJobId === job.job_id ? "Close" : "Edit"}
                        </Button>
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
                      {editingJobId === job.job_id && (
                        <div className="mt-3 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <Input
                            type="datetime-local"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="max-w-xs"
                          />
                          <Input
                            placeholder="Title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                          <Textarea
                            placeholder="New caption (leave blank to keep current)"
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            rows={2}
                          />
                          <Button
                            size="sm"
                            onClick={() => editScheduledMutation.mutate()}
                            disabled={editScheduledMutation.isPending}
                          >
                            {editScheduledMutation.isPending ? (
                              <Loader2 size={14} className="mr-1.5 animate-spin" />
                            ) : null}
                            Save changes
                          </Button>
                        </div>
                      )}
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

          {/* ---------------- Right rail ---------------- */}
          <div className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-6 space-y-4">
              {/* Stepper */}
              <div className="flex items-center justify-between px-1">
                {steps.map((step, i) => (
                  <div key={step.label} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          step.done
                            ? "bg-zinc-950 text-white"
                            : i === currentStep
                              ? "border-2 border-zinc-950 text-zinc-950"
                              : "border border-zinc-200 text-zinc-400"
                        }`}
                      >
                        {step.done ? <Check size={13} /> : i + 1}
                      </span>
                      <span className={`text-[10px] font-medium ${step.done || i === currentStep ? "text-zinc-950" : "text-zinc-400"}`}>
                        {step.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && <div className={`mx-1 mb-4 h-px flex-1 ${steps[i + 1].done ? "bg-zinc-950" : "bg-zinc-200"}`} />}
                  </div>
                ))}
              </div>

              {/* Per-platform preview */}
              <Card padding="lg">
                {effectiveSelected.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {effectiveSelected.map((p) => {
                      const meta = PLATFORM_META[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setPreviewPlatform(p)}
                          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            previewPlatform === p ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          <meta.icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {renderPreviewCard()}
              </Card>

              {/* Estimates */}
              <Card padding="lg">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Estimates</p>
                <p className="text-sm text-zinc-600">
                  Est. reach:{" "}
                  <span className="font-semibold text-zinc-950">
                    {selectedFollowers > 0
                      ? `${formatCount(selectedFollowers * 0.08)} – ${formatCount(selectedFollowers * 0.2)}`
                      : "—"}
                  </span>
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  Best time to post:{" "}
                  <span className="font-semibold text-zinc-950">
                    {BEST_TIMES[effectiveSelected[0] ?? ""] ?? "9–11 AM"}
                  </span>
                </p>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  Reach = 8–20% of the {formatCount(selectedFollowers)} followers on your selected channels; times are typical engagement windows.
                </p>
              </Card>

              {/* Character count */}
              {effectiveSelected.length > 0 && (
                <Card padding="lg">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Character count</p>
                  <div className="space-y-1.5">
                    {effectiveSelected.map((p) => {
                      const limit = CHAR_LIMITS[p] ?? 2200;
                      const over = charCount > limit;
                      const near = !over && charCount > limit * 0.9;
                      return (
                        <div key={p} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">{PLATFORM_META[p].label}</span>
                          <span className={`font-semibold tabular-nums ${over ? "text-red-600" : near ? "text-amber-600" : "text-emerald-600"}`}>
                            {charCount.toLocaleString()} / {limit.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Rail actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={(!content.trim() && !mediaUrl) || postMutation.isPending}
                  onClick={() => postMutation.mutate({ draft: true })}
                >
                  Save Draft
                </Button>
                <Button
                  className="flex-1"
                  disabled={!canSubmit}
                  onClick={() => postMutation.mutate({ draft: false })}
                >
                  {timing === "schedule" ? "Schedule" : "Post Now"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
