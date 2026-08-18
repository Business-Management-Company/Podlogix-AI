import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, CalendarRange, Eye, Heart, PenSquare, Plug, Plus, RefreshCw, Repeat, Users,
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

/** Per-platform analytics from Upload-Post's Analytics API. */
interface PlatformAnalytics {
  followers?: number;
  reach?: number;
  views?: number;
  impressions?: number;
  profileViews?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  message?: string; // "Analytics are not supported for X." style notes
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

function formatCount(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

const QUICK_ACTIONS = [
  { label: "Create Post", hint: "Publish everywhere at once", href: "/social/posts", icon: PenSquare },
  { label: "Campaign", hint: "A date-to-date push on one theme", href: "/social/posts?tab=campaign", icon: CalendarRange },
  { label: "Cadence", hint: "A weekly rhythm with themes per day", href: "/social/posts?tab=cadence", icon: Repeat },
];

export default function SocialHub() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const justConnected = urlParams.get("connected") === "true";

  const { data: accountsData, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<{
    accounts: UploadPostAccount[];
    hasProfile?: boolean;
  }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const accounts = accountsData?.accounts || [];
  const connectedPlatforms = accounts.map((a) => a.platform.toLowerCase());

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Record<string, PlatformAnalytics>>({
    queryKey: ["/api/upload-post/analytics", connectedPlatforms.join(",")],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/upload-post/analytics?platforms=${connectedPlatforms.join(",")}`);
      return res.json();
    },
    enabled: connectedPlatforms.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  });

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

  // Stats show one platform when a pill is selected, otherwise sum across all.
  const usablePlatforms = Object.entries(analytics ?? {}).filter(
    ([, v]) => v && typeof v === "object" && !v.message
  );
  const scoped: [string, PlatformAnalytics][] = selectedPlatform
    ? usablePlatforms.filter(([p]) => p === selectedPlatform)
    : usablePlatforms;
  const sum = (field: keyof PlatformAnalytics) =>
    scoped.reduce((total, [, v]) => total + (typeof v[field] === "number" ? (v[field] as number) : 0), 0);
  const engagements = sum("likes") + sum("comments") + sum("shares") + sum("saves");
  const scopeLabel = selectedPlatform
    ? selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)
    : "all channels";

  const STATS = [
    { label: "Followers", value: formatCount(sum("followers")), hint: scopeLabel, icon: Users },
    { label: "Reach (30d)", value: formatCount(sum("reach")), hint: "unique accounts reached", icon: BarChart3 },
    { label: "Views", value: formatCount(sum("views")), hint: "content views", icon: Eye },
    { label: "Engagements", value: formatCount(engagements), hint: "likes · comments · shares · saves", icon: Heart },
  ];

  return (
    <div className="w-full max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Social Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Your channels, their health, and where to act next.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchAccounts()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Connected accounts — horizontal, click to focus stats */}
      <section className="mb-6">
        {accountsLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-40 rounded-full" />)}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((account) => {
              const platform = account.platform.toLowerCase();
              const Icon = platformIcons[platform] || Users;
              const active = selectedPlatform === platform;
              const stats = analytics?.[platform];
              return (
                <button
                  key={account.id}
                  onClick={() => setSelectedPlatform(active ? null : platform)}
                  title={account.reauthRequired ? "Reconnect needed" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors ${
                    active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                  data-testid={`account-pill-${platform}`}
                >
                  {account.profilePictureUrl ? (
                    <img src={account.profilePictureUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/15" : "bg-zinc-100"}`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : "text-zinc-600"}`} />
                    </span>
                  )}
                  <span className="text-xs font-medium">
                    {account.platformUsername ? `@${account.platformUsername}` : platform}
                  </span>
                  {typeof stats?.followers === "number" && (
                    <span className={`text-[11px] ${active ? "text-white/70" : "text-zinc-400"}`}>
                      {formatCount(stats.followers)}
                    </span>
                  )}
                  {account.reauthRequired && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                </button>
              );
            })}
            {/* Empty placeholder — click to connect another platform */}
            <Link href="/connectors">
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-zinc-300 py-1.5 pl-1.5 pr-3.5 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-50">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-medium">Add account</span>
              </span>
            </Link>
          </div>
        )}
      </section>

      {/* Stats — scoped to the selected pill, or totals */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} padding="lg">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{stat.label}</p>
              <stat.icon className="h-3.5 w-3.5 text-zinc-300" />
            </div>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {analyticsLoading ? "…" : stat.value}
            </p>
            <p className="text-xs text-zinc-500">{stat.hint}</p>
          </Card>
        ))}
      </section>

      {/* Quick actions */}
      <section className="mb-6">
        <SectionHeader title="Quick actions" />
        <div className="grid gap-3 sm:grid-cols-3">
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

      {/* Reauth warnings, if any */}
      {accounts.some((a) => a.reauthRequired) && (
        <section className="mb-6">
          <Card padding="md" className="border-amber-200 bg-amber-50/60">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-amber-800">
                Some accounts need to be reconnected before posting works again:
              </p>
              {accounts.filter((a) => a.reauthRequired).map((account) => (
                <Button
                  key={account.id}
                  size="sm"
                  variant="outline"
                  onClick={() => connectMutation.mutate([account.platform.toLowerCase()])}
                  disabled={connectMutation.isPending}
                >
                  Reconnect {account.platform}
                </Button>
              ))}
            </div>
          </Card>
        </section>
      )}

      {accounts.length === 0 && !accountsLoading && (
        <section className="mb-6">
          <EmptyState
            icon={Plug}
            title="No accounts connected yet"
            description="Connect your social media accounts to post from Podlogix."
            action={{ label: "Open Connectors", href: "/connectors" }}
          />
        </section>
      )}

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
