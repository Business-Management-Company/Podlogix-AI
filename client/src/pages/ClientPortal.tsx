import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Search, Users, Bookmark, MessageSquare, TrendingUp, 
  DollarSign, Instagram, Youtube, Twitter, Podcast,
  Plus, Filter, Heart, Send, Eye, Star, MapPin,
  Mail, ExternalLink, MoreHorizontal, X, Sparkles,
  UserPlus, FileText, Calculator, Building2
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import type { ClientSavedCreator } from "@shared/schema";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  tiktok: <SiTiktok className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  podcast: <Podcast className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  saved: "bg-muted text-muted-foreground",
  interested: "bg-blue-500/10 text-blue-500",
  contacted: "bg-amber-500/10 text-amber-500",
  negotiating: "bg-purple-500/10 text-purple-500",
  partnered: "bg-green-500/10 text-green-500",
  declined: "bg-red-500/10 text-red-500",
};

function formatFollowers(count: number | null | undefined): string {
  if (!count) return "N/A";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatRate(cents: number | null | undefined): string {
  if (!cents) return "N/A";
  return `$${(cents / 100).toLocaleString()}`;
}

function calculateEstimatedRates(followerCount: number, engagementRate: number, avgViews?: number) {
  const safeFollowers = Math.max(1, followerCount || 0);
  const safeEngagement = Math.max(0, Math.min(engagementRate || 0, 10000));
  
  const baseRate = Math.max(25, (safeFollowers / 10000) * 50);
  const engagementMultiplier = safeEngagement > 300 ? 1.5 : safeEngagement > 200 ? 1.2 : 1;
  const viewsBonus = avgViews && safeFollowers > 0 ? Math.min((avgViews / safeFollowers) * 20, 100) : 0;
  
  const postRate = Math.round((baseRate * engagementMultiplier + viewsBonus) * 100);
  const storyRate = Math.round(postRate * 0.4);
  const videoRate = Math.round(postRate * 2.5);
  
  if (!isFinite(postRate) || !isFinite(storyRate) || !isFinite(videoRate)) {
    return { postRate: 2500, storyRate: 1000, videoRate: 6250 };
  }
  
  return { postRate, storyRate, videoRate };
}

interface CreatorCardProps {
  creator: ClientSavedCreator;
  onUpdateStatus: (id: string, status: string) => void;
  onViewDetails: (creator: ClientSavedCreator) => void;
}

function CreatorCard({ creator, onUpdateStatus, onViewDetails }: CreatorCardProps) {
  return (
    <Card className="hover-elevate cursor-pointer" onClick={() => onViewDetails(creator)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={creator.profilePicUrl || undefined} alt={creator.displayName || creator.username} />
            <AvatarFallback>{(creator.displayName || creator.username).slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{creator.displayName || creator.username}</span>
              {platformIcons[creator.platform]}
            </div>
            <div className="text-sm text-muted-foreground">@{creator.username}</div>
            {creator.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                {creator.location}
              </div>
            )}
          </div>
          <Badge className={statusColors[creator.status || "saved"]} data-testid={`badge-status-${creator.id}`}>
            {creator.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
          <div>
            <div className="font-semibold">{formatFollowers(creator.followerCount)}</div>
            <div className="text-xs text-muted-foreground">Followers</div>
          </div>
          <div>
            <div className="font-semibold">{creator.engagementRate ? `${(creator.engagementRate / 100).toFixed(1)}%` : "N/A"}</div>
            <div className="text-xs text-muted-foreground">Engagement</div>
          </div>
          <div>
            <div className="font-semibold">{formatRate(creator.estimatedPostRate)}</div>
            <div className="text-xs text-muted-foreground">Est. Rate</div>
          </div>
        </div>
        
        {creator.categories && creator.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {creator.categories.slice(0, 3).map((cat, i) => (
              <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiscoveryTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [platform, setPlatform] = useState<string>("instagram");
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const searchCreators = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Please enter a search query", variant: "destructive" });
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await apiRequest("POST", "/api/social-analytics/discover", {
          query: searchQuery,
          platform,
          filters: {
            followers: {
              min: minFollowers ? parseInt(minFollowers) : undefined,
              max: maxFollowers ? parseInt(maxFollowers) : undefined,
            },
          },
          limit: 20,
        });
      const data = await res.json();
      setSearchResults(data.creators || []);
    } catch (error) {
      toast({ title: "Search failed", description: String(error), variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (creator: any) => {
      const rates = calculateEstimatedRates(
        creator.followers || creator.follower_count || 0,
        creator.engagement_rate ? creator.engagement_rate * 100 : 200,
        creator.avg_views
      );
      
      const res = await apiRequest("POST", "/api/client-portal/saved-creators", {
          platform: creator.platform || platform,
          platformUserId: creator.user_id || creator.id,
          username: creator.username || creator.handle,
          displayName: creator.fullname || creator.full_name || creator.name,
          profilePicUrl: creator.picture || creator.profile_pic_url,
          bio: creator.bio || creator.description,
          followerCount: creator.followers || creator.follower_count,
          engagementRate: Math.round((creator.engagement_rate || 0.02) * 10000),
          avgViews: creator.avg_views,
          avgLikes: creator.avg_likes,
          location: creator.geo?.city || creator.location,
          categories: creator.topics || creator.categories || [],
          email: creator.contacts?.emails?.[0]?.value || creator.email,
          estimatedPostRate: rates.postRate,
          estimatedStoryRate: rates.storyRate,
          estimatedVideoRate: rates.videoRate,
          status: "saved",
        });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Creator saved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/saved-creators"] });
    },
    onError: (error) => {
      toast({ title: "Failed to save", description: String(error), variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Creator Discovery
          </CardTitle>
          <CardDescription>
            Search 340M+ creators using natural language. Try "Fashion influencers in LA with 50k-200k followers"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Describe the creators you're looking for..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCreators()}
              className="flex-1"
              data-testid="input-discovery-search"
            />
            <Button onClick={searchCreators} disabled={isSearching} data-testid="button-search-creators">
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px]" data-testid="select-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Min followers"
              type="number"
              value={minFollowers}
              onChange={(e) => setMinFollowers(e.target.value)}
              className="w-[120px]"
              data-testid="input-min-followers"
            />
            <Input
              placeholder="Max followers"
              type="number"
              value={maxFollowers}
              onChange={(e) => setMaxFollowers(e.target.value)}
              className="w-[120px]"
              data-testid="input-max-followers"
            />
          </div>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((creator, idx) => (
            <Card key={creator.user_id || idx} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator.picture} alt={creator.fullname} />
                    <AvatarFallback>{(creator.fullname || creator.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{creator.fullname || creator.username}</div>
                    <div className="text-sm text-muted-foreground">@{creator.username}</div>
                    {creator.geo?.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {creator.geo.city}, {creator.geo.country}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
                  <div>
                    <div className="font-semibold">{formatFollowers(creator.followers)}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="font-semibold">{creator.engagement_rate ? `${(creator.engagement_rate * 100).toFixed(1)}%` : "N/A"}</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                  <div>
                    <div className="font-semibold">{creator.avg_views ? formatFollowers(creator.avg_views) : "N/A"}</div>
                    <div className="text-xs text-muted-foreground">Avg Views</div>
                  </div>
                </div>
                
                {creator.topics && creator.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {creator.topics.slice(0, 3).map((topic: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => saveMutation.mutate(creator)}
                    disabled={saveMutation.isPending}
                    data-testid={`button-save-creator-${idx}`}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  {creator.contacts?.emails?.[0]?.value && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${creator.contacts.emails[0].value}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Search for creators to get started</p>
          <p className="text-sm mt-2">Use natural language or filters to find the perfect match</p>
        </div>
      )}
    </div>
  );
}

function SavedCreatorsTab() {
  const { toast } = useToast();
  const [selectedCreator, setSelectedCreator] = useState<ClientSavedCreator | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: savedCreators = [], isLoading } = useQuery<ClientSavedCreator[]>({
    queryKey: ["/api/client-portal/saved-creators"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/client-portal/saved-creators/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/saved-creators"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/client-portal/saved-creators/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Creator removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/saved-creators"] });
      setShowDetailsDialog(false);
    },
  });

  const filteredCreators = savedCreators.filter(c => 
    statusFilter === "all" || c.status === statusFilter
  );

  const statusCounts = savedCreators.reduce((acc, c) => {
    acc[c.status || "saved"] = (acc[c.status || "saved"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
          >
            All ({savedCreators.length})
          </Button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              data-testid={`filter-${status}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Button>
          ))}
        </div>
      </div>

      {filteredCreators.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No saved creators yet</p>
          <p className="text-sm mt-2">Discover and save creators to track them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
              onViewDetails={(c) => {
                setSelectedCreator(c);
                setShowDetailsDialog(true);
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          {selectedCreator && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCreator.profilePicUrl || undefined} />
                    <AvatarFallback>{(selectedCreator.displayName || selectedCreator.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedCreator.displayName || selectedCreator.username}
                      {platformIcons[selectedCreator.platform]}
                    </DialogTitle>
                    <DialogDescription>@{selectedCreator.username}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">{formatFollowers(selectedCreator.followerCount)}</div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-2xl font-bold">
                        {selectedCreator.engagementRate ? `${(selectedCreator.engagementRate / 100).toFixed(2)}%` : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">Engagement Rate</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Estimated Rates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xl font-semibold">{formatRate(selectedCreator.estimatedPostRate)}</div>
                        <div className="text-sm text-muted-foreground">Per Post</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{formatRate(selectedCreator.estimatedStoryRate)}</div>
                        <div className="text-sm text-muted-foreground">Per Story</div>
                      </div>
                      <div>
                        <div className="text-xl font-semibold">{formatRate(selectedCreator.estimatedVideoRate)}</div>
                        <div className="text-sm text-muted-foreground">Per Video</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedCreator.bio && (
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground">{selectedCreator.bio}</p>
                  </div>
                )}

                {selectedCreator.categories && selectedCreator.categories.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Categories</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedCreator.categories.map((cat, i) => (
                        <Badge key={i} variant="secondary">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Status</h4>
                  <Select
                    value={selectedCreator.status || "saved"}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({ id: selectedCreator.id, status: value });
                      setSelectedCreator({ ...selectedCreator, status: value });
                    }}
                  >
                    <SelectTrigger data-testid="select-creator-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="partnered">Partnered</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selectedCreator.email && (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${selectedCreator.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact
                    </a>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedCreator.id)}
                  data-testid="button-delete-creator"
                >
                  Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaKitsTab() {
  const { toast } = useToast();
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [isLoading, setIsLoading] = useState(false);
  const [mediaKit, setMediaKit] = useState<any>(null);

  const fetchMediaKit = async () => {
    if (!handle.trim()) {
      toast({ title: "Enter a username", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/social-analytics/profile", { handle: handle.replace("@", ""), platform });
      const data = await res.json();
      
      if (data.profile) {
        const profile = data.profile;
        const rates = calculateEstimatedRates(
          profile.followers || 0,
          (profile.engagement_rate || 0.02) * 10000,
          profile.avg_views
        );
        setMediaKit({ ...profile, rates });
      } else {
        toast({ title: "Profile not found", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Failed to load", description: String(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            View Creator Media Kit
          </CardTitle>
          <CardDescription>
            Enter a creator's username to view their media kit and estimated rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[140px]" data-testid="select-mediakit-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="@username"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMediaKit()}
              className="flex-1"
              data-testid="input-mediakit-handle"
            />
            <Button onClick={fetchMediaKit} disabled={isLoading} data-testid="button-view-mediakit">
              {isLoading ? "Loading..." : "View Kit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {mediaKit && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={mediaKit.picture} />
                <AvatarFallback>{(mediaKit.fullname || mediaKit.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{mediaKit.fullname || mediaKit.username}</h2>
                <p className="text-muted-foreground">@{mediaKit.username}</p>
                {mediaKit.bio && <p className="mt-2 text-sm">{mediaKit.bio}</p>}
                {mediaKit.geo && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4" />
                    {mediaKit.geo.city}, {mediaKit.geo.country}
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{formatFollowers(mediaKit.followers)}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">
                    {mediaKit.engagement_rate ? `${(mediaKit.engagement_rate * 100).toFixed(2)}%` : "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground">Engagement</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{formatFollowers(mediaKit.avg_views)}</div>
                  <div className="text-sm text-muted-foreground">Avg Views</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Heart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{formatFollowers(mediaKit.avg_likes)}</div>
                  <div className="text-sm text-muted-foreground">Avg Likes</div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rate Card (Estimated)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{formatRate(mediaKit.rates.postRate)}</div>
                    <div className="text-sm text-muted-foreground">Per Post</div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{formatRate(mediaKit.rates.storyRate)}</div>
                    <div className="text-sm text-muted-foreground">Per Story</div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 text-center">
                    <div className="text-2xl font-bold text-primary">{formatRate(mediaKit.rates.videoRate)}</div>
                    <div className="text-sm text-muted-foreground">Per Video</div>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * Rates are estimated based on follower count, engagement rate, and average views. Actual rates may vary.
              </p>
            </div>

            {mediaKit.topics && mediaKit.topics.length > 0 && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Content Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {mediaKit.topics.map((topic: string, i: number) => (
                      <Badge key={i} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mediaKit.contacts?.emails?.[0]?.value && (
              <>
                <Separator className="my-6" />
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Contact</h3>
                  <Button variant="outline" asChild>
                    <a href={`mailto:${mediaKit.contacts.emails[0].value}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      {mediaKit.contacts.emails[0].value}
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardTab() {
  const { data: savedCreators = [] } = useQuery<ClientSavedCreator[]>({
    queryKey: ["/api/client-portal/saved-creators"],
  });

  const stats = {
    total: savedCreators.length,
    interested: savedCreators.filter(c => c.status === "interested").length,
    contacted: savedCreators.filter(c => c.status === "contacted").length,
    negotiating: savedCreators.filter(c => c.status === "negotiating").length,
    partnered: savedCreators.filter(c => c.status === "partnered").length,
  };

  const recentCreators = [...savedCreators]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Saved</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Star className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.interested}</div>
                <div className="text-sm text-muted-foreground">Interested</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Send className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.contacted}</div>
                <div className="text-sm text-muted-foreground">Contacted</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <MessageSquare className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.negotiating}</div>
                <div className="text-sm text-muted-foreground">Negotiating</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserPlus className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.partnered}</div>
                <div className="text-sm text-muted-foreground">Partnered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recently Saved Creators</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCreators.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No creators saved yet. Start discovering!
              </p>
            ) : (
              <div className="space-y-3">
                {recentCreators.map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 p-2 rounded-lg hover-elevate">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={creator.profilePicUrl || undefined} />
                      <AvatarFallback>{(creator.displayName || creator.username).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {creator.displayName || creator.username}
                        {platformIcons[creator.platform]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatFollowers(creator.followerCount)} followers
                      </div>
                    </div>
                    <Badge className={statusColors[creator.status || "saved"]}>
                      {creator.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" data-testid="button-discover-creators">
              <Search className="h-4 w-4 mr-2" />
              Discover New Creators
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-saved">
              <Bookmark className="h-4 w-4 mr-2" />
              View Saved Creators
            </Button>
            <Button className="w-full justify-start" variant="outline" data-testid="button-view-media-kits">
              <FileText className="h-4 w-4 mr-2" />
              Browse Media Kits
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to access the Client Portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            Client Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover influencers, view media kits, and manage partnerships
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="discover" data-testid="tab-discover">Discover</TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved">Saved</TabsTrigger>
          <TabsTrigger value="media-kits" data-testid="tab-media-kits">Media Kits</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="discover">
          <DiscoveryTab />
        </TabsContent>

        <TabsContent value="saved">
          <SavedCreatorsTab />
        </TabsContent>

        <TabsContent value="media-kits">
          <MediaKitsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
