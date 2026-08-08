import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rss,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Shield,
  Mail,
  Link2,
  Share2,
  Mic,
  BarChart3,
  ChevronRight,
  Play,
  TrendingUp,
  Users,
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

const SETUP_STEPS = [
  {
    id: 'profile',
    title: 'Create your Link Page',
    description: 'Set up your public profile with links and social channels',
    href: '/dashboard/profile',
    icon: Link2,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    id: 'rss',
    title: 'Connect your RSS feed',
    description: 'Import your podcast episodes from your RSS feed',
    href: '/dashboard/rss',
    icon: Rss,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    id: 'distribution',
    title: 'Distribute to platforms',
    description: 'Submit your podcast to Spotify, Apple, YouTube and more',
    href: '/dashboard/distribution',
    icon: Share2,
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
  },
  {
    id: 'voice',
    title: 'Protect your voice',
    description: 'Certify your voice on the blockchain',
    href: '/dashboard/certify',
    icon: Shield,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
];

const QUICK_ACTIONS = [
  {
    title: 'AI Assistant',
    description: 'Generate show notes, transcripts & clips',
    href: '/dashboard/ai',
    icon: Sparkles,
    color: 'text-violet-500',
    bg: 'from-violet-500/10 to-violet-500/5',
    border: 'border-violet-500/20',
  },
  {
    title: 'RSS Feeds',
    description: 'Manage your podcast feeds',
    href: '/dashboard/rss',
    icon: Rss,
    color: 'text-orange-500',
    bg: 'from-orange-500/10 to-orange-500/5',
    border: 'border-orange-500/20',
  },
  {
    title: 'Social Hub',
    description: 'Post across all platforms at once',
    href: '/dashboard/social-hub',
    icon: Share2,
    color: 'text-sky-500',
    bg: 'from-sky-500/10 to-sky-500/5',
    border: 'border-sky-500/20',
  },
  {
    title: 'Email Hub',
    description: 'Email guests, subscribers & sponsors',
    href: '/dashboard/email',
    icon: Mail,
    color: 'text-rose-500',
    bg: 'from-rose-500/10 to-rose-500/5',
    border: 'border-rose-500/20',
  },
  {
    title: 'Distribution',
    description: 'Submit to Spotify, Apple & more',
    href: '/dashboard/distribution',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/20',
  },
  {
    title: 'Voice Protection',
    description: 'Blockchain-certified voice identity',
    href: '/identity',
    icon: Shield,
    color: 'text-amber-500',
    bg: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/20',
  },
];

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
      setTimeout(() => { window.location.href = "/login"; }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  if (authLoading || dataLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const checklistItems = SETUP_STEPS.map(step => ({
    ...step,
    completed: step.id === 'profile'
      ? !!dashboardData?.profile
      : step.id === 'rss'
      ? !!dashboardData?.hasRssFeed
      : step.id === 'distribution'
      ? Object.values(dashboardData?.distributionStatus || {}).some(s => s === 'submitted' || s === 'approved')
      : false,
  }));

  const completedCount = checklistItems.filter(i => i.completed).length;
  const allDone = completedCount === 4;
  const progressPct = Math.round((completedCount / 4) * 100);

  return (
    <div className="flex flex-col min-h-full">

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#0D1B2A] to-[#1a2e45] border-b border-white/[0.06] px-8 py-7">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {allDone ? `Welcome back, ${user?.firstName || 'Podcaster'}!` : `Hey ${user?.firstName || 'Podcaster'} 👋`}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {allDone
                ? "You're fully set up. Keep creating."
                : `${completedCount} of 4 setup steps complete — let's get your podcast live.`}
            </p>
            {!allDone && (
              <div className="mt-3 flex items-center gap-3">
                <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{progressPct}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dashboardData?.profile && (
              <Button size="sm" variant="outline" asChild className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/30">
                <Link href={`/p/${dashboardData.profile.slug}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View Profile
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/dashboard/ai">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI Assistant
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-6 max-w-6xl mx-auto w-full space-y-7">

        {/* Setup checklist — only shown until complete */}
        {!allDone && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Get started
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {checklistItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={item.href}>
                      <div className={`
                        relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150 h-full
                        ${item.completed
                          ? 'border-border bg-muted/30 opacity-60'
                          : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                        }
                      `}>
                        <div className="flex items-start justify-between">
                          <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${item.color}`} />
                          </div>
                          {item.completed
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          }
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-snug ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                        </div>
                        {!item.completed && (
                          <div className="flex items-center gap-1 text-xs text-primary font-medium mt-auto">
                            <span>Start</span>
                            <ChevronRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your tools
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                >
                  <Link href={action.href}>
                    <div className={`
                      group flex items-center gap-4 p-4 rounded-xl border ${action.border}
                      bg-gradient-to-br ${action.bg}
                      cursor-pointer hover:shadow-sm transition-all duration-150 hover:scale-[1.01]
                    `}>
                      <div className={`w-10 h-10 rounded-xl bg-background/60 border ${action.border} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{action.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
