import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Loader2,
  Code,
  UserCheck,
  Plus,
  FileText,
  Send,
  Clock,
  RefreshCw,
  X,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";
import { SiYoutube, SiInstagram, SiLinkedin, SiTiktok, SiX, SiTwitch } from "react-icons/si";

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

interface InfluencersClubCreator {
  handle?: string;
  username?: string;
  full_name?: string;
  profile_picture?: string;
  biography?: string;
  follower_count?: number;
  following_count?: number;
  engagement_percent?: number;
  avg_likes?: number;
  avg_comments?: number;
  avg_views?: number;
  email?: string;
  location?: { country?: string; city?: string };
  is_verified?: boolean;
  platform?: string;
}

interface InfluencersClubResult {
  creators?: InfluencersClubCreator[];
  data?: InfluencersClubCreator[];
  total?: number;
  error?: string;
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
    case 'twitter': return <SiX className="h-4 w-4" />;
    case 'twitch': return <SiTwitch className="h-4 w-4 text-purple-500" />;
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

interface DevDocument {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdByUserId: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  invitedByUserId: string;
  invitedByName: string | null;
  status: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string | null;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const getTabFromUrl = () => new URLSearchParams(window.location.search).get("tab") || "overview";
  const [selectedTab, setSelectedTab] = useState(getTabFromUrl);

  useEffect(() => {
    const tab = getTabFromUrl();
    if (tab !== selectedTab) {
      setSelectedTab(tab);
    }
  }, [window.location.search]);
  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [instagramHashtag, setInstagramHashtag] = useState("");
  const [linkedinQuery, setLinkedinQuery] = useState("");
  const [linkedinSearchType, setLinkedinSearchType] = useState<'people' | 'companies'>('people');
  const [influencersClubQuery, setInfluencersClubQuery] = useState("");
  const [influencersClubPlatform, setInfluencersClubPlatform] = useState<string>('instagram');
  const [influencersClubFilters, setInfluencersClubFilters] = useState({
    keywords: "",
    bioKeywords: "",
    location: "",
    minFollowers: "5000",
    maxFollowers: "100000",
    minEngagement: "2.5",
    hasEmail: false,
    isVerified: false,
  });
  const [selectedCreator, setSelectedCreator] = useState<AdminCreator | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminCreator>>({});
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("general");
  const [editingDoc, setEditingDoc] = useState<DevDocument | null>(null);
  const [editDocTitle, setEditDocTitle] = useState("");
  const [editDocContent, setEditDocContent] = useState("");
  const [editDocCategory, setEditDocCategory] = useState("general");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "superadmin">("admin");

