import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mic, 
  Headphones,
  Rss, 
  Sparkles, 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Bookmark,
  BookOpen,
  Bell,
  Search,
  Play,
  FileText,
  Zap,
  Settings,
  Tag,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  HelpCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { SiSpotify } from "react-icons/si";

interface PodcastSubscription {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  artworkUrl: string | null;
  feedUrl: string;
  spotifyShowId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SubscriptionEpisode {
  id: string;
  subscriptionId: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  duration: number | null;
  publishedAt: string | null;
  transcriptStatus: string;
  briefingStatus: string;
  isRead: boolean;
}

interface UserInterest {
  id: string;
  topic: string;
  keywords: string[] | null;
  priority: string;
  isActive: boolean;
}

interface EpisodeBriefing {
  id: string;
  episodeId: string;
  summary: string;
  keyTakeaways: string[] | null;
  relevantQuotes: string[] | null;
  personalInsights: string[] | null;
  matchedInterests: string[] | null;
  relevanceScore: number;
  isBookmarked: boolean;
  createdAt: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  imageUrl: string | null;
  totalEpisodes: number;
}

export default function ListenerDashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [rssFeedUrl, setRssFeedUrl] = useState("");
  const [isAddPodcastOpen, setIsAddPodcastOpen] = useState(false);
  const [isAddInterestOpen, setIsAddInterestOpen] = useState(false);
  const [newInterest, setNewInterest] = useState({ topic: "", keywords: "", priority: "medium" });
  const [selectedEpisode, setSelectedEpisode] = useState<SubscriptionEpisode | null>(null);

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<PodcastSubscription[]>({
    queryKey: ['/api/listener/subscriptions'],
    enabled: isAuthenticated,
  });

  const { data: episodes = [], isLoading: episodesLoading } = useQuery<SubscriptionEpisode[]>({
    queryKey: ['/api/listener/episodes'],
    enabled: isAuthenticated,
  });

  const { data: interests = [] } = useQuery<UserInterest[]>({
    queryKey: ['/api/listener/interests'],
    enabled: isAuthenticated,
  });

  const { data: briefings = [] } = useQuery<EpisodeBriefing[]>({
    queryKey: ['/api/listener/briefings'],
    enabled: isAuthenticated,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/listener/notifications'],
    enabled: isAuthenticated,
  });

  const { data: spotifyStatus, refetch: refetchSpotifyStatus } = useQuery<{ 
    connected: boolean; 
    displayName: string | null;
    spotifyUserId: string | null;
  }>({
    queryKey: ['/api/listener/spotify/status'],
    enabled: isAuthenticated,
  });

  const { data: spotifyShows = [], isLoading: spotifyLoading } = useQuery<SpotifyShow[]>({
    queryKey: ['/api/listener/spotify/shows'],
    enabled: isAuthenticated && spotifyStatus?.connected,
  });

