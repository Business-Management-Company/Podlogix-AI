import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  Circle,
  ExternalLink,
  Shield,
  Mail,
  Link2,
  Share2
} from "lucide-react";
import { motion } from "framer-motion";

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

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: dashboardData, isLoading: dataLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Please log in", description: "Redirecting to login...", variant: "destructive" });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  if (authLoading || dataLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const checklistItems = [
    {
      id: 'profile',
      title: 'Create your Link Page',
      description: 'Set up your public profile with links and social channels',
      completed: !!dashboardData?.profile,
      href: '/dashboard/profile',
      icon: Link2,
    },
    {
      id: 'rss',
      title: 'Connect your RSS feed',
      description: 'Import your podcast episodes from your RSS feed',
      completed: !!dashboardData?.hasRssFeed,
      href: '/dashboard/rss',
      icon: Rss,
    },
    {
      id: 'distribution',
      title: 'Distribute to platforms',
      description: 'Submit your podcast to Spotify, Apple, YouTube and more',
      completed: Object.values(dashboardData?.distributionStatus || {}).some(s => s === 'submitted' || s === 'approved'),
      href: '/dashboard/distribution',
      icon: Share2,
    },
    {
      id: 'voice',
      title: 'Protect your voice',
      description: 'Certify your voice on the blockchain to prevent AI impersonation',
      completed: false,
      href: '/dashboard/certify',
      icon: Shield,
    },
  ];

  const completedCount = checklistItems.filter(i => i.completed).length;

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/10 rounded-2xl p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-welcome">
                Welcome, {user?.firstName || 'Podcaster'}!
              </h1>
              <p className="text-muted-foreground">
                {completedCount === 4 
                  ? "You're all set up! Explore your tools below."
                  : `Complete your setup: ${completedCount}/4 steps done`
                }
              </p>
            </div>
          </div>
          {dashboardData?.profile && (
            <Button variant="outline" asChild data-testid="button-view-profile">
              <Link href={`/p/${dashboardData.profile.slug}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Profile
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Getting Started
              </CardTitle>
              <CardDescription>Complete these steps to get your podcast running</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item) => (
                <Link 
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg border hover-elevate transition-colors"
                  data-testid={`checklist-${item.id}`}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                      {item.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">AI Podcast Assistant</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate transcriptions, show notes, find viral clips, and optimize your content.
                  </p>
                  <Button size="sm" asChild data-testid="button-ai-assistant">
                    <Link href="/dashboard/ai">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Open AI Chat
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Mail className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">Email Hub</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Manage contacts and send emails to guests, subscribers, and sponsors.
                  </p>
                  <Button size="sm" variant="outline" asChild data-testid="button-email-hub">
                    <Link href="/dashboard/email">
                      <Mail className="h-4 w-4 mr-2" />
                      Open Email Hub
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">Voice Protection</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Certify your voice and likeness on the blockchain to prevent AI impersonation.
                  </p>
                  <Button size="sm" variant="outline" asChild data-testid="button-voice-protection">
                    <Link href="/identity">
                      <Shield className="h-4 w-4 mr-2" />
                      View Certificates
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}
