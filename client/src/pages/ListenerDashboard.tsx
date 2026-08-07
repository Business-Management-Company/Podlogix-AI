import { useState, useEffect, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  BarChart3,
  Search,
  Play,
  Pause,
  Volume2,
  FileText,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Zap,
  Settings,
  Tag,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ListMusic,
  MessageCircle,
  X,
  Send,
  Command,
  Home,
  Layers,
  ChevronRight
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
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [rssFeedUrl, setRssFeedUrl] = useState("");
  const [isAddPodcastOpen, setIsAddPodcastOpen] = useState(false);
  const [isAddInterestOpen, setIsAddInterestOpen] = useState(false);
  const [newInterest, setNewInterest] = useState({ topic: "", keywords: "", priority: "medium" });
  const [selectedEpisode, setSelectedEpisode] = useState<SubscriptionEpisode | null>(null);
  const [playingEpisodeId, setPlayingEpisodeId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [episodeSort, setEpisodeSort] = useState<'newest' | 'oldest' | 'unread'>('newest');
  const [episodeFilter, setEpisodeFilter] = useState<string>('all');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(new Set());
  const [expandedPodcastId, setExpandedPodcastId] = useState<string | null>(null);
  const [spotifyPlaylistPodcasts, setSpotifyPlaylistPodcasts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('spotifyPlaylistPodcasts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [activeTab, setActiveTab] = useState('subscriptions');
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [cmdKQuery, setCmdKQuery] = useState('');
  const [cmdKSelectedIdx, setCmdKSelectedIdx] = useState(0);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement | null>(null);

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
      const res = await fetch('/api/listener/spotify/playlist', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create playlist');
      return data;
    },
    onSuccess: (data: { externalUrl: string }) => {
      toast({
        title: "Playlist created!",
        description: "Podlogix Recommendations playlist is ready in Spotify"
      });
    },
    onError: (error: any) => {
      toast({ title: "Spotify playlist error", description: error.message, variant: "destructive" });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ episodeId, podcastName, episodeTitle }: { episodeId: string; podcastName: string; episodeTitle: string }) => {
      const res = await fetch('/api/listener/spotify/playlist/add', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, podcastName, episodeTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add to playlist');
      return data;
    },
    onSuccess: () => {
      toast({ title: "Added to playlist!", description: "Episode added to Podlogix Recommendations" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add to playlist", description: error.message, variant: "destructive" });
    },
  });

  const addNewEpisodesToPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/listener/spotify/playlist/add-new', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add episodes');
      return data;
    },
    onSuccess: (data: { addedCount: number; totalAttempted: number; playlistUrl: string }) => {
      toast({
        title: "Episodes added!",
        description: `Added ${data.addedCount} of ${data.totalAttempted} new episodes to your playlist`
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add episodes", description: error.message, variant: "destructive" });
    },
  });

  const syncSmartPlaylistMutation = useMutation({
    mutationFn: async (subscriptionIds: string[]) => {
      const res = await fetch('/api/listener/spotify/playlist/sync-smart', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to sync playlist');
      return data;
    },
    onSuccess: (data: { addedCount: number; playlistUrl: string }) => {
      toast({
        title: "Smart playlist synced!",
        description: `Added ${data.addedCount} episode${data.addedCount !== 1 ? 's' : ''} from your marked podcasts`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const togglePlaylistPodcast = (subId: string) => {
    setSpotifyPlaylistPodcasts(prev => {
      const next = new Set(prev);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      try {
        localStorage.setItem('spotifyPlaylistPodcasts', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (briefingId: string) => {
      const res = await apiRequest('PATCH', `/api/listener/briefings/${briefingId}/bookmark`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/briefings'] });
      toast({
        title: data.isBookmarked ? "Briefing saved!" : "Briefing unsaved",
        description: data.isBookmarked ? "Added to your saved briefings" : "Removed from saved briefings"
      });
    },
    onError: () => {
      toast({ title: "Failed to save briefing", variant: "destructive" });
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
      const detail = params.get('spotify_error_detail');
      const message = errorType === 'missing_params'
        ? 'Authorization parameters missing'
        : errorType === 'not_authenticated'
        ? 'Session expired — please log in again'
        : detail
        ? decodeURIComponent(detail)
        : 'Failed to connect Spotify account';
      toast({ title: "Spotify connection failed", description: message, variant: "destructive" });
      window.history.replaceState({}, '', '/listener');
    }
  }, [location, toast, refetchSpotifyStatus]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(prev => !prev);
        setCmdKQuery('');
        setCmdKSelectedIdx(0);
      }
      if (e.key === 'Escape') {
        setCmdKOpen(false);
        setAiChatOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (aiEndRef.current) aiEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

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

  const togglePlayEpisode = (episode: SubscriptionEpisode) => {
    if (!episode.audioUrl) return;

    if (playingEpisodeId === episode.id) {
      audioRef.current?.pause();
      setPlayingEpisodeId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = episode.audioUrl;
        audioRef.current.play();
      }
      setPlayingEpisodeId(episode.id);
    }
  };

  const getPodcastName = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    return sub?.title || 'Unknown Podcast';
  };

  const toggleEpisodeSelection = (episodeId: string) => {
    setSelectedEpisodeIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  const selectAllEpisodes = () => {
    if (selectedEpisodeIds.size === filteredEpisodes.length) {
      setSelectedEpisodeIds(new Set());
    } else {
      setSelectedEpisodeIds(new Set(filteredEpisodes.map(e => e.id)));
    }
  };

  const filteredEpisodes = episodes
    .filter(ep => episodeFilter === 'all' || ep.subscriptionId === episodeFilter)
    .sort((a, b) => {
      if (episodeSort === 'unread') {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      }
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return episodeSort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

  const batchBriefingMutation = useMutation({
    mutationFn: async (episodeIds: string[]) => {
      const results = [];
      for (const id of episodeIds) {
        const res = await apiRequest('POST', `/api/listener/episodes/${id}/transcribe`);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/listener/episodes'] });
      setSelectedEpisodeIds(new Set());
      toast({ title: "Processing started", description: `Transcribing ${selectedEpisodeIds.size} episodes for briefings` });
    },
    onError: () => {
      toast({ title: "Failed to start batch processing", variant: "destructive" });
    },
  });

  const commandItems = [
    { group: 'Navigate', label: 'Podcasts', icon: Rss, action: () => setActiveTab('subscriptions') },
    { group: 'Navigate', label: 'Briefings', icon: BookOpen, action: () => setActiveTab('briefings') },
    { group: 'Navigate', label: 'Episodes', icon: Play, action: () => setActiveTab('episodes') },
    { group: 'Navigate', label: 'Creator Dashboard', icon: Mic, action: () => navigate('/dashboard') },
    { group: 'Navigate', label: 'Analytics', icon: BarChart3, action: () => navigate('/listener/analytics') },
    { group: 'Navigate', label: 'Help & Docs', icon: HelpCircle, action: () => navigate('/help') },
    { group: 'Actions', label: 'Sync Episodes', icon: RefreshCw, action: () => syncEpisodesMutation.mutate() },
    { group: 'Actions', label: 'Add Podcast', icon: Plus, action: () => setIsAddPodcastOpen(true) },
    { group: 'Actions', label: 'Auto Briefings', icon: Sparkles, action: () => autoBriefingsMutation.mutate() },
    { group: 'Actions', label: 'Sync Smart Playlist', icon: ListMusic, action: () => spotifyPlaylistPodcasts.size > 0 && syncSmartPlaylistMutation.mutate([...spotifyPlaylistPodcasts]) },
    { group: 'Actions', label: 'Ask Podlogix AI', icon: MessageCircle, action: () => setAiChatOpen(true) },
    { group: 'Settings', label: 'Manage Interests', icon: Tag, action: () => setIsAddInterestOpen(true) },
    { group: 'Settings', label: 'Notifications', icon: Bell, action: () => markNotificationsReadMutation.mutate() },
    { group: 'Settings', label: 'Sign Out', icon: LogOut, action: () => logout() },
  ];

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);
    try {
      const context = `The user listens to these podcasts: ${subscriptions.map(s => s.title).join(', ')}. They have ${briefings.length} briefings and ${episodes.filter(e => !e.isRead).length} unread episodes. Their tracked interests: ${interests.map(i => i.topic).join(', ')}.`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context, history: aiMessages.slice(-10) }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.response || data.message || data.reply || 'Sorry, I could not process that.' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white">
              <Headphones className="w-4 h-4" />
            </div>
            <span className="font-bold text-base hidden sm:block">Podlogix</span>
          </Link>

          {/* Cmd+K Search trigger */}
          <button
            onClick={() => { setCmdKOpen(true); setCmdKQuery(''); }}
            className="flex-1 max-w-sm flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground group"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Search or run a command...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs bg-background border rounded px-1 py-0.5 font-mono">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* Right-side icons */}
          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => syncEpisodesMutation.mutate()}
                  disabled={syncEpisodesMutation.isPending}
                  data-testid="button-sync-header"
                >
                  <RefreshCw className={`h-4 w-4 ${syncEpisodesMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync Episodes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/dashboard">
                    <Mic className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Creator Mode</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative"
                  onClick={() => markNotificationsReadMutation.mutate()}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications {unreadNotifications.length > 0 ? `(${unreadNotifications.length})` : ''}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Help</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">{user?.firstName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium hidden sm:block">{user?.firstName || 'Account'}</span>
                </button>
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
          className="bg-gradient-to-r from-accent/10 via-primary/10 to-accent/5 rounded-2xl p-5 md:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold mb-1" data-testid="text-welcome">
                Your Podcast Hub
              </h1>
              <p className="text-muted-foreground text-sm">
                {subscriptions.length} podcast{subscriptions.length !== 1 ? 's' : ''} · {episodes.filter(e => !e.isRead).length} new episodes · {briefings.length} briefings
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => autoBriefingsMutation.mutate()}
                disabled={autoBriefingsMutation.isPending || interests.length === 0}
                data-testid="button-auto-briefings"
              >
                {autoBriefingsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                Auto Briefings
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddPodcastOpen(true)}
                data-testid="button-add-podcast"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Podcast
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('episodes')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Play className="h-4 w-4 text-primary" />
                <Badge variant="secondary" className="text-xs">{episodes.filter(e => !e.isRead).length} new</Badge>
              </div>
              <p className="text-2xl font-bold">{episodes.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Episodes</p>
            </CardContent>
          </Card>
          <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('briefings')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <Badge variant="secondary" className="text-xs">{briefings.filter((b: EpisodeBriefing) => b.isBookmarked).length} saved</Badge>
              </div>
              <p className="text-2xl font-bold">{briefings.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Briefings</p>
            </CardContent>
          </Card>
          <Card className="hover-elevate cursor-pointer" onClick={() => setActiveTab('subscriptions')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Rss className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">{subscriptions.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Podcasts</p>
            </CardContent>
          </Card>
          <Card className={`hover-elevate cursor-pointer ${spotifyStatus?.connected ? 'border-green-500/30' : ''}`} onClick={() => spotifyStatus?.connected ? syncSmartPlaylistMutation.mutate([...spotifyPlaylistPodcasts]) : connectSpotifyMutation.mutate()}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <SiSpotify className={`h-4 w-4 ${spotifyStatus?.connected ? 'text-green-500' : 'text-muted-foreground'}`} />
                {spotifyStatus?.connected && spotifyPlaylistPodcasts.size > 0 && (
                  <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">{spotifyPlaylistPodcasts.size} tracked</Badge>
                )}
              </div>
              <p className="text-sm font-semibold">{spotifyStatus?.connected ? 'Spotify' : 'Connect'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{spotifyStatus?.connected ? (spotifyPlaylistPodcasts.size > 0 ? 'Tap to sync playlist' : 'Smart playlist ready') : 'Link your account'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">
                  <Rss className="h-4 w-4 mr-2" />
                  Podcasts
                </TabsTrigger>
                <TabsTrigger value="briefings" data-testid="tab-briefings">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Briefings
                </TabsTrigger>
                <TabsTrigger value="episodes" data-testid="tab-episodes">
                  <Play className="h-4 w-4 mr-2" />
                  Episodes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="episodes" className="mt-6 space-y-4">
                {/* Sort, Filter, and Batch Actions */}
                <div className="flex flex-wrap items-center gap-3 pb-2">
                  <Select value={episodeSort} onValueChange={(v) => setEpisodeSort(v as 'newest' | 'oldest' | 'unread')}>
                    <SelectTrigger className="w-[140px]" data-testid="select-sort">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="unread">Unread First</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={episodeFilter} onValueChange={setEpisodeFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Podcasts</SelectItem>
                      {subscriptions.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllEpisodes}
                    data-testid="button-select-all"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedEpisodeIds.size === filteredEpisodes.length ? 'Deselect All' : 'Select All'}
                  </Button>

                  {selectedEpisodeIds.size > 0 && (
                    <Button
                      onClick={() => batchBriefingMutation.mutate(Array.from(selectedEpisodeIds))}
                      disabled={batchBriefingMutation.isPending}
                      data-testid="button-batch-brief"
                    >
                      {batchBriefingMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Brief {selectedEpisodeIds.size} Episode{selectedEpisodeIds.size > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>

                {episodesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </div>
                ) : filteredEpisodes.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No episodes yet</h3>
                    <p className="text-muted-foreground text-sm">Subscribe to podcasts to see their latest episodes here</p>
                  </Card>
                ) : (
                  filteredEpisodes.map((episode) => (
                    <Card key={episode.id} className={`hover-elevate ${!episode.isRead ? 'border-primary/30' : ''} ${selectedEpisodeIds.has(episode.id) ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <Checkbox
                              checked={selectedEpisodeIds.has(episode.id)}
                              onCheckedChange={() => toggleEpisodeSelection(episode.id)}
                              data-testid={`checkbox-episode-${episode.id}`}
                            />
                            <button
                              onClick={() => togglePlayEpisode(episode)}
                              disabled={!episode.audioUrl}
                              className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              data-testid={`button-play-${episode.id}`}
                            >
                              {playingEpisodeId === episode.id ? (
                                <Pause className="h-5 w-5 text-primary" />
                              ) : (
                                <Play className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {!episode.isRead && <Badge className="text-xs">New</Badge>}
                              {episode.duration && (
                                <span className="text-xs text-muted-foreground">{formatDuration(episode.duration)}</span>
                              )}
                            </div>
                            <p className="text-xs text-primary font-medium truncate" data-testid={`text-podcast-name-${episode.id}`}>
                              {getPodcastName(episode.subscriptionId)}
                            </p>
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
                                ) : episode.briefingStatus === 'failed' ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="destructive">Briefing Failed</Badge>
                                    <Button size="sm" onClick={() => generateBriefingMutation.mutate(episode.id)} disabled={generateBriefingMutation.isPending} data-testid={`button-retry-briefing-${episode.id}`}>
                                      Retry
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" onClick={() => generateBriefingMutation.mutate(episode.id)} disabled={generateBriefingMutation.isPending} data-testid={`button-generate-briefing-${episode.id}`}>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Generate Briefing
                                  </Button>
                                )
                              ) : episode.transcriptStatus === 'processing' ? (
                                <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Transcribing...</Badge>
                              ) : episode.transcriptStatus === 'failed' ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="destructive">Transcription Failed</Badge>
                                  <Button size="sm" variant="outline" onClick={() => transcribeMutation.mutate(episode.id)} disabled={transcribeMutation.isPending} data-testid={`button-retry-transcribe-${episode.id}`}>
                                    Retry
                                  </Button>
                                </div>
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
                            <Button
                              size="sm"
                              variant={briefing.isBookmarked ? "default" : "outline"}
                              onClick={() => toggleBookmarkMutation.mutate(briefing.id)}
                              disabled={toggleBookmarkMutation.isPending}
                              data-testid={`button-save-briefing-${briefing.id}`}
                            >
                              <Bookmark className={`h-4 w-4 mr-1 ${briefing.isBookmarked ? 'fill-current' : ''}`} />
                              {briefing.isBookmarked ? 'Saved' : 'Save'}
                            </Button>
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

              <TabsContent value="subscriptions" className="mt-6 space-y-3">
                {spotifyStatus?.connected && subscriptions.length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-muted-foreground">
                    <ListMusic className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Toggle <SiSpotify className="inline h-3 w-3 mx-0.5 text-green-600" /> on each podcast to include its latest episode in your smart Spotify playlist.</span>
                  </div>
                )}
                {subsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
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
                  <div className="space-y-3">
                    {subscriptions.map((sub) => {
                      const isExpanded = expandedPodcastId === sub.id;
                      const subEpisodes = episodes
                        .filter(e => e.subscriptionId === sub.id)
                        .sort((a, b) => {
                          const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                          const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
                          return db - da;
                        });
                      const inPlaylist = spotifyPlaylistPodcasts.has(sub.id);

                      return (
                        <Card key={sub.id} className={`transition-all ${isExpanded ? 'ring-2 ring-primary/30' : 'hover-elevate'}`}>
                          <CardContent className="p-0">
                            {/* Podcast header row — clicking expands */}
                            <div
                              className="flex items-center gap-3 p-4 cursor-pointer select-none"
                              onClick={() => setExpandedPodcastId(isExpanded ? null : sub.id)}
                            >
                              <Avatar className="h-12 w-12 rounded flex-shrink-0">
                                <AvatarImage src={sub.artworkUrl || undefined} />
                                <AvatarFallback><Mic className="h-5 w-5" /></AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{sub.title}</h3>
                                <p className="text-sm text-muted-foreground truncate">{sub.author}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{subEpisodes.length} episode{subEpisodes.length !== 1 ? 's' : ''}</span>
                                  {sub.spotifyShowId && (
                                    <Badge variant="secondary" className="text-xs py-0">
                                      <SiSpotify className="h-3 w-3 mr-1" />
                                      Spotify
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                {spotifyStatus?.connected && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={inPlaylist ? "default" : "outline"}
                                        className={inPlaylist ? "bg-green-500 hover:bg-green-600 text-white border-green-500" : ""}
                                        onClick={() => togglePlaylistPodcast(sub.id)}
                                        data-testid={`button-playlist-toggle-${sub.id}`}
                                      >
                                        <SiSpotify className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{inPlaylist ? 'Remove from smart playlist' : 'Add to smart playlist'}</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => unsubscribeMutation.mutate(sub.id)}
                                      data-testid={`button-unsubscribe-${sub.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Unsubscribe</TooltipContent>
                                </Tooltip>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>

                            {/* Expanded episodes list */}
                            {isExpanded && (
                              <div className="border-t px-4 pb-4 pt-3 space-y-2">
                                {subEpisodes.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-3">No episodes yet — try syncing</p>
                                ) : (
                                  subEpisodes.slice(0, 8).map(ep => (
                                    <div key={ep.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                                      <button
                                        onClick={() => togglePlayEpisode(ep)}
                                        disabled={!ep.audioUrl}
                                        className="flex-shrink-0 w-8 h-8 bg-background rounded-md flex items-center justify-center hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {playingEpisodeId === ep.id ? (
                                          <Pause className="h-4 w-4 text-primary" />
                                        ) : (
                                          <Play className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{ep.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {ep.publishedAt && (
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(ep.publishedAt).toLocaleDateString()}
                                            </span>
                                          )}
                                          {ep.duration && <span className="text-xs text-muted-foreground">{formatDuration(ep.duration)}</span>}
                                          {!ep.isRead && <Badge className="text-xs py-0 px-1">New</Badge>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {ep.transcriptStatus === 'completed' && ep.briefingStatus === 'completed' ? (
                                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelectedEpisode(ep)}>
                                            <BookOpen className="h-3.5 w-3.5" />
                                          </Button>
                                        ) : ep.transcriptStatus !== 'completed' && ep.transcriptStatus !== 'processing' ? (
                                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => transcribeMutation.mutate(ep.id)} disabled={!ep.audioUrl || transcribeMutation.isPending}>
                                            <FileText className="h-3.5 w-3.5" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {subEpisodes.length > 8 && (
                                  <p className="text-xs text-muted-foreground text-center pt-1">
                                    + {subEpisodes.length - 8} more — see Episodes tab for full list
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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
                    <div className="space-y-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => syncSmartPlaylistMutation.mutate([...spotifyPlaylistPodcasts])}
                        disabled={syncSmartPlaylistMutation.isPending || spotifyPlaylistPodcasts.size === 0}
                        data-testid="button-sync-smart-playlist"
                      >
                        {syncSmartPlaylistMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ListMusic className="h-4 w-4 mr-2" />
                        )}
                        Sync Smart Playlist
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {spotifyPlaylistPodcasts.size === 0
                          ? 'Mark podcasts in the Podcasts tab'
                          : `${spotifyPlaylistPodcasts.size} podcast${spotifyPlaylistPodcasts.size !== 1 ? 's' : ''} selected — adds latest episode from each`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
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

        {/* Add Podcast Dialog */}
        <Dialog open={isAddPodcastOpen} onOpenChange={setIsAddPodcastOpen}>
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
      </main>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingEpisodeId(null)}
        onPause={() => setPlayingEpisodeId(null)}
        className="hidden"
      />

      {/* Floating AI Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {aiChatOpen && (
          <div className="w-80 md:w-96 h-[480px] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b bg-primary">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-sm">Ask Podlogix AI</span>
              </div>
              <button onClick={() => setAiChatOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {aiMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/40" />
                  <p className="mb-4 text-xs">Ask me about your podcasts, briefings, or anything else.</p>
                  <div className="space-y-2">
                    {['What did YC cover this week?', 'Summarize my top briefings', 'Which podcasts cover AI?'].map(s => (
                      <button key={s} onClick={() => setAiInput(s)} className="block w-full text-left text-xs p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start mb-3">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <input
                className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30 min-w-0"
                placeholder="Ask about your podcasts..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
              />
              <button
                onClick={sendAiMessage}
                disabled={!aiInput.trim() || aiLoading}
                className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 hover:bg-primary/90 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setAiChatOpen(prev => !prev)}
          className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center ${aiChatOpen ? 'bg-muted text-foreground' : 'bg-primary text-white'}`}
        >
          {aiChatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </button>
      </div>

      {/* Cmd+K Command Palette */}
      {cmdKOpen && (
        <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[15vh] px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCmdKOpen(false)} />
          <div className="relative bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                placeholder="Type to search or run a command..."
                value={cmdKQuery}
                onChange={e => { setCmdKQuery(e.target.value); setCmdKSelectedIdx(0); }}
                onKeyDown={e => {
                  const filtered = commandItems.filter(item => !cmdKQuery || item.label.toLowerCase().includes(cmdKQuery.toLowerCase()));
                  if (e.key === 'ArrowDown') { e.preventDefault(); setCmdKSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setCmdKSelectedIdx(i => Math.max(i - 1, 0)); }
                  if (e.key === 'Enter' && filtered[cmdKSelectedIdx]) { filtered[cmdKSelectedIdx].action(); setCmdKOpen(false); setCmdKQuery(''); }
                }}
              />
              <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border font-mono">ESC</kbd>
            </div>
            <ScrollArea className="max-h-72">
              {(() => {
                const filtered = commandItems.filter(item => !cmdKQuery || item.label.toLowerCase().includes(cmdKQuery.toLowerCase()) || item.group.toLowerCase().includes(cmdKQuery.toLowerCase()));
                const groups = [...new Set(filtered.map(i => i.group))];
                let globalIdx = 0;
                return groups.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No results for "{cmdKQuery}"</p>
                ) : groups.map(group => (
                  <div key={group}>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group}</div>
                    {filtered.filter(i => i.group === group).map((item) => {
                      const idx = globalIdx++;
                      const Icon = item.icon as any;
                      const isSelected = idx === cmdKSelectedIdx;
                      return (
                        <button
                          key={item.label}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
                          onClick={() => { item.action(); setCmdKOpen(false); setCmdKQuery(''); }}
                          onMouseEnter={() => setCmdKSelectedIdx(idx)}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm">{item.label}</span>
                          <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </ScrollArea>
            <div className="px-4 py-2 border-t flex items-center gap-4 text-xs text-muted-foreground bg-muted/30">
              <span className="flex items-center gap-1"><kbd className="bg-background border rounded px-1 font-mono text-xs">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-background border rounded px-1 font-mono text-xs">↵</kbd> Select</span>
              <span className="flex items-center gap-1"><kbd className="bg-background border rounded px-1 font-mono text-xs">ESC</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
