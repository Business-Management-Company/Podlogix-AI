import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Compass,
  Filter,
  Heart,
  Loader2,
  MapPin,
  Play,
  Search,
  Share2,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type BrandMode = "search" | "lookalikes";

interface Creator {
  handle: string;
  platform: string;
  name: string;
  profilePicture?: string | null;
  followers: number;
  engagementRate: number;
  avgViews?: number;
  location?: string | null;
  niche?: string | null;
  isVerified?: boolean;
  similarityScore?: number | null;
}

interface FullProfile extends Creator {
  bio?: string | null;
  following?: number;
  postsCount?: number;
  avgLikes?: number;
  avgComments?: number;
  email?: string | null;
}

interface CreditsInfo {
  available: number;
  used: number;
  total: number;
  plan: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  twitch: "Twitch",
};

const BRAND_MODES: { id: BrandMode; label: string; description: string }[] = [
  { id: "search", label: "Search", description: "Filter 340M+ creators by niche, location, and follower count" },
  { id: "lookalikes", label: "Lookalikes", description: "Find creators similar to a profile you already like" },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3">
        {creator.profilePicture ? (
          <img
            src={creator.profilePicture}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
            <Users size={16} className="text-zinc-400" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-medium text-zinc-950">
            {creator.name || creator.handle}
            {creator.isVerified && <BadgeCheck size={13} className="shrink-0 text-sky-500" />}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {PLATFORM_LABELS[creator.platform] || creator.platform} · @{creator.handle}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Followers</p>
          <p className="font-semibold text-zinc-950">{formatCount(creator.followers)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400">Engagement</p>
          <p className="font-semibold text-zinc-950">{(creator.engagementRate ?? 0).toFixed(1)}%</p>
        </div>
        {creator.location && (
          <div className="col-span-2 flex items-center gap-1 text-xs text-zinc-500">
            <MapPin size={11} />
            {creator.location}
          </div>
        )}
        {typeof creator.similarityScore === "number" && (
          <div className="col-span-2 flex items-center gap-1 text-xs text-emerald-600">
            <Zap size={11} />
            {Math.round(creator.similarityScore * 100)}% match
          </div>
        )}
      </div>
    </Card>
  );
}

function FullProfileCard({ profile }: { profile: FullProfile }) {
  return (
    <Card padding="lg">
      <div className="flex items-center gap-3">
        {profile.profilePicture ? (
          <img
            src={profile.profilePicture}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
            <Users size={20} className="text-zinc-400" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-base font-semibold text-zinc-950">
            {profile.name}
            {profile.isVerified && <BadgeCheck size={15} className="shrink-0 text-sky-500" />}
          </p>
          <p className="truncate text-sm text-zinc-500">
            {PLATFORM_LABELS[profile.platform] || profile.platform} · @{profile.handle}
          </p>
        </div>
      </div>
      {profile.bio && <p className="mt-3 text-sm text-zinc-600">{profile.bio}</p>}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-100 p-3 text-center">
          <Users size={16} className="mx-auto mb-1 text-zinc-400" strokeWidth={1.75} />
          <p className="text-lg font-semibold text-zinc-950">{formatCount(profile.followers)}</p>
          <p className="text-[11px] text-zinc-500">Followers</p>
        </div>
        <div className="rounded-lg border border-zinc-100 p-3 text-center">
          <Heart size={16} className="mx-auto mb-1 text-zinc-400" strokeWidth={1.75} />
          <p className="text-lg font-semibold text-zinc-950">{(profile.engagementRate ?? 0).toFixed(1)}%</p>
          <p className="text-[11px] text-zinc-500">Engagement</p>
        </div>
        <div className="rounded-lg border border-zinc-100 p-3 text-center">
          <Share2 size={16} className="mx-auto mb-1 text-zinc-400" strokeWidth={1.75} />
          <p className="text-lg font-semibold text-zinc-950">{formatCount(profile.avgLikes ?? 0)}</p>
          <p className="text-[11px] text-zinc-500">Avg likes</p>
        </div>
        <div className="rounded-lg border border-zinc-100 p-3 text-center">
          <Play size={16} className="mx-auto mb-1 text-zinc-400" strokeWidth={1.75} />
          <p className="text-lg font-semibold text-zinc-950">{formatCount(profile.avgViews ?? 0)}</p>
          <p className="text-[11px] text-zinc-500">Avg views</p>
        </div>
      </div>
    </Card>
  );
}

export default function SocialDiscover() {
  const { toast } = useToast();

  // ── Primary: guest research ──
  const [guestHandle, setGuestHandle] = useState("");
  const [guestPlatform, setGuestPlatform] = useState("instagram");
  const [guestEmail, setGuestEmail] = useState("");
  const [addedForHandle, setAddedForHandle] = useState<string | null>(null);

  // ── Secondary: brand-matching tools ──
  const [showBrandTools, setShowBrandTools] = useState(false);
  const [brandMode, setBrandMode] = useState<BrandMode>("search");
  const [brandHandle, setBrandHandle] = useState("");
  const [brandPlatform, setBrandPlatform] = useState("instagram");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: creditsData } = useQuery<{ credits: CreditsInfo }>({
    queryKey: ["/api/social-analytics/credits"],
  });
  const credits = creditsData?.credits?.available;
  const creditsTone =
    credits === undefined
      ? "neutral"
      : credits < 5
        ? "text-red-600 bg-red-50 border-red-200"
        : credits < 20
          ? "text-amber-600 bg-amber-50 border-amber-200"
          : "text-zinc-600 bg-zinc-50 border-zinc-200";

  const { data: dashboardData } = useQuery<{ podcasts: { id: string; title: string }[] }>({
    queryKey: ["/api/dashboard"],
  });
  const podcast = dashboardData?.podcasts?.[0];

  const guestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/profile", {
        handle: guestHandle.trim(),
        platform: guestPlatform,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGuestEmail(data?.analytics?.email || "");
      setAddedForHandle(null);
    },
  });
  const guestResult: FullProfile | null = guestMutation.data?.analytics ?? null;

  const addToPipelineMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/podcasts/${podcast!.id}/guests`, {
        email: guestEmail.trim(),
        firstName: guestResult?.name || guestResult?.handle,
        notes: `Researched via Discover — @${guestResult?.handle} on ${PLATFORM_LABELS[guestResult?.platform || ""] || guestResult?.platform}`,
      });
      return res.json();
    },
    onSuccess: () => {
      setAddedForHandle(guestResult?.handle ?? null);
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "guests"] });
      toast({ title: "Added to Guest Pipeline" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add guest", variant: "destructive" });
    },
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/discover", {
        platform: brandPlatform,
        niche: niche || undefined,
        location: location || undefined,
        limit: 25,
      });
      return res.json();
    },
  });

  const lookalikesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/lookalikes", {
        handle: brandHandle.trim(),
        platform: brandPlatform,
        limit: 20,
      });
      return res.json();
    },
  });

  const activeBrandMutation = brandMode === "search" ? searchMutation : lookalikesMutation;
  const canSubmitBrand = brandMode === "search" ? true : brandHandle.trim().length > 0;
  const runBrandSearch = () => {
    if (brandMode === "search") searchMutation.mutate();
    else lookalikesMutation.mutate();
  };

  const searchResults: Creator[] = searchMutation.data?.creators ?? [];
  const lookalikeResults: Creator[] = lookalikesMutation.data?.lookalikes ?? [];

  const notConfigured =
    guestMutation.error instanceof Error && guestMutation.error.message.includes("not configured");
  const brandNotConfigured =
    activeBrandMutation.error instanceof Error && activeBrandMutation.error.message.includes("not configured");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Discover</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Research a potential guest before you book them — powered by Influencers.club.
          </p>
        </div>
        {credits !== undefined && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${creditsTone}`}>
            {credits.toFixed(2)} credits left
          </span>
        )}
      </div>

      {/* ── Primary: research a guest ── */}
      <section className="mb-6">
        <SectionHeader title="Research a guest" />
        <Card padding="lg">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="e.g. @shawnryan762 or shawnryan762"
              value={guestHandle}
              onChange={(e) => setGuestHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && guestHandle.trim() && guestMutation.mutate()}
              className="flex-1"
            />
            <Select value={guestPlatform} onValueChange={setGuestPlatform}>
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
            <Button
              onClick={() => guestMutation.mutate()}
              disabled={!guestHandle.trim() || guestMutation.isPending}
            >
              {guestMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              Look up
            </Button>
          </div>
          {guestMutation.isError && (
            <p className="mt-3 text-xs text-red-600">
              {notConfigured
                ? "Analytics aren't configured for this workspace yet."
                : "Couldn't find that profile — double check the handle and platform."}
            </p>
          )}
        </Card>

        {guestMutation.isPending ? null : !guestResult ? (
          <div className="mt-4">
            <EmptyState
              icon={Search}
              title="Look up a potential guest"
              description="Enter a handle to see their audience size and engagement before you reach out."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <FullProfileCard profile={guestResult} />
            <Card padding="lg">
              {!podcast ? (
                <p className="text-xs text-zinc-500">
                  Connect a show to start tracking guests.{" "}
                  <Link href="/dashboard/rss" className="underline hover:text-zinc-700">
                    Connect a show →
                  </Link>
                </p>
              ) : addedForHandle === guestResult.handle ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle2 size={15} />
                  Added to your Guest Pipeline
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Email — required to track as a guest"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addToPipelineMutation.mutate()}
                    disabled={!guestEmail.trim() || addToPipelineMutation.isPending}
                  >
                    {addToPipelineMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-1.5 h-4 w-4" />
                    )}
                    Add to Guest Pipeline
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </section>

      {/* ── Secondary: brand-matching tools ── */}
      <section>
        <button
          onClick={() => setShowBrandTools((v) => !v)}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
        >
          <ChevronDown size={13} className={`transition-transform ${showBrandTools ? "rotate-180" : ""}`} />
          Looking for brand-matching search instead?
        </button>

        {showBrandTools && (
          <div className="rounded-xl border border-dashed border-zinc-200 p-4">
            <div className="mb-3 flex gap-2">
              {BRAND_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setBrandMode(m.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    brandMode === m.id ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="mb-3 text-xs text-zinc-500">{BRAND_MODES.find((m) => m.id === brandMode)?.description}</p>

            <Card padding="lg">
              <div className="flex flex-col gap-2 sm:flex-row">
                {brandMode === "lookalikes" && (
                  <Input
                    placeholder="e.g. @shawnryan762 or shawnryan762"
                    value={brandHandle}
                    onChange={(e) => setBrandHandle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canSubmitBrand && runBrandSearch()}
                    className="flex-1"
                  />
                )}
                {brandMode === "search" && (
                  <Input
                    placeholder="e.g. sustainable fashion, military transition, personal finance"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runBrandSearch()}
                    className="flex-1"
                  />
                )}
                <Select value={brandPlatform} onValueChange={setBrandPlatform}>
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
                {brandMode === "search" && (
                  <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                    Filters
                  </Button>
                )}
                <Button onClick={runBrandSearch} disabled={!canSubmitBrand || activeBrandMutation.isPending}>
                  {activeBrandMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-1.5 h-4 w-4" />
                  )}
                  {brandMode === "search" ? "Search" : "Find lookalikes"}
                </Button>
              </div>

              {brandMode === "search" && showFilters && (
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <Input
                    placeholder="Location, e.g. United States"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              )}

              {activeBrandMutation.isError && (
                <p className="mt-3 text-xs text-red-600">
                  {brandNotConfigured
                    ? "Analytics aren't configured for this workspace yet."
                    : "That search didn't work — double check the input and try again."}
                </p>
              )}
            </Card>

            <div className="mt-4">
              {brandMode === "search" ? (
                searchMutation.isPending ? null : searchResults.length === 0 ? (
                  <EmptyState
                    icon={Compass}
                    title="Search for creators"
                    description="Enter a niche and pick a platform to start discovering creators."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchResults.map((c) => (
                      <CreatorCard key={`${c.platform}-${c.handle}`} creator={c} />
                    ))}
                  </div>
                )
              ) : lookalikesMutation.isPending ? null : lookalikeResults.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="Find similar creators"
                  description="Enter a handle to find creators with a similar audience and content style."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lookalikeResults.map((c) => (
                    <CreatorCard key={`${c.platform}-${c.handle}`} creator={c} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
