import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  Link2,
  Instagram,
  Youtube,
  Linkedin,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  Settings,
  Headphones,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Video,
  ExternalLink,
} from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  verified: boolean;
  lastSyncedAt?: string;
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

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: spotifyStatus, isLoading: spotifyLoading } = useQuery<SpotifyConnection>({
    queryKey: ["/api/listener/spotify/status"],
  });

  const { data: phylloStatus } = useQuery<PhylloStatus>({
    queryKey: ["/api/social/phyllo/status"],
  });

  const { data: creatorProfiles = [], isLoading: profilesLoading } = useQuery<CreatorSocialProfile[]>({
    queryKey: ["/api/creator/social-profiles"],
  });

  const isSuperAdmin = adminCheck?.isSuperAdmin === true;

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
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove profile", variant: "destructive" });
    },
  });

  const connectedPlatforms = creatorProfiles.map((p) => p.platform);
  const availablePlatforms = Object.keys(platformNames).filter((p) => !connectedPlatforms.includes(p));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8 text-primary" />
          Connectors
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your accounts to enable podcast imports, showcase your social profiles, and more.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Podcast & Music</h2>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <SiSpotify className="h-6 w-6 text-green-500" />
                  <div>
                    <CardTitle>Spotify</CardTitle>
                    <CardDescription>Import your followed podcasts from Spotify</CardDescription>
                  </div>
                </div>
                {spotifyLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : spotifyStatus?.connected ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {spotifyStatus?.connected ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{spotifyStatus.displayName || "Spotify Account"}</p>
                    <p className="text-xs text-muted-foreground">ID: {spotifyStatus.spotifyUserId}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectSpotifyMutation.mutate()}
                    disabled={disconnectSpotifyMutation.isPending}
                    data-testid="button-disconnect-spotify"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => connectSpotifyMutation.mutate()}
                  disabled={connectSpotifyMutation.isPending}
                  className="gap-2"
                  data-testid="button-connect-spotify"
                >
                  {connectSpotifyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SiSpotify className="h-4 w-4" />
                  )}
                  Connect Spotify
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Your Social Profiles</h2>
        </div>

        {availablePlatforms.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Add Social Profiles</CardTitle>
                <CardDescription>
                  Click a platform to connect your profile and showcase it on your creator page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {availablePlatforms.map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 hover-elevate"
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setProfileUrl("");
                        setDialogOpen(true);
                      }}
                      data-testid={`button-add-${platform}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {platformIcons[platform]}
                      </div>
                      <span className="text-sm font-medium">{platformNames[platform]}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Social Profile</DialogTitle>
                  <DialogDescription>
                    Add your social media profile to showcase on your creator page. YouTube profiles will automatically fetch your channel stats.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                  
                  {selectedPlatform && (
                    <div className="space-y-2">
                      <Label>Profile URL</Label>
                      <Input
                        placeholder={platformPlaceholders[selectedPlatform]}
                        value={profileUrl}
                        onChange={(e) => setProfileUrl(e.target.value)}
                        data-testid="input-profile-url"
                      />
                      {selectedPlatform === "youtube" && (
                        <p className="text-xs text-muted-foreground">
                          We'll automatically fetch your subscriber count, views, and video count using the YouTube API.
                        </p>
                      )}
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
                    Add Profile
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Connected Social Profiles</CardTitle>
              <CardDescription>
                Showcase your social media presence on your creator page. YouTube profiles include real-time analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profilesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : creatorProfiles.length > 0 ? (
                <div className="space-y-4">
                  {creatorProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                      data-testid={`profile-${profile.platform}`}
                    >
                      <div className="flex items-start gap-4">
                        {profile.profilePictureUrl ? (
                          <img
                            src={profile.profilePictureUrl}
                            alt={profile.displayName || profile.username || "Profile"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            {platformIcons[profile.platform]}
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {platformIcons[profile.platform]}
                            <span className="font-medium">
                              {profile.displayName || profile.username || platformNames[profile.platform]}
                            </span>
                            {profile.verified && (
                              <Badge variant="default" className="gap-1 text-xs">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          
                          {profile.platform === "youtube" && profile.subscriberCount !== undefined && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {formatNumber(profile.subscriberCount)} subscribers
                              </span>
                              <span className="flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                {formatNumber(profile.videoCount)} videos
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(profile.viewCount)} views
                              </span>
                            </div>
                          )}
                          
                          {profile.username && (
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                          )}
                          
                          {profile.lastSyncedAt && (
                            <p className="text-xs text-muted-foreground">
                              Last synced: {new Date(profile.lastSyncedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(profile.profileUrl, "_blank")}
                          data-testid={`button-view-${profile.platform}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {profile.platform === "youtube" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => syncProfileMutation.mutate(profile.id)}
                            disabled={syncProfileMutation.isPending}
                            data-testid={`button-sync-${profile.platform}`}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncProfileMutation.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProfileMutation.mutate(profile.id)}
                          disabled={deleteProfileMutation.isPending}
                          data-testid={`button-delete-${profile.platform}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No social profiles added yet</p>
                  <p className="text-sm mt-1">Add your YouTube, Instagram, TikTok and other social profiles to showcase on your creator page.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Platform Configuration</h2>
            <Badge variant="outline" className="text-xs">Super Admin</Badge>
          </div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>API Configuration Status</CardTitle>
                <CardDescription>Overview of configured external services for the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <SiSpotify className="h-5 w-5 text-green-500" />
                      <span>Spotify API</span>
                    </div>
                    <Badge variant="default">Configured</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <span>YouTube Data API</span>
                    </div>
                    <Badge variant="default">Configured</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span>Phyllo Social Monitoring</span>
                    </div>
                    <Badge variant={phylloStatus?.configured ? "default" : "secondary"}>
                      {phylloStatus?.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
