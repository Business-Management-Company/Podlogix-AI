import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  Users,
  Hash,
  Bookmark,
  TrendingUp,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  LogOut,
  Link2,
  Eye,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

interface DemoInfluencer {
  userId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  platform: string;
  location: string | null;
  categories: string[];
}

interface SavedInfluencer {
  id: string;
  platform: string;
  platformUserId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number | null;
  engagementRate: number | null;
  location: string | null;
  categories: string[] | null;
  notes: string | null;
  status: string;
}

interface HashtagMonitor {
  id: string;
  hashtag: string;
  platform: string;
  isActive: boolean;
}

interface PhylloUser {
  id: string;
  name: string;
  external_id: string;
}

interface PhylloAccount {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  profile_pic_url: string | null;
  status: string;
}

interface PhylloProfile {
  id: string;
  account_id: string;
  platform: string;
  username: string;
  full_name: string | null;
  profile_pic_url: string | null;
  bio: string | null;
  follower_count: number;
  following_count: number;
  is_verified: boolean;
}

interface PhylloEngagement {
  account_id: string;
  platform: string;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  avg_shares: number;
  avg_views: number;
  total_content_count: number;
}

interface ConnectedCreator {
  account: PhylloAccount;
  profile: PhylloProfile | null;
  engagement: PhylloEngagement | null;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  const p = platform.toLowerCase();
  switch (p) {
    case 'instagram': return <SiInstagram className="h-4 w-4" />;
    case 'tiktok': return <SiTiktok className="h-4 w-4" />;
    case 'youtube': return <SiYoutube className="h-4 w-4" />;
    default: return <Users className="h-4 w-4" />;
  }
};

