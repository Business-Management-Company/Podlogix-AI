import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RefreshCw, Share2, Heart, MessageCircle, Play, BadgeCheck, Search, Loader2 } from "lucide-react";
import { Card, EmptyState, SectionHeader, StatTile } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface AccountAnalytics {
  handle: string;
  platform: string;
  name: string;
  profilePicture?: string;
  followers: number;
  postsCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  isVerified: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  twitch: "Twitch",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Infer platform from a pasted profile URL — lets someone paste a link instead of picking from the dropdown. */
function detectPlatform(input: string): string | null {
  const s = input.toLowerCase();
  if (s.includes("tiktok.com")) return "tiktok";
  if (s.includes("instagram.com")) return "instagram";
  if (s.includes("youtube.com") || s.includes("youtu.be")) return "youtube";
  if (s.includes("twitter.com") || s.includes("x.com")) return "twitter";
  if (s.includes("twitch.tv")) return "twitch";
  return null;
}

function AccountCard({ account }: { account: AccountAnalytics }) {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3">
        {account.profilePicture ? (
          <img
            src={account.profilePicture}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
            <Share2 size={18} className="text-zinc-400" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1 truncate text-sm font-medium text-zinc-950">
            {account.name}
            {account.isVerified && <BadgeCheck size={14} className="shrink-0 text-sky-500" />}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {PLATFORM_LABELS[account.platform] || account.platform} · @{account.handle}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Followers" value={formatCount(account.followers)} icon={Share2} color="#f97316" />
        <StatTile label="Engagement" value={`${account.engagementRate.toFixed(1)}%`} icon={Heart} color="#10b981" />
        <StatTile label="Avg likes" value={formatCount(account.avgLikes)} icon={MessageCircle} color="#0ea5e9" />
        <StatTile label="Avg views" value={formatCount(account.avgViews)} icon={Play} color="#a855f7" />
      </div>
    </Card>
  );
}

export default function ShowPromotion() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<{ accounts: AccountAnalytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts-cached"],
  });

  const notConfigured = error instanceof Error && error.message.includes("not configured");
  const accounts = data?.accounts ?? [];

  const [handleInput, setHandleInput] = useState("");
  const [lookupPlatform, setLookupPlatform] = useState("instagram");
  const [lookedUp, setLookedUp] = useState<AccountAnalytics | null>(null);

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/profile", {
        handle: handleInput.trim(),
        platform: detectPlatform(handleInput) || lookupPlatform,
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result?.analytics) setLookedUp(result.analytics);
    },
  });

  const lookupNotConfigured =
    lookupMutation.error instanceof Error && lookupMutation.error.message.includes("not configured");

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Promotion</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Analytics for the social accounts linked on your Link Page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <section className="mb-8">
        <SectionHeader title="Check a profile" />
        <Card padding="lg">
          <p className="mb-3 text-xs text-zinc-500">
            Paste an Instagram or TikTok URL, or just a handle, to pull real analytics for any public profile.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g. @shawnryan762 or instagram.com/shawnryan762"
              value={handleInput}
              onChange={(e) => {
                const val = e.target.value;
                setHandleInput(val);
                const detected = detectPlatform(val);
                if (detected) setLookupPlatform(detected);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleInput.trim() && lookupMutation.mutate()}
              className="flex-1"
            />
            <Select value={lookupPlatform} onValueChange={setLookupPlatform}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="twitter">X (Twitter)</SelectItem>
                <SelectItem value="twitch">Twitch</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => lookupMutation.mutate()} disabled={!handleInput.trim() || lookupMutation.isPending}>
              {lookupMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              Look up
            </Button>
          </div>
          {lookupMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {lookupNotConfigured
                ? "Analytics aren't configured for this workspace yet."
                : "Couldn't find that profile — double check the handle and platform."}
            </p>
          )}
        </Card>
        {lookedUp && (
          <div className="mt-4">
            <AccountCard account={lookedUp} />
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Connected accounts" />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : notConfigured ? (
          <EmptyState
            icon={Share2}
            title="Analytics aren't set up yet"
            description="This workspace's social analytics connection isn't configured. Ask an admin to finish that setup."
          />
        ) : accounts.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="No social accounts linked"
            description="Add your Instagram, TikTok, YouTube, or X handle to your Link Page and analytics will show up here automatically."
            action={{ label: "Add social links", href: "/dashboard/profile" }}
          />
        ) : error ? (
          <EmptyState
            icon={Share2}
            title="Couldn't load analytics"
            description="Something went wrong pulling your account analytics. Try refreshing."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard key={`${account.platform}-${account.handle}`} account={account} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-zinc-400">
        Want to post directly from Podlogix instead of just tracking analytics?{" "}
        <Link href="/dashboard/social-hub" className="underline hover:text-zinc-600">
          Try the workspace Social Hub
        </Link>
        .
      </p>
    </div>
  );
}
