import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Cpu, Download, ExternalLink,
  FlaskConical, Globe2, GraduationCap, HeartPulse, Info, Landmark, LayoutGrid, Laugh, List, Loader2, Mail, Medal, MessagesSquare,
  Mic2, Music, Newspaper, Palette, Rss, Search, ShieldAlert, Star, Trophy, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import {
  GuestAppearanceHistory,
  type GuestAppearanceResult,
} from "@/components/guest/GuestAppearanceHistory";
import { RevealEmailButton } from "@/components/guest/RevealEmailButton";
import { MasterContactButton } from "@/components/guest/MasterContactButton";
import { StarButton } from "@/components/guest/StarButton";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { usePromoteGuestContact } from "@/hooks/use-promote-guest-contact";
import { useToggleProspectStar } from "@/hooks/use-toggle-prospect-star";
import { GUEST_STAGES, type GuestStage } from "@/lib/guest-workflow";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ViewMode = "table" | "cards";
type CreatorSort = "relevance" | "appearance_count" | "alphabetical" | "recent_episode";
type PodcastSort = "relevance" | "alphabetical" | "date_of_first_episode" | "power_score";
type DiscoverTab = "search" | "guests" | "podcasts" | "latest" | "active" | "credited";

// No "Search" tab — typing in the box already surfaces results and suggestions,
// so the tabs are lenses over that query (default view = combined people +
// shows, no tab highlighted).
const DISCOVER_TABS: { key: DiscoverTab; label: string; icon: LucideIcon }[] = [
  { key: "guests", label: "By Guest", icon: Users },
  { key: "podcasts", label: "Podcast Shows", icon: Mic2 },
  { key: "latest", label: "Latest Episodes", icon: CalendarDays },
  { key: "active", label: "Recently Active", icon: Clock3 },
  { key: "credited", label: "Most Credited", icon: Medal },
];

// All 15 shown at once in a 5-column grid (3 rows of 5). Each gets its own hue
// so the grid reads as a set of distinct, scannable tiles — an icon + colour
// beats a collage of borrowed podcast art (which repeated across tiles and read
// as noise). The colour is the tile's whole identity: icon badge, tint, hover.
const DISCOVERY_TOPICS = [
  { label: "Health & Wellness", query: "health wellness", icon: HeartPulse, color: "#10b981" },
  { label: "Business", query: "business entrepreneurship", icon: BriefcaseBusiness, color: "#2563eb" },
  { label: "Technology", query: "technology", icon: Cpu, color: "#6366f1" },
  { label: "Science", query: "science", icon: FlaskConical, color: "#0891b2" },
  { label: "Education", query: "education", icon: GraduationCap, color: "#d97706" },
  { label: "Society & Culture", query: "society culture", icon: MessagesSquare, color: "#e11d48" },
  { label: "Comedy", query: "comedy", icon: Laugh, color: "#eab308" },
  { label: "News", query: "news", icon: Newspaper, color: "#dc2626" },
  { label: "Sports", query: "sports", icon: Trophy, color: "#ea580c" },
  { label: "True Crime", query: "true crime", icon: ShieldAlert, color: "#475569" },
  { label: "Music", query: "music", icon: Music, color: "#c026d3" },
  { label: "History", query: "history", icon: Landmark, color: "#a16207" },
  { label: "Arts", query: "arts", icon: Palette, color: "#db2777" },
  { label: "Spirituality", query: "spirituality religion", icon: Globe2, color: "#0d9488" },
  // "veteran" alone, not "military veterans" — the combined phrase was
  // pulling in a much broader, noisier set of tangential matches.
  { label: "Military & Veterans", query: "veteran", icon: Medal, color: "#4d7c0f" },
] as const;


/**
 * A topic row: a compact list item — a small stack of real podcast covers, the
 * category name, and a chevron. The covers are what the collage grid had, just
 * dialled way down so they read as an accent, not a wall of art. Each category
 * keeps its hue for the hover border and the fallback icon badge (shown while
 * art is loading, or when Podchaser returns none).
 */
function TopicTile({ label, query, icon: TopicIcon, color, images, onSelect, canExport }: {
  label: string;
  query: string;
  icon: LucideIcon;
  color: string;
  images: string[];
  onSelect: () => void;
  canExport: boolean;
}) {
  const covers = images.slice(0, 3);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onSelect()}
      style={{ ["--tile" as string]: color }}
      className="group relative flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-left transition-all hover:border-[var(--tile)] hover:shadow-sm"
    >
      {covers.length > 0 ? (
        <div className="flex shrink-0 -space-x-5">
          {covers.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-12 w-12 rounded-md border-2 border-white object-cover shadow-sm"
              style={{ zIndex: covers.length - i }}
            />
          ))}
        </div>
      ) : (
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: color }}
        >
          <TopicIcon className="h-6 w-6 text-white" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-tight text-zinc-900">{label}</span>
      {canExport ? (
        <a
          href={`/api/admin/podcast-export?${new URLSearchParams({ q: query, pages: "10" })}`}
          onClick={(event) => event.stopPropagation()}
          title={`Download ${label} podcasts as CSV (admin only)`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : null}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-[var(--tile)]"
        aria-hidden="true"
      />
    </div>
  );
}

interface CreatorCandidate {
  id: string;
  name: string;
  informalName: string | null;
  pronouns: string | null;
  subtitle: string | null;
  location: string | null;
  bio: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  episodeAppearanceCount: number | null;
  followerCount: number | null;
  socialLinks: { twitter: string | null; wikipedia: string | null } & Record<string, string | null>;
}

interface PodcastCandidate {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  language: string | null;
  webUrl: string | null;
  rssUrl: string | null;
  numberOfEpisodes: number | null;
  avgEpisodeLength: number | null;
  daysBetweenEpisodes: number | null;
  followerCount: number | null;
  ratingCount: number | null;
  ratingAverage: number | null;
  reviewCount: number | null;
  startDate: string | null;
  latestEpisodeDate: string | null;
  categories: Array<{ title: string; slug: string }>;
  hasGuests: boolean | null;
  explicit: boolean | null;
  status: string | null;
  author: { name: string | null; email: string | null };
  socialLinks: Record<string, string | null>;
  socialFollowerCounts: Record<string, number | null>;
}

