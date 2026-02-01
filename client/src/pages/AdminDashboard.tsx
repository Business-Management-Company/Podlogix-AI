import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  Activity, 
  Podcast, 
  Fingerprint,
  ArrowLeft,
  UserCog,
  Ban,
  CheckCircle,
  Trash2,
  Crown,
  Search,
  UserPlus,
  DollarSign,
  TrendingUp,
  MapPin,
  Edit,
  Eye,
  Phone,
  Mail,
  Globe,
  Tag,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { SiYoutube, SiInstagram, SiLinkedin, SiTiktok } from "react-icons/si";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string | null;
  isActive: string | null;
  createdAt: string | null;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalIdentityAssets: number;
  verifiedIdentities: number;
  totalSubscriptions: number;
}

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

interface AdminCreator {
  id: string;
  addedByUserId: string;
  platform: string;
  platformUserId: string | null;
  username: string;
  fullName: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  engagementRate: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgViews: number | null;
  location: string | null;
  categories: string[] | null;
  niche: string | null;
  hourlyRate: number | null;
  perPostRate: number | null;
  perVideoRate: number | null;
  perStoryRate: number | null;
  monthlyRetainerRate: number | null;
  packageDescription: string | null;
  currency: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  tags: string[] | null;
  lastContactedAt: string | null;
  createdAt: string | null;
}

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl?: string;
}

interface YouTubeSearchResult {
  channels: YouTubeChannel[];
  nextPageToken?: string;
}

interface InstagramPost {
  id: string;
  mediaType: string;
  mediaUrl?: string;
  permalink: string;
  caption?: string;
  likeCount?: number;
  commentsCount?: number;
  timestamp: string;
  username?: string;
}

interface HashtagDiscoveryResult {
  hashtag: string;
  posts: InstagramPost[];
  total: number;
  error?: { type: string; message: string };
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatCurrency(amount: number | null, currency: string = "USD"): string {
  if (!amount) return "-";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram': return <SiInstagram className="h-4 w-4 text-pink-500" />;
    case 'tiktok': return <SiTiktok className="h-4 w-4" />;
    case 'youtube': return <SiYoutube className="h-4 w-4 text-red-500" />;
    case 'linkedin': return <SiLinkedin className="h-4 w-4 text-blue-600" />;
    default: return <Users className="h-4 w-4" />;
  }
}

