import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Youtube, Loader2, Upload, ExternalLink } from "lucide-react";
import { Card } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Podcast } from "@shared/schema";

type Status = { connected: boolean; channelTitle?: string | null };
type Video = { id: string; title: string; description: string; thumbnailUrl: string | null; publishedAt: string | null; duration: string | null; privacyStatus: string; url: string };
type Upload = { url: string; name: string; size: number; type: string };

export default function YouTubeImport() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [podcastId, setPodcastId] = useState("");
  const [selected, setSelected] = useState<Video | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const { data: status } = useQuery<Status>({ queryKey: ["/api/content-sources/youtube/status"] });
  const { data: podcasts = [] } = useQuery<Podcast[]>({ queryKey: ["/api/podcasts"] });
  const videos = useQuery<{ items: Video[] }>({ queryKey: ["/api/content-sources/youtube/videos"], enabled: !!status?.connected });

  const connect = useMutation({
    mutationFn: async () => (await apiRequest("GET", "/api/content-sources/youtube/auth")).json(),
    onSuccess: (data) => { window.location.href = data.authUrl; },
  });
  const importVideo = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Choose a video");
      const response = await apiRequest("POST", "/api/content-sources/youtube/import", {
        ...selected, videoId: selected.id, podcastId,
        sourceMediaUrl: upload?.url, sourceMimeType: upload?.type, sourceSizeBytes: upload?.size,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({ title: "Imported from YouTube", description: upload ? "Your source file is ready for Podlogix processing." : "Metadata imported. Attach the source file from the episode when you're ready." });
      navigate(`/shows/${podcastId}/episodes/${data.episode.id}`);
    },
    onError: (error: Error) => toast({ title: "Import failed", description: error.message, variant: "destructive" }),
  });

  // The upload only counts once the PUT succeeds — onComplete, not here.
  // Recording it early would let a failed upload become a dead source URL.
  const getUploadParameters = async (file: File) => {
    const response = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };
  const uploadFinished = (result: { successful: Array<{ uploadURL: string; name: string; size: number; type: string }> }) => {
    const file = result.successful[0];
    if (file) setUpload({ url: file.uploadURL, name: file.name, size: file.size, type: file.type || "application/octet-stream" });
  };

  if (!status?.connected) return (
    <div className="w-full max-w-4xl px-6 py-8">
      <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-8">
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50"><Youtube className="h-5 w-5 text-red-600" /></div>
        <h1 className="text-sm font-medium text-zinc-950">Import your YouTube videos</h1>
        <p className="mb-4 mt-1 max-w-md text-xs leading-relaxed text-zinc-500">Connect the Google account that owns your channel. Podlogix only shows videos from that verified channel.</p>
        <Button disabled={connect.isPending} onClick={() => connect.mutate()}>{connect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Connect YouTube</Button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl px-6 py-8">
      <div className="mb-6"><h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Import from YouTube</h1><p className="mt-1 text-sm text-zinc-500">Owned videos from {status.channelTitle}. Select one, choose its Podlogix show, and optionally attach your original source file.</p></div>
      {videos.isLoading ? <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your videos…</div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(videos.data?.items ?? []).map((video) => <Card key={video.id} padding="none" className={`overflow-hidden ${selected?.id === video.id ? "ring-2 ring-zinc-900" : ""}`}>
            <button className="w-full text-left" onClick={() => { setSelected(video); setUpload(null); }}><div className="aspect-video bg-zinc-100">{video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />}</div><div className="p-3"><p className="line-clamp-2 text-sm font-medium text-zinc-900">{video.title}</p><p className="mt-1 text-xs capitalize text-zinc-400">{video.privacyStatus}</p></div></button>
          </Card>)}
        </div>
      )}
      {selected && <Card className="mt-6 space-y-4">
        <div><h2 className="text-sm font-semibold text-zinc-950">Import “{selected.title}”</h2><p className="mt-1 text-xs text-zinc-500">YouTube does not provide source media downloads through its API. Upload your original MP4/audio now, or import the metadata and attach it later.</p></div>
        <Select value={podcastId} onValueChange={setPodcastId}><SelectTrigger><SelectValue placeholder="Choose a Podlogix show" /></SelectTrigger><SelectContent>{podcasts.map((podcast) => <SelectItem key={podcast.id} value={podcast.id}>{podcast.title}</SelectItem>)}</SelectContent></Select>
        <ObjectUploader maxFileSize={500 * 1024 * 1024} onGetUploadParameters={getUploadParameters} onComplete={uploadFinished} buttonClassName="w-full border border-dashed bg-white text-zinc-600 hover:bg-zinc-50"><Upload className="mr-2 h-4 w-4" />{upload ? upload.name : "Attach original video or audio (up to 500MB)"}</ObjectUploader>
        <div className="flex items-center justify-between"><a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800">View on YouTube <ExternalLink className="h-3 w-3" /></a><Button disabled={!podcastId || importVideo.isPending} onClick={() => importVideo.mutate()}>{importVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{upload ? "Import and process" : "Import metadata"}</Button></div>
      </Card>}
    </div>
  );
}
