import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BuzzsproutConnect } from "@/components/settings/BuzzsproutConnect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Link2,
  Instagram,
  Youtube,
  Linkedin,
  CheckCircle,
  Loader2,
  Settings,
  Database,
  Shield,
  Mail,
  ExternalLink,
  RefreshCw,
  Trash2,
  Calendar,
} from "lucide-react";
import { SiTiktok, SiSpotify, SiGithub } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpotifyConnection {
  connected: boolean;
  displayName?: string;
  spotifyUserId?: string;
}

interface GoogleCalendarConnection {
  connected: boolean;
  email?: string;
}

interface CreatorSocialProfile {
  id: string;
  userId: string;
  platform: string;
  profileUrl: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  youtubeChannelId?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: number;
  instagramAccountId?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  verified: boolean;
  lastSyncedAt?: string;
}

interface InstagramStatus {
  configured: boolean;
}

interface LinkedInStatus {
  configured: boolean;
}

interface FacebookStatus {
  configured: boolean;
}

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

interface PhylloStatus {
  configured: boolean;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5 text-pink-500" />,
  tiktok: <SiTiktok className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5 text-red-500" />,
  twitter: <span className="font-bold text-lg">𝕏</span>,
  linkedin: <Linkedin className="h-5 w-5 text-blue-600" />,
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
};

const platformPlaceholders: Record<string, string> = {
  youtube: "https://youtube.com/@yourchannel or channel URL",
  instagram: "https://instagram.com/yourusername",
  tiktok: "https://tiktok.com/@yourusername",
  twitter: "https://twitter.com/yourusername",
  linkedin: "https://linkedin.com/in/yourusername",
};

