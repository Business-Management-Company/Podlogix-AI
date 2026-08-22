import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Loader2, Mic, Music, UploadCloud } from "lucide-react";
import { Card } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Podcast } from "@shared/schema";

/**
 * /shows/new/create — build a brand-new show from scratch: title,
 * description, thumbnail, and (optionally) a first episode's audio.
 * Creating the podcast happens immediately; the thumbnail and first
 * episode are attached once their uploads finish.
 */
export default function CreateShowScratch() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [episodeTitle, setEpisodeTitle] = useState("");

  const artworkUpload = useUpload();
  const audioUpload = useUpload();

  const createShow = useMutation({
    mutationFn: async () => {
      // 1. Upload thumbnail first (if provided) so we can set it on create.
      let artworkUrl: string | undefined;
      if (artworkFile) {
        const result = await artworkUpload.uploadFile(artworkFile);
        if (!result) throw new Error("Failed to upload thumbnail");
        artworkUrl = result.objectPath;
      }

      // 2. Create the podcast.
      const podcastRes = await apiRequest("POST", "/api/podcasts", {
        title,
        description: description || undefined,
        artworkUrl,
      });
      const podcast: Podcast = await podcastRes.json();

      // 3. If audio was provided, upload it and create the first episode.
      if (audioFile) {
        const audioResult = await audioUpload.uploadFile(audioFile);
        if (!audioResult) throw new Error("Failed to upload episode audio");
        await apiRequest("POST", `/api/podcasts/${podcast.id}/episodes`, {
          title: episodeTitle || title,
          audioUrl: audioResult.objectPath,
        });
      }

      return podcast;
    },
    onSuccess: (podcast) => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({ title: "Show created", description: "Now let's get it published." });
      navigate(`/shows/${podcast.id}`);
    },
    onError: (err) => {
      toast({
        title: "Couldn't create show",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setArtworkFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setArtworkPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setArtworkPreview(null);
    }
  };

  const isSubmitting = createShow.isPending;
  const canSubmit = title.trim().length > 0 && !isSubmitting;

  return (
    <div className="w-full max-w-2xl px-6 py-8">
      <Link href="/shows/new">
        <span className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700">
          <ArrowLeft size={16} />
          Back
        </span>
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Set up your show</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Title and description now, everything else can change later.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) createShow.mutate();
        }}
        className="mt-8 space-y-6"
      >
        {/* Thumbnail */}
        <Card padding="lg" className="flex items-center gap-4">
          <label
            htmlFor="artwork"
            className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
          >
            {artworkPreview ? (
              <img src={artworkPreview} alt="Show artwork" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={24} className="text-zinc-400" strokeWidth={1.5} />
            )}
          </label>
          <div className="min-w-0 flex-1">
            <Label htmlFor="artwork" className="text-sm font-semibold text-zinc-950">
              Show thumbnail
            </Label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Square image, at least 1400×1400px for Apple Podcasts.
            </p>
            <Input
              id="artwork"
              type="file"
              accept="image/*"
              onChange={handleArtworkChange}
              className="mt-2 max-w-xs text-xs"
            />
          </div>
        </Card>

        {/* Title + description */}
        <div className="space-y-2">
          <Label htmlFor="title">Show title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Podcast"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences about your show."
            rows={4}
          />
        </div>

        {/* First episode (optional) */}
        <Card padding="lg" className="space-y-3">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-zinc-500" />
            <p className="text-sm font-semibold text-zinc-950">First episode (optional)</p>
          </div>
          <p className="text-xs text-zinc-500">
            Upload audio now to publish your first episode right away, or skip and add it later.
          </p>
          <div className="space-y-2">
            <Label htmlFor="episode-title">Episode title</Label>
            <Input
              id="episode-title"
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="Episode 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="episode-audio">Audio file</Label>
            <label
              htmlFor="episode-audio"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              {audioFile ? <Music size={16} /> : <UploadCloud size={16} />}
              {audioFile ? audioFile.name : "Choose an audio file (MP3, WAV, M4A)"}
            </label>
            <Input
              id="episode-audio"
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>
        </Card>

        <div className="flex items-center justify-between pt-2">
          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isSubmitting ? "Creating..." : "Create show"}
          </Button>
        </div>
      </form>
    </div>
  );
}
