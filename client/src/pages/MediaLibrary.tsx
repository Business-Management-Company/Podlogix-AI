import { useState } from "react";
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
import { Check, Download, ExternalLink, Film, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
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

export default function MediaLibrary() {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [importPlatform, setImportPlatform] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const { data: libraryData, isLoading } = useQuery<{ items: MediaLibraryItem[] }>({
    queryKey: ["/api/media-library"],
  });
  const items = libraryData?.items ?? [];

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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Media Library</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everything you've already published, pulled into one place — ready to reuse.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} data-testid="button-import">
          <Download className="mr-1.5 h-4 w-4" /> Import from your channels
        </Button>
      </div>

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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = PLATFORM_ICONS[item.platform] ?? ImageIcon;
            const visual = item.mediaUrl ?? item.thumbnailUrl;
            return (
              <Card key={item.id} padding="none" className="group overflow-hidden">
                <div className="relative aspect-square bg-zinc-100">
                  {visual ? (
                    item.mediaType === "video" && item.mediaUrl ? (
                      <video src={item.mediaUrl} className="h-full w-full object-cover" />
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
                {item.caption && (
                  <p className="truncate px-3 py-2 text-xs text-zinc-600">{item.caption}</p>
                )}
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