function formatNumber(num: number | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function Connectors() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [profileUrl, setProfileUrl] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [managePlatform, setManagePlatform] = useState<string>("");

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: spotifyStatus, isLoading: spotifyLoading } = useQuery<SpotifyConnection>({
    queryKey: ["/api/listener/spotify/status"],
  });

  const { data: googleCalendarStatus, isLoading: googleCalendarLoading } = useQuery<GoogleCalendarConnection>({
    queryKey: ["/api/calendar/google/status"],
  });

  const { data: phylloStatus } = useQuery<PhylloStatus>({
    queryKey: ["/api/social/phyllo/status"],
  });

  const { data: instagramStatus } = useQuery<InstagramStatus>({
    queryKey: ["/api/creator/instagram/status"],
  });

  const { data: linkedinStatus } = useQuery<LinkedInStatus>({
    queryKey: ["/api/creator/linkedin/status"],
  });

  const { data: facebookStatus } = useQuery<FacebookStatus>({
    queryKey: ["/api/creator/facebook/status"],
  });

  const { data: creatorProfiles = [], isLoading: profilesLoading } = useQuery<CreatorSocialProfile[]>({
    queryKey: ["/api/creator/social-profiles"],
  });

  const isSuperAdmin = adminCheck?.isSuperAdmin === true;
  const hasInstagramConnected = creatorProfiles.some(p => p.platform === 'instagram' && p.instagramAccountId);
  const hasLinkedInConnected = creatorProfiles.some(p => p.platform === 'linkedin');
  const hasFacebookConnected = creatorProfiles.some(p => p.platform === 'facebook');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('instagram_connected') === 'true') {
      toast({ title: "Instagram connected!", description: "Your Instagram profile has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, '', '/connectors');
    } else if (params.get('instagram_error')) {
      toast({ title: "Instagram connection failed", description: "Could not connect your Instagram account", variant: "destructive" });
      window.history.replaceState({}, '', '/connectors');
    }
    
    if (params.get('linkedin_connected') === 'true') {
      toast({ title: "LinkedIn connected!", description: "Your LinkedIn profile has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, '', '/connectors');
    } else if (params.get('linkedin_error')) {
      toast({ title: "LinkedIn connection failed", description: "Could not connect your LinkedIn account", variant: "destructive" });
      window.history.replaceState({}, '', '/connectors');
    }
    
    if (params.get('facebook_connected') === 'true') {
      toast({ title: "Facebook connected!", description: "Your Facebook Page has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, '', '/connectors');
    } else if (params.get('facebook_error')) {
      const error = params.get('facebook_error');
      const errorMessages: Record<string, string> = {
        'no_pages': 'No Facebook Pages found. You need a Facebook Page to connect.',
        'auth_denied': 'Access was denied.',
        'token_exchange_failed': 'Could not exchange authorization code.',
      };
      toast({ title: "Facebook connection failed", description: (error && errorMessages[error]) || "Could not connect your Facebook Page", variant: "destructive" });
      window.history.replaceState({}, '', '/connectors');
    }

    if (params.get('google_calendar_connected') === 'true') {
      toast({ title: "Google Calendar connected!", description: "Your calendar has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/google/status"] });
      window.history.replaceState({}, '', '/connectors');
    } else if (params.get('google_calendar_error')) {
      toast({ title: "Google Calendar connection failed", description: "Could not connect your Google Calendar", variant: "destructive" });
      window.history.replaceState({}, '', '/connectors');
    }
  }, [toast]);

  const connectSpotifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/listener/spotify/auth");
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect to Spotify", variant: "destructive" });
    },
  });

  const disconnectSpotifyMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/listener/spotify/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listener/spotify/status"] });
      toast({ title: "Disconnected", description: "Spotify has been disconnected" });
      setManageDialogOpen(false);
    },
  });

  const connectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/calendar/google/auth");
      const data = await res.json();
      return data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect to Google Calendar", variant: "destructive" });
    },
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/calendar/google/disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/google/status"] });
      toast({ title: "Disconnected", description: "Google Calendar has been disconnected" });
      setManageDialogOpen(false);
    },
  });

  const connectInstagramMutation = useMutation({
    mutationFn: async () => {
      // Add timestamp to prevent browser caching
      const res = await apiRequest("GET", `/api/creator/instagram/auth?t=${Date.now()}`);
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect to Instagram", variant: "destructive" });
    },
  });

  const syncInstagramMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/creator/instagram/sync/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      toast({ title: "Synced", description: "Instagram analytics updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync Instagram", variant: "destructive" });
    },
  });

  const connectLinkedInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/creator/linkedin/auth");
      const data = await res.json();
      return data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect to LinkedIn", variant: "destructive" });
    },
  });

  const connectFacebookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/creator/facebook/auth?t=${Date.now()}`);
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to connect to Facebook", variant: "destructive" });
    },
  });

  const addProfileMutation = useMutation({
    mutationFn: async ({ platform, profileUrl }: { platform: string; profileUrl: string }) => {
      const res = await apiRequest("POST", "/api/creator/social-profiles", { platform, profileUrl });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      setDialogOpen(false);
      setSelectedPlatform("");
      setProfileUrl("");
      toast({ title: "Profile Added", description: "Your social profile has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/creator/social-profiles/${id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      toast({ title: "Synced", description: "Profile analytics updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to sync profile", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/creator/social-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      toast({ title: "Removed", description: "Social profile has been removed." });
      setManageDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove profile", variant: "destructive" });
    },
  });

  const connectedPlatforms = creatorProfiles.map((p) => p.platform);
  const urlBasedPlatforms = ['youtube', 'tiktok', 'twitter'];
  const availablePlatforms = urlBasedPlatforms.filter((p) => !connectedPlatforms.includes(p));

  const getProfileByPlatform = (platform: string) => creatorProfiles.find(p => p.platform === platform);

  const handleManage = (platform: string) => {
    setManagePlatform(platform);
    setManageDialogOpen(true);
  };

  const managedProfile = managePlatform ? getProfileByPlatform(managePlatform) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Link2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
      </div>

      {/* Podcast Hosting Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Podcast Hosting</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your podcast host to import episodes, sync analytics, and manage your shows from Podlogix.
        </p>
        <BuzzsproutConnect />
      </section>

      {/* Podlogix Managed Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Podlogix managed</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These are built-in integrations that work automatically. They're configured for your app.
        </p>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Podlogix Database</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">PostgreSQL</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-muted-foreground">Active</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Podlogix Auth</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">Authentication</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-muted-foreground">Active</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Resend</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">Email Service</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-muted-foreground">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Connectors Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Connectors</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your accounts to import podcasts, showcase social profiles, and more.
        </p>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Description</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Connection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* GitHub - always show as active (Replit managed) */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <SiGithub className="h-5 w-5" />
                    <span className="font-medium">GitHub</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Access GitHub repositories and organizations
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                </td>
              </tr>

              {/* Spotify */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <SiSpotify className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Spotify</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Import your followed podcasts from Spotify
                </td>
                <td className="px-4 py-3 text-right">
                  {spotifyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : spotifyStatus?.connected ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('spotify')}
                        data-testid="button-manage-spotify"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connectSpotifyMutation.mutate()}
                      disabled={connectSpotifyMutation.isPending}
                      data-testid="button-connect-spotify"
                    >
                      {connectSpotifyMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="h-3 w-3 mr-1" />
                      )}
                      Sign in
                    </Button>
                  )}
                </td>
              </tr>

              {/* Google Calendar */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Google Calendar</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  See upcoming calendar events on your Today dashboard
                </td>
                <td className="px-4 py-3 text-right">
                  {googleCalendarLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : googleCalendarStatus?.connected ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManage('google_calendar')}
                        data-testid="button-manage-google-calendar"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => connectGoogleCalendarMutation.mutate()}
                      disabled={connectGoogleCalendarMutation.isPending}
                      data-testid="button-connect-google-calendar"
                    >
                      {connectGoogleCalendarMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="h-3 w-3 mr-1" />
                      )}
                      Sign in
                    </Button>
                  )}
                </td>
              </tr>

              {/* YouTube */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Youtube className="h-5 w-5 text-red-500" />
                    <span className="font-medium">YouTube</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Showcase your YouTube channel with real analytics
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : connectedPlatforms.includes('youtube') ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('youtube')}
                        data-testid="button-manage-youtube"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedPlatform('youtube');
                        setProfileUrl('');
                        setDialogOpen(true);
                      }}
                      data-testid="button-connect-youtube"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Sign in
                    </Button>
                  )}
                </td>
              </tr>

              {/* Instagram */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">Instagram</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Display follower count and profile on your creator page
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : hasInstagramConnected ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('instagram')}
                        data-testid="button-manage-instagram"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : instagramStatus?.configured ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => connectInstagramMutation.mutate()}
                      disabled={connectInstagramMutation.isPending}
                      data-testid="button-connect-instagram"
                    >
                      {connectInstagramMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="h-3 w-3 mr-1" />
                      )}
                      Sign in
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </td>
              </tr>

              {/* TikTok */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <SiTiktok className="h-5 w-5" />
                    <span className="font-medium">TikTok</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Showcase your TikTok profile on your creator page
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : connectedPlatforms.includes('tiktok') ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('tiktok')}
                        data-testid="button-manage-tiktok"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedPlatform('tiktok');
                        setProfileUrl('');
                        setDialogOpen(true);
                      }}
                      data-testid="button-connect-tiktok"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Sign in
                    </Button>
                  )}
                </td>
              </tr>

              {/* X (Twitter) */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">𝕏</span>
                    <span className="font-medium">X (Twitter)</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Showcase your X profile on your creator page
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : connectedPlatforms.includes('twitter') ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('twitter')}
                        data-testid="button-manage-twitter"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedPlatform('twitter');
                        setProfileUrl('');
                        setDialogOpen(true);
                      }}
                      data-testid="button-connect-twitter"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Sign in
                    </Button>
                  )}
                </td>
              </tr>

              {/* LinkedIn */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">LinkedIn</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Connect your LinkedIn profile via OAuth
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : hasLinkedInConnected ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('linkedin')}
                        data-testid="button-manage-linkedin"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : linkedinStatus?.configured ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => connectLinkedInMutation.mutate()}
                      disabled={connectLinkedInMutation.isPending}
                      data-testid="button-connect-linkedin"
                    >
                      {connectLinkedInMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="h-3 w-3 mr-1" />
                      )}
                      Sign in
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </td>
              </tr>

              {/* Facebook */}
              <tr className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="font-medium">Facebook Page</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  Connect your Facebook Page via OAuth
                </td>
                <td className="px-4 py-3 text-right">
                  {profilesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : hasFacebookConnected ? (
                    <div className="flex items-center justify-end gap-2">
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleManage('facebook')}
                        data-testid="button-manage-facebook"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  ) : facebookStatus?.configured ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => connectFacebookMutation.mutate()}
                      disabled={connectFacebookMutation.isPending}
                      data-testid="button-connect-facebook"
                    >
                      {connectFacebookMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="h-3 w-3 mr-1" />
                      )}
                      Sign in
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Super Admin Section */}
      {isSuperAdmin && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Platform Configuration</h2>
            <Badge variant="outline" className="text-xs">Super Admin</Badge>
          </div>
          
          <div className="border rounded-lg overflow-hidden border-dashed">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Service</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <SiSpotify className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Spotify API</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="default">Configured</Badge>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <span className="font-medium">YouTube Data API</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant="default">Configured</Badge>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Instagram className="h-5 w-5 text-pink-500" />
                      <span className="font-medium">Meta Graph API</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={instagramStatus?.configured ? "default" : "secondary"}>
                      {instagramStatus?.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">LinkedIn OAuth</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={linkedinStatus?.configured ? "default" : "secondary"}>
                      {linkedinStatus?.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">Phyllo Social Monitoring</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={phylloStatus?.configured ? "default" : "secondary"}>
                      {phylloStatus?.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add Profile Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && platformIcons[selectedPlatform]}
              Add {selectedPlatform ? platformNames[selectedPlatform] : 'Social'} Profile
            </DialogTitle>
            <DialogDescription>
              Enter your profile URL to add it to your creator page.
              {selectedPlatform === 'youtube' && ' We\'ll automatically fetch your channel stats.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {!selectedPlatform && (
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        <div className="flex items-center gap-2">
                          {platformIcons[platform]}
                          {platformNames[platform]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedPlatform && (
              <div className="space-y-2">
                <Label>Profile URL</Label>
                <Input
                  placeholder={platformPlaceholders[selectedPlatform]}
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  data-testid="input-profile-url"
                />
              </div>
            )}
            
            <Button
              className="w-full"
              onClick={() => addProfileMutation.mutate({ platform: selectedPlatform, profileUrl })}
              disabled={!selectedPlatform || !profileUrl || addProfileMutation.isPending}
              data-testid="button-submit-profile"
            >
              {addProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Connect Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Profile Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {managePlatform === 'spotify' ? (
                <SiSpotify className="h-5 w-5 text-green-500" />
              ) : managePlatform === 'google_calendar' ? (
                <Calendar className="h-5 w-5 text-blue-500" />
              ) : managePlatform && platformIcons[managePlatform]}
              Manage {managePlatform === 'spotify' ? 'Spotify' : managePlatform === 'google_calendar' ? 'Google Calendar' : managePlatform ? platformNames[managePlatform] : ''} Connection
            </DialogTitle>
            <DialogDescription>
              View and manage your connected account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {managePlatform === 'spotify' && spotifyStatus?.connected && (
              <>
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium">{spotifyStatus.displayName || "Spotify Account"}</p>
                  <p className="text-sm text-muted-foreground">ID: {spotifyStatus.spotifyUserId}</p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => disconnectSpotifyMutation.mutate()}
                  disabled={disconnectSpotifyMutation.isPending}
                  data-testid="button-disconnect-spotify"
                >
                  {disconnectSpotifyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Disconnect Spotify
                </Button>
              </>
            )}

            {managePlatform === 'google_calendar' && googleCalendarStatus?.connected && (
              <>
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium">{googleCalendarStatus.email || "Google Account"}</p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => disconnectGoogleCalendarMutation.mutate()}
                  disabled={disconnectGoogleCalendarMutation.isPending}
                  data-testid="button-disconnect-google-calendar"
                >
                  {disconnectGoogleCalendarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Disconnect Google Calendar
                </Button>
              </>
            )}

            {managePlatform && managePlatform !== 'spotify' && managePlatform !== 'google_calendar' && managedProfile && (
              <>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    {managedProfile.profilePictureUrl ? (
                      <img
                        src={managedProfile.profilePictureUrl}
                        alt={managedProfile.displayName || "Profile"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        {platformIcons[managedProfile.platform]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {managedProfile.displayName || managedProfile.username || platformNames[managedProfile.platform]}
                      </p>
                      {managedProfile.username && (
                        <p className="text-sm text-muted-foreground">@{managedProfile.username}</p>
                      )}
                    </div>
                  </div>
                  
                  {managedProfile.platform === "youtube" && managedProfile.subscriberCount !== undefined && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>{formatNumber(managedProfile.subscriberCount)} subscribers</span>
                      <span>{formatNumber(managedProfile.videoCount)} videos</span>
                      <span>{formatNumber(managedProfile.viewCount)} views</span>
                    </div>
                  )}
                  
                  {managedProfile.platform === "instagram" && managedProfile.followersCount !== undefined && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>{formatNumber(managedProfile.followersCount)} followers</span>
                      <span>{formatNumber(managedProfile.mediaCount)} posts</span>
                    </div>
                  )}
                  
                  {managedProfile.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last synced: {new Date(managedProfile.lastSyncedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(managedProfile.profileUrl, "_blank")}
                    data-testid="button-view-profile"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Profile
                  </Button>
                  
                  {(managedProfile.platform === 'youtube' || managedProfile.platform === 'instagram') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (managedProfile.platform === 'instagram') {
                          syncInstagramMutation.mutate(managedProfile.id);
                        } else {
                          syncProfileMutation.mutate(managedProfile.id);
                        }
                      }}
                      disabled={syncProfileMutation.isPending || syncInstagramMutation.isPending}
                      data-testid="button-sync-profile"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${(syncProfileMutation.isPending || syncInstagramMutation.isPending) ? "animate-spin" : ""}`} />
                      Sync
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => deleteProfileMutation.mutate(managedProfile.id)}
                  disabled={deleteProfileMutation.isPending}
                  data-testid="button-disconnect-profile"
                >
                  {deleteProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Disconnect {platformNames[managedProfile.platform]}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
