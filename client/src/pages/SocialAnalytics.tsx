import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Users, 
  Heart, 
  MessageCircle, 
  Eye,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Search,
  Calculator,
  Link2,
  Sparkles,
  UserPlus,
  Mail,
  Image,
  CreditCard,
  AlertCircle,
  Globe,
  Tag,
  Bot
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiX, SiTwitch } from "react-icons/si";

interface Analytics {
  handle: string;
  platform: string;
  name: string;
  bio?: string;
  profilePicture?: string;
  followers: number;
  following?: number;
  postsCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  avgReelLikes?: number;
  postsPerMonth?: number;
  email?: string;
  emailVerified?: boolean;
  location?: string;
  language?: string;
  businessCategory?: string;
  isVerified: boolean;
  socialLinks?: string[];
  estimatedMonthlyIncome?: number;
  fakeFollowerPercent?: number;
  similarityScore?: number;
}

interface DiscoveredCreator {
  handle: string;
  platform: string;
  name: string;
  profilePicture?: string;
  followers: number;
  engagementRate: number;
  avgViews: number;
  email?: string;
  emailVerified?: boolean;
  location?: string;
  niche?: string;
  isVerified: boolean;
  estimatedMonthlyIncome?: number;
  fakeFollowerPercent?: number;
  similarityScore?: number;
}

interface Post {
  id: string;
  type: string;
  caption?: string;
  thumbnail?: string;
  url?: string;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  engagementRate: number;
  postedAt?: string;
}

interface Rates {
  feedPost: number;
  story: number | null;
  reel: number | null;
  video: number;
  package3Posts: number;
  packageMonthly: number;
}

interface Credits {
  available: number;
  used: number;
  total: number;
  plan: string;
  resetDate?: string;
}

const platformIcons: Record<string, any> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  twitter: SiX,
  twitch: SiTwitch,
};

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  tiktok: "bg-black",
  youtube: "bg-red-600",
  twitter: "bg-sky-500",
  twitch: "bg-purple-600",
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