function getStatusColor(status: string | null): string {
  switch (status) {
    case 'active': return 'bg-green-500/10 text-green-500';
    case 'negotiating': return 'bg-amber-500/10 text-amber-500';
    case 'contracted': return 'bg-blue-500/10 text-blue-500';
    default: return 'bg-gray-500/10 text-gray-500';
  }
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'high': return 'bg-red-500/10 text-red-500';
    case 'medium': return 'bg-amber-500/10 text-amber-500';
    case 'low': return 'bg-blue-500/10 text-blue-500';
    default: return 'bg-gray-500/10 text-gray-500';
  }
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [instagramHashtag, setInstagramHashtag] = useState("");
  const [linkedinQuery, setLinkedinQuery] = useState("");
  const [linkedinSearchType, setLinkedinSearchType] = useState<'people' | 'companies'>('people');
  const [selectedCreator, setSelectedCreator] = useState<AdminCreator | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminCreator>>({});

  const { data: adminCheck, isLoading: checkLoading } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery<AdminCreator[]>({
    queryKey: ['/api/admin/creators'],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: youtubeStatus } = useQuery<{ configured: boolean }>({
    queryKey: ['/api/brand/youtube/status'],
  });

  const { data: instagramStatus } = useQuery<{ configured: boolean; hasLinkedAccount: boolean }>({
    queryKey: ['/api/brand/instagram/hashtag-status'],
  });

  const youtubeSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/brand/youtube/search", { query });
      return res.json() as Promise<YouTubeSearchResult>;
    },
  });

  const instagramSearchMutation = useMutation({
    mutationFn: async (hashtag: string) => {
      const res = await apiRequest("POST", "/api/brand/instagram/hashtag-search", { hashtag });
      return res.json() as Promise<HashtagDiscoveryResult>;
    },
  });

  const addCreatorMutation = useMutation({
    mutationFn: async (creator: Partial<AdminCreator>) => {
      const res = await apiRequest("POST", "/api/admin/creators", creator);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creators'] });
      toast({ title: "Creator Added", description: "Creator has been added to your list." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add creator.", variant: "destructive" });
    },
  });

  const updateCreatorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdminCreator> }) => {
      const res = await apiRequest("PATCH", `/api/admin/creators/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creators'] });
      setIsEditDialogOpen(false);
      toast({ title: "Creator Updated", description: "Creator details have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update creator.", variant: "destructive" });
    },
  });

  const deleteCreatorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/creators/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/creators'] });
      toast({ title: "Creator Removed", description: "Creator has been removed from your list." });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Role updated", description: "User role has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Status updated", description: "User status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User deleted", description: "User has been removed from the platform." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    },
  });

  const handleYoutubeSearch = () => {
    if (!youtubeQuery.trim()) return;
    youtubeSearchMutation.mutate(youtubeQuery);
  };

  const handleInstagramSearch = () => {
    if (!instagramHashtag.trim()) return;
    instagramSearchMutation.mutate(instagramHashtag);
  };

  const handleLinkedInSearch = () => {
    if (!linkedinQuery.trim()) return;
    const searchUrl = linkedinSearchType === 'people'
      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(linkedinQuery)}`
      : `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(linkedinQuery)}`;
    window.open(searchUrl, '_blank');
  };

  const handleAddYouTubeCreator = (channel: YouTubeChannel) => {
    addCreatorMutation.mutate({
      platform: 'youtube',
      platformUserId: channel.id,
      username: channel.customUrl || channel.title,
      fullName: channel.title,
      profilePicUrl: channel.thumbnailUrl,
      bio: channel.description?.substring(0, 500),
      followerCount: channel.subscriberCount,
      avgViews: Math.round(channel.viewCount / Math.max(channel.videoCount, 1)),
      status: 'prospect',
      priority: 'medium',
    });
  };

  const handleAddInstagramCreator = (post: InstagramPost) => {
    addCreatorMutation.mutate({
      platform: 'instagram',
      username: post.username || 'unknown',
      profilePicUrl: post.mediaUrl,
      avgLikes: post.likeCount,
      avgComments: post.commentsCount,
      status: 'prospect',
      priority: 'medium',
    });
  };

  const handleEditCreator = (creator: AdminCreator) => {
    setSelectedCreator(creator);
    setEditForm(creator);
    setIsEditDialogOpen(true);
  };

  const handleViewCreator = (creator: AdminCreator) => {
    setSelectedCreator(creator);
    setIsViewDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedCreator) return;
    updateCreatorMutation.mutate({ id: selectedCreator.id, updates: editForm });
  };

  if (checkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "superadmin": return "default";
      case "admin": return "secondary";
      default: return "outline";
    }
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "superadmin": return <Crown className="h-3 w-3" />;
      case "admin": return <ShieldCheck className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-8 w-8 text-primary" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage users and monitor platform activity
              </p>
            </div>
          </div>
          <Badge variant={adminCheck.isSuperAdmin ? "default" : "secondary"} className="gap-1">
            {adminCheck.isSuperAdmin ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {adminCheck.role}
          </Badge>
        </motion.div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="creators" data-testid="tab-creators">
              <UserPlus className="h-4 w-4 mr-2" />
              Creators
            </TabsTrigger>
            <TabsTrigger value="discovery" data-testid="tab-discovery">
              <Search className="h-4 w-4 mr-2" />
              Discovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-users">
                      {statsLoading ? "..." : stats?.totalUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.activeUsers || 0} active
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Admins</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-admin-count">
                      {statsLoading ? "..." : stats?.adminCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Platform administrators
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Voice Identities</CardTitle>
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-identity-count">
                      {statsLoading ? "..." : stats?.totalIdentityAssets || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.verifiedIdentities || 0} verified on blockchain
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Podcast Subscriptions</CardTitle>
                    <Podcast className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-subscription-count">
                      {statsLoading ? "..." : stats?.totalSubscriptions || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Active listener subscriptions
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`user-row-${user.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {user.firstName} {user.lastName}
                              </p>
                              <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                                {getRoleIcon(user.role)}
                                {user.role || "user"}
                              </Badge>
                              {user.isActive === "false" && (
                                <Badge variant="destructive">Suspended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {adminCheck.isSuperAdmin && (
                            <Select
                              value={user.role || "user"}
                              onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="superadmin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          <Button
                            variant={user.isActive === "false" ? "default" : "outline"}
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ 
                              userId: user.id, 
                              isActive: user.isActive === "false" ? "true" : "false" 
                            })}
                            data-testid={`button-toggle-status-${user.id}`}
                          >
                            {user.isActive === "false" ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>

                          {adminCheck.isSuperAdmin && (
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this user?")) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Creators Tab */}
          <TabsContent value="creators" className="space-y-6">
            {creatorsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
              </div>
            ) : creators.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No creators yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Use the Discovery tab to find and add influencers to your list
                </p>
                <Button onClick={() => setSelectedTab("discovery")} data-testid="button-start-discovery">
                  <Search className="h-4 w-4 mr-2" />
                  Start Discovery
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {creators.map((creator) => (
                  <motion.div key={creator.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover-elevate" data-testid={`card-creator-${creator.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={creator.profilePicUrl || undefined} />
                              <AvatarFallback>{creator.username[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {creator.fullName || creator.username}
                                {getPlatformIcon(creator.platform)}
                              </CardTitle>
                              <CardDescription>@{creator.username}</CardDescription>
                            </div>
                          </div>
                          <Badge className={getPriorityColor(creator.priority)}>
                            {creator.priority || 'medium'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          {creator.followerCount && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{formatFollowers(creator.followerCount)}</span>
                            </div>
                          )}
                          {creator.engagementRate && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-muted-foreground" />
                              <span>{(creator.engagementRate / 100).toFixed(1)}%</span>
                            </div>
                          )}
                          {creator.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{creator.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Rate Sheet</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Per Post:</span> {formatCurrency(creator.perPostRate, creator.currency || 'USD')}</div>
                            <div><span className="text-muted-foreground">Per Video:</span> {formatCurrency(creator.perVideoRate, creator.currency || 'USD')}</div>
                            <div><span className="text-muted-foreground">Hourly:</span> {formatCurrency(creator.hourlyRate, creator.currency || 'USD')}</div>
                            <div><span className="text-muted-foreground">Monthly:</span> {formatCurrency(creator.monthlyRetainerRate, creator.currency || 'USD')}</div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(creator.status)}>{creator.status || 'prospect'}</Badge>
                      </CardContent>
                      <CardFooter className="flex gap-2 pt-0">
                        <Button variant="outline" size="sm" onClick={() => handleViewCreator(creator)} data-testid={`button-view-${creator.id}`}>
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditCreator(creator)} data-testid={`button-edit-${creator.id}`}>
                          <Edit className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCreatorMutation.mutate(creator.id)} data-testid={`button-delete-creator-${creator.id}`}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Discovery Tab */}
          <TabsContent value="discovery" className="space-y-6">
            <Tabs defaultValue="youtube" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 max-w-lg">
                <TabsTrigger value="youtube" data-testid="tab-discovery-youtube"><SiYoutube className="h-4 w-4 mr-2" />YouTube</TabsTrigger>
                <TabsTrigger value="instagram" data-testid="tab-discovery-instagram"><SiInstagram className="h-4 w-4 mr-2" />Instagram</TabsTrigger>
                <TabsTrigger value="linkedin" data-testid="tab-discovery-linkedin"><SiLinkedin className="h-4 w-4 mr-2" />LinkedIn</TabsTrigger>
              </TabsList>

              <TabsContent value="youtube" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <SiYoutube className="h-5 w-5 text-red-500" />YouTube Creator Discovery
                          <Badge variant="default" className="ml-2">Free</Badge>
                        </CardTitle>
                        <CardDescription>Search YouTube channels and add creators to your list</CardDescription>
                      </div>
                      {!youtubeStatus?.configured && <Badge variant="outline">Demo Mode</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="Search YouTube channels..." value={youtubeQuery} onChange={(e) => setYoutubeQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSearch()} data-testid="input-youtube-search" />
                      <Button onClick={handleYoutubeSearch} disabled={youtubeSearchMutation.isPending} data-testid="button-youtube-search">
                        {youtubeSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {youtubeSearchMutation.data?.channels && (
                      <div className="grid gap-3">
                        {youtubeSearchMutation.data.channels.map((channel) => (
                          <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={channel.thumbnailUrl} />
                                <AvatarFallback>{channel.title[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{channel.title}</div>
                                <div className="text-sm text-muted-foreground">{formatFollowers(channel.subscriberCount)} subscribers</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={`https://youtube.com/channel/${channel.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" data-testid={`button-youtube-external-${channel.id}`}><ExternalLink className="h-4 w-4" /></Button>
                              </a>
                              <Button size="sm" onClick={() => handleAddYouTubeCreator(channel)} disabled={addCreatorMutation.isPending} data-testid={`button-add-youtube-${channel.id}`}>
                                <UserPlus className="h-4 w-4 mr-1" />Add
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instagram" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <SiInstagram className="h-5 w-5 text-pink-500" />Instagram Hashtag Discovery
                          <Badge variant="default" className="ml-2">Free</Badge>
                        </CardTitle>
                        <CardDescription>Search hashtags to discover Instagram creators</CardDescription>
                      </div>
                      {!instagramStatus?.configured && <Badge variant="outline">Not Configured</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="Enter hashtag (e.g., fitness, travel)..." value={instagramHashtag} onChange={(e) => setInstagramHashtag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInstagramSearch()} data-testid="input-instagram-search" />
                      <Button onClick={handleInstagramSearch} disabled={instagramSearchMutation.isPending} data-testid="button-instagram-search">
                        {instagramSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {instagramSearchMutation.data?.error && (
                      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{instagramSearchMutation.data.error.message}</div>
                    )}
                    {instagramSearchMutation.data?.posts && instagramSearchMutation.data.posts.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {instagramSearchMutation.data.posts.map((post) => (
                          <div key={post.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate">
                            <div className="flex items-center gap-3">
                              {post.mediaUrl && <img src={post.mediaUrl} alt="" className="h-12 w-12 object-cover rounded" />}
                              <div>
                                <div className="font-medium">@{post.username || 'unknown'}</div>
                                <div className="text-sm text-muted-foreground">{post.likeCount ? `${formatFollowers(post.likeCount)} likes` : 'No data'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" data-testid={`button-instagram-external-${post.id}`}><ExternalLink className="h-4 w-4" /></Button>
                              </a>
                              <Button size="sm" onClick={() => handleAddInstagramCreator(post)} disabled={addCreatorMutation.isPending} data-testid={`button-add-instagram-${post.id}`}>
                                <UserPlus className="h-4 w-4 mr-1" />Add
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="linkedin" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SiLinkedin className="h-5 w-5 text-blue-600" />LinkedIn Discovery
                      <Badge variant="default" className="ml-2">Free</Badge>
                    </CardTitle>
                    <CardDescription>Search LinkedIn profiles and companies (opens in new tab)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Select value={linkedinSearchType} onValueChange={(v) => setLinkedinSearchType(v as 'people' | 'companies')}>
                        <SelectTrigger className="w-[140px]" data-testid="select-linkedin-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="people">People</SelectItem>
                          <SelectItem value="companies">Companies</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Search LinkedIn..." value={linkedinQuery} onChange={(e) => setLinkedinQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLinkedInSearch()} data-testid="input-linkedin-search" />
                      <Button onClick={handleLinkedInSearch} data-testid="button-linkedin-search">
                        <ExternalLink className="h-4 w-4 mr-1" />Search
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">LinkedIn search opens in a new tab. Manually add creators from results.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* View Creator Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedCreator?.profilePicUrl || undefined} />
                  <AvatarFallback>{selectedCreator?.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    {selectedCreator?.fullName || selectedCreator?.username}
                    {selectedCreator && getPlatformIcon(selectedCreator.platform)}
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">@{selectedCreator?.username}</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            {selectedCreator && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" />Analytics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg"><div className="text-2xl font-bold">{selectedCreator.followerCount ? formatFollowers(selectedCreator.followerCount) : '-'}</div><div className="text-sm text-muted-foreground">Followers</div></div>
                    <div className="p-3 border rounded-lg"><div className="text-2xl font-bold">{selectedCreator.engagementRate ? `${(selectedCreator.engagementRate / 100).toFixed(1)}%` : '-'}</div><div className="text-sm text-muted-foreground">Engagement</div></div>
                    <div className="p-3 border rounded-lg"><div className="text-2xl font-bold">{selectedCreator.avgViews ? formatFollowers(selectedCreator.avgViews) : '-'}</div><div className="text-sm text-muted-foreground">Avg Views</div></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" />Rate Sheet ({selectedCreator.currency || 'USD'})</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg"><div className="text-xl font-bold">{formatCurrency(selectedCreator.hourlyRate, selectedCreator.currency || 'USD')}</div><div className="text-sm text-muted-foreground">Hourly Rate</div></div>
                    <div className="p-3 border rounded-lg"><div className="text-xl font-bold">{formatCurrency(selectedCreator.perPostRate, selectedCreator.currency || 'USD')}</div><div className="text-sm text-muted-foreground">Per Post</div></div>
                    <div className="p-3 border rounded-lg"><div className="text-xl font-bold">{formatCurrency(selectedCreator.perVideoRate, selectedCreator.currency || 'USD')}</div><div className="text-sm text-muted-foreground">Per Video</div></div>
                    <div className="p-3 border rounded-lg"><div className="text-xl font-bold">{formatCurrency(selectedCreator.perStoryRate, selectedCreator.currency || 'USD')}</div><div className="text-sm text-muted-foreground">Per Story</div></div>
                    <div className="p-3 border rounded-lg col-span-2"><div className="text-xl font-bold">{formatCurrency(selectedCreator.monthlyRetainerRate, selectedCreator.currency || 'USD')}</div><div className="text-sm text-muted-foreground">Monthly Retainer</div></div>
                  </div>
                  {selectedCreator.packageDescription && <div className="mt-3 p-3 border rounded-lg"><div className="text-sm text-muted-foreground mb-1">Package Notes</div><p className="text-sm">{selectedCreator.packageDescription}</p></div>}
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Mail className="h-4 w-4" />Contact Info</h4>
                  <div className="space-y-2 text-sm">
                    {selectedCreator.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{selectedCreator.email}</div>}
                    {selectedCreator.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{selectedCreator.phone}</div>}
                    {selectedCreator.websiteUrl && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><a href={selectedCreator.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedCreator.websiteUrl}</a></div>}
                    {selectedCreator.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{selectedCreator.location}</div>}
                  </div>
                </div>
                {selectedCreator.notes && <div><h4 className="font-semibold mb-3">Notes</h4><p className="text-sm p-3 bg-muted rounded-lg">{selectedCreator.notes}</p></div>}
                {selectedCreator.tags && selectedCreator.tags.length > 0 && <div><h4 className="font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4" />Tags</h4><div className="flex flex-wrap gap-2">{selectedCreator.tags.map((tag, i) => <Badge key={i} variant="secondary">{tag}</Badge>)}</div></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Creator Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Creator</DialogTitle>
              <DialogDescription>Update creator details, rate sheet, and contact information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Full Name</Label><Input value={editForm.fullName || ''} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} data-testid="input-edit-fullname" /></div>
                <div><Label>Username</Label><Input value={editForm.username || ''} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} data-testid="input-edit-username" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="input-edit-email" /></div>
                <div><Label>Phone</Label><Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} data-testid="input-edit-phone" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Location</Label><Input value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} data-testid="input-edit-location" /></div>
                <div><Label>Website</Label><Input value={editForm.websiteUrl || ''} onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })} data-testid="input-edit-website" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Status</Label>
                  <Select value={editForm.status || 'prospect'} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="contracted">Contracted</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={editForm.priority || 'medium'} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                    <SelectTrigger data-testid="select-edit-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Rate Sheet</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Hourly Rate ($)</Label><Input type="number" value={editForm.hourlyRate || ''} onChange={(e) => setEditForm({ ...editForm, hourlyRate: parseInt(e.target.value) || null })} data-testid="input-edit-hourly" /></div>
                  <div><Label>Per Post Rate ($)</Label><Input type="number" value={editForm.perPostRate || ''} onChange={(e) => setEditForm({ ...editForm, perPostRate: parseInt(e.target.value) || null })} data-testid="input-edit-perpost" /></div>
                  <div><Label>Per Video Rate ($)</Label><Input type="number" value={editForm.perVideoRate || ''} onChange={(e) => setEditForm({ ...editForm, perVideoRate: parseInt(e.target.value) || null })} data-testid="input-edit-pervideo" /></div>
                  <div><Label>Per Story Rate ($)</Label><Input type="number" value={editForm.perStoryRate || ''} onChange={(e) => setEditForm({ ...editForm, perStoryRate: parseInt(e.target.value) || null })} data-testid="input-edit-perstory" /></div>
                  <div className="col-span-2"><Label>Monthly Retainer ($)</Label><Input type="number" value={editForm.monthlyRetainerRate || ''} onChange={(e) => setEditForm({ ...editForm, monthlyRetainerRate: parseInt(e.target.value) || null })} data-testid="input-edit-monthly" /></div>
                </div>
              </div>
              <div><Label>Package Description</Label><Textarea value={editForm.packageDescription || ''} onChange={(e) => setEditForm({ ...editForm, packageDescription: e.target.value })} placeholder="Describe any special packages or deals..." data-testid="textarea-edit-package" /></div>
              <div><Label>Notes</Label><Textarea value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Add any notes about this creator..." data-testid="textarea-edit-notes" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={updateCreatorMutation.isPending} data-testid="button-save-edit">
                {updateCreatorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