  const connectSpotifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/listener/spotify/auth');
      return res.json();
    },
    onSuccess: (data: { authUrl: string }) => {
      window.location.href = data.authUrl;
    },
    onError: () => {
      toast({ title: "Connection failed", description: "Could not connect to Spotify", variant: "destructive" });
    },
  });

  const disconnectSpotifyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', '/api/listener/spotify/disconnect');
    },
    onSuccess: () => {
      refetchSpotifyStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/listener/spotify/shows'] });
      toast({ title: "Disconnected", description: "Spotify account disconnected" });
    },
    onError: () => {
      toast({ title: "Disconnect failed", description: "Could not disconnect Spotify", variant: "destructive" });
    },
  });

  const searchSpotifyMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest('GET', `/api/listener/spotify/search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
  });

  const importFromSpotifyMutation = useMutation({
    mutationFn: async (showId: string) => {
      const res = await apiRequest('POST', '/api/listener/spotify/import', { showId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/subscriptions'] });
      toast({ title: "Podcast imported", description: "Successfully imported from Spotify" });
    },
    onError: () => {
      toast({ title: "Import failed", description: "Could not import podcast", variant: "destructive" });
    },
  });

  const subscribeRssMutation = useMutation({
    mutationFn: async (feedUrl: string) => {
      const res = await apiRequest('POST', '/api/listener/subscriptions', { feedUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      setRssFeedUrl("");
      setIsAddPodcastOpen(false);
      toast({ title: "Subscribed!", description: "Successfully subscribed to podcast" });
    },
    onError: () => {
      toast({ title: "Subscription failed", description: "Could not subscribe to podcast feed", variant: "destructive" });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/listener/subscriptions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      toast({ title: "Unsubscribed", description: "Removed from your subscriptions" });
    },
  });

  const addInterestMutation = useMutation({
    mutationFn: async (data: { topic: string; keywords: string[]; priority: string }) => {
      const res = await apiRequest('POST', '/api/listener/interests', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/interests'] });
      setNewInterest({ topic: "", keywords: "", priority: "medium" });
      setIsAddInterestOpen(false);
      toast({ title: "Interest added", description: "AI will now track this topic in your podcasts" });
    },
  });

  const deleteInterestMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/listener/interests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/interests'] });
      toast({ title: "Interest removed" });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const res = await apiRequest('POST', `/api/listener/episodes/${episodeId}/transcribe`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      toast({ title: "Transcription started", description: "This may take a few minutes" });
    },
  });

  const generateBriefingMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      const res = await apiRequest('POST', `/api/listener/episodes/${episodeId}/briefing`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/briefings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      toast({ title: "Briefing generation started", description: "Your personalized briefing is being created" });
    },
  });

  const markNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', '/api/listener/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/notifications'] });
    },
  });

  const syncEpisodesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/listener/sync');
      return res.json();
    },
    onSuccess: (data: { synced: number; newEpisodes: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/subscriptions'] });
      toast({ 
        title: "Sync complete", 
        description: `Found ${data.newEpisodes} new episodes from ${data.synced} podcasts` 
      });
    },
    onError: () => {
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  const autoBriefingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/listener/auto-briefings', { maxEpisodes: 3 });
      return res.json();
    },
    onSuccess: (data: { processed: number; briefings: number }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/briefings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/listener/notifications'] });
      toast({ 
        title: "Auto-briefings complete", 
        description: `Generated ${data.briefings} briefings from ${data.processed} episodes` 
      });
    },
    onError: () => {
      toast({ title: "Auto-briefings failed", variant: "destructive" });
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/listener/spotify/playlist');
      return res.json();
    },
    onSuccess: (data: { externalUrl: string }) => {
      toast({ 
        title: "Playlist created!", 
        description: "Podlogix Recommendations playlist is ready in Spotify" 
      });
    },
    onError: () => {
      toast({ title: "Failed to create playlist", variant: "destructive" });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ episodeId, podcastName, episodeTitle }: { episodeId: string; podcastName: string; episodeTitle: string }) => {
      const res = await apiRequest('POST', '/api/listener/spotify/playlist/add', { episodeId, podcastName, episodeTitle });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Added to playlist!", description: "Episode added to Podlogix Recommendations" });
    },
    onError: () => {
      toast({ title: "Failed to add to playlist", description: "Episode may not be available on Spotify", variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify_connected') === 'true') {
      toast({ title: "Spotify connected!", description: "You can now import your followed podcasts" });
      refetchSpotifyStatus();
      window.history.replaceState({}, '', '/listener');
    }
    if (params.get('spotify_error')) {
      const errorType = params.get('spotify_error');
      const message = errorType === 'missing_params' 
        ? 'Authorization parameters missing' 
        : 'Failed to connect Spotify account';
      toast({ title: "Spotify connection failed", description: message, variant: "destructive" });
      window.history.replaceState({}, '', '/listener');
    }
  }, [toast, refetchSpotifyStatus]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const recentBriefings = briefings.slice(0, 5);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white">
              <Headphones className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">Podlogix Listener</span>
          </Link>

          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" asChild data-testid="link-creator-dashboard">
                  <Link href="/dashboard">
                    <Mic className="h-4 w-4 mr-2" />
                    Creator Mode
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Switch to podcast creator tools</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild data-testid="link-help">
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help & Knowledge Base</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative cursor-pointer">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications.length}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-accent/10 via-primary/10 to-accent/5 rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome">
                Your Podcast Briefings
              </h1>
              <p className="text-muted-foreground">
                AI-powered insights from {subscriptions.length} podcast{subscriptions.length !== 1 ? 's' : ''} you follow
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => syncEpisodesMutation.mutate()}
                    disabled={syncEpisodesMutation.isPending}
                    data-testid="button-sync"
                  >
                    {syncEpisodesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Episodes
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Check all podcasts for new episodes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => autoBriefingsMutation.mutate()}
                    disabled={autoBriefingsMutation.isPending || interests.length === 0}
                    data-testid="button-auto-briefings"
                  >
                    {autoBriefingsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Auto Briefings
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {interests.length === 0 
                    ? "Add interests first to generate briefings" 
                    : "Automatically transcribe and generate briefings for new episodes"}
                </TooltipContent>
              </Tooltip>
              <Dialog open={isAddPodcastOpen} onOpenChange={setIsAddPodcastOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-podcast">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Podcast
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Podcast</DialogTitle>
                    <DialogDescription>
                      Import from Spotify or subscribe via RSS feed
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="rss" className="mt-4">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="rss">
                        <Rss className="h-4 w-4 mr-2" />
                        RSS Feed
                      </TabsTrigger>
                      <TabsTrigger value="spotify" disabled={!spotifyStatus?.connected}>
                        <SiSpotify className="h-4 w-4 mr-2" />
                        Spotify
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="rss" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="rss-url">RSS Feed URL</Label>
                        <Input
                          id="rss-url"
                          placeholder="https://example.com/feed.xml"
                          value={rssFeedUrl}
                          onChange={(e) => setRssFeedUrl(e.target.value)}
                          data-testid="input-rss-url"
                        />
                      </div>
                      <Button 
                        onClick={() => subscribeRssMutation.mutate(rssFeedUrl)}
                        disabled={!rssFeedUrl || subscribeRssMutation.isPending}
                        className="w-full"
                        data-testid="button-subscribe-rss"
                      >
                        {subscribeRssMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Subscribe
                      </Button>
                    </TabsContent>
                    <TabsContent value="spotify" className="space-y-4 mt-4">
                      {spotifyStatus?.connected ? (
                        <>
                          <div className="space-y-2">
                            <Label>Search Spotify</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Search podcasts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                data-testid="input-spotify-search"
                              />
                              <Button 
                                variant="outline" 
                                onClick={() => searchSpotifyMutation.mutate(searchQuery)}
                                disabled={!searchQuery || searchSpotifyMutation.isPending}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-64">
                            <div className="space-y-2">
                              {(searchSpotifyMutation.data as SpotifyShow[] || spotifyShows).map((show: SpotifyShow) => (
                                <div key={show.id} className="flex items-center gap-3 p-2 rounded-lg border hover-elevate">
                                  <Avatar className="h-10 w-10 rounded">
                                    <AvatarImage src={show.imageUrl || undefined} />
                                    <AvatarFallback><Mic className="h-4 w-4" /></AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{show.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{show.publisher}</p>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => importFromSpotifyMutation.mutate(show.id)}
                                    disabled={importFromSpotifyMutation.isPending}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <SiSpotify className="h-12 w-12 mx-auto text-green-500 mb-4" />
                          <p className="text-muted-foreground mb-4">Connect your Spotify account to import podcasts</p>
                          <Button 
                            variant="outline" 
                            onClick={() => connectSpotifyMutation.mutate()}
                            disabled={connectSpotifyMutation.isPending}
                            data-testid="button-connect-spotify"
                          >
                            {connectSpotifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <SiSpotify className="h-4 w-4 mr-2" />
                            Connect Spotify
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="episodes" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="episodes" data-testid="tab-episodes">
                  <Play className="h-4 w-4 mr-2" />
                  Episodes
                </TabsTrigger>
                <TabsTrigger value="briefings" data-testid="tab-briefings">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Briefings
                </TabsTrigger>
                <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
                  <Rss className="h-4 w-4 mr-2" />
                  Podcasts
                </TabsTrigger>
              </TabsList>

              <TabsContent value="episodes" className="mt-6 space-y-4">
                {episodesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                ) : episodes.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No episodes yet</h3>
                    <p className="text-muted-foreground text-sm">Subscribe to podcasts to see their latest episodes here</p>
                  </Card>
                ) : (
                  episodes.map((episode) => (
                    <Card key={episode.id} className={`hover-elevate ${!episode.isRead ? 'border-primary/30' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                            <Play className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {!episode.isRead && <Badge className="text-xs">New</Badge>}
                              {episode.duration && (
                                <span className="text-xs text-muted-foreground">{formatDuration(episode.duration)}</span>
                              )}
                            </div>
                            <h3 className="font-semibold truncate" data-testid={`text-episode-title-${episode.id}`}>
                              {episode.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {episode.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              {episode.transcriptStatus === 'completed' ? (
                                episode.briefingStatus === 'completed' ? (
                                  <Button size="sm" variant="outline" onClick={() => setSelectedEpisode(episode)} data-testid={`button-view-briefing-${episode.id}`}>
                                    <BookOpen className="h-4 w-4 mr-1" />
                                    View Briefing
                                  </Button>
                                ) : episode.briefingStatus === 'processing' ? (
                                  <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating...</Badge>
                                ) : (
                                  <Button size="sm" onClick={() => generateBriefingMutation.mutate(episode.id)} disabled={generateBriefingMutation.isPending} data-testid={`button-generate-briefing-${episode.id}`}>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Generate Briefing
                                  </Button>
                                )
                              ) : episode.transcriptStatus === 'processing' ? (
                                <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Transcribing...</Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => transcribeMutation.mutate(episode.id)} disabled={transcribeMutation.isPending || !episode.audioUrl} data-testid={`button-transcribe-${episode.id}`}>
                                  <FileText className="h-4 w-4 mr-1" />
                                  Transcribe
                                </Button>
                              )}
                              {episode.audioUrl && (
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={episode.audioUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="briefings" className="mt-6 space-y-4">
                {briefings.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No briefings yet</h3>
                    <p className="text-muted-foreground text-sm">Generate your first AI-powered briefing from an episode</p>
                  </Card>
                ) : (
                  briefings.map((briefing) => {
                    const episode = episodes.find(e => e.id === briefing.episodeId);
                    const subscription = subscriptions.find(s => s.id === episode?.subscriptionId);
                    return (
                    <Card key={briefing.id} className="hover-elevate">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant={briefing.relevanceScore >= 70 ? 'default' : 'secondary'}>
                              {briefing.relevanceScore}% Relevant
                            </Badge>
                            {briefing.isBookmarked && <Bookmark className="h-4 w-4 text-primary fill-primary" />}
                          </div>
                          {spotifyStatus?.connected && briefing.relevanceScore >= 70 && episode && subscription && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToPlaylistMutation.mutate({
                                episodeId: episode.id,
                                podcastName: subscription.title,
                                episodeTitle: episode.title
                              })}
                              disabled={addToPlaylistMutation.isPending}
                              data-testid={`button-add-playlist-${briefing.id}`}
                            >
                              {addToPlaylistMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <SiSpotify className="h-4 w-4 mr-1" />
                              )}
                              Add to Playlist
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">{briefing.summary}</p>
                        {briefing.matchedInterests && briefing.matchedInterests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {briefing.matchedInterests.map((interest, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )})
                )}
              </TabsContent>

              <TabsContent value="subscriptions" className="mt-6 space-y-4">
                {subsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                  </div>
                ) : subscriptions.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No podcasts yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">Add your first podcast to get started</p>
                    <Button onClick={() => setIsAddPodcastOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Podcast
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {subscriptions.map((sub) => (
                      <Card key={sub.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 rounded">
                              <AvatarImage src={sub.artworkUrl || undefined} />
                              <AvatarFallback><Mic className="h-5 w-5" /></AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{sub.title}</h3>
                              <p className="text-sm text-muted-foreground truncate">{sub.author}</p>
                              {sub.spotifyShowId && (
                                <Badge variant="secondary" className="mt-2 text-xs">
                                  <SiSpotify className="h-3 w-3 mr-1" />
                                  Spotify
                                </Badge>
                              )}
                            </div>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => unsubscribeMutation.mutate(sub.id)}
                              data-testid={`button-unsubscribe-${sub.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Your Interests
                  </CardTitle>
                  <Dialog open={isAddInterestOpen} onOpenChange={setIsAddInterestOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" data-testid="button-add-interest">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Add a new topic for AI to track</TooltipContent>
                    </Tooltip>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Interest</DialogTitle>
                        <DialogDescription>
                          AI will track and highlight content related to your interests
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="topic">Topic</Label>
                          <Input
                            id="topic"
                            placeholder="e.g., AI trends, startup funding"
                            value={newInterest.topic}
                            onChange={(e) => setNewInterest(prev => ({ ...prev, topic: e.target.value }))}
                            data-testid="input-interest-topic"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="keywords">Keywords (comma separated)</Label>
                          <Input
                            id="keywords"
                            placeholder="e.g., machine learning, GPT, neural networks"
                            value={newInterest.keywords}
                            onChange={(e) => setNewInterest(prev => ({ ...prev, keywords: e.target.value }))}
                            data-testid="input-interest-keywords"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select value={newInterest.priority} onValueChange={(v) => setNewInterest(prev => ({ ...prev, priority: v }))}>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button 
                          onClick={() => addInterestMutation.mutate({
                            topic: newInterest.topic,
                            keywords: newInterest.keywords.split(',').map(k => k.trim()).filter(Boolean),
                            priority: newInterest.priority,
                          })}
                          disabled={!newInterest.topic || addInterestMutation.isPending}
                          data-testid="button-save-interest"
                        >
                          {addInterestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Interest
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <CardDescription>Topics AI tracks for you</CardDescription>
              </CardHeader>
              <CardContent>
                {interests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No interests added yet. Add topics to get personalized briefings!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {interests.map((interest) => (
                      <div key={interest.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            interest.priority === 'high' ? 'default' : 
                            interest.priority === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {interest.priority}
                          </Badge>
                          <span className="text-sm font-medium">{interest.topic}</span>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => deleteInterestMutation.mutate(interest.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                  {unreadNotifications.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => markNotificationsReadMutation.mutate()}>
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No notifications yet
                  </p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {notifications.slice(0, 10).map((notif) => (
                        <div 
                          key={notif.id} 
                          className={`p-3 rounded-lg border ${!notif.isRead ? 'bg-primary/5 border-primary/20' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {notif.type === 'briefing_ready' && <Sparkles className="h-4 w-4 text-primary" />}
                            {notif.type === 'new_episode' && <Play className="h-4 w-4 text-green-500" />}
                            {notif.type === 'impersonator_alert' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="text-sm font-medium">{notif.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <SiSpotify className="h-5 w-5 text-green-500" />
                  Spotify
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spotifyStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Connected</p>
                        {spotifyStatus.displayName && (
                          <p className="text-xs text-muted-foreground">{spotifyStatus.displayName}</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="default"
                      size="sm" 
                      className="w-full bg-green-500 text-white"
                      onClick={() => createPlaylistMutation.mutate()}
                      disabled={createPlaylistMutation.isPending}
                      data-testid="button-create-playlist"
                    >
                      {createPlaylistMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <SiSpotify className="h-4 w-4 mr-2" />
                      )}
                      Create Playlist
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => disconnectSpotifyMutation.mutate()}
                      disabled={disconnectSpotifyMutation.isPending}
                      data-testid="button-disconnect-spotify"
                    >
                      {disconnectSpotifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Connect Spotify to import your followed podcasts
                    </p>
                    <Button 
                      onClick={() => connectSpotifyMutation.mutate()}
                      disabled={connectSpotifyMutation.isPending}
                      className="w-full bg-green-500 text-white"
                      data-testid="button-connect-spotify-sidebar"
                    >
                      {connectSpotifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <SiSpotify className="h-4 w-4 mr-2" />
                      Connect Spotify
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <Zap className="h-8 w-8 mx-auto text-primary mb-3" />
                <h3 className="font-semibold mb-2">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-2xl font-bold">{subscriptions.length}</p>
                    <p className="text-xs text-muted-foreground">Podcasts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{briefings.length}</p>
                    <p className="text-xs text-muted-foreground">Briefings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{interests.length}</p>
                    <p className="text-xs text-muted-foreground">Interests</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{episodes.filter(e => !e.isRead).length}</p>
                    <p className="text-xs text-muted-foreground">Unread</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedEpisode && (
          <Dialog open={!!selectedEpisode} onOpenChange={() => setSelectedEpisode(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedEpisode.title}</DialogTitle>
                <DialogDescription>AI-generated briefing</DialogDescription>
              </DialogHeader>
              {(() => {
                const briefing = briefings.find(b => b.episodeId === selectedEpisode.id);
                if (!briefing) return <p>No briefing found</p>;
                return (
                  <div className="space-y-6 mt-4">
                    <div className="flex items-center gap-4">
                      <Badge>{briefing.relevanceScore}% Relevant</Badge>
                      {briefing.matchedInterests?.map((interest, i) => (
                        <Badge key={i} variant="outline">{interest}</Badge>
                      ))}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Summary
                      </h4>
                      <p className="text-sm text-muted-foreground">{briefing.summary}</p>
                    </div>

                    {briefing.keyTakeaways && briefing.keyTakeaways.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Key Takeaways
                        </h4>
                        <ul className="space-y-2">
                          {briefing.keyTakeaways.map((takeaway, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {takeaway}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {briefing.relevantQuotes && briefing.relevantQuotes.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notable Quotes
                        </h4>
                        <div className="space-y-2">
                          {briefing.relevantQuotes.map((quote, i) => (
                            <blockquote key={i} className="text-sm italic border-l-2 border-primary pl-4 py-1 text-muted-foreground">
                              "{quote}"
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}

                    {briefing.personalInsights && briefing.personalInsights.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Personal Insights
                        </h4>
                        <ul className="space-y-2">
                          {briefing.personalInsights.map((insight, i) => (
                            <li key={i} className="text-sm flex items-start gap-2 bg-primary/5 p-2 rounded">
                              <Zap className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