export default function BrandDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [newHashtag, setNewHashtag] = useState('');
  const [hashtagPlatform, setHashtagPlatform] = useState('instagram');
  const [phylloUser, setPhylloUser] = useState<PhylloUser | null>(null);
  const [connectedCreators, setConnectedCreators] = useState<ConnectedCreator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);

  const { data: phylloStatus } = useQuery<{ configured: boolean }>({
    queryKey: ['/api/brand/phyllo/status'],
    enabled: !!user,
  });

  const { data: demoInfluencers, isLoading: demoLoading } = useQuery<{ influencers: DemoInfluencer[]; isDemo: boolean }>({
    queryKey: ['/api/brand/influencers/demo'],
    enabled: !!user && !phylloStatus?.configured,
  });

  const { data: savedInfluencers = [], isLoading: savedLoading } = useQuery<SavedInfluencer[]>({
    queryKey: ['/api/brand/saved-influencers'],
    enabled: !!user,
  });

  const { data: hashtagMonitors = [] } = useQuery<HashtagMonitor[]>({
    queryKey: ['/api/brand/hashtag-monitors'],
    enabled: !!user,
  });

  const createPhylloUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/brand/phyllo/user');
      return res.json() as Promise<PhylloUser>;
    },
    onSuccess: (data) => {
      setPhylloUser(data);
      toast({ title: "Phyllo user created" });
    },
  });

  const loadConnectedAccounts = async (userId: string) => {
    setLoadingCreators(true);
    try {
      const accountsRes = await apiRequest('GET', `/api/brand/phyllo/accounts/${userId}`);
      const accounts: PhylloAccount[] = await accountsRes.json();
      
      const creators: ConnectedCreator[] = await Promise.all(
        accounts.filter(a => a.status === 'CONNECTED').map(async (account) => {
          let profile: PhylloProfile | null = null;
          let engagement: PhylloEngagement | null = null;
          
          try {
            const profileRes = await apiRequest('GET', `/api/brand/phyllo/profile/${account.id}`);
            profile = await profileRes.json();
          } catch (e) {
            console.error('Error fetching profile:', e);
          }
          
          try {
            const engagementRes = await apiRequest('GET', `/api/brand/phyllo/engagement/${account.id}`);
            engagement = await engagementRes.json();
          } catch (e) {
            console.error('Error fetching engagement:', e);
          }
          
          return { account, profile, engagement };
        })
      );
      
      setConnectedCreators(creators);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
      toast({ title: "Failed to load connected accounts", variant: "destructive" });
    } finally {
      setLoadingCreators(false);
    }
  };

  useEffect(() => {
    if (phylloStatus?.configured && user && phylloUser) {
      loadConnectedAccounts(phylloUser.id);
    }
  }, [phylloStatus?.configured, user, phylloUser]);

  const saveInfluencerMutation = useMutation({
    mutationFn: async (influencer: DemoInfluencer | { userId: string; username: string; fullName: string | null; profilePicUrl: string | null; bio: string | null; followerCount: number; engagementRate: number; avgLikes: number; avgComments: number; platform: string; location: string | null; categories: string[] }) => {
      const res = await apiRequest('POST', '/api/brand/saved-influencers', {
        platform: influencer.platform,
        platformUserId: influencer.userId,
        username: influencer.username,
        fullName: influencer.fullName,
        profilePicUrl: influencer.profilePicUrl,
        bio: influencer.bio,
        followerCount: influencer.followerCount,
        engagementRate: Math.round(influencer.engagementRate * 100),
        location: influencer.location || null,
        categories: influencer.categories || [],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand/saved-influencers'] });
      toast({ title: "Influencer saved!" });
    },
  });

  const deleteInfluencerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/brand/saved-influencers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand/saved-influencers'] });
      toast({ title: "Influencer removed" });
    },
  });

  const addHashtagMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/brand/hashtag-monitors', {
        hashtag: newHashtag.startsWith('#') ? newHashtag : `#${newHashtag}`,
        platform: hashtagPlatform,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand/hashtag-monitors'] });
      setNewHashtag('');
      toast({ title: "Hashtag monitor added!" });
    },
  });

  const deleteHashtagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/brand/hashtag-monitors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand/hashtag-monitors'] });
      toast({ title: "Hashtag monitor removed" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to access Brand Tools</h2>
          <p className="text-muted-foreground mb-4">Discover influencers and monitor hashtags</p>
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isInfluencerSaved = (userId: string) => 
    savedInfluencers.some(s => s.platformUserId === userId);

  const saveConnectedCreator = (creator: ConnectedCreator) => {
    if (!creator.profile) return;
    saveInfluencerMutation.mutate({
      userId: creator.account.id,
      username: creator.profile.username,
      fullName: creator.profile.full_name,
      profilePicUrl: creator.profile.profile_pic_url,
      bio: creator.profile.bio,
      followerCount: creator.profile.follower_count,
      engagementRate: creator.engagement?.engagement_rate || 0,
      avgLikes: creator.engagement?.avg_likes || 0,
      avgComments: creator.engagement?.avg_comments || 0,
      platform: creator.profile.platform.toLowerCase(),
      location: null,
      categories: [],
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Brand Dashboard</h1>
              <p className="text-xs text-muted-foreground">Powered by Phyllo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>{user?.firstName?.[0] || 'B'}</AvatarFallback>
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
          className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/5 rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome">
                Influencer Discovery
              </h1>
              <p className="text-muted-foreground">
                Find creators and track their engagement with consent-based data from Phyllo
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!phylloStatus?.configured ? (
                <Badge variant="secondary">
                  Demo Mode - Add PHYLLO_CLIENT_ID for live data
                </Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Phyllo Connected
                </Badge>
              )}
            </div>
          </div>
        </motion.div>

        {phylloStatus?.configured && !phylloUser && (
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Link2 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Initialize Phyllo Connection</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your Phyllo user to start connecting creator accounts and viewing their verified data.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => createPhylloUserMutation.mutate()}
                  disabled={createPhylloUserMutation.isPending}
                  data-testid="button-init-phyllo"
                >
                  {createPhylloUserMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Initialize Phyllo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!phylloStatus?.configured && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">How Phyllo Works</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Phyllo provides consent-based creator data. Influencers connect their social accounts via OAuth, 
                    giving you access to verified profile, engagement, and audience data. This ensures 100% accurate, 
                    real-time metrics with creator consent.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="discover" data-testid="tab-discover">
              <Search className="h-4 w-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="saved" data-testid="tab-saved">
              <Bookmark className="h-4 w-4 mr-2" />
              Saved ({savedInfluencers.length})
            </TabsTrigger>
            <TabsTrigger value="hashtags" data-testid="tab-hashtags">
              <Hash className="h-4 w-4 mr-2" />
              Hashtags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6">
            {phylloStatus?.configured && phylloUser ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Connected Creators
                      </CardTitle>
                      <CardDescription>
                        Creators who have connected their accounts via Phyllo
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => loadConnectedAccounts(phylloUser.id)}
                      disabled={loadingCreators}
                      data-testid="button-refresh-creators"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loadingCreators ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingCreators ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                    </div>
                  ) : connectedCreators.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No connected creators yet</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Invite creators to connect their social accounts via Phyllo to see their verified data here.
                      </p>
                      <Button variant="outline" asChild>
                        <a href="https://docs.getphyllo.com" target="_blank" rel="noopener noreferrer">
                          Learn about Phyllo Connect
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {connectedCreators.map((creator) => (
                        <Card key={creator.account.id} className="hover-elevate overflow-visible">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                                <AvatarImage src={creator.profile?.profile_pic_url || creator.account.profile_pic_url || undefined} />
                                <AvatarFallback>
                                  <PlatformIcon platform={creator.account.platform} />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold truncate">
                                    {creator.profile?.full_name || creator.account.username}
                                  </h3>
                                  <PlatformIcon platform={creator.account.platform} />
                                  {creator.profile?.is_verified && (
                                    <CheckCircle className="h-4 w-4 text-blue-500" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  @{creator.profile?.username || creator.account.username}
                                </p>
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {creator.account.status}
                                </Badge>
                              </div>
                            </div>
                            {creator.profile?.bio && (
                              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                                {creator.profile.bio}
                              </p>
                            )}
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">
                                  {formatFollowers(creator.profile?.follower_count || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">
                                  {(creator.engagement?.engagement_rate || 0).toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground">Engagement</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">
                                  {formatFollowers(creator.engagement?.avg_likes || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Avg Likes</p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                className="flex-1"
                                disabled={isInfluencerSaved(creator.account.id) || saveInfluencerMutation.isPending || !creator.profile}
                                onClick={() => saveConnectedCreator(creator)}
                                data-testid={`button-save-${creator.account.id}`}
                              >
                                {isInfluencerSaved(creator.account.id) ? (
                                  <>Saved</>
                                ) : saveInfluencerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Bookmark className="h-4 w-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a 
                                  href={creator.profile?.url || `https://www.instagram.com/${creator.account.username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  data-testid={`button-view-${creator.account.id}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Featured Creators (Demo)
                  </CardTitle>
                  <CardDescription>
                    Demo creators to explore. Configure Phyllo API keys for real creator data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {demoLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {demoInfluencers?.influencers.map((influencer) => (
                        <Card key={influencer.userId} className="hover-elevate overflow-visible">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                                <AvatarImage src={influencer.profilePicUrl || undefined} />
                                <AvatarFallback>
                                  <PlatformIcon platform={influencer.platform} />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold truncate">{influencer.fullName || influencer.username}</h3>
                                  <PlatformIcon platform={influencer.platform} />
                                </div>
                                <p className="text-sm text-muted-foreground">@{influencer.username}</p>
                                {influencer.location && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {influencer.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                              {influencer.bio || 'No bio available'}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">{formatFollowers(influencer.followerCount)}</p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">{influencer.engagementRate.toFixed(1)}%</p>
                                <p className="text-xs text-muted-foreground">Engagement</p>
                              </div>
                              <div className="p-2 bg-muted/50 rounded">
                                <p className="text-sm font-semibold">{formatFollowers(influencer.avgLikes)}</p>
                                <p className="text-xs text-muted-foreground">Avg Likes</p>
                              </div>
                            </div>
                            {influencer.categories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {influencer.categories.slice(0, 3).map((cat, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                className="flex-1"
                                disabled={isInfluencerSaved(influencer.userId) || saveInfluencerMutation.isPending}
                                onClick={() => saveInfluencerMutation.mutate(influencer)}
                                data-testid={`button-save-${influencer.userId}`}
                              >
                                {isInfluencerSaved(influencer.userId) ? (
                                  <>Saved</>
                                ) : saveInfluencerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Bookmark className="h-4 w-4 mr-1" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button size="sm" variant="outline" asChild>
                                <a 
                                  href={`https://www.instagram.com/${influencer.username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  data-testid={`button-view-${influencer.userId}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!phylloStatus?.configured && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Eye className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Want real influencer data?</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure your Phyllo API credentials (PHYLLO_CLIENT_ID and PHYLLO_SECRET) to access 
                        real creator profiles with verified engagement metrics across 20+ platforms.
                      </p>
                      <Button size="sm" variant="outline" className="mt-2" asChild>
                        <a href="https://dashboard.getphyllo.com/registration" target="_blank" rel="noopener noreferrer">
                          Get Phyllo API Keys
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            {savedLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
              </div>
            ) : savedInfluencers.length === 0 ? (
              <Card className="p-8 text-center">
                <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No saved influencers</h3>
                <p className="text-muted-foreground text-sm">
                  Discover creators and save them to build your list
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {savedInfluencers.map((influencer) => (
                  <Card key={influencer.id} className="hover-elevate overflow-visible">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={influencer.profilePicUrl || undefined} />
                          <AvatarFallback>
                            <PlatformIcon platform={influencer.platform} />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{influencer.fullName || influencer.username}</h3>
                            <PlatformIcon platform={influencer.platform} />
                          </div>
                          <p className="text-sm text-muted-foreground">@{influencer.username}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">{influencer.status}</Badge>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteInfluencerMutation.mutate(influencer.id)}
                          data-testid={`button-delete-${influencer.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      {influencer.bio && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{influencer.bio}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 mt-4 text-center">
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-sm font-semibold">{formatFollowers(influencer.followerCount || 0)}</p>
                          <p className="text-xs text-muted-foreground">Followers</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-sm font-semibold">{((influencer.engagementRate || 0) / 100).toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Engagement</p>
                        </div>
                      </div>
                      {influencer.categories && influencer.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {influencer.categories.slice(0, 3).map((cat, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Hashtag Monitors</CardTitle>
                <CardDescription>Track hashtags to find relevant content and creators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={hashtagPlatform} onValueChange={setHashtagPlatform}>
                    <SelectTrigger className="w-[140px]" data-testid="select-hashtag-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">
                        <div className="flex items-center gap-2">
                          <SiInstagram className="h-4 w-4" /> Instagram
                        </div>
                      </SelectItem>
                      <SelectItem value="tiktok">
                        <div className="flex items-center gap-2">
                          <SiTiktok className="h-4 w-4" /> TikTok
                        </div>
                      </SelectItem>
                      <SelectItem value="youtube">
                        <div className="flex items-center gap-2">
                          <SiYoutube className="h-4 w-4" /> YouTube
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter hashtag (e.g., fashion)"
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    className="flex-1"
                    data-testid="input-hashtag"
                  />
                  <Button 
                    onClick={() => addHashtagMutation.mutate()}
                    disabled={!newHashtag || addHashtagMutation.isPending}
                    data-testid="button-add-hashtag"
                  >
                    {addHashtagMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {hashtagMonitors.length === 0 ? (
                  <div className="text-center py-8">
                    <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No hashtags monitored</h3>
                    <p className="text-muted-foreground text-sm">
                      Add hashtags to track content and discover creators
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {hashtagMonitors.map((monitor) => (
                      <Badge 
                        key={monitor.id} 
                        variant="secondary" 
                        className="text-sm py-1.5 px-3 flex items-center gap-2"
                      >
                        <PlatformIcon platform={monitor.platform} />
                        {monitor.hashtag}
                        <button
                          onClick={() => deleteHashtagMutation.mutate(monitor.id)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-delete-hashtag-${monitor.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Hashtag monitoring saves your tracked hashtags. 
                    With Phyllo configured, you can discover creators who use these hashtags 
                    and have connected their accounts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
