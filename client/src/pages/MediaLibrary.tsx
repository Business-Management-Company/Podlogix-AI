import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  AudioLines, Check, Clapperboard, Download, ExternalLink, Film, FolderOpen,
  Image as ImageIcon, Link2, Loader2, Play, Plus, Radio, Search, Sparkles, Trash2, Upload, Wand2,
} from "lucide-react";
import {
  SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiTiktok, SiX, SiThreads,
  SiReddit, SiPinterest, SiBluesky,
} from "react-icons/si";

interface MediaLibraryItem {
  id: string;
  platform: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  postedAt: string | null;
}

interface ChannelMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

interface UploadPostAccount {
  platform: string;
  isConnected: boolean;
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, youtube: SiYoutube, facebook: SiFacebook, linkedin: SiLinkedin,
  tiktok: SiTiktok, x: SiX, threads: SiThreads, reddit: SiReddit, pinterest: SiPinterest, bluesky: SiBluesky,
};

/** Platforms whose /media API returns importable files (not just permalinks). */
const PERMALINK_ONLY = new Set(["tiktok", "youtube"]);

type LibraryFilter = "all" | "video" | "audio" | "studio" | "refined";

const FILTERS: Array<{ key: LibraryFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "video", label: "Videos" },
  { key: "audio", label: "Audio" },
  { key: "studio", label: "From the studio" },
  { key: "refined", label: "Refined" },
];

function StatCard({
  icon: Icon, value, label, tint,
}: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; tint: string }) {
  return (
    <Card className="flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xl font-semibold tabular-nums leading-tight text-zinc-950">{value}</span>
        <span className="block text-[11px] font-medium text-zinc-500">{label}</span>
      </span>
    </Card>
  );
}

