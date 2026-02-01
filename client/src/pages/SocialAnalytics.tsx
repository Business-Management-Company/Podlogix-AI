import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Link2
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
}

interface Rates {
  feedPost: number;
  story: number | null;
  reel: number | null;
  video: number;
  package3Posts: number;
  packageMonthly: number;
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

  const { data: myAccountsData, isLoading: myAccountsLoading, refetch: refetchMyAccounts } = useQuery<{ accounts: Analytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts"],
  });

  const searchMutation = useMutation({
    mutationFn: async ({ handle, platform }: { handle: string; platform: string }) => {
      const res = await apiRequest("POST", "/api/social-analytics/profile", { handle, platform });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.analytics) {
        setCurrentAnalytics(data.analytics);
        toast({
          title: "Analytics Retrieved",
          description: `Found data for @${data.analytics.handle}`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fetch analytics. Make sure the handle exists.",
        variant: "destructive",
      });
    },
  });

  const calculateRatesMutation = useMutation({
    mutationFn: async (params: { followers: number; engagementRate: number; platform: string; avgViews?: number }) => {
      const res = await apiRequest("POST", "/api/social-analytics/calculate-rates", params);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.rates) {
        setCalculatedRates(data.rates);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate rates",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchHandle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a handle to search",
        variant: "destructive",
      });
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

  const myAccounts = myAccountsData?.accounts || [];

  const AnalyticsCard = ({ analytics, showRates = true }: { analytics: Analytics; showRates?: boolean }) => {
    const Icon = platformIcons[analytics.platform] || Link2;
    
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {analytics.profilePicture ? (
                <img 
                  src={analytics.profilePicture} 
                  alt={analytics.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${platformColors[analytics.platform] || 'bg-muted'}`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  {analytics.name}
                  {analytics.isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  )}
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
          {analytics.bio && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{analytics.bio}</p>
          )}
          {(analytics.location || analytics.businessCategory) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {analytics.location && <span>{analytics.location}</span>}
              {analytics.location && analytics.businessCategory && <span>•</span>}
              {analytics.businessCategory && <span>{analytics.businessCategory}</span>}
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
              <p className="text-2xl font-bold">{analytics.engagementRate.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatNumber(analytics.postsCount)}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Eye className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatNumber(analytics.avgViews)}</p>
              <p className="text-xs text-muted-foreground">Avg Views</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-2 rounded-lg border">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-500" />
              <p className="font-semibold">{formatNumber(analytics.avgLikes)}</p>
              <p className="text-xs text-muted-foreground">Avg Likes</p>
            </div>
            <div className="text-center p-2 rounded-lg border">
              <MessageCircle className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <p className="font-semibold">{formatNumber(analytics.avgComments)}</p>
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Social Analytics</h1>
          <p className="text-muted-foreground">View analytics and calculate sponsorship rates</p>
        </div>
      </div>

      <Tabs defaultValue="my-accounts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-accounts" data-testid="tab-my-accounts">
            My Accounts
          </TabsTrigger>
          <TabsTrigger value="search" data-testid="tab-search">
            Search Profile
          </TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">
            Rate Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>My Connected Accounts</CardTitle>
                  <CardDescription>Analytics for your connected social media profiles</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetchMyAccounts()}
                  disabled={myAccountsLoading}
                  data-testid="button-refresh-my-accounts"
                >
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
              ) : myAccounts.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No analytics available</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your social accounts in the Social Hub to see analytics
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/dashboard/social-hub" data-testid="link-social-hub">
                      <Link2 className="w-4 h-4 mr-2" />
                      Go to Social Hub
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
                  <Input
                    id="search-handle"
                    placeholder="e.g. username"
                    value={searchHandle}
                    onChange={(e) => setSearchHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    data-testid="input-search-handle"
                  />
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
                  <Button 
                    onClick={handleSearch}
                    disabled={searchMutation.isPending}
                    data-testid="button-search-profile"
                  >
                    {searchMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentAnalytics && (
            <AnalyticsCard analytics={currentAnalytics} />
          )}
        </TabsContent>

        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Suggested Sponsorship Rates
              </CardTitle>
              <CardDescription>
                Calculate rates based on your profile analytics
              </CardDescription>
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
                          <div className="flex items-center justify-between">
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
                          <div className="flex items-center justify-between">
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

                  <p className="text-xs text-muted-foreground">
                    * Rates are suggestions based on industry standards. Actual rates may vary based on niche, content quality, and brand requirements.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Calculator className="w-16 h-16 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">No rates calculated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Search for a profile or view your account analytics to calculate suggested rates
                    </p>
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
