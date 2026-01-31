import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, AlertTriangle, Check, ExternalLink, Shield, RefreshCw } from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiLinkedin, SiFacebook } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ConnectedSocialAccount, SocialMonitoringAlert } from "@shared/schema";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <SiInstagram className="h-4 w-4" />,
  tiktok: <SiTiktok className="h-4 w-4" />,
  youtube: <SiYoutube className="h-4 w-4" />,
  twitter: <FaXTwitter className="h-4 w-4" />,
  linkedin: <SiLinkedin className="h-4 w-4" />,
  facebook: <SiFacebook className="h-4 w-4" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-r from-blue-500 to-blue-700",
  tiktok: "bg-black",
  youtube: "bg-red-600",
  twitter: "bg-black",
  linkedin: "bg-blue-700",
  facebook: "bg-blue-600",
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
};

interface PhylloStatus {
  configured: boolean;
  supportedPlatforms: { id: string; name: string; displayName: string }[];
}

export default function SocialMonitoring() {
  const { toast } = useToast();
  const [showPlatformSelect, setShowPlatformSelect] = useState(false);

  const { data: phylloStatus, isLoading: statusLoading } = useQuery<PhylloStatus>({
    queryKey: ["/api/social/phyllo/status"],
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<ConnectedSocialAccount[]>({
    queryKey: ["/api/social/phyllo/accounts"],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<SocialMonitoringAlert[]>({
    queryKey: ["/api/social/phyllo/alerts"],
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await apiRequest("DELETE", `/api/social/phyllo/accounts/${accountId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/phyllo/accounts"] });
      toast({ title: "Account disconnected", description: "Social account has been removed from monitoring." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect account. Please try again.", variant: "destructive" });
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await apiRequest("PATCH", `/api/social/phyllo/alerts/${alertId}/resolve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/phyllo/alerts"] });
      toast({ title: "Alert resolved", description: "The alert has been marked as resolved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resolve alert. Please try again.", variant: "destructive" });
    },
  });

  const connectAccountMutation = useMutation({
    mutationFn: async (platform: string) => {
      if (!phylloStatus?.configured) {
        const saveRes = await apiRequest("POST", "/api/social/phyllo/accounts", {
          platform,
          username: `demo_${platform}_user`,
          status: "connected",
        });
        return saveRes.json();
      }

      const tokenRes = await apiRequest("POST", "/api/social/phyllo/sdk-token");
      const tokenData = await tokenRes.json();
      
      if (tokenData.error) {
        throw new Error(tokenData.error);
      }

      const saveRes = await apiRequest("POST", "/api/social/phyllo/accounts", {
        platform,
        username: `demo_${platform}_user`,
        status: "connected",
        phylloUserId: tokenData.userId,
      });
      return saveRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/phyllo/accounts"] });
      setShowPlatformSelect(false);
      toast({ 
        title: "Account connected", 
        description: phylloStatus?.configured 
          ? "Social account is now being monitored for impersonation." 
          : "Demo account added. Connect Phyllo API for real monitoring."
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Connection failed", 
        description: error.message || "Unable to connect social account. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const isLoading = statusLoading || accountsLoading || alertsLoading;
  const unresolvedAlerts = alerts.filter(a => !a.isResolved);
  const connectedPlatforms = accounts.map(a => a.platform);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Social Media Monitoring</CardTitle>
            </div>
            {phylloStatus?.configured ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Check className="h-3 w-3 mr-1" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Demo Mode
              </Badge>
            )}
          </div>
          <CardDescription>
            {phylloStatus?.configured 
              ? "Connect your social accounts to monitor for potential impersonation and protect your voice identity."
              : "Demo mode: Connect placeholder accounts to preview the monitoring experience. Configure Phyllo API keys for real monitoring."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No social accounts connected yet.</p>
              <p className="text-xs mt-1">Connect your accounts to enable impersonation monitoring.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {accounts.map((account) => (
                <div 
                  key={account.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`account-${account.platform}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-white ${PLATFORM_COLORS[account.platform] || 'bg-gray-600'}`}>
                      {PLATFORM_ICONS[account.platform] || <Shield className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{PLATFORM_NAMES[account.platform] || account.platform}</p>
                      <p className="text-sm text-muted-foreground">@{account.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={account.status === 'connected' ? 'default' : 'secondary'}>
                      {account.status}
                    </Badge>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => disconnectMutation.mutate(account.id)}
                      disabled={disconnectMutation.isPending}
                      data-testid={`disconnect-${account.platform}`}
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showPlatformSelect ? (
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Select a platform to connect:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(phylloStatus?.supportedPlatforms || []).map((platform) => {
                  const isConnected = connectedPlatforms.includes(platform.name);
                  return (
                    <Button
                      key={platform.id}
                      variant={isConnected ? "secondary" : "outline"}
                      className="justify-start gap-2"
                      disabled={isConnected || connectAccountMutation.isPending}
                      onClick={() => connectAccountMutation.mutate(platform.name)}
                      data-testid={`connect-${platform.name}`}
                    >
                      <div className={`p-1 rounded text-white ${PLATFORM_COLORS[platform.name] || 'bg-gray-600'}`}>
                        {PLATFORM_ICONS[platform.name] || <Shield className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{platform.displayName}</span>
                      {isConnected && <Check className="h-3 w-3 ml-auto" />}
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPlatformSelect(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => setShowPlatformSelect(true)} 
              className="w-full"
              data-testid="button-add-platform"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Social Account
            </Button>
          )}
        </CardContent>
      </Card>

      {unresolvedAlerts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Monitoring Alerts</CardTitle>
              <Badge variant="destructive" className="ml-auto">{unresolvedAlerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {unresolvedAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 space-y-2"
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                  <Badge variant={
                    alert.severity === 'high' ? 'destructive' : 
                    alert.severity === 'medium' ? 'default' : 'secondary'
                  }>
                    {alert.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  {alert.contentUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={alert.contentUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Content
                      </a>
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => resolveAlertMutation.mutate(alert.id)}
                    disabled={resolveAlertMutation.isPending}
                    data-testid={`resolve-alert-${alert.id}`}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {accounts.length > 0 && unresolvedAlerts.length === 0 && (
        <Card className="border-green-500/50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-600">All Clear</p>
              <p className="text-sm text-muted-foreground">No impersonation alerts detected. Your accounts are being monitored.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