interface SearchPagination {
  page: number;
  perPage: number;
  totalResults: number;
  totalPages: number;
  hasMore: boolean;
}

interface CreatorSearchResult {
  creatorCandidates: CreatorCandidate[];
  pagination: SearchPagination;
  suggestedQuery: string | null;
  restrictedFields: string[];
}

interface PodcastSearchResult {
  podcastCandidates: PodcastCandidate[];
  pagination: SearchPagination;
  suggestedQuery: string | null;
  restrictedFields: string[];
}

interface PodcastCredit {
  creator: CreatorCandidate;
  roleCode: string;
  roleTitle: string;
  episodeCount: number;
  latestEpisode: { id: string; title: string; airDate: string | null } | null;
}

interface PodcastCreditsResult {
  podcastId: string;
  credits: PodcastCredit[];
  pagination: SearchPagination;
}

interface GuestProspect {
  id: string;
  providerPersonId: string;
  name: string;
  email: string | null;
  masterContactId?: string | null;
  pipelineStage?: string | null;
  starred?: boolean;
  socialLinks: Record<string, string> | null;
}

interface PodcastOption { id: string; title: string }
interface BuzzsproutStatus { connected: boolean; connection?: { id: string; podcastTitle?: string | null } }

function queryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body as T;
}

function formatCount(value: number | null | undefined): string {
  const number = value ?? 0;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return number.toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) return "Unavailable";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "Unavailable";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function formatCadence(days: number | null): string {
  if (days == null || days <= 0) return "Unavailable";
  if (days <= 2) return "Several times a week";
  if (days <= 9) return "Weekly";
  if (days <= 18) return "Every other week";
  if (days <= 40) return "Monthly";
  return `About every ${Math.round(days)} days`;
}

const SOCIAL_LABELS: Record<string, string> = {
  twitter: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  patreon: "Patreon",
  twitch: "Twitch",
};