export default function SocialAnalytics() {
  const { toast } = useToast();
  const [searchHandle, setSearchHandle] = useState("");
  const [searchPlatform, setSearchPlatform] = useState("instagram");
  const [currentAnalytics, setCurrentAnalytics] = useState<Analytics | null>(null);
  const [calculatedRates, setCalculatedRates] = useState<Rates | null>(null);
  
  // Discovery state
  const [discoveryFilters, setDiscoveryFilters] = useState({
    platform: "instagram",
    minFollowers: "",
    maxFollowers: "",
    minEngagement: "",
    maxEngagement: "",
    location: "",
    niche: "",
    hasEmail: false,
    isVerified: false,
    aiPrompt: "",
  });
  const [discoveredCreators, setDiscoveredCreators] = useState<DiscoveredCreator[]>([]);
  
  // Lookalikes state
  const [lookalikesHandle, setLookalikesHandle] = useState("");
  const [lookalikesPlaftform, setLookalikesPlaftform] = useState("instagram");
  const [lookalikes, setLookalikes] = useState<DiscoveredCreator[]>([]);
  
  // Email enrichment state
  const [enrichEmail, setEnrichEmail] = useState("");
  const [enrichedProfiles, setEnrichedProfiles] = useState<any[]>([]);
  
  // Posts state
  const [postsHandle, setPostsHandle] = useState("");
  const [postsPlatform, setPostsPlatform] = useState("instagram");
  const [creatorPosts, setCreatorPosts] = useState<Post[]>([]);

  const { data: myAccountsData, isLoading: myAccountsLoading, error: myAccountsError, refetch: refetchMyAccounts } = useQuery<{ accounts: Analytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts"],
  });

  const { data: creditsData, refetch: refetchCredits } = useQuery<{ credits: Credits }>({
    queryKey: ["/api/social-analytics/credits"],
  });

  const searchMutation = useMutation({
    mutationFn: async ({ handle, platform }: { handle: string; platform: string }) => {
      const res = await apiRequest("POST", "/api/social-analytics/profile", { handle, platform });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.analytics) {
        setCurrentAnalytics(data.analytics);
        refetchCredits();
        toast({ title: "Analytics Retrieved", description: `Found data for @${data.analytics.handle}` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to fetch analytics. Make sure the handle exists.", variant: "destructive" });
    },
  });

  const calculateRatesMutation = useMutation({
    mutationFn: async (params: { followers: number; engagementRate: number; platform: string; avgViews?: number }) => {
      const res = await apiRequest("POST", "/api/social-analytics/calculate-rates", params);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.rates) setCalculatedRates(data.rates);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to calculate rates", variant: "destructive" });
    },
  });

  const discoveryMutation = useMutation({
    mutationFn: async (filters: any) => {
      const res = await apiRequest("POST", "/api/social-analytics/discover", filters);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.creators) {
        setDiscoveredCreators(data.creators);
        refetchCredits();
        toast({ title: "Discovery Complete", description: `Found ${data.creators.length} creators` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Discovery search failed", variant: "destructive" });
    },
  });

  const lookalikeMutation = useMutation({
    mutationFn: async ({ handle, platform }: { handle: string; platform: string }) => {
      const res = await apiRequest("POST", "/api/social-analytics/lookalikes", { handle, platform, limit: 20 });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.lookalikes) {
        setLookalikes(data.lookalikes);
        refetchCredits();
        toast({ title: "Lookalikes Found", description: `Found ${data.lookalikes.length} similar creators` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to find similar creators", variant: "destructive" });
    },
  });

  const emailEnrichMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/social-analytics/enrich-email", { email, mode: "advanced" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.profiles) {
        setEnrichedProfiles(data.profiles);
        refetchCredits();
        toast({ title: "Email Enriched", description: `Found ${data.profiles.length} social profiles` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to enrich email", variant: "destructive" });
    },
  });

  const postsMutation = useMutation({
    mutationFn: async ({ handle, platform }: { handle: string; platform: string }) => {
      const res = await apiRequest("POST", "/api/social-analytics/posts", { handle, platform, limit: 12 });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.posts) {
        setCreatorPosts(data.posts);
        refetchCredits();
        toast({ title: "Posts Retrieved", description: `Found ${data.posts.length} recent posts` });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to fetch posts", variant: "destructive" });
    },
  });

  const handleSearch = () => {
    if (!searchHandle.trim()) {
      toast({ title: "Error", description: "Please enter a handle to search", variant: "destructive" });
      return;
    }
    searchMutation.mutate({ handle: searchHandle, platform: searchPlatform });
  };

  const handleCalculateRates = (analytics: Analytics) => {
    calculateRatesMutation.mutate({
      followers: analytics.followers,
      engagementRate: analytics.engagementRate,
      platform: analytics.platform,
      avgViews: analytics.avgViews,
    });
  };

  const handleDiscovery = () => {
    const filters: Record<string, any> = { platform: discoveryFilters.platform };
    if (discoveryFilters.minFollowers) filters.minFollowers = parseInt(discoveryFilters.minFollowers);
    if (discoveryFilters.maxFollowers) filters.maxFollowers = parseInt(discoveryFilters.maxFollowers);
    if (discoveryFilters.minEngagement) filters.minEngagement = parseFloat(discoveryFilters.minEngagement);
    if (discoveryFilters.maxEngagement) filters.maxEngagement = parseFloat(discoveryFilters.maxEngagement);
    if (discoveryFilters.location) filters.location = discoveryFilters.location;
    if (discoveryFilters.niche) filters.niche = discoveryFilters.niche;
    if (discoveryFilters.hasEmail) filters.hasEmail = true;
    if (discoveryFilters.isVerified) filters.isVerified = true;
    if (discoveryFilters.aiPrompt) filters.aiPrompt = discoveryFilters.aiPrompt;
    discoveryMutation.mutate(filters);
  };

  const handleLookalikes = () => {
    if (!lookalikesHandle.trim()) {
      toast({ title: "Error", description: "Please enter a handle", variant: "destructive" });
      return;
    }
    lookalikeMutation.mutate({ handle: lookalikesHandle, platform: lookalikesPlaftform });
  };

  const handleEmailEnrich = () => {
    if (!enrichEmail.trim() || !enrichEmail.includes("@")) {
      toast({ title: "Error", description: "Please enter a valid email", variant: "destructive" });
      return;
    }
    emailEnrichMutation.mutate(enrichEmail);
  };

  const handleFetchPosts = () => {
    if (!postsHandle.trim()) {
      toast({ title: "Error", description: "Please enter a handle", variant: "destructive" });
      return;
    }
    postsMutation.mutate({ handle: postsHandle, platform: postsPlatform });
  };

  const myAccounts = myAccountsData?.accounts || [];
  const credits = creditsData?.credits;

  const AnalyticsCard = ({ analytics, showRates = true, compact = false }: { analytics: Analytics; showRates?: boolean; compact?: boolean }) => {
    const Icon = platformIcons[analytics.platform] || Link2;
    
    if (compact) {
      return (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {analytics.profilePicture ? (
                <img src={analytics.profilePicture} alt={analytics.name} className="w-12 h-12 rounded-full object-cover border" />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${platformColors[analytics.platform] || 'bg-muted'}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{analytics.name}</p>
                  {analytics.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground">@{analytics.handle}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatNumber(analytics.followers)}</p>
                <p className="text-xs text-muted-foreground">{analytics.engagementRate?.toFixed(1)}% ER</p>
              </div>
              {analytics.email && (
                <Badge variant="outline" className="ml-2">
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Badge>
              )}
            </div>
            {analytics.similarityScore && (
              <div className="mt-2">
                <Badge variant="secondary">{(analytics.similarityScore * 100).toFixed(0)}% match</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {analytics.profilePicture ? (
                <img src={analytics.profilePicture} alt={analytics.name} className="w-16 h-16 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${platformColors[analytics.platform] || 'bg-muted'}`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  {analytics.name}
                  {analytics.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  @{analytics.handle}
                </CardDescription>
              </div>
            </div>
            <Badge className={platformColors[analytics.platform]}>
              {analytics.platform.charAt(0).toUpperCase() + analytics.platform.slice(1)}
            </Badge>
          </div>
          {analytics.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{analytics.bio}</p>}
          {(analytics.location || analytics.businessCategory) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {analytics.location && <span>{analytics.location}</span>}
              {analytics.location && analytics.businessCategory && <span>•</span>}
              {analytics.businessCategory && <span>{analytics.businessCategory}</span>}
            </div>
          )}
          {analytics.email && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                <Mail className="w-3 h-3 mr-1" />
                {analytics.email}
                {analytics.emailVerified && <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" />}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatNumber(analytics.followers)}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{analytics.engagementRate?.toFixed(2) || 0}%</p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatNumber(analytics.postsCount || 0)}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Eye className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatNumber(analytics.avgViews || 0)}</p>
              <p className="text-xs text-muted-foreground">Avg Views</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-2 rounded-lg border">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="font-semibold">{formatNumber(analytics.avgLikes || 0)}</p>
              <p className="text-xs text-muted-foreground">Avg Likes</p>
            </div>
            <div className="text-center p-2 rounded-lg border">
              <MessageCircle className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="font-semibold">{formatNumber(analytics.avgComments || 0)}</p>
              <p className="text-xs text-muted-foreground">Avg Comments</p>
            </div>
            {analytics.postsPerMonth !== undefined && analytics.postsPerMonth > 0 && (
              <div className="text-center p-2 rounded-lg border">
                <BarChart3 className="w-4 h-4 mx-auto mb-1 text-green-500" />
                <p className="font-semibold">{analytics.postsPerMonth.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Posts/Month</p>
              </div>
            )}
          </div>

          {(analytics.estimatedMonthlyIncome || analytics.fakeFollowerPercent !== undefined) && (
            <div className="flex gap-2 flex-wrap">
              {analytics.estimatedMonthlyIncome && (
                <Badge variant="secondary">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Est. {formatCurrency(analytics.estimatedMonthlyIncome)}/mo
                </Badge>
              )}
              {analytics.fakeFollowerPercent !== undefined && analytics.fakeFollowerPercent !== null && (
                <Badge variant={analytics.fakeFollowerPercent > 20 ? "destructive" : "secondary"}>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {analytics.fakeFollowerPercent.toFixed(1)}% fake followers
                </Badge>
              )}
            </div>
          )}

          {showRates && (
            <Button 
              onClick={() => handleCalculateRates(analytics)}
              variant="outline"
              className="w-full"
              disabled={calculateRatesMutation.isPending}
              data-testid="button-calculate-rates"
            >
              {calculateRatesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4 mr-2" />
              )}
              Calculate Suggested Rates
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const CreatorCard = ({ creator }: { creator: DiscoveredCreator }) => {
    const Icon = platformIcons[creator.platform] || Link2;
    
    return (
      <Card className="overflow-hidden hover-elevate">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {creator.profilePicture ? (
              <img src={creator.profilePicture} alt={creator.name} className="w-12 h-12 rounded-full object-cover border" />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${platformColors[creator.platform] || 'bg-muted'}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{creator.name || creator.handle}</p>
                {creator.isVerified && <CheckCircle2 className="w-3 h-3 text-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground">@{creator.handle}</p>
              {creator.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3" /> {creator.location}
                </p>
              )}
              {creator.niche && (
                <Badge variant="outline" className="mt-1 text-xs">
                  <Tag className="w-3 h-3 mr-1" /> {creator.niche}
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-muted/50 rounded p-2">
              <p className="font-bold text-sm">{formatNumber(creator.followers)}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="font-bold text-sm">{creator.engagementRate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-muted-foreground">ER</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="font-bold text-sm">{formatNumber(creator.avgViews)}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {creator.email && (
              <Badge variant="secondary" className="text-xs">
                <Mail className="w-3 h-3 mr-1" />
                {creator.emailVerified ? "Verified Email" : "Has Email"}
              </Badge>
            )}
            {creator.similarityScore && (
              <Badge className="text-xs">{(creator.similarityScore * 100).toFixed(0)}% match</Badge>
            )}
            {creator.estimatedMonthlyIncome && (
              <Badge variant="outline" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                {formatCurrency(creator.estimatedMonthlyIncome)}/mo
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Social Analytics PRO</h1>
          <p className="text-muted-foreground">Powered by Influencers.club - 340M+ creator database</p>
        </div>
        {credits && (
          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center gap-4">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{credits.plan} Plan</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(credits.available)} credits remaining
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetchCredits()} data-testid="button-refresh-credits">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="my-accounts" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="my-accounts" data-testid="tab-my-accounts">My Accounts</TabsTrigger>
          <TabsTrigger value="search" data-testid="tab-search">Profile Search</TabsTrigger>
          <TabsTrigger value="discover" data-testid="tab-discover">
            <Sparkles className="w-4 h-4 mr-1" />
            AI Discovery
          </TabsTrigger>
          <TabsTrigger value="lookalikes" data-testid="tab-lookalikes">
            <UserPlus className="w-4 h-4 mr-1" />
            Lookalikes
          </TabsTrigger>
          <TabsTrigger value="email" data-testid="tab-email">
            <Mail className="w-4 h-4 mr-1" />
            Email Lookup
          </TabsTrigger>
          <TabsTrigger value="posts" data-testid="tab-posts">
            <Image className="w-4 h-4 mr-1" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">
            <Calculator className="w-4 h-4 mr-1" />
            Rates
          </TabsTrigger>
        </TabsList>

        {/* My Accounts Tab */}
        <TabsContent value="my-accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>My Connected Accounts</CardTitle>
                  <CardDescription>Analytics for your connected social media profiles</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchMyAccounts()} disabled={myAccountsLoading} data-testid="button-refresh-my-accounts">
                  <RefreshCw className={`w-4 h-4 mr-2 ${myAccountsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myAccountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : myAccountsError instanceof Error && myAccountsError.message.includes("not configured") ? (
                <div className="text-left py-10 space-y-4">
                  <BarChart3 className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Analytics aren't set up yet</p>
                    <p className="text-sm text-muted-foreground">This workspace's social analytics connection isn't configured.</p>
                  </div>
                </div>
              ) : myAccounts.length === 0 ? (
                <div className="text-left py-10 space-y-4">
                  <BarChart3 className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="font-medium">No analytics available</p>
                    <p className="text-sm text-muted-foreground">Add your Instagram, TikTok, YouTube, or X handle to your Link Page to see analytics here.</p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/dashboard/profile" data-testid="link-social-hub">
                      <Link2 className="w-4 h-4 mr-2" />
                      Go to Link Page
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {myAccounts.map((account, index) => (
                    <AnalyticsCard key={index} analytics={account} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Profile</CardTitle>
              <CardDescription>Look up analytics for any public social media profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search-handle">Handle</Label>
                  <Input id="search-handle" placeholder="e.g. username" value={searchHandle} onChange={(e) => setSearchHandle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} data-testid="input-search-handle" />
                </div>
                <div className="w-[180px]">
                  <Label htmlFor="search-platform">Platform</Label>
                  <Select value={searchPlatform} onValueChange={setSearchPlatform}>
                    <SelectTrigger id="search-platform" data-testid="select-search-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={searchMutation.isPending} data-testid="button-search-profile">
                    {searchMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          {currentAnalytics && <AnalyticsCard analytics={currentAnalytics} />}
        </TabsContent>

        {/* AI Discovery Tab */}
        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI-Powered Creator Discovery
              </CardTitle>
              <CardDescription>Search 340M+ creators with advanced filters and AI natural language search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <Label className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI Search (describe what you're looking for)
                </Label>
                <Textarea 
                  placeholder="e.g., Fashion influencers in LA with 50k-200k followers who post about sustainable clothing"
                  value={discoveryFilters.aiPrompt}
                  onChange={(e) => setDiscoveryFilters(f => ({ ...f, aiPrompt: e.target.value }))}
                  data-testid="textarea-ai-prompt"
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Platform</Label>
                  <Select value={discoveryFilters.platform} onValueChange={(v) => setDiscoveryFilters(f => ({ ...f, platform: v }))}>
                    <SelectTrigger data-testid="select-discover-platform"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Followers</Label>
                  <Input type="number" placeholder="e.g., 10000" value={discoveryFilters.minFollowers} onChange={(e) => setDiscoveryFilters(f => ({ ...f, minFollowers: e.target.value }))} data-testid="input-min-followers" />
                </div>
                <div>
                  <Label>Max Followers</Label>
                  <Input type="number" placeholder="e.g., 500000" value={discoveryFilters.maxFollowers} onChange={(e) => setDiscoveryFilters(f => ({ ...f, maxFollowers: e.target.value }))} data-testid="input-max-followers" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input placeholder="e.g., United States" value={discoveryFilters.location} onChange={(e) => setDiscoveryFilters(f => ({ ...f, location: e.target.value }))} data-testid="input-location" />
                </div>
                <div>
                  <Label>Niche</Label>
                  <Input placeholder="e.g., Fashion" value={discoveryFilters.niche} onChange={(e) => setDiscoveryFilters(f => ({ ...f, niche: e.target.value }))} data-testid="input-niche" />
                </div>
                <div>
                  <Label>Min Engagement %</Label>
                  <Input type="number" step="0.1" placeholder="e.g., 2.5" value={discoveryFilters.minEngagement} onChange={(e) => setDiscoveryFilters(f => ({ ...f, minEngagement: e.target.value }))} data-testid="input-min-engagement" />
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={discoveryFilters.hasEmail} onCheckedChange={(c) => setDiscoveryFilters(f => ({ ...f, hasEmail: c }))} data-testid="switch-has-email" />
                    <Label>Has Email</Label>
                  </div>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={discoveryFilters.isVerified} onCheckedChange={(c) => setDiscoveryFilters(f => ({ ...f, isVerified: c }))} data-testid="switch-verified" />
                    <Label>Verified Only</Label>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleDiscovery} disabled={discoveryMutation.isPending} className="w-full" data-testid="button-discover">
                {discoveryMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Discover Creators
              </Button>
            </CardContent>
          </Card>

          {discoveredCreators.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {discoveredCreators.map((creator, index) => (
                <CreatorCard key={index} creator={creator} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lookalikes Tab */}
        <TabsContent value="lookalikes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Find Similar Creators
              </CardTitle>
              <CardDescription>Enter a creator handle to find similar influencers with matching audience and content style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label>Creator Handle</Label>
                  <Input placeholder="e.g., popular_influencer" value={lookalikesHandle} onChange={(e) => setLookalikesHandle(e.target.value)} data-testid="input-lookalike-handle" />
                </div>
                <div className="w-[180px]">
                  <Label>Platform</Label>
                  <Select value={lookalikesPlaftform} onValueChange={setLookalikesPlaftform}>
                    <SelectTrigger data-testid="select-lookalike-platform"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleLookalikes} disabled={lookalikeMutation.isPending} data-testid="button-find-lookalikes">
                    {lookalikeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Find Lookalikes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {lookalikes.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lookalikes.map((creator, index) => (
                <CreatorCard key={index} creator={creator} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Email Enrichment Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email to Social Profile
              </CardTitle>
              <CardDescription>Enter an email address to discover all associated social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[300px]">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="creator@example.com" value={enrichEmail} onChange={(e) => setEnrichEmail(e.target.value)} data-testid="input-enrich-email" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleEmailEnrich} disabled={emailEnrichMutation.isPending} data-testid="button-enrich-email">
                    {emailEnrichMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Find Profiles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {enrichedProfiles.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {enrichedProfiles.map((profile, index) => (
                <AnalyticsCard key={index} analytics={profile} showRates={false} compact />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Recent Posts & Engagement
              </CardTitle>
              <CardDescription>View latest posts from any creator with full engagement metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label>Creator Handle</Label>
                  <Input placeholder="e.g., username" value={postsHandle} onChange={(e) => setPostsHandle(e.target.value)} data-testid="input-posts-handle" />
                </div>
                <div className="w-[180px]">
                  <Label>Platform</Label>
                  <Select value={postsPlatform} onValueChange={setPostsPlatform}>
                    <SelectTrigger data-testid="select-posts-platform"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="twitch">Twitch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleFetchPosts} disabled={postsMutation.isPending} data-testid="button-fetch-posts">
                    {postsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Image className="w-4 h-4 mr-2" />}
                    Get Posts
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {creatorPosts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {creatorPosts.map((post, index) => (
                <Card key={index} className="overflow-hidden">
                  {post.thumbnail && (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={post.thumbnail} alt={post.caption || 'Post'} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2">{post.type}</Badge>
                    {post.caption && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.caption}</p>}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="font-bold text-sm">{formatNumber(post.likes)}</p>
                        <p className="text-xs text-muted-foreground">Likes</p>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{formatNumber(post.comments)}</p>
                        <p className="text-xs text-muted-foreground">Comments</p>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{formatNumber(post.views)}</p>
                        <p className="text-xs text-muted-foreground">Views</p>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{post.engagementRate?.toFixed(1) || 0}%</p>
                        <p className="text-xs text-muted-foreground">ER</p>
                      </div>
                    </div>
                    {post.url && (
                      <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                        <a href={post.url} target="_blank" rel="noopener noreferrer">
                          <Link2 className="w-3 h-3 mr-2" />
                          View Post
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Suggested Sponsorship Rates
              </CardTitle>
              <CardDescription>Calculate rates based on your profile analytics</CardDescription>
            </CardHeader>
            <CardContent>
              {calculatedRates ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Feed Post</p>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(calculatedRates.feedPost)}</p>
                      </CardContent>
                    </Card>
                    {calculatedRates.story && (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-sm text-muted-foreground mb-2">Story</p>
                          <p className="text-3xl font-bold text-green-600">{formatCurrency(calculatedRates.story)}</p>
                        </CardContent>
                      </Card>
                    )}
                    {calculatedRates.reel && (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <p className="text-sm text-muted-foreground mb-2">Reel/Short</p>
                          <p className="text-3xl font-bold text-green-600">{formatCurrency(calculatedRates.reel)}</p>
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Video</p>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(calculatedRates.video)}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Package Deals</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">3 Posts Package</p>
                              <p className="text-sm text-muted-foreground">10% discount applied</p>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(calculatedRates.package3Posts)}</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">Monthly Partnership</p>
                              <p className="text-sm text-muted-foreground">8 posts/month</p>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(calculatedRates.packageMonthly)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">* Rates are suggestions based on industry standards. Actual rates may vary based on niche, content quality, and brand requirements.</p>
                </div>
              ) : (
                <div className="text-left py-12 space-y-4">
                  <Calculator className="w-16 h-16 text-muted-foreground" />
                  <div>
                    <p className="font-medium">No rates calculated yet</p>
                    <p className="text-sm text-muted-foreground">Search for a profile or view your account analytics to calculate suggested rates</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