export default function MediaLibrary() {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");

  const { data: libraryData, isLoading } = useQuery<{ items: MediaLibraryItem[] }>({
    queryKey: ["/api/media-library"],
  });
  const items = libraryData?.items ?? [];

  const stats = {
    total: items.length,
    videos: items.filter((i) => i.mediaType === "video").length,
    audio: items.filter((i) => i.mediaType === "audio").length,
    refined: items.filter((i) => i.platform === "media-lab").length,
  };

  const visible = items.filter((i) => {
    if (filter === "video" && i.mediaType !== "video") return false;
    if (filter === "audio" && i.mediaType !== "audio") return false;
    if (filter === "studio" && i.platform !== "live") return false;
    if (filter === "refined" && i.platform !== "media-lab") return false;
    if (query && !(i.caption ?? "").toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const { data: accountsData } = useQuery<{ accounts: UploadPostAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const connectedPlatforms = (accountsData?.accounts ?? [])
    .filter((a) => a.isConnected)
    .map((a) => a.platform.toLowerCase());

  const { data: channelMedia, isLoading: mediaLoading } = useQuery<{ media?: ChannelMediaItem[]; items?: ChannelMediaItem[] }>({
    queryKey: ["/api/upload-post/media", importPlatform],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/upload-post/media?platform=${importPlatform}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: !!importPlatform,
    retry: false,
  });
  const browseItems: ChannelMediaItem[] = channelMedia?.media ?? channelMedia?.items ?? [];

  const importMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = browseItems.filter((m) => picked.has(m.id));
      const res = await apiRequest("POST", "/api/media-library/import", {
        platform: importPlatform,
        items: selectedItems,
      });
      if (!res.ok) throw new Error("import failed");
      return res.json();
    },
    onSuccess: (data: { imported: number; skipped: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({
        title: `Imported ${data.imported} item${data.imported === 1 ? "" : "s"}`,
        description: data.skipped > 0 ? `${data.skipped} already in your library` : undefined,
      });
      setImportOpen(false);
      setPicked(new Set());
      setImportPlatform(null);
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/media-library/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({ title: "Removed from library" });
    },
  });

  // ── Add media by hand: upload a file, or paste a link ──
  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [preview, setPreview] = useState<MediaLibraryItem | null>(null);
  const [, navigate] = useLocation();
  const uploadPathRef = useRef<string | null>(null);

  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", {
      name: file.name, size: file.size, contentType: file.type,
    });
    const data = await res.json();
    uploadPathRef.current = data.objectPath;
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const fileUploaded = async (name?: string) => {
    if (!uploadPathRef.current) return;
    try {
      const res = await apiRequest("POST", "/api/media-library/add", {
        url: uploadPathRef.current, title: name ?? "",
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({ title: "Added to your library" });
      setAddOpen(false);
    } catch {
      toast({ title: "Couldn't add that file", variant: "destructive" });
    }
  };

  const addByLink = async () => {
    setAddBusy(true);
    try {
      const res = await apiRequest("POST", "/api/media-library/add", { url: addUrl.trim() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't add that link");
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({
        title: data.linked ? "YouTube link saved" : "Added to your library",
        description: data.linked ? "Saved as a linked reference — the file itself stays on YouTube." : undefined,
      });
      setAddUrl("");
      setAddOpen(false);
    } catch (e) {
      toast({
        title: "Couldn't add that",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setAddBusy(false);
    }
  };

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Media Storage</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everything you've already published, pulled into one place — ready to reuse.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => navigate("/studio/live")} data-testid="button-back-to-studios">
            <Radio className="mr-1.5 h-4 w-4" /> Back to Studios
          </Button>
          <Button variant="outline" onClick={() => setAddOpen(true)} data-testid="button-add-media">
            <Plus className="mr-1.5 h-4 w-4" /> Add media
          </Button>
          <Button onClick={() => setImportOpen(true)} data-testid="button-import">
            <Download className="mr-1.5 h-4 w-4" /> Import from your channels
          </Button>
        </div>
      </div>

      {/* Preview: play in place — the Refiner is one explicit click away, never automatic */}
      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.caption || "Preview"}</DialogTitle>
            <DialogDescription>
              {preview?.mediaType === "audio" ? "Listen here, or send it to the Refiner." : "Watch here, or send it to the Refiner."}
            </DialogDescription>
          </DialogHeader>
          {preview?.mediaUrl && (
            <div className="space-y-4">
              {preview.mediaType === "video" ? (
                <video src={preview.mediaUrl} controls autoPlay className="aspect-video w-full rounded-lg bg-black" />
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-lg bg-emerald-50/60 px-4 py-8">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <AudioLines className="h-6 w-6 text-emerald-600" />
                  </span>
                  <audio src={preview.mediaUrl} controls autoPlay className="w-full" />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
                <Button onClick={() => navigate(`/studio/refine?src=${encodeURIComponent(preview.mediaUrl!)}`)}>
                  <Wand2 className="mr-1.5 h-4 w-4" /> Open in Refiner
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add media dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add media</DialogTitle>
            <DialogDescription>
              Upload a file from your computer, or paste a link. Direct video/audio links get copied into your
              storage; YouTube links are saved as linked references.
            </DialogDescription>
          </DialogHeader>
          <ObjectUploader
            maxFileSize={500 * 1024 * 1024}
            onGetUploadParameters={getUploadParams}
            onComplete={(r) => void fileUploaded((r.successful[0] as { name?: string } | undefined)?.name)}
            buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-8 !text-zinc-500 hover:!bg-zinc-50"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs font-medium">Upload video or audio</span>
            <span className="text-[11px] text-zinc-400">Up to 500MB</span>
          </ObjectUploader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="…or paste a link — .mp4, .mp3, or YouTube"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && addUrl.trim()) void addByLink(); }}
                className="pl-8"
              />
            </div>
            <Button onClick={() => void addByLink()} disabled={!addUrl.trim() || addBusy}>
              {addBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length > 0 && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={FolderOpen} value={stats.total} label="Total files" tint="bg-blue-50 text-blue-600" />
            <StatCard icon={Clapperboard} value={stats.videos} label="Videos" tint="bg-violet-50 text-violet-600" />
            <StatCard icon={AudioLines} value={stats.audio} label="Audio" tint="bg-emerald-50 text-emerald-600" />
            <StatCard icon={Sparkles} value={stats.refined} label="Refined" tint="bg-amber-50 text-amber-600" />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.key ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search files…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        </>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-square w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Your library is empty"
          description="Import your existing posts from connected channels and they'll be here, ready to reuse in new posts."
        />
      ) : visible.length === 0 ? (
        <Card className="py-10 text-center text-sm text-zinc-500">
          Nothing matches this filter{query ? ` and “${query}”` : ""}.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => {
            const Icon =
              PLATFORM_ICONS[item.platform] ??
              (item.platform === "live" ? Clapperboard : item.platform === "media-lab" ? Sparkles : ImageIcon);
            const visual = item.mediaUrl ?? item.thumbnailUrl;
            return (
              <Card key={item.id} padding="none" className="group overflow-hidden">
                <div className="relative aspect-square bg-zinc-100">
                  {item.mediaType === "audio" && item.mediaUrl ? (
                    <button
                      onClick={() => setPreview(item)}
                      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-emerald-50/60 px-3 transition-colors hover:bg-emerald-50"
                      aria-label="Preview audio"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                        <AudioLines className="h-5 w-5 text-emerald-600" />
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700">Play audio</span>
                    </button>
                  ) : visual ? (
                    item.mediaType === "video" && item.mediaUrl ? (
                      <button onClick={() => setPreview(item)} className="relative block h-full w-full" aria-label="Preview video">
                        <video src={item.mediaUrl} className="h-full w-full object-cover" preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Play className="ml-0.5 h-4 w-4 text-white" />
                          </span>
                        </span>
                      </button>
                    ) : (
                      <img src={visual} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )
                  ) : (
                    <a
                      href={item.permalink ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-600"
                    >
                      {item.mediaType === "video" ? <Film size={22} /> : <ExternalLink size={22} />}
                      <span className="px-3 text-center text-[11px]">View on {item.platform}</span>
                    </a>
                  )}
                  <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50">
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-500 group-hover:flex"
                    aria-label="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">
                    {item.caption || item.platform}
                  </p>
                  {item.platform === "live" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                      <Clapperboard className="h-2.5 w-2.5" /> Studio
                    </span>
                  )}
                  {item.platform === "media-lab" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <Sparkles className="h-2.5 w-2.5" /> Refined
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setImportPlatform(null); setPicked(new Set()); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import from your channels</DialogTitle>
            <DialogDescription>
              {importPlatform
                ? PERMALINK_ONLY.has(importPlatform)
                  ? "This platform shares links to your posts rather than the files themselves — imports become linked references."
                  : "Pick the posts to copy into your library."
                : "Choose a connected channel to browse its posts."}
            </DialogDescription>
          </DialogHeader>

          {!importPlatform ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {connectedPlatforms.length === 0 ? (
                <p className="col-span-3 py-6 text-center text-sm text-zinc-500">
                  No connected channels yet — connect accounts first.
                </p>
              ) : (
                connectedPlatforms.map((platform) => {
                  const Icon = PLATFORM_ICONS[platform] ?? ImageIcon;
                  return (
                    <button
                      key={platform}
                      onClick={() => setImportPlatform(platform)}
                      className="flex items-center gap-2.5 rounded-lg border border-zinc-200 px-4 py-3 text-left capitalize hover:border-zinc-400"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{platform}</span>
                    </button>
                  );
                })
              )}
            </div>
          ) : mediaLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="aspect-square w-full rounded-lg" />)}
            </div>
          ) : browseItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">No posts found on this channel.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {browseItems.map((media) => {
                  const selected = picked.has(media.id);
                  const visual = media.thumbnail_url ?? media.media_url;
                  return (
                    <button
                      key={media.id}
                      onClick={() => togglePick(media.id)}
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${selected ? "border-zinc-950" : "border-transparent"}`}
                    >
                      {visual ? (
                        <img src={visual} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 px-2 text-center text-[10px] text-zinc-500">
                          <Film size={16} />
                          {media.caption?.slice(0, 40) || "Post"}
                        </span>
                      )}
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950">
                          <Check size={12} className="text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => { setImportPlatform(null); setPicked(new Set()); }} className="text-xs text-zinc-500 underline">
                  Choose a different channel
                </button>
                <Button
                  disabled={picked.size === 0 || importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                >
                  {importMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                  Import {picked.size > 0 ? `${picked.size} selected` : ""}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
