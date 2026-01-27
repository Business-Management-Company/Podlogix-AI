import { useState } from "react";
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
import { Label } from "@/components/ui/label";
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
  Filter,
  Loader2,
  LogOut
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";

interface Influencer {
  userId: string;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  location: string | null;
  categories: string[];
  platform: string;
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

interface SearchResult {
  influencers: Influencer[];
  total: number;
  page: number;
  hasMore: boolean;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'instagram': return <SiInstagram className="h-4 w-4" />;
    case 'tiktok': return <SiTiktok className="h-4 w-4" />;
    case 'youtube': return <SiYoutube className="h-4 w-4" />;
    default: return <Users className="h-4 w-4" />;
  }
};

export default function BrandDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [searchFilters, setSearchFilters] = useState({
    platform: 'instagram' as 'instagram' | 'tiktok' | 'youtube',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    location: '',
    keywords: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  const [hashtagPlatform, setHashtagPlatform] = useState('instagram');

  const { data: modashStatus } = useQuery<{ configured: boolean }>({
    queryKey: ['/api/brand/modash/status'],
    enabled: !!user,
  });

  const { data: savedInfluencers = [], isLoading: savedLoading } = useQuery<SavedInfluencer[]>({
    queryKey: ['/api/brand/saved-influencers'],
    enabled: !!user,
  });

  const { data: hashtagMonitors = [] } = useQuery<HashtagMonitor[]>({
    queryKey: ['/api/brand/hashtag-monitors'],
    enabled: !!user,
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/brand/influencers/search', {
        platform: searchFilters.platform,
        minFollowers: searchFilters.minFollowers ? parseInt(searchFilters.minFollowers) : undefined,
        maxFollowers: searchFilters.maxFollowers ? parseInt(searchFilters.maxFollowers) : undefined,
        minEngagement: searchFilters.minEngagement ? parseFloat(searchFilters.minEngagement) : undefined,
        location: searchFilters.location || undefined,
        keywords: searchFilters.keywords ? searchFilters.keywords.split(',').map(k => k.trim()) : undefined,
      });
      return res.json() as Promise<SearchResult>;
    },
  });

  const saveInfluencerMutation = useMutation({
    mutationFn: async (influencer: Influencer) => {
      const res = await apiRequest('POST', '/api/brand/saved-influencers', {
        platform: influencer.platform,
        platformUserId: influencer.userId,
        username: influencer.username,
        fullName: influencer.fullName,
        profilePicUrl: influencer.profilePicUrl,
        bio: influencer.bio,
        followerCount: influencer.followerCount,
        engagementRate: Math.round(influencer.engagementRate * 100),
        location: influencer.location,
        categories: influencer.categories,
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
              <p className="text-xs text-muted-foreground">Influencer Discovery</p>
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
                Search and save influencers for your brand campaigns
              </p>
            </div>
            {!modashStatus?.configured && (
              <Badge variant="secondary">
                Demo Mode - Add MODASH_API_KEY for live data
              </Badge>
            )}
          </div>
        </motion.div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="search" data-testid="tab-search">
              <Search className="h-4 w-4 mr-2" />
              Search
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

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle>Search Influencers</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="button-toggle-filters"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select 
                    value={searchFilters.platform} 
                    onValueChange={(v) => setSearchFilters(f => ({ ...f, platform: v as any }))}
                  >
                    <SelectTrigger className="w-[140px]" data-testid="select-platform">
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
                    placeholder="Keywords (e.g., fashion, travel, tech)"
                    value={searchFilters.keywords}
                    onChange={(e) => setSearchFilters(f => ({ ...f, keywords: e.target.value }))}
                    className="flex-1"
                    data-testid="input-keywords"
                  />
                  <Button 
                    onClick={() => searchMutation.mutate()} 
                    disabled={searchMutation.isPending}
                    data-testid="button-search"
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid gap-4 md:grid-cols-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="space-y-2">
                      <Label>Min Followers</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10000"
                        value={searchFilters.minFollowers}
                        onChange={(e) => setSearchFilters(f => ({ ...f, minFollowers: e.target.value }))}
                        data-testid="input-min-followers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Followers</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500000"
                        value={searchFilters.maxFollowers}
                        onChange={(e) => setSearchFilters(f => ({ ...f, maxFollowers: e.target.value }))}
                        data-testid="input-max-followers"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Engagement %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 2.0"
                        value={searchFilters.minEngagement}
                        onChange={(e) => setSearchFilters(f => ({ ...f, minEngagement: e.target.value }))}
                        data-testid="input-min-engagement"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g., United States"
                        value={searchFilters.location}
                        onChange={(e) => setSearchFilters(f => ({ ...f, location: e.target.value }))}
                        data-testid="input-location"
                      />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {searchMutation.data && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {searchMutation.data.total} influencers
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchMutation.data.influencers.map((influencer) => (
                    <Card key={influencer.userId} className="hover-elevate overflow-visible">
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
                              href={
                                influencer.platform === 'tiktok' 
                                  ? `https://www.tiktok.com/@${influencer.username}`
                                  : influencer.platform === 'youtube'
                                  ? `https://www.youtube.com/@${influencer.username}`
                                  : `https://www.instagram.com/${influencer.username}`
                              } 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!searchMutation.data && !searchMutation.isPending && (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Search for Influencers</h3>
                <p className="text-muted-foreground text-sm">
                  Use the search bar above to find influencers by keywords, platform, and more
                </p>
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
                  Search and save influencers to build your list
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
                <CardDescription>Track hashtags to find relevant content and influencers</CardDescription>
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
                    placeholder="Enter hashtag (e.g., #fashion)"
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
                      Add hashtags to track content and discover influencers
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
                    <strong>Note:</strong> Hashtag monitoring requires a Modash API subscription. 
                    Currently showing saved hashtags. Real-time monitoring will be available once 
                    the API is configured.
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
