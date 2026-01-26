import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Rss, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Mic,
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import type { Podcast, RssFeed } from "@shared/schema";

export default function RssManagement() {
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [feedUrl, setFeedUrl] = useState("");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; episodeCount: number; title?: string } | null>(null);
  const [podcastTitle, setPodcastTitle] = useState("");

  const { data: podcasts = [], isLoading: podcastsLoading } = useQuery<Podcast[]>({
    queryKey: ['/api/podcasts'],
    enabled: isAuthenticated,
  });

  const podcast = podcasts[0];

  const { data: feeds = [], isLoading: feedsLoading } = useQuery<RssFeed[]>({
    queryKey: ['/api/podcasts', podcast?.id, 'rss'],
    queryFn: async () => {
      if (!podcast) return [];
      const res = await fetch(`/api/podcasts/${podcast.id}/rss`);
      return res.json();
    },
    enabled: !!podcast,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const createPodcastMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest('POST', '/api/podcasts', { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts'] });
      toast({ title: "Podcast created!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create podcast.", variant: "destructive" });
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest('POST', '/api/rss/validate', { feedUrl: url });
      return res.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        toast({ title: "Valid RSS feed!", description: `Found ${data.episodeCount} episodes.` });
      } else {
        toast({ title: "Invalid RSS feed", description: "Please check the URL.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Validation failed", description: "Could not validate this URL.", variant: "destructive" });
    },
  });

  const addFeedMutation = useMutation({
    mutationFn: async () => {
      if (!podcast) throw new Error("No podcast");
      const res = await apiRequest('POST', `/api/podcasts/${podcast.id}/rss`, { 
        feedUrl, 
        sourceType: 'existing',
        status: 'validated'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts', podcast?.id, 'rss'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setFeedUrl("");
      setValidationResult(null);
      toast({ title: "RSS feed added!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add feed.", variant: "destructive" });
    },
  });

  const generateHostedMutation = useMutation({
    mutationFn: async () => {
      if (!podcast) throw new Error("No podcast");
      const res = await apiRequest('POST', `/api/podcasts/${podcast.id}/rss/generate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts', podcast?.id, 'rss'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({ title: "Podlogix RSS feed created!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate feed.", variant: "destructive" });
    },
  });

  if (authLoading || podcastsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Rss className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl">RSS Management</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* No Podcast Yet */}
        {!podcast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Create Your Podcast</CardTitle>
                <CardDescription>First, let's set up your podcast before managing RSS feeds.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="podcast-title">Podcast Title</Label>
                  <Input
                    id="podcast-title"
                    placeholder="My Awesome Podcast"
                    value={podcastTitle}
                    onChange={(e) => setPodcastTitle(e.target.value)}
                    data-testid="input-podcast-title"
                  />
                </div>
                <Button 
                  onClick={() => createPodcastMutation.mutate(podcastTitle)}
                  disabled={!podcastTitle || createPodcastMutation.isPending}
                  data-testid="button-create-podcast"
                >
                  {createPodcastMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Podcast
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Existing Feeds */}
        {podcast && feeds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Active RSS Feeds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {feeds.map((feed) => (
                  <div key={feed.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm truncate" data-testid={`text-feed-url-${feed.id}`}>
                        {feed.feedUrl}
                      </span>
                    </div>
                    <Badge variant="secondary">{feed.sourceType}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* RSS Setup */}
        {podcast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Setup RSS Feed</CardTitle>
                <CardDescription>
                  Import your existing RSS feed or create a new one with Podlogix hosting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="existing" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="existing" data-testid="tab-existing-rss">Import Existing</TabsTrigger>
                    <TabsTrigger value="hosted" data-testid="tab-hosted-rss">Podlogix Hosting</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="existing" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="feed-url">RSS Feed URL</Label>
                      <Input
                        id="feed-url"
                        placeholder="https://feeds.example.com/podcast.xml"
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                        data-testid="input-feed-url"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => validateMutation.mutate(feedUrl)}
                        disabled={!feedUrl || validateMutation.isPending}
                        data-testid="button-validate-rss"
                      >
                        {validateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Validate Feed
                      </Button>
                      
                      {validationResult?.valid && (
                        <Button 
                          onClick={() => addFeedMutation.mutate()}
                          disabled={addFeedMutation.isPending}
                          data-testid="button-add-feed"
                        >
                          {addFeedMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add Feed
                        </Button>
                      )}
                    </div>

                    {validationResult && (
                      <div className={`p-3 rounded-lg ${validationResult.valid ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="flex items-center gap-2">
                          {validationResult.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium">
                            {validationResult.valid 
                              ? `Valid feed with ${validationResult.episodeCount} episodes`
                              : 'Invalid RSS feed'}
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="hosted" className="space-y-4 mt-4">
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Mic className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Podlogix Podcast Hosting</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Get a reliable RSS feed hosted by Podlogix. Upload your episodes directly 
                            and we'll handle the distribution to all major platforms.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => generateHostedMutation.mutate()}
                      disabled={generateHostedMutation.isPending}
                      data-testid="button-generate-hosted"
                    >
                      {generateHostedMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Rss className="h-4 w-4 mr-2" />
                      )}
                      Create Podlogix RSS Feed
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