function candidatePayload(candidate: CreatorCandidate) {
  const socialLinks = Object.fromEntries(
    Object.entries(candidate.socialLinks).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return {
    providerPersonId: candidate.id,
    name: candidate.name,
    informalName: candidate.informalName,
    pronouns: candidate.pronouns,
    subtitle: candidate.subtitle,
    location: candidate.location,
    bio: candidate.bio,
    profileUrl: candidate.profileUrl,
    imageUrl: candidate.imageUrl,
    socialLinks,
    episodeAppearanceCount: candidate.episodeAppearanceCount,
  };
}

function hasEnrichmentProfile(socialLinks?: Record<string, string | null | undefined> | null): boolean {
  return ["instagram", "youtube", "tiktok", "twitter", "twitch"].some((platform) => Boolean(socialLinks?.[platform]));
}

function PersonAvatar({ candidate, size = "md" }: { candidate: CreatorCandidate; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-32 w-32" : "h-12 w-12";
  if (candidate.imageUrl) {
    return <img src={candidate.imageUrl} alt="" className={`${classes} shrink-0 rounded-full border border-zinc-200 object-cover`} />;
  }
  return <span className={`flex ${classes} shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50`}><Users size={size === "lg" ? 44 : 17} className="text-zinc-400" /></span>;
}

function PodcastArtwork({ podcast, size = "md" }: { podcast: PodcastCandidate; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-20 w-20" : "h-12 w-12";
  if (podcast.imageUrl) {
    return <img src={podcast.imageUrl} alt="" className={`${classes} shrink-0 rounded-lg border border-zinc-200 object-cover`} />;
  }
  return <span className={`flex ${classes} shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50`}><Mic2 size={size === "lg" ? 24 : 17} className="text-zinc-400" /></span>;
}

function PaginationControls({ pagination, onPage }: { pagination: SearchPagination; onPage: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPage(pagination.page - 1)} disabled={pagination.page <= 1}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
        <Button variant="outline" size="sm" onClick={() => onPage(pagination.page + 1)} disabled={!pagination.hasMore}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default function SocialDiscover() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canExportTopics = user?.role === "admin" || user?.role === "superadmin";
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [activeTab, setActiveTab] = useState<DiscoverTab>("search");
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState(() => queryParam("person"));
  const [debouncedSearchInput, setDebouncedSearchInput] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [peoplePage, setPeoplePage] = useState(1);
  const [podcastPage, setPodcastPage] = useState(1);
  const [creatorSort, setCreatorSort] = useState<CreatorSort>("relevance");
  const [podcastSort, setPodcastSort] = useState<PodcastSort>("relevance");
  const [selectedCreator, setSelectedCreator] = useState<CreatorCandidate | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastCandidate | null>(null);
  const [selectedTargetShowId, setSelectedTargetShowId] = useState(() => queryParam("showId"));
  // One call for every topic row's cover art, not one per row (14+ parallel
  // searches on load hit the rate limit and dropped rows to their icon badge).
  const { data: topicArtData } = useQuery<{ art: Record<string, string[]> }>({
    queryKey: ["/api/guest-discovery/topic-art", DISCOVERY_TOPICS.map((t) => t.query).join(",")],
    queryFn: () => fetchJson(`/api/guest-discovery/topic-art?${new URLSearchParams({ topics: DISCOVERY_TOPICS.map((t) => t.query).join(",") })}`),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const topicArt = topicArtData?.art ?? {};
  const [pipelineStage, setPipelineStage] = useState<GuestStage>("prospect");
  const [addedToPodcastId, setAddedToPodcastId] = useState<string | null>(null);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchInput(searchInput.trim()), 650);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const { data: dashboard } = useQuery<{ podcasts: PodcastOption[] }>({ queryKey: ["/api/dashboard"] });
  const { data: buzzsprout } = useQuery<BuzzsproutStatus>({ queryKey: ["/api/connectors/buzzsprout/status"], retry: false });
  const nativePodcasts = dashboard?.podcasts ?? [];
  const buzzsproutPodcast = buzzsprout?.connected && buzzsprout.connection?.id
    && !nativePodcasts.some((podcast) => podcast.title.trim().toLowerCase() === buzzsprout.connection?.podcastTitle?.trim().toLowerCase())
    ? [{ id: `buzzsprout:${buzzsprout.connection.id}`, title: buzzsprout.connection.podcastTitle || "Buzzsprout show" }]
    : [];
  const ownedPodcasts = [...nativePodcasts, ...buzzsproutPodcast];
  const targetShowId = ownedPodcasts.some((podcast) => podcast.id === selectedTargetShowId)
    ? selectedTargetShowId
    : ownedPodcasts[0]?.id ?? "";

  const peopleSearchQuery = useQuery<CreatorSearchResult>({
    queryKey: ["/api/guest-discovery/search", submittedQuery, peoplePage, creatorSort],
    queryFn: () => fetchJson(`/api/guest-discovery/search?q=${encodeURIComponent(submittedQuery)}&max=10&page=${peoplePage}&sort=${creatorSort}`),
    enabled: submittedQuery.length >= 2,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const podcastSearchQuery = useQuery<PodcastSearchResult>({
    queryKey: ["/api/guest-discovery/podcasts", submittedQuery, podcastPage, podcastSort],
    queryFn: () => fetchJson(`/api/guest-discovery/podcasts?q=${encodeURIComponent(submittedQuery)}&max=10&page=${podcastPage}&sort=${podcastSort}`),
    enabled: submittedQuery.length >= 2,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const peopleSuggestionQuery = useQuery<CreatorSearchResult>({
    queryKey: ["/api/guest-discovery/search", "suggestions", debouncedSearchInput],
    queryFn: () => fetchJson(`/api/guest-discovery/search?q=${encodeURIComponent(debouncedSearchInput)}&max=5&page=1&sort=relevance`),
    enabled: suggestionsOpen && debouncedSearchInput.length >= 2,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const podcastSuggestionQuery = useQuery<PodcastSearchResult>({
    queryKey: ["/api/guest-discovery/podcasts", "suggestions", debouncedSearchInput],
    queryFn: () => fetchJson(`/api/guest-discovery/podcasts?q=${encodeURIComponent(debouncedSearchInput)}&max=5&page=1&sort=relevance`),
    enabled: suggestionsOpen && debouncedSearchInput.length >= 3,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const appearanceQuery = useGuestAppearances(selectedCreator?.id);
  const creatorDetailQuery = useQuery<{ creator: CreatorCandidate }>({
    queryKey: ["/api/guest-discovery/creators", selectedCreator?.id],
    queryFn: () => fetchJson(`/api/guest-discovery/creators/${encodeURIComponent(selectedCreator!.id)}`),
    enabled: Boolean(selectedCreator?.id) && !hasEnrichmentProfile(selectedCreator?.socialLinks),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  const podcastCreditsQuery = useQuery<PodcastCreditsResult>({
    queryKey: ["/api/guest-discovery/podcasts", selectedPodcast?.id, "credits"],
    queryFn: () => fetchJson(`/api/guest-discovery/podcasts/${encodeURIComponent(selectedPodcast!.id)}/credits?max=25`),
    enabled: Boolean(selectedPodcast?.id), staleTime: 6 * 60 * 60 * 1000, retry: false,
  });
  const { data: prospectData } = useQuery<{ prospects: GuestProspect[] }>({ queryKey: ["/api/guest-prospects"] });
  const activeCreator = creatorDetailQuery.data?.creator ?? selectedCreator;
  const savedProspect = activeCreator ? prospectData?.prospects.find((prospect) => prospect.providerPersonId === activeCreator.id) ?? null : null;
  const promoteContactMutation = usePromoteGuestContact();
  const toggleStarMutation = useToggleProspectStar();

  const saveProspectMutation = useMutation({
    mutationFn: async (candidate: CreatorCandidate) => {
      const response = await apiRequest("POST", "/api/guest-prospects", candidatePayload(candidate));
      return response.json() as Promise<GuestProspect>;
    },
    // Silent — this is an internal step before Add to Pipeline, Add to Contacts,
    // or starring; those actions show their own toast.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] }),
    onError: (error: Error) => toast({ title: "Couldn't save guest", description: error.message, variant: "destructive" }),
  });
  const addToPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!activeCreator || !targetShowId) throw new Error("Choose a guest and show first");
      let prospect = savedProspect;
      if (!prospect) prospect = await saveProspectMutation.mutateAsync(activeCreator);
      const response = await apiRequest("POST", `/api/podcasts/${encodeURIComponent(targetShowId)}/guests`, {
        guestProspectId: prospect.id,
        stage: pipelineStage,
        notes: `${appearanceQuery.data?.pagination.guestEpisodesTotal ?? 0} guest episodes found during research`,
      });
      return response.json();
    },
    onSuccess: () => {
      setAddedToPodcastId(targetShowId);
      setPipelineDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", targetShowId, "guests"] });
      toast({ title: "Added to guest pipeline" });
    },
    onError: (error: Error) => toast({ title: "Couldn't add prospect", description: error.message, variant: "destructive" }),
  });
  const revealEmailMutation = useMutation({
    mutationFn: async () => {
      if (!activeCreator) throw new Error("Choose a guest first");
      let prospect = savedProspect;
      if (!prospect) prospect = await saveProspectMutation.mutateAsync(activeCreator);
      const response = await apiRequest("POST", `/api/guest-prospects/${encodeURIComponent(prospect.id)}/reveal-email`);
      return response.json() as Promise<{ email: string; charged: boolean }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({ title: result.charged ? "Email revealed" : "Saved email loaded", description: result.email });
    },
    onError: (error: Error) => toast({ title: "Couldn't reveal email", description: error.message, variant: "destructive" }),
  });

  const addToContacts = async () => {
    try {
      if (!activeCreator) return;
      let prospect = savedProspect;
      if (!prospect) prospect = await saveProspectMutation.mutateAsync(activeCreator);
      await promoteContactMutation.mutateAsync(prospect.id);
    } catch {
      // Both mutations surface their own actionable toast message.
    }
  };

  const toggleStarred = async () => {
    try {
      if (!activeCreator) return;
      let prospect = savedProspect;
      if (!prospect) prospect = await saveProspectMutation.mutateAsync(activeCreator);
      const nextStarred = !prospect.starred;
      await toggleStarMutation.mutateAsync({ id: prospect.id, starred: nextStarred });
      toast({ title: nextStarred ? "Starred" : "Star removed" });
    } catch {
      // Both mutations surface their own actionable toast message.
    }
  };

  const submitSearch = (requestedQuery?: string) => {
    const query = (requestedQuery ?? searchInput).trim();
    if (query.length < 2) return;
    if (requestedQuery) setSearchInput(query);
    setSuggestionsOpen(false); setPeoplePage(1); setPodcastPage(1); setSelectedCreator(null); setSelectedPodcast(null); setSubmittedQuery(query);
  };
  const chooseCreator = (candidate: CreatorCandidate) => {
    setSuggestionsOpen(false); setPipelineDialogOpen(false); setSearchInput(candidate.name); setSelectedPodcast(null); setSelectedCreator(candidate); setAddedToPodcastId(null);
  };
  const choosePodcast = (podcast: PodcastCandidate) => {
    setSuggestionsOpen(false); setSearchInput(podcast.title); setSelectedCreator(null); setSelectedPodcast(podcast);
  };

  const people = peopleSearchQuery.data?.creatorCandidates ?? [];
  const podcastResults = podcastSearchQuery.data?.podcastCandidates ?? [];
  const peoplePagination = peopleSearchQuery.data?.pagination;
  const podcastPagination = podcastSearchQuery.data?.pagination;
  const peopleTotal = peoplePagination?.totalResults ?? people.length;
  const podcastTotal = podcastPagination?.totalResults ?? podcastResults.length;
  const totalResults = peopleTotal + podcastTotal;
  const searchPending = peopleSearchQuery.isFetching || podcastSearchQuery.isFetching;
  const searchSettled = !peopleSearchQuery.isFetching && !podcastSearchQuery.isFetching;
  const suggestedQueries = Array.from(new Set([
    peopleSearchQuery.data?.suggestedQuery,
    podcastSearchQuery.data?.suggestedQuery,
  ].filter((value): value is string => Boolean(value))));
  const currentSearchInput = searchInput.trim();
  const suggestionsReady = currentSearchInput === debouncedSearchInput;
  const peopleSuggestions = suggestionsReady ? peopleSuggestionQuery.data?.creatorCandidates ?? [] : [];
  const podcastSuggestions = suggestionsReady ? podcastSuggestionQuery.data?.podcastCandidates ?? [] : [];
  const suggestionsPending = !suggestionsReady || peopleSuggestionQuery.isFetching || podcastSuggestionQuery.isFetching;
  const showSuggestions = suggestionsOpen && currentSearchInput.length >= 2;
  const applySuggestion = (suggestion: string) => {
    setSearchInput(suggestion);
    setSubmittedQuery(suggestion);
    setPeoplePage(1);
    setPodcastPage(1);
  };

  return (
    <div className="w-full max-w-7xl px-6 py-8">
      {/* ── Categories hero ── */}
      <section className="mb-8">
        <h1 className="text-[22px] font-bold tracking-tight text-zinc-950">Categories</h1>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVERY_TOPICS.map(({ label, query, icon, color }) => (
            <TopicTile key={label} label={label} query={query} icon={icon} color={color} images={topicArt[query] ?? []} onSelect={() => { submitSearch(query); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }} canExport={canExportTopics} />
          ))}
        </div>
      </section>

      {/* ── Filter bar ── */}
      <div ref={resultsRef} className="sticky top-0 z-20 -mx-6 mb-4 border-b border-zinc-200 bg-white/95 px-6 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {DISCOVER_TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "guests") { setCreatorSort("appearance_count"); submitSearch(submittedQuery || searchInput); }
                  else if (key === "podcasts") { setPodcastSort("relevance"); submitSearch(submittedQuery || searchInput); }
                  else if (key === "latest") { setPodcastSort("date_of_first_episode"); submitSearch(submittedQuery || searchInput); }
                  else if (key === "active") { setCreatorSort("recent_episode"); submitSearch(submittedQuery || searchInput); }
                  else if (key === "credited") { setCreatorSort("appearance_count"); submitSearch(submittedQuery || searchInput); }
                }}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-[14.5px] font-medium transition-colors ${
                  activeTab === key
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {label}
              </button>
            ))}
            {/* Categories dropdown — quick-jump back to a topic */}
            <Select value="" onValueChange={(query) => { submitSearch(query); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }}>
              <SelectTrigger className="h-auto gap-1.5 border-0 bg-transparent px-3.5 py-2 text-[14.5px] font-medium text-zinc-500 shadow-none hover:bg-zinc-100 hover:text-zinc-700 focus:ring-0">
                <LayoutGrid className="h-4 w-4" />
                <span>Categories</span>
              </SelectTrigger>
              <SelectContent>
                {DISCOVERY_TOPICS.map(({ label, query }) => (
                  <SelectItem key={query} value={query}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            {totalResults > 0 && <span className="whitespace-nowrap text-[15px] font-semibold tabular-nums text-zinc-500">{formatCount(totalResults)} results</span>}
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)} variant="outline" size="sm" aria-label="Result layout">
              <ToggleGroupItem value="table" aria-label="Table view"><List className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Card view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* ── Search field (no button) ── */}
      <div
        className="relative mb-6"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuggestionsOpen(false);
        }}
      >
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400" />
        <Input
          role="combobox"
          aria-label="Search people or podcast shows"
          aria-autocomplete="list"
          aria-controls="guest-search-suggestions"
          aria-expanded={showSuggestions}
          placeholder="Search people or podcast shows…"
          value={searchInput}
          onFocus={() => setSuggestionsOpen(true)}
          onChange={(event) => { setSearchInput(event.target.value); setSuggestionsOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitSearch();
            if (event.key === "Escape") setSuggestionsOpen(false);
          }}
          className="h-[52px] pl-11 text-base"
        />
        {showSuggestions ? (
          <div id="guest-search-suggestions" role="listbox" className="absolute inset-x-0 top-full z-40 mt-2 max-h-[28rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
            {suggestionsPending && peopleSuggestions.length === 0 && podcastSuggestions.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Finding likely matches…</p>
            ) : null}
            {peopleSuggestions.length > 0 ? (
              <div className="space-y-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">People</p>
                {peopleSuggestions.map((candidate) => (
                  <button key={candidate.id} type="button" role="option" aria-selected="false" onClick={() => chooseCreator(candidate)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none">
                    <PersonAvatar candidate={candidate} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-950">{candidate.name}</span><span className="block truncate text-xs text-zinc-500">{candidate.subtitle || candidate.location || "Guest profile"}</span></span>
                  </button>
                ))}
              </div>
            ) : null}
            {podcastSuggestions.length > 0 ? (
              <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Podcast shows</p>
                {podcastSuggestions.map((podcast) => (
                  <button key={podcast.id} type="button" role="option" aria-selected="false" onClick={() => choosePodcast(podcast)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none">
                    <PodcastArtwork podcast={podcast} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-950">{podcast.title}</span><span className="block truncate text-xs text-zinc-500">{podcast.author.name || podcast.status || "Podcast show"}</span></span>
                  </button>
                ))}
              </div>
            ) : null}
            {!suggestionsPending && peopleSuggestions.length === 0 && podcastSuggestions.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-500">No quick matches yet. Press Enter for broader results.</p> : null}
            <button type="button" onClick={() => submitSearch()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border-t border-zinc-100 px-3 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"><Search className="h-4 w-4" />See all results for &ldquo;{searchInput.trim()}&rdquo;</button>
          </div>
        ) : null}
      </div>

      {peopleSearchQuery.isError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="font-medium">People search:</span> {peopleSearchQuery.error.message}</p> : null}
      {podcastSearchQuery.isError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="font-medium">Podcast search:</span> {podcastSearchQuery.error.message}</p> : null}
      {suggestedQueries.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Did you mean</span>
          {suggestedQueries.map((suggestion) => <button key={suggestion} type="button" onClick={() => applySuggestion(suggestion)} className="font-semibold underline underline-offset-2">{suggestion}</button>)}
          <span>?</span>
        </div>
      ) : null}

      {submittedQuery && searchSettled && totalResults === 0 && !peopleSearchQuery.isError && !podcastSearchQuery.isError ? (
        <EmptyState icon={Search} title="No matching people or podcasts" description="Try a shorter name, remove titles such as Dr., or search by one distinctive word." />
      ) : totalResults > 0 ? (
        <div className="space-y-8">

          {peopleTotal > 0 ? <section>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900">
                  <Users className="h-4 w-4 text-white" aria-hidden="true" />
                </span>
                <h2 className="text-[22px] font-bold tracking-tight text-zinc-950">People</h2>
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-[15px] font-semibold tabular-nums text-zinc-600">{formatCount(peopleTotal)}</span>
              </div>
              <Select value={creatorSort} onValueChange={(value) => { setCreatorSort(value as CreatorSort); setPeoplePage(1); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="appearance_count">Most credited episodes</SelectItem><SelectItem value="relevance">Best match</SelectItem><SelectItem value="recent_episode">Recently active</SelectItem><SelectItem value="alphabetical">Name A–Z</SelectItem></SelectContent>
              </Select>
            </div>
            <p className="mb-4 text-[14.5px] text-zinc-500">Credited episodes can include host, guest, producer, and other roles. Open a person for guest-only totals and history.</p>
            {viewMode === "table" ? <PeopleTable people={people} onChoose={chooseCreator} /> : <PeopleCards people={people} onChoose={chooseCreator} />}
            {peoplePagination ? <PaginationControls pagination={peoplePagination} onPage={setPeoplePage} /> : null}
          </section> : null}

          {podcastTotal > 0 ? <section>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900">
                  <Mic2 className="h-4 w-4 text-white" aria-hidden="true" />
                </span>
                <h2 className="text-[22px] font-bold tracking-tight text-zinc-950">Podcast shows</h2>
                <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-[15px] font-semibold tabular-nums text-zinc-600">{formatCount(podcastTotal)}</span>
              </div>
              <Select value={podcastSort} onValueChange={(value) => { setPodcastSort(value as PodcastSort); setPodcastPage(1); }}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="relevance">Best match</SelectItem><SelectItem value="power_score">Podchaser rating</SelectItem><SelectItem value="date_of_first_episode">Newest shows</SelectItem><SelectItem value="alphabetical">Title A–Z</SelectItem></SelectContent>
              </Select>
            </div>
            {viewMode === "table" ? <PodcastTable podcasts={podcastResults} onChoose={choosePodcast} /> : <PodcastCards podcasts={podcastResults} onChoose={choosePodcast} />}
            {podcastPagination ? <PaginationControls pagination={podcastPagination} onPage={setPodcastPage} /> : null}
          </section> : null}
        </div>
      ) : null}

      <PersonDrawer
        candidate={activeCreator}
        prospect={savedProspect}
        appearances={appearanceQuery.data}
        appearancesLoading={appearanceQuery.isFetching}
        appearancesError={appearanceQuery.error}
        ownedPodcasts={ownedPodcasts}
        targetShowId={targetShowId}
        pipelineStage={pipelineStage}
        addedToPodcastId={addedToPodcastId}
        contactPending={promoteContactMutation.isPending || saveProspectMutation.isPending}
        revealPending={revealEmailMutation.isPending}
        pipelinePending={addToPipelineMutation.isPending}
        starPending={toggleStarMutation.isPending || saveProspectMutation.isPending}
        pipelineDialogOpen={pipelineDialogOpen}
        onClose={() => setSelectedCreator(null)}
        onAddContact={() => void addToContacts()}
        onReveal={() => revealEmailMutation.mutate()}
        onTargetShow={setSelectedTargetShowId}
        onStage={setPipelineStage}
        onAddPipeline={() => addToPipelineMutation.mutate()}
        onPipelineDialog={setPipelineDialogOpen}
        onToggleStar={() => void toggleStarred()}
      />
      <PodcastDrawer
        podcast={selectedPodcast}
        credits={podcastCreditsQuery.data}
        creditsLoading={podcastCreditsQuery.isFetching}
        creditsError={podcastCreditsQuery.error}
        restrictedFields={podcastSearchQuery.data?.restrictedFields ?? []}
        onClose={() => setSelectedPodcast(null)}
        onChoosePerson={chooseCreator}
      />
    </div>
  );
}

function PeopleTable({ people, onChoose }: { people: CreatorCandidate[]; onChoose: (candidate: CreatorCandidate) => void }) {
  return (
    <Card padding="none" className="overflow-hidden"><Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[30%]">Guest</TableHead><TableHead className="hidden w-[38%] md:table-cell">Description</TableHead><TableHead className="hidden w-[17%] lg:table-cell">Location</TableHead><TableHead className="w-[15%] text-right">Credited episodes</TableHead></TableRow></TableHeader><TableBody>
      {people.map((candidate) => <TableRow key={candidate.id} tabIndex={0} role="button" aria-label={`Open ${candidate.name}`} className="cursor-pointer" onClick={() => onChoose(candidate)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onChoose(candidate)}>
        <TableCell><div className="flex items-center gap-3"><PersonAvatar candidate={candidate} /><div className="min-w-0"><p className="text-[17px] font-semibold leading-tight text-zinc-950">{candidate.name}</p><p className="truncate text-[14.5px] text-zinc-500 md:hidden">{candidate.subtitle || "Guest profile"}</p></div></div></TableCell>
        <TableCell className="hidden md:table-cell"><p className="line-clamp-2 break-words text-[14.5px] text-zinc-600">{candidate.subtitle || candidate.bio || "Guest profile"}</p></TableCell>
        <TableCell className="hidden text-[14.5px] text-zinc-500 lg:table-cell">{candidate.location || "—"}</TableCell>
        <TableCell className="text-right"><span className="text-[15px] font-semibold tabular-nums text-zinc-950">{formatCount(candidate.episodeAppearanceCount)}</span><ChevronRight className="ml-2 inline h-4 w-4 text-zinc-300" /></TableCell>
      </TableRow>)}
    </TableBody></Table></Card>
  );
}

function PeopleCards({ people, onChoose }: { people: CreatorCandidate[]; onChoose: (candidate: CreatorCandidate) => void }) {
  return <div className="grid gap-3 md:grid-cols-2">{people.map((candidate) => <button key={candidate.id} type="button" onClick={() => onChoose(candidate)} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left hover:border-zinc-400"><PersonAvatar candidate={candidate} /><span className="min-w-0 flex-1"><span className="block text-[17px] font-semibold leading-tight text-zinc-950">{candidate.name}</span><span className="mt-1 line-clamp-2 text-sm text-zinc-500">{candidate.subtitle || candidate.bio || "Guest profile"}</span></span><span className="shrink-0 text-right text-sm font-semibold text-zinc-950">{formatCount(candidate.episodeAppearanceCount)}<span className="block text-[10px] font-normal text-zinc-400">credited episodes</span></span></button>)}</div>;
}

function PodcastTable({ podcasts, onChoose }: { podcasts: PodcastCandidate[]; onChoose: (podcast: PodcastCandidate) => void }) {
  return (
    <Card padding="none" className="overflow-hidden"><Table className="table-fixed"><TableHeader><TableRow><TableHead className="w-[30%]">Podcast</TableHead><TableHead className="hidden w-[38%] md:table-cell">Description</TableHead><TableHead className="hidden w-[17%] lg:table-cell">Categories</TableHead><TableHead className="w-[15%] text-right">Episodes</TableHead></TableRow></TableHeader><TableBody>
      {podcasts.map((podcast) => <TableRow key={podcast.id} tabIndex={0} role="button" aria-label={`Open ${podcast.title}`} className="cursor-pointer" onClick={() => onChoose(podcast)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onChoose(podcast)}>
        <TableCell><div className="flex items-center gap-3"><PodcastArtwork podcast={podcast} /><div className="min-w-0"><p className="truncate text-[17px] font-semibold leading-tight text-zinc-950">{podcast.title}</p><p className="truncate text-[14.5px] text-zinc-500">{podcast.author.name || podcast.status || "Podcast show"}</p></div></div></TableCell>
        <TableCell className="hidden md:table-cell"><p className="line-clamp-2 break-words text-[14.5px] text-zinc-600">{podcast.description || "No description available"}</p></TableCell>
        <TableCell className="hidden lg:table-cell"><div className="flex flex-wrap gap-1">{podcast.categories.slice(0, 3).map((category) => <span key={category.slug} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{category.title}</span>)}</div></TableCell>
        <TableCell className="text-right"><span className="font-semibold text-zinc-950">{formatCount(podcast.numberOfEpisodes)}</span><ChevronRight className="ml-2 inline h-4 w-4 text-zinc-300" /></TableCell>
      </TableRow>)}
    </TableBody></Table></Card>
  );
}

function PodcastCards({ podcasts, onChoose }: { podcasts: PodcastCandidate[]; onChoose: (podcast: PodcastCandidate) => void }) {
  return <div className="grid gap-3 md:grid-cols-2">{podcasts.map((podcast) => <button key={podcast.id} type="button" onClick={() => onChoose(podcast)} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left hover:border-zinc-400"><PodcastArtwork podcast={podcast} /><span className="min-w-0 flex-1"><span className="block text-[17px] font-semibold leading-tight text-zinc-950">{podcast.title}</span><span className="mt-1 line-clamp-2 text-sm text-zinc-500">{podcast.description || podcast.author.name || "Podcast show"}</span></span><span className="shrink-0 text-right text-sm font-semibold text-zinc-950">{formatCount(podcast.numberOfEpisodes)}<span className="block text-[10px] font-normal text-zinc-400">episodes</span></span></button>)}</div>;
}

interface PersonDrawerProps {
  candidate: CreatorCandidate | null;
  prospect: GuestProspect | null;
  appearances?: GuestAppearanceResult;
  appearancesLoading: boolean;
  appearancesError: Error | null;
  ownedPodcasts: PodcastOption[];
  targetShowId: string;
  pipelineStage: GuestStage;
  addedToPodcastId: string | null;
  contactPending: boolean;
  revealPending: boolean;
  pipelinePending: boolean;
  starPending: boolean;
  pipelineDialogOpen: boolean;
  onClose: () => void;
  onAddContact: () => void;
  onReveal: () => void;
  onTargetShow: (id: string) => void;
  onStage: (stage: GuestStage) => void;
  onAddPipeline: () => void;
  onPipelineDialog: (open: boolean) => void;
  onToggleStar: () => void;
}

function HostedShowActivity({ podcast }: { podcast?: GuestAppearanceResult["hostedPodcasts"][number] }) {
  if (!podcast) return null;
  const latestDate = podcast.latestEpisodeDate ?? podcast.latestEpisode?.airDate ?? null;
  return (
    <section aria-label="Hosted show activity" className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center gap-3">
          {podcast.podcastImageUrl ? <img src={podcast.podcastImageUrl} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white"><Mic2 className="h-4 w-4 text-zinc-400" /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-950">{podcast.podcastTitle}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-500">{podcast.latestEpisode?.title ? `Latest: ${podcast.latestEpisode.title}` : podcast.author?.name || "Hosted podcast"}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(latestDate)}</span>
            <span className="hidden sm:inline">{podcast.numberOfEpisodes != null ? `${formatCount(podcast.numberOfEpisodes)} episodes` : "Episodes unavailable"}</span>
            {podcast.status ? <span className="rounded-full bg-white px-2 py-1 capitalize">{podcast.status}</span> : null}
          </div>
        </div>
    </section>
  );
}

const STAR_HINT_SEEN_KEY = "podlogix:star-hint-seen";

function PersonDrawer(props: PersonDrawerProps) {
  const { candidate, prospect, appearances, appearancesLoading, appearancesError } = props;
  const [starHintOpen, setStarHintOpen] = useState(false);

  useEffect(() => {
    if (!candidate || typeof window === "undefined") return;
    if (window.localStorage.getItem(STAR_HINT_SEEN_KEY)) return;
    window.localStorage.setItem(STAR_HINT_SEEN_KEY, "1");
    setStarHintOpen(true);
    const timeoutId = window.setTimeout(() => setStarHintOpen(false), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [candidate]);

  return (
    <>
      <Sheet open={Boolean(candidate)} onOpenChange={(open) => !open && props.onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[52vw]">
          {candidate ? <>
            <SheetHeader className="rounded-xl border-l-4 border-l-primary bg-zinc-50 p-4">
              <div className="flex items-center gap-3">
                <PersonAvatar candidate={candidate} size="lg" />
                <div className="min-w-0 flex-1"><SheetTitle className="truncate text-left">{candidate.name}</SheetTitle><p className="mt-1 line-clamp-2 text-sm text-zinc-500">{candidate.subtitle || candidate.location || "Guest profile"}</p></div>
                <TooltipProvider delayDuration={250}><Tooltip open={starHintOpen} onOpenChange={setStarHintOpen}><TooltipTrigger asChild><span><StarButton starred={prospect?.starred} isPending={props.starPending} onToggle={props.onToggleStar} /></span></TooltipTrigger><TooltipContent side="bottom" className="max-w-56 border-blue-600 bg-blue-600 text-white">Star your top picks — works whether they're just reviewed, in a pipeline, or already a contact.</TooltipContent></Tooltip></TooltipProvider>
              </div>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <TooltipProvider delayDuration={250}>
                <div className="flex flex-wrap gap-2">
                  <Tooltip><TooltipTrigger asChild><Button onClick={() => props.onPipelineDialog(true)} className="h-9"><UserPlus className="mr-1.5 h-4 w-4" />Add to Pipeline</Button></TooltipTrigger><TooltipContent side="bottom" className="max-w-64">Assign this guest to a show and booking stage — the right choice once you're actively pursuing them.</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><span><MasterContactButton className="h-9" masterContactId={prospect?.masterContactId} isPending={props.contactPending} onAdd={props.onAddContact} /></span></TooltipTrigger><TooltipContent side="bottom" className="max-w-64">Create a master contact record for notes, outreach, and future campaigns — no show commitment needed.</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><span><RevealEmailButton className="h-9" email={prospect?.email} canReveal={hasEnrichmentProfile(candidate.socialLinks) || Boolean(appearances?.hostedPodcasts.some((podcast) => hasEnrichmentProfile(podcast.socialLinks)))} isPending={props.revealPending} onConfirm={props.onReveal} /></span></TooltipTrigger><TooltipContent side="bottom" className="max-w-64">Use one Influencers Club credit once; the saved email is reused afterward.</TooltipContent></Tooltip>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-zinc-500"><Info className="h-3.5 w-3.5" aria-hidden="true" /><span><strong className="font-medium text-zinc-700">Pipeline</strong> means you're actively pursuing this guest for a specific show. <strong className="font-medium text-zinc-700">Contacts</strong> just saves them for outreach — no show needed. Use the star for your top picks either way.</span></p>
              </TooltipProvider>
              <GuestSocialProfiles compact socialLinks={candidate.socialLinks} hostedPodcasts={appearances?.hostedPodcasts} />
              <HostedShowActivity podcast={appearances?.hostedPodcasts[0]} />
              <section><SectionHeader title="Guest snapshot" /><GuestResearchSummary compact subtitle={candidate.subtitle} bio={candidate.bio} location={candidate.location} creditedEpisodes={candidate.episodeAppearanceCount} /></section>
              <GuestAppearanceHistory guestName={candidate.name} appearances={appearances} isLoading={appearancesLoading} error={appearancesError} />
            </div>
          </> : null}
        </SheetContent>
      </Sheet>
      <Dialog open={props.pipelineDialogOpen} onOpenChange={props.onPipelineDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add to guest pipeline</DialogTitle><DialogDescription>Assign this person to one of your shows and choose their current booking stage. This also saves them to your shortlist.</DialogDescription></DialogHeader>
          {props.ownedPodcasts.length > 0 ? <div className="space-y-3">
            <Select value={props.targetShowId} onValueChange={props.onTargetShow}><SelectTrigger><SelectValue placeholder="Choose your show" /></SelectTrigger><SelectContent>{props.ownedPodcasts.map((podcast) => <SelectItem key={podcast.id} value={podcast.id}>{podcast.title}</SelectItem>)}</SelectContent></Select>
            <Select value={props.pipelineStage} onValueChange={(value) => props.onStage(value as GuestStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GUEST_STAGES.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}</SelectContent></Select>
            <Button className="w-full" onClick={props.onAddPipeline} disabled={!props.targetShowId || props.pipelinePending || props.addedToPodcastId === props.targetShowId}>{props.pipelinePending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : props.addedToPodcastId === props.targetShowId ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}{props.addedToPodcastId === props.targetShowId ? "Added to Pipeline" : "Add to Guest Pipeline"}</Button>
          </div> : <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">Connect a show to add this guest to a pipeline. <Link href="/dashboard/rss" className="underline">Connect a show →</Link></p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PodcastDrawerProps {
  podcast: PodcastCandidate | null;
  credits?: PodcastCreditsResult;
  creditsLoading: boolean;
  creditsError: Error | null;
  restrictedFields: string[];
  onClose: () => void;
  onChoosePerson: (candidate: CreatorCandidate) => void;
}

function PodcastDrawer({ podcast, credits, creditsLoading, creditsError, restrictedFields, onClose, onChoosePerson }: PodcastDrawerProps) {
  const socialLinks = Object.entries(podcast?.socialLinks ?? {})
    .filter((entry): entry is [string, string] => Boolean(entry[1]));
  const socialFollowerCounts = Object.entries(podcast?.socialFollowerCounts ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === "number");
  const hasRestrictedProof = restrictedFields.some((field) => /social|rating|review/i.test(field));

  return (
    <Sheet open={Boolean(podcast)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">
        {podcast ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-4">
                <PodcastArtwork podcast={podcast} size="lg" />
                <div className="min-w-0">
                  <SheetTitle className="line-clamp-2 text-left">{podcast.title}</SheetTitle>
                  <p className="mt-1 text-sm text-zinc-500">{podcast.author.name || "Podcast show"}</p>
                </div>
              </div>
            </SheetHeader>
            <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-500">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This is the show, not a guest — pick a person from "Hosts and guests" below to add them to your pipeline or contacts.
            </p>
            <div className="mt-6 space-y-6">
              <section>
                <SectionHeader title="Show details" />
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm leading-6 text-zinc-600">{podcast.description || "No description available."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {podcast.categories.map((category) => <span key={category.slug} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600">{category.title}</span>)}
                  </div>
                </div>
              </section>

              {podcast.webUrl || podcast.rssUrl || socialLinks.length > 0 ? (
                <section>
                  <SectionHeader title="Official links" />
                  <div className="flex flex-wrap gap-2">
                    {podcast.webUrl ? <a href={podcast.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400"><Globe2 className="h-4 w-4" />Website<ExternalLink className="h-3 w-3" /></a> : null}
                    {podcast.rssUrl ? <a href={podcast.rssUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400"><Rss className="h-4 w-4" />RSS feed<ExternalLink className="h-3 w-3" /></a> : null}
                    {socialLinks.map(([platform, url]) => <a key={platform} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400">{SOCIAL_LABELS[platform] || platform}<ExternalLink className="h-3 w-3" /></a>)}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">These links belong to the podcast show and may differ from an individual guest's profiles.</p>
                </section>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailCard label="Episodes" value={formatCount(podcast.numberOfEpisodes)} />
                <DetailCard label="Latest episode" value={formatDate(podcast.latestEpisodeDate)} icon={<CalendarDays className="h-4 w-4" />} />
                <DetailCard label="First episode" value={formatDate(podcast.startDate)} />
                <DetailCard label="Average length" value={formatDuration(podcast.avgEpisodeLength)} icon={<Clock3 className="h-4 w-4" />} />
                <DetailCard label="Release cadence" value={formatCadence(podcast.daysBetweenEpisodes)} />
                <DetailCard label="Language" value={podcast.language?.toUpperCase() || "Unavailable"} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                {podcast.status ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">Status: {podcast.status}</span> : null}
                {podcast.explicit != null ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">{podcast.explicit ? "Marked explicit" : "Not marked explicit"}</span> : null}
                {podcast.hasGuests != null ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">{podcast.hasGuests ? "Features guests" : "No guest credits found"}</span> : null}
              </div>

              {podcast.ratingAverage != null || podcast.reviewCount != null || socialFollowerCounts.length > 0 ? (
                <section>
                  <SectionHeader title="Public proof" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {podcast.ratingAverage != null ? (
                      <div className="rounded-xl border border-zinc-200 p-4">
                        <p className="flex items-center gap-1 text-lg font-semibold text-zinc-950"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{podcast.ratingAverage.toFixed(1)}</p>
                        <p className="text-xs text-zinc-500">Listener rating · {formatCount(podcast.ratingCount)} ratings · {formatCount(podcast.reviewCount)} reviews</p>
                      </div>
                    ) : null}
                    {socialFollowerCounts.length > 0 ? (
                      <div className="rounded-xl border border-zinc-200 p-4">
                        <p className="text-sm font-medium text-zinc-950">Public social reach</p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                          {socialFollowerCounts.map(([platform, count]) => <span key={platform}>{SOCIAL_LABELS[platform] || platform}: {formatCount(count)}</span>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-zinc-400">Ratings describe the podcast, not the quality of every individual guest.</p>
                </section>
              ) : hasRestrictedProof ? (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-500">Some social-reach and listener-review fields are not included with the connected Podchaser permissions.</p>
              ) : null}

              {podcast.author.email ? <a href={`mailto:${podcast.author.email}`} className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 hover:border-zinc-400"><Mail className="h-4 w-4 text-zinc-400" /><span><span className="font-medium text-zinc-950">Public show email</span><span className="block text-xs text-zinc-500">{podcast.author.email}</span></span></a> : null}

              <section>
                <SectionHeader title={`Hosts and guests${credits ? ` · ${formatCount(credits.pagination.totalResults)}` : ""}`} />
                {creditsError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{creditsError.message}</p> : creditsLoading ? <p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading credited people…</p> : <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">{credits?.credits.map((credit) => <button key={`${credit.creator.id}-${credit.roleCode}`} type="button" onClick={() => onChoosePerson(credit.creator)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"><PersonAvatar candidate={credit.creator} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-950">{credit.creator.name}</span><span className="block text-xs text-zinc-500">{credit.roleTitle} · {credit.episodeCount} episode{credit.episodeCount === 1 ? "" : "s"}</span></span><ChevronRight className="h-4 w-4 text-zinc-300" /></button>)}</Card>}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-950">{icon}{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