  const { data: adminCheck, isLoading: checkLoading } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isAdmin === true,
  });

  interface AdminFinancials {
    services: { name: string; purpose: string; monthlyUsd: number | null; notes?: string }[];
    fixedTotalUsd: number;
    icCredits: { available: number; used: number } | null;
    icCreditUsd: number;
    ffmpegConsumption: {
      used_minutes: number;
      remaining_minutes: number;
      quota_minutes: number;
      plan: string;
    } | null;
  }

  const { data: financials, isLoading: financialsLoading } = useQuery<AdminFinancials>({
    queryKey: ["/api/admin/financials"],
    enabled: adminCheck?.isSuperAdmin === true,
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

  const { data: devDocs = [], isLoading: docsLoading } = useQuery<DevDocument[]>({
    queryKey: ['/api/admin/dev-documents'],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<TeamInvitation[]>({
    queryKey: ['/api/admin/team-invitations'],
    enabled: adminCheck?.isAdmin === true,
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

  const { data: influencersClubStatus } = useQuery<{ configured: boolean; valid?: boolean; credits?: number }>({
    queryKey: ['/api/influencers-club/status'],
    enabled: adminCheck?.isAdmin === true,
  });

  const influencersClubMutation = useMutation({
    mutationFn: async ({ platform, prompt }: { platform: string; prompt: string }) => {
      const res = await apiRequest("POST", "/api/influencers-club/discover", { platform, prompt, limit: 20 });
      return res.json() as Promise<InfluencersClubResult>;
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

  const createDocMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category?: string }) => {
      const res = await apiRequest("POST", "/api/admin/dev-documents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dev-documents'] });
      setNewDocTitle("");
      setNewDocContent("");
      setNewDocCategory("general");
      toast({ title: "Document Created", description: "Development document has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create document.", variant: "destructive" });
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; content?: string; category?: string } }) => {
      const res = await apiRequest("PATCH", `/api/admin/dev-documents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dev-documents'] });
      setEditingDoc(null);
      toast({ title: "Document Updated", description: "Document has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update document.", variant: "destructive" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/dev-documents/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/dev-documents'] });
      toast({ title: "Document Deleted", description: "Document has been removed." });
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/admin/team-invitations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team-invitations'] });
      setInviteEmail("");
      setInviteRole("admin");
      toast({ title: "Invitation Sent", description: "Team invitation has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to create invitation.", variant: "destructive" });
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/team-invitations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team-invitations'] });
      toast({ title: "Invitation Revoked", description: "Invitation has been revoked." });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/team-invitations/${id}/resend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/team-invitations'] });
      toast({ title: "Invitation Resent", description: "Invitation has been renewed." });
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

  const handleInfluencersClubSearch = () => {
    const { keywords, bioKeywords, location, minFollowers, maxFollowers, minEngagement, hasEmail, isVerified } = influencersClubFilters;
    
    // Build a structured prompt from the filters
    const parts: string[] = [];
    if (keywords.trim()) parts.push(`keywords: ${keywords}`);
    if (bioKeywords.trim()) parts.push(`bio contains: ${bioKeywords}`);
    if (location.trim()) parts.push(`located in: ${location}`);
    if (minFollowers) parts.push(`minimum ${minFollowers} followers`);
    if (maxFollowers) parts.push(`maximum ${maxFollowers} followers`);
    if (minEngagement) parts.push(`minimum ${minEngagement}% engagement`);
    if (hasEmail) parts.push(`has verified email`);
    if (isVerified) parts.push(`verified account`);
    
    const prompt = parts.join(', ') || 'popular influencers';
    influencersClubMutation.mutate({ platform: influencersClubPlatform, prompt });
  };

  const handleAddInfluencersClubCreator = (creator: InfluencersClubCreator) => {
    addCreatorMutation.mutate({
      platform: creator.platform || influencersClubPlatform,
      username: creator.handle || creator.username || 'unknown',
      fullName: creator.full_name,
      profilePicUrl: creator.profile_picture,
      bio: creator.biography?.substring(0, 500),
      followerCount: creator.follower_count,
      engagementRate: creator.engagement_percent ? Math.round(creator.engagement_percent * 100) : undefined,
      avgLikes: creator.avg_likes,
      avgComments: creator.avg_comments,
      avgViews: creator.avg_views,
      email: creator.email,
      location: creator.location?.country ? `${creator.location.city || ''} ${creator.location.country}`.trim() : undefined,
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
      <div className="max-w-7xl px-4 py-8">
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
          <TabsList className={`grid w-full ${adminCheck.isSuperAdmin ? "grid-cols-7 max-w-5xl" : "grid-cols-6 max-w-4xl"}`}>
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
            <TabsTrigger value="development" data-testid="tab-development">
              <Code className="h-4 w-4 mr-2" />
              Development
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">
              <UserCheck className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
            {adminCheck.isSuperAdmin && (
              <TabsTrigger value="financials" data-testid="tab-financials">
                <DollarSign className="h-4 w-4 mr-2" />
                Financials
              </TabsTrigger>
            )}
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
            <Tabs defaultValue="influencers-club" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                <TabsTrigger value="influencers-club" data-testid="tab-discovery-influencers-club">
                  <Search className="h-4 w-4 mr-2" />Influencers.club
                </TabsTrigger>
                <TabsTrigger value="youtube" data-testid="tab-discovery-youtube"><SiYoutube className="h-4 w-4 mr-2" />YouTube</TabsTrigger>
                <TabsTrigger value="instagram" data-testid="tab-discovery-instagram"><SiInstagram className="h-4 w-4 mr-2" />Instagram</TabsTrigger>
                <TabsTrigger value="linkedin" data-testid="tab-discovery-linkedin"><SiLinkedin className="h-4 w-4 mr-2" />LinkedIn</TabsTrigger>
              </TabsList>

              {/* Influencers.club Tab */}
              <TabsContent value="influencers-club" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-primary" />Influencers.club Discovery
                          <Badge variant="default" className="ml-2">340M+ Creators</Badge>
                        </CardTitle>
                        <CardDescription>AI-powered search across Instagram, TikTok, YouTube, Twitter, Twitch & more</CardDescription>
                      </div>
                      {influencersClubStatus?.configured ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {influencersClubStatus.credits ? `${influencersClubStatus.credits} credits` : 'Connected'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Not Configured</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select value={influencersClubPlatform} onValueChange={setInfluencersClubPlatform}>
                          <SelectTrigger data-testid="select-influencers-platform">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram"><div className="flex items-center gap-2"><SiInstagram className="h-4 w-4" />Instagram</div></SelectItem>
                            <SelectItem value="tiktok"><div className="flex items-center gap-2"><SiTiktok className="h-4 w-4" />TikTok</div></SelectItem>
                            <SelectItem value="youtube"><div className="flex items-center gap-2"><SiYoutube className="h-4 w-4" />YouTube</div></SelectItem>
                            <SelectItem value="twitter"><div className="flex items-center gap-2"><SiX className="h-4 w-4" />Twitter/X</div></SelectItem>
                            <SelectItem value="twitch"><div className="flex items-center gap-2"><SiTwitch className="h-4 w-4" />Twitch</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Keywords (comma-separated)</Label>
                        <Input 
                          placeholder="military, veteran, fitness..." 
                          value={influencersClubFilters.keywords} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, keywords: e.target.value }))} 
                          data-testid="input-influencers-keywords" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bio Keywords</Label>
                        <Input 
                          placeholder="combat, marine, airforce..." 
                          value={influencersClubFilters.bioKeywords} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, bioKeywords: e.target.value }))} 
                          data-testid="input-influencers-bio" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input 
                          placeholder="United States" 
                          value={influencersClubFilters.location} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, location: e.target.value }))} 
                          data-testid="input-influencers-location" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Min Followers</Label>
                        <Input 
                          type="number"
                          placeholder="5000" 
                          value={influencersClubFilters.minFollowers} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, minFollowers: e.target.value }))} 
                          data-testid="input-influencers-min-followers" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Followers</Label>
                        <Input 
                          type="number"
                          placeholder="100000" 
                          value={influencersClubFilters.maxFollowers} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, maxFollowers: e.target.value }))} 
                          data-testid="input-influencers-max-followers" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Min Engagement %</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder="2.5" 
                          value={influencersClubFilters.minEngagement} 
                          onChange={(e) => setInfluencersClubFilters(f => ({ ...f, minEngagement: e.target.value }))} 
                          data-testid="input-influencers-min-engagement" 
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="hasEmail" 
                            checked={influencersClubFilters.hasEmail}
                            onCheckedChange={(checked) => setInfluencersClubFilters(f => ({ ...f, hasEmail: checked === true }))}
                            data-testid="checkbox-has-email"
                          />
                          <Label htmlFor="hasEmail" className="flex items-center gap-1 cursor-pointer">
                            <Mail className="h-3 w-3" />Has Email
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="isVerified" 
                            checked={influencersClubFilters.isVerified}
                            onCheckedChange={(checked) => setInfluencersClubFilters(f => ({ ...f, isVerified: checked === true }))}
                            data-testid="checkbox-verified"
                          />
                          <Label htmlFor="isVerified" className="flex items-center gap-1 cursor-pointer">
                            <CheckCircle className="h-3 w-3" />Verified
                          </Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleInfluencersClubSearch} disabled={influencersClubMutation.isPending || !influencersClubStatus?.configured} data-testid="button-influencers-search">
                          {influencersClubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                          Search Influencers
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setInfluencersClubFilters({ keywords: "", bioKeywords: "", location: "", minFollowers: "5000", maxFollowers: "100000", minEngagement: "2.5", hasEmail: false, isVerified: false })}
                          data-testid="button-clear-filters"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    {influencersClubMutation.data?.error && (
                      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{influencersClubMutation.data.error}</div>
                    )}
                    {(influencersClubMutation.data?.creators || influencersClubMutation.data?.data) && (
                      <div className="grid gap-3">
                        {(influencersClubMutation.data.creators || influencersClubMutation.data.data || []).map((creator, idx) => (
                          <div key={creator.handle || creator.username || idx} className="flex items-center justify-between p-4 border rounded-lg hover-elevate" data-testid={`card-influencer-${idx}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={creator.profile_picture} />
                                <AvatarFallback>{(creator.handle || creator.username || '?')[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {creator.full_name || creator.handle || creator.username}
                                  {creator.is_verified && <CheckCircle className="h-4 w-4 text-blue-500" />}
                                </div>
                                <div className="text-sm text-muted-foreground">@{creator.handle || creator.username}</div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                  {creator.follower_count && <span>{formatFollowers(creator.follower_count)} followers</span>}
                                  {creator.engagement_percent && <span>{(creator.engagement_percent * 100).toFixed(1)}% eng.</span>}
                                  {creator.location?.country && <span>{creator.location.city ? `${creator.location.city}, ` : ''}{creator.location.country}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {creator.email && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Mail className="h-3 w-3" />Email
                                </Badge>
                              )}
                              <Button size="sm" onClick={() => handleAddInfluencersClubCreator(creator)} disabled={addCreatorMutation.isPending} data-testid={`button-add-influencer-${idx}`}>
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

          <TabsContent value="development" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Development Document
                </CardTitle>
                <CardDescription>Share documentation, guides, or notes with your development team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. Meta App Review Guide"
                      data-testid="input-doc-title"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                      <SelectTrigger data-testid="select-doc-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="api">API Documentation</SelectItem>
                        <SelectItem value="setup">Setup Guide</SelectItem>
                        <SelectItem value="architecture">Architecture</SelectItem>
                        <SelectItem value="deployment">Deployment</SelectItem>
                        <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    placeholder="Paste or type your development documentation here..."
                    className="min-h-[200px] font-mono text-sm"
                    data-testid="textarea-doc-content"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (!newDocTitle.trim() || !newDocContent.trim()) {
                      toast({ title: "Missing Fields", description: "Title and content are required.", variant: "destructive" });
                      return;
                    }
                    createDocMutation.mutate({ title: newDocTitle, content: newDocContent, category: newDocCategory });
                  }}
                  disabled={createDocMutation.isPending}
                  data-testid="button-create-doc"
                >
                  {createDocMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <FileText className="h-4 w-4 mr-2" />
                  Save Document
                </Button>
              </CardContent>
            </Card>

            {docsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : devDocs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
                  <p className="text-muted-foreground text-center">Add your first development document above to share with your team.</p>
                </CardContent>
              </Card>
            ) : selectedDocId && devDocs.find(d => d.id === selectedDocId) ? (
              (() => {
                const doc = devDocs.find(d => d.id === selectedDocId)!;
                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedDocId(null)}
                            data-testid="button-back-to-docs"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <Badge variant="secondary">{doc.category || 'general'}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingDoc(doc);
                              setEditDocTitle(doc.title);
                              setEditDocContent(doc.content);
                              setEditDocCategory(doc.category || 'general');
                            }}
                            data-testid={`button-edit-doc-${doc.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              deleteDocMutation.mutate(doc.id);
                              setSelectedDocId(null);
                            }}
                            data-testid={`button-delete-doc-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'recently'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none" data-testid={`text-doc-content-${doc.id}`}>
                        <ReactMarkdown>{doc.content}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>{devDocs.length} document{devDocs.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {devDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer hover-elevate"
                        onClick={() => setSelectedDocId(doc.id)}
                        data-testid={`doc-list-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'recently'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{doc.category || 'general'}</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Invite Team Member
                </CardTitle>
                <CardDescription>
                  Invite developers or admins to join your platform. They will be granted the selected role when they sign up with the invited email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="flex-1 min-w-[250px]">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="developer@example.com"
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div className="w-[180px]">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v: "admin" | "superadmin") => setInviteRole(v)}>
                      <SelectTrigger data-testid="select-invite-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
                        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
                        return;
                      }
                      createInvitationMutation.mutate({ email: inviteEmail, role: inviteRole });
                    }}
                    disabled={createInvitationMutation.isPending}
                    data-testid="button-send-invite"
                  >
                    {createInvitationMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Send className="h-4 w-4 mr-2" />
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Invitations</CardTitle>
                <CardDescription>Manage pending and past invitations</CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <UserCheck className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No invitations sent yet. Use the form above to invite team members.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-4 p-4 border rounded-md flex-wrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{inv.email[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium" data-testid={`text-invite-email-${inv.id}`}>{inv.email}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="gap-1">
                                {inv.role === 'superadmin' ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                                {inv.role}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                              </span>
                              {inv.invitedByName && <span>by {inv.invitedByName}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={inv.status === 'accepted' ? 'default' : inv.status === 'pending' ? 'secondary' : 'outline'}
                            data-testid={`badge-invite-status-${inv.id}`}
                          >
                            {inv.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {inv.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                            {inv.status}
                          </Badge>
                          {inv.status === 'pending' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => resendInvitationMutation.mutate(inv.id)}
                                title="Resend invitation"
                                data-testid={`button-resend-invite-${inv.id}`}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => revokeInvitationMutation.mutate(inv.id)}
                                title="Revoke invitation"
                                data-testid={`button-revoke-invite-${inv.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {adminCheck.isSuperAdmin && (
            <TabsContent value="financials" className="space-y-6">
              {financialsLoading || !financials ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">Fixed subscriptions</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${financials.fixedTotalUsd.toFixed(0)}/mo
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {financials.services.filter((s) => s.monthlyUsd === null).length > 0
                            ? "plus usage-based services below"
                            : "all plans priced"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">influencers.club credits</CardTitle>
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {financials.icCredits ? financials.icCredits.available.toFixed(0) : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {financials.icCredits
                            ? `${financials.icCredits.used.toFixed(0)} used to date · $${financials.icCreditUsd.toFixed(2)}/credit · full lookup = 1 credit`
                            : "API key not configured"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-medium">Upload-Post FFmpeg minutes</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {financials.ffmpegConsumption
                            ? `${financials.ffmpegConsumption.remaining_minutes.toFixed(0)} left`
                            : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {financials.ffmpegConsumption
                            ? `of ${financials.ffmpegConsumption.quota_minutes}/mo · ${financials.ffmpegConsumption.plan} plan · resets monthly`
                            : "Consumption API unavailable"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Platform services</CardTitle>
                      <CardDescription>
                        Fixed plans are maintained in code — flag me when a plan changes. Metered costs pull live.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {financials.services.map((service) => (
                          <div key={service.name} className="flex items-start justify-between gap-4 py-3">
                            <div className="min-w-0">
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground">{service.purpose}</p>
                              {service.notes && (
                                <p className="text-xs text-muted-foreground/70">{service.notes}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {service.monthlyUsd === null ? (
                                <Badge variant="secondary">usage-based</Badge>
                              ) : (
                                <span className="font-semibold">${service.monthlyUsd.toFixed(0)}/mo</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
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

        {/* Edit Document Dialog */}
        <Dialog open={editingDoc !== null} onOpenChange={(open) => { if (!open) setEditingDoc(null); }}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Document</DialogTitle>
              <DialogDescription>Update the development document</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input value={editDocTitle} onChange={(e) => setEditDocTitle(e.target.value)} data-testid="input-edit-doc-title" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editDocCategory} onValueChange={setEditDocCategory}>
                    <SelectTrigger data-testid="select-edit-doc-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="api">API Documentation</SelectItem>
                      <SelectItem value="setup">Setup Guide</SelectItem>
                      <SelectItem value="architecture">Architecture</SelectItem>
                      <SelectItem value="deployment">Deployment</SelectItem>
                      <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editDocContent}
                  onChange={(e) => setEditDocContent(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  data-testid="textarea-edit-doc-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDoc(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!editingDoc) return;
                  updateDocMutation.mutate({
                    id: editingDoc.id,
                    data: { title: editDocTitle, content: editDocContent, category: editDocCategory },
                  });
                }}
                disabled={updateDocMutation.isPending}
                data-testid="button-save-doc-edit"
              >
                {updateDocMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
