import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Settings,
  Shield,
  Database,
  Zap,
  Bell,
  Globe,
  Clock,
  BarChart3,
  Layers,
  Key,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HardDrive,
  Server,
  RefreshCcw
} from "lucide-react";

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: string;
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  totalIdentityAssets: number;
  verifiedIdentities: number;
  totalSubscriptions: number;
}

interface SystemHealth {
  database: "healthy" | "degraded" | "down";
  api: "healthy" | "degraded" | "down";
  storage: "healthy" | "degraded" | "down";
  blockchain: "healthy" | "degraded" | "down";
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: React.ElementType; 
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {trend === "up" && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                <span className={`text-xs ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthIndicator({ status }: { status: "healthy" | "degraded" | "down" }) {
  const colors = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500"
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${colors[status]} animate-pulse`} />
      <span className="text-sm capitalize">{status}</span>
    </div>
  );
}

export default function SaaSAdminPortal() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: adminCheck, isLoading: isLoadingAdmin } = useQuery<AdminCheck>({
    queryKey: ["/api/admin/check"],
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
    enabled: adminCheck?.isSuperAdmin,
  });

  const systemHealth: SystemHealth = {
    database: "healthy",
    api: "healthy",
    storage: "healthy",
    blockchain: "healthy"
  };

  const featureFlags = [
    { id: "voice_protection", name: "Voice Protection", description: "Enable blockchain-based voice certification", enabled: true },
    { id: "ai_briefings", name: "AI Briefings", description: "Enable AI-generated podcast summaries", enabled: true },
    { id: "social_hub", name: "Social Hub", description: "Enable multi-platform social posting", enabled: true },
    { id: "influencer_discovery", name: "Influencer Discovery", description: "Enable influencer search and discovery", enabled: true },
    { id: "spotify_integration", name: "Spotify Integration", description: "Enable Spotify podcast imports", enabled: true },
    { id: "email_hub", name: "Email Hub", description: "Enable email management features", enabled: true },
  ];

  const apiIntegrations = [
    { name: "OpenAI", status: "connected", usage: "15,234 tokens", icon: Zap },
    { name: "Polygon RPC", status: "connected", usage: "128 calls", icon: Database },
    { name: "Spotify API", status: "connected", usage: "52 requests", icon: Globe },
    { name: "Influencers.club", status: "connected", usage: "89 credits", icon: Users },
    { name: "YouTube Data API", status: "connected", usage: "245 units", icon: BarChart3 },
    { name: "Upload-Post", status: "connected", usage: "34 posts", icon: Layers },
  ];

  if (isLoadingAdmin) {
    return (
      <div className="min-h-screen p-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!adminCheck?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This portal is only accessible to SaaS platform owners (Super Administrators).
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SaaS Owner Portal</h1>
            <p className="text-muted-foreground">Platform-wide management and monitoring</p>
          </div>
          <Badge className="ml-auto" variant="secondary">Super Admin</Badge>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <Activity className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="features" data-testid="tab-features">
            <Layers className="h-4 w-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Key className="h-4 w-4 mr-2" />
            API Integrations
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard 
              title="Total Users" 
              value={isLoadingStats ? "..." : formatNumber(stats?.totalUsers || 0)}
              change="+12% this month"
              trend="up"
              icon={Users}
            />
            <StatCard 
              title="Active Users" 
              value={isLoadingStats ? "..." : formatNumber(stats?.activeUsers || 0)}
              change="+8% this week"
              trend="up"
              icon={Activity}
            />
            <StatCard 
              title="Voice Certificates" 
              value={isLoadingStats ? "..." : formatNumber(stats?.verifiedIdentities || 0)}
              change="+23% this month"
              trend="up"
              icon={Shield}
            />
            <StatCard 
              title="Subscriptions" 
              value={isLoadingStats ? "..." : formatNumber(stats?.totalSubscriptions || 0)}
              change="+5% this month"
              trend="up"
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest platform events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: "New user registration", time: "2 minutes ago", type: "user" },
                    { action: "Voice certificate minted", time: "15 minutes ago", type: "certificate" },
                    { action: "Podcast subscription created", time: "1 hour ago", type: "subscription" },
                    { action: "Creator profile published", time: "3 hours ago", type: "profile" },
                    { action: "AI briefing generated", time: "4 hours ago", type: "ai" },
                  ].map((event, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm">{event.action}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Monthly recurring revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-primary">$0</p>
                  <p className="text-sm text-muted-foreground mt-2">MRR (No paid plans active)</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-semibold">0</p>
                    <p className="text-xs text-muted-foreground">Paid Subscribers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-muted-foreground">Free Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Database className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Database</p>
                    <HealthIndicator status={systemHealth.database} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Server className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">API Server</p>
                    <HealthIndicator status={systemHealth.api} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <HardDrive className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Object Storage</p>
                    <HealthIndicator status={systemHealth.storage} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Cpu className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Polygon RPC</p>
                    <HealthIndicator status={systemHealth.blockchain} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Metrics</CardTitle>
                  <CardDescription>Real-time performance monitoring</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Response Time</span>
                    <span className="font-medium">45ms</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/4 bg-green-500 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Database Connections</span>
                    <span className="font-medium">12 / 100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[12%] bg-green-500 rounded-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Storage Used</span>
                    <span className="font-medium">2.4 GB / 10 GB</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/4 bg-green-500 rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable platform features globally</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between py-4 border-b last:border-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{flag.name}</p>
                        {flag.enabled && (
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch 
                      checked={flag.enabled} 
                      onCheckedChange={() => {
                        toast({
                          title: "Feature flag updated",
                          description: `${flag.name} has been ${flag.enabled ? 'disabled' : 'enabled'}.`,
                        });
                      }}
                      data-testid={`switch-${flag.id}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apiIntegrations.map((integration) => (
              <Card key={integration.name}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <integration.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{integration.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-500 capitalize">{integration.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage this month</span>
                      <span className="font-medium">{integration.usage}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys Configuration
              </CardTitle>
              <CardDescription>Manage your API keys and secrets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "OPENAI_API_KEY", status: "configured" },
                  { name: "POLYGON_RPC_URL", status: "configured" },
                  { name: "SPOTIFY_CLIENT_ID", status: "configured" },
                  { name: "INFLUENCERS_CLUB_API_KEY", status: "configured" },
                  { name: "YOUTUBE_API_KEY", status: "configured" },
                  { name: "UPLOAD_POST_API_KEY", status: "configured" },
                ].map((key) => (
                  <div key={key.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <code className="text-sm font-mono">{key.name}</code>
                    </div>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure global platform behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input id="platform-name" defaultValue="Podlogix" data-testid="input-platform-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" defaultValue="support@podlogix.co" data-testid="input-support-email" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access for non-admin users</p>
                  </div>
                  <Switch data-testid="switch-maintenance" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">User Registration</p>
                    <p className="text-sm text-muted-foreground">Allow new user signups</p>
                  </div>
                  <Switch defaultChecked data-testid="switch-registration" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure platform notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4" />
                    <div>
                      <p className="font-medium">New User Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified of new signups</p>
                    </div>
                  </div>
                  <Switch defaultChecked data-testid="switch-user-alerts" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Error Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified of system errors</p>
                    </div>
                  </div>
                  <Switch defaultChecked data-testid="switch-error-alerts" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Revenue Alerts</p>
                      <p className="text-sm text-muted-foreground">Get notified of new payments</p>
                    </div>
                  </div>
                  <Switch data-testid="switch-revenue-alerts" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
