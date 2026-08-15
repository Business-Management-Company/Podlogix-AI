import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Compass,
  Filter,
  Heart,
  Loader2,
  MapPin,
  Play,
  Search,
  Share2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

type Mode = "search" | "handle" | "lookalikes";

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

const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "search", label: "Search", description: "Filter 340M+ creators by niche, location, and follower count" },
  { id: "handle", label: "Handle", description: "Pull full analytics for one known profile" },
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
  const [mode, setMode] = useState<Mode>("search");
  const [handleInput, setHandleInput] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: creditsData } = useQuery<{ credits: CreditsInfo }>({
    queryKey: ["/api/social-analytics/credits"],
  });
  const credits = creditsData?.credits?.available;
  const creditsTone =
    credits === undefined ? "neutral" : credits < 5 ? "text-red-600 bg-red-50 border-red-200" : credits < 20 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-zinc-600 bg-zinc-50 border-zinc-200";

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/discover", {
        platform,
        niche: niche || undefined,
        location: location || undefined,
        limit: 25,
      });
      return res.json();
    },
  });

  const handleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/profile", {
        handle: handleInput.trim(),
        platform,
      });
      return res.json();
    },
  });

  const lookalikesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social-analytics/lookalikes", {
        handle: handleInput.trim(),
        platform,
        limit: 20,
      });
      return res.json();
    },
  });

  const activeMutation = mode === "search" ? searchMutation : mode === "handle" ? handleMutation : lookalikesMutation;
  const canSubmit = mode === "search" ? true : handleInput.trim().length > 0;

  const runSearch = () => {
    if (mode === "search") searchMutation.mutate();
    else if (mode === "handle") handleMutation.mutate();
    else lookalikesMutation.mutate();
  };

  const searchResults: Creator[] = searchMutation.data?.creators ?? [];
  const lookalikeResults: Creator[] = lookalikesMutation.data?.lookalikes ?? [];
  const handleResult: FullProfile | null = handleMutation.data?.analytics ?? null;

  const notConfigured =
    activeMutation.error instanceof Error && activeMutation.error.message.includes("not configured");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Discover</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Search creators, check a specific handle, or find lookalikes — powered by Influencers.club.
          </p>
        </div>
        {credits !== undefined && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${creditsTone}`}>
            {credits.toFixed(2)} credits left
          </span>
        )}
      </div>

      <section className="mb-6">
        <div className="mb-4 flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m.id ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-zinc-500">{MODES.find((m) => m.id === mode)?.description}</p>

        <Card padding="lg">
          <div className="flex flex-col gap-2 sm:flex-row">
            {mode !== "search" && (
              <Input
                placeholder="e.g. @shawnryan762 or shawnryan762"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && runSearch()}
                className="flex-1"
              />
            )}
            {mode === "search" && (
              <Input
                placeholder="e.g. sustainable fashion, military transition, personal finance"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                className="flex-1"
              />
            )}
            <Select value={platform} onValueChange={setPlatform}>
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
            {mode === "search" && (
              <Button variant="outline" onClick={() => setShowFilters((v) => !v)}>
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Filters
              </Button>
            )}
            <Button onClick={runSearch} disabled={!canSubmit || activeMutation.isPending}>
              {activeMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              {mode === "search" ? "Search" : mode === "handle" ? "Look up" : "Find lookalikes"}
            </Button>
          </div>

          {mode === "search" && showFilters && (
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <Input
                placeholder="Location, e.g. United States"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}

          {activeMutation.isError && (
            <p className="mt-3 text-xs text-red-600">
              {notConfigured
                ? "Analytics aren't configured for this workspace yet."
                : "That search didn't work — double check the input and try again."}
            </p>
          )}
        </Card>
      </section>

      <section>
        {mode === "search" && (
          <>
            <SectionHeader title={searchResults.length ? `${searchResults.length} creators` : "Results"} />
            {searchMutation.isPending ? null : searchResults.length === 0 ? (
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
            )}
          </>
        )}

        {mode === "handle" && (
          <>
            <SectionHeader title="Profile" />
            {handleMutation.isPending ? null : !handleResult ? (
              <EmptyState
                icon={Sparkles}
                title="Look up a creator"
                description="Enter a handle to pull their full analytics."
              />
            ) : (
              <FullProfileCard profile={handleResult} />
            )}
          </>
        )}

        {mode === "lookalikes" && (
          <>
            <SectionHeader title={lookalikeResults.length ? `${lookalikeResults.length} similar creators` : "Results"} />
            {lookalikesMutation.isPending ? null : lookalikeResults.length === 0 ? (
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
          </>
        )}
      </section>
    </div>
  );
}
