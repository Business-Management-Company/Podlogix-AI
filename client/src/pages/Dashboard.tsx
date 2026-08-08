import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  ChevronRight,
} from "lucide-react";

interface DashboardData {
  profile: {
    id: string;
    slug: string;
    displayName: string;
    isPublished: boolean;
  } | null;
  podcasts: Array<{ id: string; title: string }>;
  hasRssFeed: boolean;
  distributionStatus: Record<string, string>;
}

const SETUP_STEPS = [
  {
    id: "profile",
    title: "Create your Link Page",
    description: "Set up your public profile with links and social channels",
    href: "/dashboard/profile",
    icon: Link2,
    accent: "#6366f1",
  },
  {
    id: "rss",
    title: "Connect an RSS feed",
    description: "Import your podcast episodes from your RSS feed",
    href: "/dashboard/rss",
    icon: Rss,
    accent: "#f97316",
  },
  {
    id: "distribution",
    title: "Distribute to platforms",
    description: "Submit your podcast to Spotify, Apple, YouTube and more",
    href: "/dashboard/distribution",
    icon: Share2,
    accent: "#0ea5e9",
  },
  {
    id: "voice",
    title: "Protect your voice",
    description: "Certify your voice identity on the blockchain",
    href: "/dashboard/certify",
    icon: Shield,
    accent: "#10b981",
  },
];

const TOOLS = [
  { title: "RSS Feeds", description: "Manage your podcast feeds", href: "/dashboard/rss", icon: Rss },
  { title: "Distribution", description: "Submit to Spotify, Apple & more", href: "/dashboard/distribution", icon: TrendingUp },
  { title: "Social Hub", description: "Post across all platforms at once", href: "/dashboard/social-hub", icon: Share2 },
  { title: "Email Hub", description: "Email guests, subscribers & sponsors", href: "/dashboard/email", icon: Mail },
  { title: "Analytics", description: "Track your audience growth", href: "/listener/analytics", icon: BarChart3 },
  { title: "Voice Protection", description: "Blockchain-certified voice identity", href: "/identity", icon: Shield },
];

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: dashboardData, isLoading: dataLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Please log in", variant: "destructive" });
      setTimeout(() => { window.location.href = "/login"; }, 500);
    }
  }, [authLoading, isAuthenticated, toast]);

  if (authLoading || dataLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const checklistItems = SETUP_STEPS.map((step) => ({
    ...step,
    completed:
      step.id === "profile"
        ? !!dashboardData?.profile
        : step.id === "rss"
        ? !!dashboardData?.hasRssFeed
        : step.id === "distribution"
        ? Object.values(dashboardData?.distributionStatus || {}).some(
            (s) => s === "submitted" || s === "approved"
          )
        : false,
  }));

  const completedCount = checklistItems.filter((i) => i.completed).length;
  const allDone = completedCount === 4;
  const progressPct = Math.round((completedCount / 4) * 100);

  return (
    <div className="flex flex-col min-h-full bg-background">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6 border-b">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {allDone
                ? `Welcome back, ${user?.firstName || "Podcaster"}`
                : `Hey ${user?.firstName || "Podcaster"}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allDone
                ? "You're fully set up. Keep creating."
                : `${completedCount} of 4 steps complete`}
            </p>

            {/* Inline progress bar — only while setup is incomplete */}
            {!allDone && (
              <div className="flex items-center gap-3 mt-3">
                <div className="w-36 h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progressPct}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dashboardData?.profile && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/p/${dashboardData.profile.slug}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View Profile
                </Link>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href="/dashboard/rss">
                <Rss className="h-3.5 w-3.5 mr-1.5" />
                Add Podcast
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 py-7 max-w-5xl mx-auto w-full space-y-8">

        {/* ── Setup checklist ─────────────────────────────────────────────── */}
        {!allDone && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Get started
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.href}>
                    <div
                      className={`
                        group relative flex flex-col gap-3 p-4 rounded-xl border cursor-pointer h-full
                        transition-all duration-150
                        ${item.completed
                          ? "border-border bg-muted/40 opacity-50 pointer-events-none"
                          : "border-border bg-card hover:border-foreground/20 hover:shadow-sm"
                        }
                      `}
                    >
                      {/* Left accent bar */}
                      {!item.completed && (
                        <span
                          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                          style={{ backgroundColor: item.accent }}
                        />
                      )}

                      <div className="flex items-start justify-between pl-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.completed
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <Circle className="h-4 w-4 text-border shrink-0" />
                        }
                      </div>

                      <div className="pl-1">
                        <p className={`text-sm font-medium leading-snug ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {!item.completed && (
                        <div className="pl-1 flex items-center gap-1 text-xs font-medium text-foreground mt-auto">
                          Start <ChevronRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Tools ───────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Tools
          </h2>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href}>
                  <div className="group flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center shrink-0 bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tool.title}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
