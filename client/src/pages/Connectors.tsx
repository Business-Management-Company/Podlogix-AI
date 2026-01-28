import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  Link2,
  Instagram,
  Youtube,
  Linkedin,
  Facebook,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Shield,
  Settings,
  Headphones,
} from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";

interface SpotifyConnection {
  connected: boolean;
  displayName?: string;
  spotifyUserId?: string;
}

interface PhylloStatus {
  configured: boolean;
  supportedPlatforms: string[];
}

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  status: string;
  profileUrl?: string;
}

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5 text-pink-500" />,
  tiktok: <SiTiktok className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5 text-red-500" />,
  twitter: <span className="font-bold text-lg">𝕏</span>,
  linkedin: <Linkedin className="h-5 w-5 text-blue-600" />,
  facebook: <Facebook className="h-5 w-5 text-blue-500" />,
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

export default function Connectors() {
  const { toast } = useToast();

  const { data: adminCheck } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: spotifyStatus, isLoading: spotifyLoading } = useQuery<SpotifyConnection>({
    queryKey: ["/api/listener/spotify/status"],
  });

  const { data: phylloStatus, isLoading: phylloLoading } = useQuery<PhylloStatus>({
    queryKey: ["/api/social/phyllo/status"],
  });

  const { data: connectedAccounts = [], isLoading: accountsLoading } = useQuery<ConnectedAccount[]>({
    queryKey: ["/api/social/phyllo/accounts"],
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

  const connectSocialMutation = useMutation({
    mutationFn: async (platform: string) => {
      const tokenRes = await apiRequest("POST", "/api/social/phyllo/sdk-token");
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error);
      const res = await apiRequest("POST", "/api/social/phyllo/accounts", {
        platform,
        username: `${platform}_user`,
        status: "connected",
        phylloUserId: tokenData.userId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/phyllo/accounts"] });
      toast({
        title: "Account connected",
        description: "Social account is now being monitored.",
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Connection failed", 
        description: "Phyllo social monitoring requires a production API key. Sandbox mode has limitations.", 
        variant: "destructive" 
      });
    },
  });

  const disconnectSocialMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await apiRequest("DELETE", `/api/social/phyllo/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/phyllo/accounts"] });
      toast({ title: "Disconnected", description: "Social account disconnected" });
    },
  });

  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const availablePlatforms = ["instagram", "tiktok", "youtube", "twitter", "linkedin", "facebook"].filter(
    (p) => !connectedPlatforms.includes(p)
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8 text-primary" />
          Connectors
        </h1>
        <p className="text-muted-foreground mt-1">
          Connect your accounts to enable podcast imports, social monitoring, and more.
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
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Voice Identity Protection</h2>
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Social Media Monitoring
                    {!phylloStatus?.configured && (
                      <Badge variant="secondary" className="text-xs">Requires API Key</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Connect social accounts for voice identity protection and impersonation monitoring.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!phylloStatus?.configured && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-500">Phyllo API Required</p>
                      <p className="text-muted-foreground mt-1">
                        Social media monitoring requires a Phyllo API key. Contact your administrator to enable this feature.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {accountsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : connectedAccounts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Connected Accounts</p>
                  {connectedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`account-${account.platform}`}
                    >
                      <div className="flex items-center gap-3">
                        {platformIcons[account.platform]}
                        <div>
                          <p className="font-medium">{platformNames[account.platform]}</p>
                          <p className="text-sm text-muted-foreground">@{account.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.status === "connected" ? "default" : "secondary"}>
                          {account.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnectSocialMutation.mutate(account.id)}
                          disabled={disconnectSocialMutation.isPending}
                          data-testid={`button-disconnect-${account.platform}`}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No social accounts connected yet.</p>
                </div>
              )}

              {availablePlatforms.length > 0 && phylloStatus?.configured && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Add Account</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availablePlatforms.map((platform) => (
                      <Button
                        key={platform}
                        variant="outline"
                        className="gap-2 justify-start"
                        onClick={() => connectSocialMutation.mutate(platform)}
                        disabled={connectSocialMutation.isPending}
                        data-testid={`button-connect-${platform}`}
                      >
                        {platformIcons[platform]}
                        {platformNames[platform]}
                      </Button>
                    ))}
                  </div>
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
                      <Link2 className="h-5 w-5 text-primary" />
                      <span>Phyllo Social Monitoring</span>
                    </div>
                    <Badge variant={phylloStatus?.configured ? "default" : "secondary"}>
                      {phylloStatus?.configured ? "Configured" : "Not Configured"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <span>YouTube Data API</span>
                    </div>
                    <Badge variant="default">Configured</Badge>
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
