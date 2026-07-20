import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  ArrowLeft,
  Mic,
  Loader2,
  Plus,
  UploadCloud,
  Trash2,
  Copy,
  Rss,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Podcast, Episode, RssFeed } from "@shared/schema";

const MAX_AUDIO_BYTES = 500 * 1024 * 1024; // 500MB

export default function Episodes() {
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pendingAudio, setPendingAudio] = useState<{
    audioUrl: string;
    fileSizeBytes: number;
    mimeType: string;
    fileName: string;
  } | null>(null);
  // objectPath returned when requesting the presigned URL, keyed for the file being uploaded
  const objectPathRef = useRef<string | null>(null);
  const fileMetaRef = useRef<{ size: number; type: string; name: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: podcasts = [], isLoading: podcastsLoading } = useQuery<Podcast[]>({
    queryKey: ["/api/podcasts"],
    enabled: isAuthenticated,
  });
  const podcast = podcasts[0];

  const { data: episodes = [], isLoading: episodesLoading } = useQuery<Episode[]>({
    queryKey: ["/api/podcasts", podcast?.id, "episodes"],
    queryFn: async () => {
      if (!podcast) return [];
      const res = await fetch(`/api/podcasts/${podcast.id}/episodes`);
      return res.json();
    },
    enabled: !!podcast,
  });

  const { data: feeds = [] } = useQuery<RssFeed[]>({
    queryKey: ["/api/podcasts", podcast?.id, "rss"],
    queryFn: async () => {
      if (!podcast) return [];
      const res = await fetch(`/api/podcasts/${podcast.id}/rss`);
      return res.json();
    },
    enabled: !!podcast,
  });
  const hostedFeed = feeds.find((f) => f.sourceType === "podlogix");

  const invalidateEpisodes = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "episodes"] });
  };

  const createEpisodeMutation = useMutation({
    mutationFn: async () => {
      if (!podcast || !pendingAudio) throw new Error("Missing data");
      const res = await apiRequest("POST", `/api/podcasts/${podcast.id}/episodes`, {
        title,
        description,
        audioUrl: pendingAudio.audioUrl,
        fileSizeBytes: pendingAudio.fileSizeBytes,
        mimeType: pendingAudio.mimeType,
      });
      return res.json();
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPendingAudio(null);
      invalidateEpisodes();
      toast({ title: "Episode created", description: "Saved as a draft. Publish it to add it to your feed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create episode.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" }) => {
      const res = await apiRequest("POST", `/api/episodes/${id}/${action}`);
      return res.json();
    },
    onSuccess: (_data, vars) => {
      invalidateEpisodes();
      toast({
        title: vars.action === "publish" ? "Episode published" : "Episode unpublished",
        description: vars.action === "publish" ? "It's now live in your RSS feed." : "Removed from your RSS feed.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update episode.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/episodes/${id}`);
    },
    onSuccess: () => {
      invalidateEpisodes();
      toast({ title: "Episode deleted" });
    },
  });

  const generateFeedMutation = useMutation({
    mutationFn: async () => {
      if (!podcast) throw new Error("No podcast");
      const res = await apiRequest("POST", `/api/podcasts/${podcast.id}/rss/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "rss"] });
      toast({ title: "Hosted feed ready", description: "Your Podlogix RSS feed is live." });
    },
  });

  const handleGetUploadParameters = async (file: { name?: string; size?: number | null; type?: string }) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", {
      name: file.name ?? "episode-audio",
      size: file.size ?? 0,
      contentType: file.type ?? "audio/mpeg",
    });
    const data = await res.json();
    objectPathRef.current = data.objectPath;
    fileMetaRef.current = {
      size: file.size ?? 0,
      type: file.type || "audio/mpeg",
      name: file.name ?? "episode-audio",
    };
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleUploadComplete = () => {
    if (objectPathRef.current && fileMetaRef.current) {
      setPendingAudio({
        audioUrl: objectPathRef.current,
        fileSizeBytes: fileMetaRef.current.size,
        mimeType: fileMetaRef.current.type,
        fileName: fileMetaRef.current.name,
      });
      toast({ title: "Audio uploaded", description: "Now add a title and save the episode." });
    }
  };

  const copyFeedUrl = () => {
    if (hostedFeed) {
      navigator.clipboard.writeText(hostedFeed.feedUrl);
      toast({ title: "Copied", description: "Feed URL copied to clipboard." });
    }
  };

  if (authLoading || podcastsLoading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full max-w-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl">Episodes</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {!podcast && (
          <Card>
            <CardHeader>
              <CardTitle>No podcast yet</CardTitle>
              <CardDescription>Create your podcast in RSS Management first, then come back to upload episodes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard/rss")} data-testid="button-goto-rss">
                <Rss className="h-4 w-4 mr-2" />
                Go to RSS Management
              </Button>
            </CardContent>
          </Card>
        )}

        {podcast && (
          <>
            {/* Hosted feed status */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Hosted RSS Feed
                  </CardTitle>
                  <CardDescription>
                    {hostedFeed
                      ? "Submit this URL to Spotify, Apple Podcasts, and other directories."
                      : "Generate your Podlogix-hosted feed to distribute this show."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hostedFeed ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 break-all" data-testid="text-feed-url">
                        {hostedFeed.feedUrl}
                      </code>
                      <Button variant="outline" size="sm" onClick={copyFeedUrl} data-testid="button-copy-feed">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateFeedMutation.mutate()}
                      disabled={generateFeedMutation.isPending}
                      data-testid="button-generate-feed"
                    >
                      {generateFeedMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Rss className="h-4 w-4 mr-2" />
                      )}
                      Generate Hosted Feed
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* New episode */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    New Episode
                  </CardTitle>
                  <CardDescription>Upload your audio, add details, and publish to your feed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Audio file</Label>
                    <div className="flex items-center gap-3">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={MAX_AUDIO_BYTES}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                      >
                        <UploadCloud className="h-4 w-4 mr-2" />
                        {pendingAudio ? "Replace audio" : "Upload audio"}
                      </ObjectUploader>
                      {pendingAudio && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-uploaded-file">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {pendingAudio.fileName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episode-title">Title</Label>
                    <Input
                      id="episode-title"
                      placeholder="Episode 1: Getting Started"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      data-testid="input-episode-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episode-description">Description / show notes</Label>
                    <Textarea
                      id="episode-description"
                      placeholder="What's this episode about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      data-testid="input-episode-description"
                    />
                  </div>
                  <Button
                    onClick={() => createEpisodeMutation.mutate()}
                    disabled={!title || !pendingAudio || createEpisodeMutation.isPending}
                    data-testid="button-save-episode"
                  >
                    {createEpisodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Save Episode
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Episode list */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Your Episodes</CardTitle>
                  <CardDescription>
                    {episodes.length === 0
                      ? "No episodes yet — upload your first one above."
                      : `${episodes.filter((e) => e.status === "published").length} published · ${episodes.filter((e) => e.status !== "published").length} draft`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {episodesLoading && <Skeleton className="h-16 w-full" />}
                  {episodes.map((ep) => (
                    <div
                      key={ep.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      data-testid={`episode-row-${ep.id}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ep.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString() : "Draft"}
                          {ep.fileSizeBytes ? ` · ${(ep.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={ep.status === "published" ? "default" : "secondary"}>
                          {ep.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            publishMutation.mutate({
                              id: ep.id,
                              action: ep.status === "published" ? "unpublish" : "publish",
                            })
                          }
                          disabled={publishMutation.isPending}
                          data-testid={`button-toggle-publish-${ep.id}`}
                        >
                          {ep.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(ep.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${ep.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
