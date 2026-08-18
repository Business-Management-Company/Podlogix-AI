import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarRange, CheckCircle2, Link2, PenSquare, Plug, RefreshCw, Repeat, Users,
} from "lucide-react";
import {
  SiInstagram, SiYoutube, SiFacebook, SiLinkedin, SiTiktok, SiX, SiThreads,
  SiReddit, SiPinterest, SiBluesky, SiDiscord, SiTelegram,
} from "react-icons/si";

interface UploadPostAccount {
  id: string;
  platform: string;
  platformUsername: string;
  profilePictureUrl: string | null;
  isConnected: boolean;
  reauthRequired?: boolean;
}

interface AccountAnalytics {
  platform: string;
  followers: number;
  engagementRate: number;
}

interface LocalPost {
  id: string;
  platforms: string[];
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, youtube: SiYoutube, facebook: SiFacebook, linkedin: SiLinkedin,
  tiktok: SiTiktok, x: SiX, twitter: SiX, threads: SiThreads, reddit: SiReddit,
  pinterest: SiPinterest, bluesky: SiBluesky, discord: SiDiscord, telegram: SiTelegram,
};

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-500",
  youtube: "bg-red-600",
  facebook: "bg-blue-600",
  linkedin: "bg-sky-700",
  tiktok: "bg-zinc-900",
  x: "bg-zinc-900",
  threads: "bg-zinc-900",
  reddit: "bg-orange-600",
  pinterest: "bg-red-700",
  bluesky: "bg-sky-500",
  discord: "bg-indigo-500",
  telegram: "bg-sky-600",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

const QUICK_ACTIONS = [
  { label: "Create Post", hint: "Publish everywhere at once", href: "/social/posts", icon: PenSquare },
  { label: "Campaign", hint: "A date-to-date push on one theme", href: "/social/posts?tab=campaign", icon: CalendarRange },
  { label: "Cadence", hint: "A weekly rhythm with themes per day", href: "/social/posts?tab=cadence", icon: Repeat },
  { label: "Connect accounts", hint: "Link more platforms", href: "/connectors", icon: Plug },
];

export default function SocialHub() {
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const justConnected = urlParams.get("connected") === "true";

  const { data: accountsData, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<{
    accounts: UploadPostAccount[];
    hasProfile?: boolean;
  }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{ accounts: AccountAnalytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts"],
    retry: false,
  });
  const analyticsByPlatform = new Map(
    (analyticsData?.accounts ?? []).map((a) => [a.platform.toLowerCase(), a])
  );

  const { data: postsData } = useQuery<{ posts: LocalPost[] }>({
    queryKey: ["/api/upload-post/posts"],
    retry: false,
  });
  const recentPosts = (postsData?.posts ?? [])
    .filter((p) => p.status !== "draft")
    .slice(0, 5);

  useEffect(() => {
    if (justConnected) {
      refetchAccounts();
      toast({
        title: "Accounts Connected",
        description: "Your social media accounts have been connected successfully.",
      });
      window.history.replaceState({}, "", "/dashboard/social-hub");
    }
  }, [justConnected, refetchAccounts, toast]);

  const connectMutation = useMutation({
    mutationFn: async (platforms: string[]) => {
      const res = await apiRequest("POST", "/api/upload-post/connect-url", { platforms });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.access_url) window.location.href = data.access_url;
      else toast({ title: "Error", description: "Failed to get connection URL", variant: "destructive" });
    },
    onError: () => toast({ title: "Error", description: "Failed to connect accounts", variant: "destructive" }),
  });

  const accounts = accountsData?.accounts || [];
  const totalFollowers = [...analyticsByPlatform.values()].reduce((sum, a) => sum + (a.followers || 0), 0);
  const avgEngagement = analyticsByPlatform.size > 0
    ? [...analyticsByPlatform.values()].reduce((sum, a) => sum + (a.engagementRate || 0), 0) / analyticsByPlatform.size
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Social Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Your channels, their health, and where to act next.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchAccounts()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Topline stats */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Connected</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{accounts.length}</p>
          <p className="text-xs text-zinc-500">of 12 platforms on your plan</p>
        </Card>
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Total followers</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{formatCount(totalFollowers)}</p>
          <p className="text-xs text-zinc-500">across tracked accounts</p>
        </Card>
        <Card padding="lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Avg engagement</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{avgEngagement.toFixed(1)}%</p>
          <p className="text-xs text-zinc-500">engagements ÷ reach</p>
        </Card>
      </section>

      {/* Quick actions */}
      <section className="mb-6">
        <SectionHeader title="Quick actions" />
        <div className="grid gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card padding="md" interactive className="flex h-full items-start gap-3">
                <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-950">{action.label}</p>
                  <p className="text-xs text-zinc-500">{action.hint}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Connected accounts + analytics */}
      <section className="mb-6">
        <SectionHeader title="What's connected" />
        {accountsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No accounts connected yet"
            description="Connect your social media accounts to post from Podlogix."
            action={{ label: "Open Connectors", href: "/connectors" }}
          />
        ) : (
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {accounts.map((account) => {
              const Icon = platformIcons[account.platform.toLowerCase()] || Users;
              const stats = analyticsByPlatform.get(account.platform.toLowerCase());
              return (
                <CardRow key={account.id} className="px-4 py-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${platformColors[account.platform.toLowerCase()] || "bg-zinc-500"}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-zinc-950">{account.platform}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {account.platformUsername && `@${account.platformUsername}`}
                      {stats && (
                        <>
                          {" · "}
                          {formatCount(stats.followers)} followers · {stats.engagementRate.toFixed(1)}% engagement
                        </>
                      )}
                    </p>
                  </div>
                  {account.reauthRequired ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="destructive">Reconnect needed</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectMutation.mutate([account.platform.toLowerCase()])}
                        disabled={connectMutation.isPending}
                      >
                        Reconnect
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="default" className="shrink-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </CardRow>
              );
            })}
          </Card>
        )}
        {accounts.length > 0 && !analyticsLoading && analyticsByPlatform.size === 0 && (
          <p className="mt-2 text-xs text-zinc-400">
            Analytics aren't available for these accounts yet — check back after they've synced.
          </p>
        )}
      </section>

      {/* Recent posts */}
      <section>
        <SectionHeader title="Recent posts" action={{ label: "Create a post", href: "/social/posts" }} />
        {recentPosts.length === 0 ? (
          <EmptyState
            icon={PenSquare}
            title="No posts yet"
            description="Your published and scheduled posts will show up here."
            action={{ label: "Create your first post", href: "/social/posts" }}
          />
        ) : (
          <Card padding="none" className="divide-y divide-zinc-100">
            {recentPosts.map((post) => (
              <CardRow key={post.id} className="px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-900">{post.content || "(media post)"}</p>
                  <p className="text-xs text-zinc-500">
                    {post.platforms.join(", ")} ·{" "}
                    {post.status === "scheduled" && post.scheduledAt
                      ? `scheduled ${new Date(post.scheduledAt).toLocaleString()}`
                      : new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={post.status === "scheduled" ? "secondary" : "default"} className="shrink-0 capitalize">
                  {post.status}
                </Badge>
              </CardRow>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
