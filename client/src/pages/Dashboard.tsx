import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Rss,
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
  Plus,
  Headphones,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  spotify:    { label: "Spotify",      color: "#1DB954" },
  apple:      { label: "Apple Podcasts", color: "#bc55e6" },
  youtube:    { label: "YouTube",      color: "#FF0000" },
  amazon:     { label: "Amazon Music", color: "#00A8E1" },
  google:     { label: "Google",       color: "#4285F4" },
  iheartradio:{ label: "iHeartRadio",  color: "#CC0000" },
};

// ─── Focus step list ─────────────────────────────────────────────────────────

interface FocusItem {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

function buildFocusItems(data: DashboardData | undefined): FocusItem[] {
  return [
    {
      id: "profile",
      label: "Create your Link Page",
      description: "Set up your public profile with links and social channels",
      href: "/dashboard/profile",
      done: !!data?.profile,
      icon: Link2,
    },
    {
      id: "rss",
      label: "Connect an RSS feed",
      description: "Import episodes from your podcast host",
      href: "/dashboard/rss",
      done: !!data?.hasRssFeed,
      icon: Rss,
    },
    {
      id: "distribution",
      label: "Distribute to platforms",
      description: "Submit to Spotify, Apple Podcasts, YouTube and more",
      href: "/dashboard/distribution",
      done: Object.values(data?.distributionStatus || {}).some(
        (s) => s === "submitted" || s === "approved"
      ),
      icon: Share2,
    },
    {
      id: "voice",
      label: "Protect your voice",
      description: "Certify your voice identity on the blockchain",
      href: "/dashboard/certify",
      done: false,
      icon: Shield,
    },
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data, isLoading: dataLoading } = useQuery<DashboardData>({
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
      <div className="max-w-2xl mx-auto px-8 pt-10 pb-16 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const focusItems = buildFocusItems(data);
  const pendingItems = focusItems.filter((i) => !i.done);
  const doneCount = focusItems.filter((i) => i.done).length;
  const allDone = doneCount === focusItems.length;

  const platforms = Object.entries(data?.distributionStatus || {});
  const hasShows = (data?.podcasts || []).length > 0;

  return (
    <div className="max-w-2xl mx-auto px-8 pt-10 pb-16">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, {user?.firstName || "Podcaster"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{getTodayString()}</p>
      </div>

      {/* ── Setup focus (while incomplete) ────────────────────────────────── */}
      {!allDone && (
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Get started
            </h2>
            <span className="text-xs text-muted-foreground">{doneCount} / {focusItems.length}</span>
          </div>

          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {focusItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 px-5 py-4 ${
                    item.done
                      ? "bg-muted/30 cursor-default"
                      : "bg-card hover:bg-muted/40 cursor-pointer transition-colors"
                  }`}
                  onClick={() => !item.done && navigate(item.href)}
                >
                  {item.done
                    ? <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500 shrink-0" />
                    : <Circle className="h-[18px] w-[18px] text-border shrink-0" />
                  }
                  <Icon className={`h-4 w-4 shrink-0 ${item.done ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-snug ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.label}
                    </p>
                    {!item.done && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {!item.done && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── My Shows ──────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            My Shows
          </h2>
          <Button size="sm" variant="ghost" asChild className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
            <Link href="/listener">
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        {hasShows ? (
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {(data?.podcasts || []).slice(0, 4).map((podcast) => (
              <Link key={podcast.id} href={`/listener`}>
                <div className="flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium flex-1 truncate">{podcast.title}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-xl px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">No shows yet</p>
            <Button size="sm" asChild>
              <Link href="/dashboard/rss">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add your first podcast
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* ── Distribution status ────────────────────────────────────────────── */}
      {platforms.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Distribution
            </h2>
            <Button size="sm" variant="ghost" asChild className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/distribution">
                Manage <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {platforms.map(([platform, status]) => {
              const display = PLATFORM_DISPLAY[platform] || { label: platform, color: "#888" };
              const statusLabel =
                status === "approved" ? "Live"
                : status === "submitted" ? "Pending review"
                : status === "not_submitted" ? "Not submitted"
                : status;
              const isLive = status === "approved";

              return (
                <div key={platform} className="flex items-center gap-4 px-5 py-3.5 bg-card">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isLive ? display.color : "#d1d5db" }}
                  />
                  <p className="text-sm font-medium flex-1">{display.label}</p>
                  <span className={`text-xs ${isLive ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Quick access
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Social Hub",    icon: Share2,    href: "/dashboard/social-hub" },
            { label: "Email",         icon: Mail,      href: "/email" },
            { label: "Analytics",     icon: BarChart3, href: "/listener/analytics" },
            { label: "Voice Identity",icon: Shield,    href: "/identity" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Link Page shortcut ────────────────────────────────────────────── */}
      {data?.profile && (
        <div className="mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/p/${data.profile.slug}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View your Link Page
            </Link>
          </Button>
        </div>
      )}

    </div>
  );
}
