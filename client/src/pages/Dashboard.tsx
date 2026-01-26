import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Mic, 
  User, 
  Rss, 
  Radio, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Settings,
  ExternalLink,
  Shield,
  Camera,
  Eye,
  Search,
  Instagram,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { SiFacebook } from "react-icons/si";

interface DashboardData {
  profile: {
    id: string;
    slug: string;
    displayName: string;
    isPublished: boolean;
  } | null;
  podcasts: Array<{
    id: string;
    title: string;
  }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

interface MetaStatus {
  configured: boolean;
  connected: boolean;
  instagramAccount: { id: string; username: string } | null;
  facebookPages: { id: string; name: string }[];
}

interface ImpersonatorAlert {
  id: string;
  platform: 'instagram' | 'facebook';
  suspiciousAccountId: string;
  suspiciousAccountName: string;
  suspiciousAccountUrl?: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  detectedAt: string;
  mediaUrl?: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [impersonatorAlerts, setImpersonatorAlerts] = useState<ImpersonatorAlert[]>([]);

  const { data: dashboardData, isLoading: dataLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
  });

  const { data: metaStatus } = useQuery<MetaStatus>({
    queryKey: ['/api/social/meta/status'],
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/social/scan-impersonators', { 
        userName: user?.firstName || 'Unknown', 
        userBio: dashboardData?.profile?.displayName 
      });
      return res.json();
    },
    onSuccess: (data: { alerts: ImpersonatorAlert[] }) => {
      setImpersonatorAlerts(data.alerts);
      if (data.alerts.length > 0) {
        toast({ title: "Potential issues found", description: `${data.alerts.length} potential impersonator(s) detected`, variant: "destructive" });
      } else {
        toast({ title: "Scan complete", description: "No potential impersonators detected" });
      }
    },
    onError: () => {
      toast({ title: "Scan failed", description: "Could not complete the impersonation scan", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Please log in", description: "Redirecting to login...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'submitted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const completedSteps = [
    !!user,
    !!dashboardData?.profile,
    dashboardData?.podcasts && dashboardData.podcasts.length > 0,
    dashboardData?.hasRssFeed,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white">
              <Mic className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl">Podlogix</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block" data-testid="text-user-name">
                {user?.firstName || 'User'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 rounded-2xl p-6 md:p-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-welcome">
                Welcome back, {user?.firstName || 'Podcaster'}!
              </h1>
              <p className="text-muted-foreground">
                Your AI-powered podcast command center. {completedSteps}/4 setup steps completed.
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold text-sm">Podlogix AI Agent</p>
                <p className="text-xs text-muted-foreground">Ready to help with your podcast</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`h-full hover-elevate ${dashboardData?.profile ? 'border-green-500/30' : 'border-dashed'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <User className={`h-5 w-5 ${dashboardData?.profile ? 'text-green-500' : 'text-muted-foreground'}`} />
                  {dashboardData?.profile && <Badge variant="secondary" className="text-xs">Active</Badge>}
                </div>
                <CardTitle className="text-lg">Profile Page</CardTitle>
                <CardDescription>Your public podcaster profile</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.profile ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{dashboardData.profile.displayName}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild data-testid="button-edit-profile">
                        <Link href="/dashboard/profile">
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild data-testid="button-view-profile">
                        <Link href={`/p/${dashboardData.profile.slug}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" asChild data-testid="button-create-profile">
                    <Link href="/dashboard/profile">
                      Create Profile <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Podcast Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`h-full hover-elevate ${dashboardData?.podcasts?.length ? 'border-green-500/30' : 'border-dashed'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Mic className={`h-5 w-5 ${dashboardData?.podcasts?.length ? 'text-green-500' : 'text-muted-foreground'}`} />
                  {dashboardData?.podcasts?.length ? <Badge variant="secondary" className="text-xs">{dashboardData.podcasts.length}</Badge> : null}
                </div>
                <CardTitle className="text-lg">Podcast</CardTitle>
                <CardDescription>Manage your podcast details</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.podcasts?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{dashboardData.podcasts[0].title}</p>
                    <Button size="sm" variant="outline" asChild data-testid="button-manage-podcast">
                      <Link href="/dashboard/podcast">
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full" asChild data-testid="button-add-podcast">
                    <Link href="/dashboard/podcast">
                      Add Podcast <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* RSS Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`h-full hover-elevate ${dashboardData?.hasRssFeed ? 'border-green-500/30' : 'border-dashed'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Rss className={`h-5 w-5 ${dashboardData?.hasRssFeed ? 'text-green-500' : 'text-muted-foreground'}`} />
                  {dashboardData?.hasRssFeed && <Badge variant="secondary" className="text-xs">Connected</Badge>}
                </div>
                <CardTitle className="text-lg">RSS Feed</CardTitle>
                <CardDescription>Your podcast feed URL</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.hasRssFeed ? (
                  <Button size="sm" variant="outline" asChild data-testid="button-manage-rss">
                    <Link href="/dashboard/rss">
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" asChild data-testid="button-setup-rss">
                    <Link href="/dashboard/rss">
                      Setup RSS <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Distribution Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full hover-elevate">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Radio className="h-5 w-5 text-muted-foreground" />
                  {Object.values(dashboardData?.distributionStatus || {}).filter(s => s === 'submitted' || s === 'approved').length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Object.values(dashboardData?.distributionStatus || {}).filter(s => s === 'submitted' || s === 'approved').length} active
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">Distribution</CardTitle>
                <CardDescription>Publish to all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {['spotify', 'apple', 'youtube'].map((channel) => (
                    <div key={channel} className="flex items-center gap-1">
                      {getStatusIcon(dashboardData?.distributionStatus[channel])}
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" asChild data-testid="button-manage-distribution">
                  <Link href="/dashboard/distribution">
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Voice Identity Protection Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-2 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-green-600" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold mb-2">Voice & Identity Protection</h3>
                  <p className="text-muted-foreground mb-4">
                    Certify your voice and likeness on the Polygon blockchain. We monitor your connected 
                    social channels to detect AI impersonators and protect your identity.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <Badge variant="outline" className="border-green-500/50 text-green-600">Voice Certification</Badge>
                    <Badge variant="outline" className="border-purple-500/50 text-purple-600">Likeness Protection</Badge>
                    <Badge variant="outline" className="border-green-500/50 text-green-600">Impersonation Monitoring</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild data-testid="button-certify-voice">
                    <Link href="/dashboard/certify">
                      <Mic className="h-4 w-4 mr-2" />
                      Certify Voice
                    </Link>
                  </Button>
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700" asChild data-testid="button-certify-likeness">
                    <Link href="/dashboard/certify-likeness">
                      <Camera className="h-4 w-4 mr-2" />
                      Certify Likeness
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild data-testid="button-view-certificates">
                    <Link href="/identity">
                      View Certificates
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Social Monitoring Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-2 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Eye className="h-10 w-10 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Social Media Monitoring</h3>
                  <p className="text-muted-foreground mb-4">
                    We monitor your connected social channels to detect potential AI impersonators and protect your identity.
                  </p>
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border">
                      <Instagram className="h-4 w-4" />
                      <span className="text-sm">Instagram</span>
                      {metaStatus?.configured ? (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">Connected</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-muted-foreground/50 text-muted-foreground">Not Connected</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border">
                      <SiFacebook className="h-4 w-4" />
                      <span className="text-sm">Facebook</span>
                      {metaStatus?.facebookPages && metaStatus.facebookPages.length > 0 ? (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">{metaStatus.facebookPages.length} Page(s)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs border-muted-foreground/50 text-muted-foreground">Not Connected</Badge>
                      )}
                    </div>
                  </div>

                  {impersonatorAlerts.length > 0 && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {impersonatorAlerts.length} Potential Issue(s) Detected
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {impersonatorAlerts.slice(0, 5).map((alert) => (
                          <div key={alert.id} className="text-sm text-muted-foreground p-2 bg-card rounded border">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium capitalize">{alert.platform}</span>
                              <Badge variant="outline" className={`text-xs ${alert.confidence === 'high' ? 'border-red-500 text-red-600' : alert.confidence === 'medium' ? 'border-yellow-500 text-yellow-600' : 'border-muted-foreground text-muted-foreground'}`}>
                                {alert.confidence} confidence
                              </Badge>
                            </div>
                            <p>Account: <span className="font-medium">{alert.suspiciousAccountName}</span></p>
                            <p className="text-xs text-red-500 mt-1">Reason: {alert.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <Button 
                    size="lg" 
                    className="bg-blue-600"
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending || !metaStatus?.configured}
                    data-testid="button-scan-impersonators"
                  >
                    {scanMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Scan Now
                      </>
                    )}
                  </Button>
                  {!metaStatus?.configured && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">Connect social accounts to scan</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Agent Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold mb-2">Your AI Podcast Assistant</h3>
                  <p className="text-muted-foreground mb-4">
                    Podlogix AI is always ready to help you create transcriptions, generate show notes, 
                    find viral clips, optimize your content, and grow your audience.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <Badge>Transcription</Badge>
                    <Badge>Show Notes</Badge>
                    <Badge>Clip Finder</Badge>
                    <Badge>SEO Optimization</Badge>
                  </div>
                </div>
                <Button size="lg" className="shrink-0" asChild data-testid="button-ai-assistant">
                  <Link href="/dashboard/ai">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start AI Chat
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
