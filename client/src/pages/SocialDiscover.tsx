import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookmarkPlus, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink,
  Globe2, LayoutGrid, List, Loader2, Mail, Mic2, Rss, Search, Star, UserPlus, Users,
} from "lucide-react";
import {
  GuestAppearanceHistory,
  type GuestAppearanceResult,
} from "@/components/guest/GuestAppearanceHistory";
import { RevealEmailButton } from "@/components/guest/RevealEmailButton";
import { MasterContactButton } from "@/components/guest/MasterContactButton";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { usePromoteGuestContact } from "@/hooks/use-promote-guest-contact";
import { GUEST_STAGES, type GuestStage } from "@/lib/guest-workflow";
import { apiRequest, queryClient } from "@/lib/queryClient";

type SearchMode = "people" | "podcasts";
type ViewMode = "table" | "cards";
type CreatorSort = "relevance" | "appearance_count" | "alphabetical" | "recent_episode";
type PodcastSort = "relevance" | "alphabetical" | "date_of_first_episode" | "power_score";

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

function hasEnrichmentProfile(socialLinks?: Record<string, string | null> | null): boolean {
  return ["instagram", "youtube", "tiktok", "twitter", "twitch"].some((platform) => Boolean(socialLinks?.[platform]));
}

function PersonAvatar({ candidate, size = "md" }: { candidate: CreatorCandidate; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-16 w-16" : "h-11 w-11";
  if (candidate.imageUrl) {
    return <img src={candidate.imageUrl} alt="" className={`${classes} shrink-0 rounded-full border border-zinc-200 object-cover`} />;
  }
  return <span className={`flex ${classes} shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50`}><Users size={size === "lg" ? 22 : 17} className="text-zinc-400" /></span>;
}

function PodcastArtwork({ podcast, size = "md" }: { podcast: PodcastCandidate; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-20 w-20" : "h-11 w-11";
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
  const [mode, setMode] = useState<SearchMode>("people");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchInput, setSearchInput] = useState(() => queryParam("person"));
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [creatorSort, setCreatorSort] = useState<CreatorSort>("appearance_count");
  const [podcastSort, setPodcastSort] = useState<PodcastSort>("relevance");
  const [selectedCreator, setSelectedCreator] = useState<CreatorCandidate | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastCandidate | null>(null);
  const [selectedTargetShowId, setSelectedTargetShowId] = useState(() => queryParam("showId"));
  const [pipelineStage, setPipelineStage] = useState<GuestStage>("prospect");
  const [addedToPodcastId, setAddedToPodcastId] = useState<string | null>(null);

  const { data: dashboard } = useQuery<{ podcasts: PodcastOption[] }>({ queryKey: ["/api/dashboard"] });
  const { data: buzzsprout } = useQuery<BuzzsproutStatus>({ queryKey: ["/api/connectors/buzzsprout/status"], retry: false });
  const nativePodcasts = dashboard?.podcasts ?? [];
  const buzzsproutPodcast = buzzsprout?.connected && buzzsprout.connection?.id
    && !nativePodcasts.some((podcast) => podcast.title.trim().toLowerCase() === buzzsprout.connection?.podcastTitle?.trim().toLowerCase())
    ? [{ id: `buzzsprout:${buzzsprout.connection.id}`, title: buzzsprout.connection.podcastTitle || "Buzzsprout show" }]
    : [];
  const ownedPodcasts = [...nativePodcasts, ...buzzsproutPodcast];
  const targetShowId = ownedPodcasts.some((podcast) => podcast.id === selectedTargetShowId) ? selectedTargetShowId : "";

  const peopleSearchQuery = useQuery<CreatorSearchResult>({
    queryKey: ["/api/guest-discovery/search", submittedQuery, page, creatorSort],
    queryFn: () => fetchJson(`/api/guest-discovery/search?q=${encodeURIComponent(submittedQuery)}&max=10&page=${page}&sort=${creatorSort}`),
    enabled: mode === "people" && submittedQuery.length >= 2,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  const podcastSearchQuery = useQuery<PodcastSearchResult>({
    queryKey: ["/api/guest-discovery/podcasts", submittedQuery, page, podcastSort],
    queryFn: () => fetchJson(`/api/guest-discovery/podcasts?q=${encodeURIComponent(submittedQuery)}&max=10&page=${page}&sort=${podcastSort}`),
    enabled: mode === "podcasts" && submittedQuery.length >= 2,
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

  const saveProspectMutation = useMutation({
    mutationFn: async (candidate: CreatorCandidate) => {
      const response = await apiRequest("POST", "/api/guest-prospects", candidatePayload(candidate));
      return response.json() as Promise<GuestProspect>;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] }); toast({ title: "Saved as guest prospect" }); },
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

  const submitSearch = () => {
    const query = searchInput.trim();
    if (query.length < 2) return;
    setPage(1); setSelectedCreator(null); setSelectedPodcast(null); setSubmittedQuery(query);
  };
  const changeMode = (value: string) => {
    setMode(value as SearchMode); setSubmittedQuery(""); setPage(1); setSelectedCreator(null); setSelectedPodcast(null);
  };
  const chooseCreator = (candidate: CreatorCandidate) => {
    setSelectedPodcast(null); setSelectedCreator(candidate); setAddedToPodcastId(null);
  };

  const activeSearch = mode === "people" ? peopleSearchQuery : podcastSearchQuery;
  const people = peopleSearchQuery.data?.creatorCandidates ?? [];
  const podcastResults = podcastSearchQuery.data?.podcastCandidates ?? [];
  const pagination = mode === "people" ? peopleSearchQuery.data?.pagination : podcastSearchQuery.data?.pagination;
  const suggestedQuery = mode === "people" ? peopleSearchQuery.data?.suggestedQuery : podcastSearchQuery.data?.suggestedQuery;
  const totalResults = pagination?.totalResults ?? (mode === "people" ? people.length : podcastResults.length);

  return (
    <div className="w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Discover guests</h1>
        <p className="mt-1 text-sm text-zinc-500">Search people or podcast shows, confirm the right match, and keep the research inside Podlogix.</p>
      </div>

      <Tabs value={mode} onValueChange={changeMode}>
        <TabsList aria-label="Search catalog">
          <TabsTrigger value="people"><Users className="mr-1.5 h-4 w-4" />People</TabsTrigger>
          <TabsTrigger value="podcasts"><Mic2 className="mr-1.5 h-4 w-4" />Podcast shows</TabsTrigger>
        </TabsList>
      </Tabs>
      <section className="mt-4">
        <Card padding="lg">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label={mode === "people" ? "Guest name" : "Podcast show name"}
              placeholder={mode === "people" ? "Search a person, e.g. Andrew Huberman" : "Search a podcast show, e.g. Huberman Lab"}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitSearch()}
              className="flex-1"
            />
            <Button onClick={submitSearch} disabled={searchInput.trim().length < 2 || activeSearch.isFetching}>
              {activeSearch.isFetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              Search {mode === "people" ? "people" : "podcasts"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Search runs only when submitted so typing never consumes the shared provider allowance.</p>
        </Card>
      </section>

      {activeSearch.isError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{activeSearch.error.message}</p>
      ) : suggestedQuery ? (
        <button type="button" onClick={() => { setSearchInput(suggestedQuery); setSubmittedQuery(suggestedQuery); setPage(1); }} className="mt-4 w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100">
          Did you mean <span className="font-semibold">{suggestedQuery}</span>?
        </button>
      ) : null}

      {submittedQuery && !activeSearch.isFetching && totalResults === 0 ? (
        <div className="mt-4"><EmptyState icon={Search} title={`No matching ${mode}`} description="Try a shorter name, remove titles such as Dr., or search by one distinctive word." /></div>
      ) : totalResults > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeader title={`${mode === "people" ? "People" : "Podcast shows"} · ${formatCount(totalResults)} results`} />
            <div className="flex items-center gap-2">
              {mode === "people" ? (
                <Select value={creatorSort} onValueChange={(value) => { setCreatorSort(value as CreatorSort); setPage(1); }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="appearance_count">Most credited episodes</SelectItem><SelectItem value="relevance">Best match</SelectItem><SelectItem value="recent_episode">Recently active</SelectItem><SelectItem value="alphabetical">Name A–Z</SelectItem></SelectContent>
                </Select>
              ) : (
                <Select value={podcastSort} onValueChange={(value) => { setPodcastSort(value as PodcastSort); setPage(1); }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="relevance">Best match</SelectItem><SelectItem value="power_score">Podchaser rating</SelectItem><SelectItem value="date_of_first_episode">Newest shows</SelectItem><SelectItem value="alphabetical">Title A–Z</SelectItem></SelectContent>
                </Select>
              )}
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)} variant="outline" size="sm" aria-label="Result layout">
                <ToggleGroupItem value="table" aria-label="Table view"><List className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="cards" aria-label="Card view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          {mode === "people" ? (
            <p className="mb-3 text-xs text-zinc-500">
              Credited episodes can include host, guest, producer, and other roles. Open a person for guest-only totals and history.
            </p>
          ) : null}

          {mode === "people" ? (
            viewMode === "table" ? <PeopleTable people={people} onChoose={chooseCreator} /> : <PeopleCards people={people} onChoose={chooseCreator} />
          ) : viewMode === "table" ? (
            <PodcastTable podcasts={podcastResults} onChoose={(podcast) => { setSelectedCreator(null); setSelectedPodcast(podcast); }} />
          ) : (
            <PodcastCards podcasts={podcastResults} onChoose={(podcast) => { setSelectedCreator(null); setSelectedPodcast(podcast); }} />
          )}
          {pagination ? <PaginationControls pagination={pagination} onPage={setPage} /> : null}
        </section>
      ) : !submittedQuery ? (
        <div className="mt-4"><EmptyState icon={mode === "people" ? Users : Mic2} title={`Search ${mode === "people" ? "for a guest" : "podcast shows"}`} description={mode === "people" ? "We'll show possible identities first, then load their guest-only podcast history after you choose one." : "Choose a show to review its description, hosts, recurring guests, and public contact information."} /></div>
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
        savePending={saveProspectMutation.isPending}
        contactPending={promoteContactMutation.isPending || saveProspectMutation.isPending}
        revealPending={revealEmailMutation.isPending}
        pipelinePending={addToPipelineMutation.isPending}
        onClose={() => setSelectedCreator(null)}
        onSave={() => activeCreator && saveProspectMutation.mutate(activeCreator)}
        onAddContact={() => void addToContacts()}
        onReveal={() => revealEmailMutation.mutate()}
        onTargetShow={setSelectedTargetShowId}
        onStage={setPipelineStage}
        onAddPipeline={() => addToPipelineMutation.mutate()}
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
    <Card padding="none" className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Guest</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="hidden lg:table-cell">Location</TableHead><TableHead className="text-right">Credited episodes</TableHead></TableRow></TableHeader><TableBody>
      {people.map((candidate) => <TableRow key={candidate.id} tabIndex={0} role="button" aria-label={`Open ${candidate.name}`} className="cursor-pointer" onClick={() => onChoose(candidate)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onChoose(candidate)}>
        <TableCell><div className="flex items-center gap-3"><PersonAvatar candidate={candidate} /><div className="min-w-0"><p className="font-semibold text-zinc-950">{candidate.name}</p><p className="max-w-xs truncate text-xs text-zinc-500 md:hidden">{candidate.subtitle || "Guest profile"}</p></div></div></TableCell>
        <TableCell className="hidden max-w-lg md:table-cell"><p className="line-clamp-2 text-zinc-600">{candidate.subtitle || candidate.bio || "Guest profile"}</p></TableCell>
        <TableCell className="hidden text-zinc-500 lg:table-cell">{candidate.location || "—"}</TableCell>
        <TableCell className="text-right"><span className="font-semibold text-zinc-950">{formatCount(candidate.episodeAppearanceCount)}</span><ChevronRight className="ml-2 inline h-4 w-4 text-zinc-300" /></TableCell>
      </TableRow>)}
    </TableBody></Table></Card>
  );
}

function PeopleCards({ people, onChoose }: { people: CreatorCandidate[]; onChoose: (candidate: CreatorCandidate) => void }) {
  return <div className="grid gap-3 md:grid-cols-2">{people.map((candidate) => <button key={candidate.id} type="button" onClick={() => onChoose(candidate)} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left hover:border-zinc-400"><PersonAvatar candidate={candidate} /><span className="min-w-0 flex-1"><span className="block font-semibold text-zinc-950">{candidate.name}</span><span className="mt-1 line-clamp-2 text-sm text-zinc-500">{candidate.subtitle || candidate.bio || "Guest profile"}</span></span><span className="shrink-0 text-right text-sm font-semibold text-zinc-950">{formatCount(candidate.episodeAppearanceCount)}<span className="block text-[10px] font-normal text-zinc-400">credited episodes</span></span></button>)}</div>;
}

function PodcastTable({ podcasts, onChoose }: { podcasts: PodcastCandidate[]; onChoose: (podcast: PodcastCandidate) => void }) {
  return (
    <Card padding="none" className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Podcast</TableHead><TableHead className="hidden md:table-cell">Description</TableHead><TableHead className="hidden lg:table-cell">Categories</TableHead><TableHead className="text-right">Episodes</TableHead></TableRow></TableHeader><TableBody>
      {podcasts.map((podcast) => <TableRow key={podcast.id} tabIndex={0} role="button" aria-label={`Open ${podcast.title}`} className="cursor-pointer" onClick={() => onChoose(podcast)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onChoose(podcast)}>
        <TableCell><div className="flex items-center gap-3"><PodcastArtwork podcast={podcast} /><div className="min-w-0"><p className="font-semibold text-zinc-950">{podcast.title}</p><p className="truncate text-xs text-zinc-500">{podcast.author.name || podcast.status || "Podcast show"}</p></div></div></TableCell>
        <TableCell className="hidden max-w-lg md:table-cell"><p className="line-clamp-2 text-zinc-600">{podcast.description || "No description available"}</p></TableCell>
        <TableCell className="hidden lg:table-cell"><div className="flex max-w-xs flex-wrap gap-1">{podcast.categories.slice(0, 3).map((category) => <span key={category.slug} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{category.title}</span>)}</div></TableCell>
        <TableCell className="text-right"><span className="font-semibold text-zinc-950">{formatCount(podcast.numberOfEpisodes)}</span><ChevronRight className="ml-2 inline h-4 w-4 text-zinc-300" /></TableCell>
      </TableRow>)}
    </TableBody></Table></Card>
  );
}

function PodcastCards({ podcasts, onChoose }: { podcasts: PodcastCandidate[]; onChoose: (podcast: PodcastCandidate) => void }) {
  return <div className="grid gap-3 md:grid-cols-2">{podcasts.map((podcast) => <button key={podcast.id} type="button" onClick={() => onChoose(podcast)} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left hover:border-zinc-400"><PodcastArtwork podcast={podcast} /><span className="min-w-0 flex-1"><span className="block font-semibold text-zinc-950">{podcast.title}</span><span className="mt-1 line-clamp-2 text-sm text-zinc-500">{podcast.description || podcast.author.name || "Podcast show"}</span></span><span className="shrink-0 text-right text-sm font-semibold text-zinc-950">{formatCount(podcast.numberOfEpisodes)}<span className="block text-[10px] font-normal text-zinc-400">episodes</span></span></button>)}</div>;
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
  savePending: boolean;
  contactPending: boolean;
  revealPending: boolean;
  pipelinePending: boolean;
  onClose: () => void;
  onSave: () => void;
  onAddContact: () => void;
  onReveal: () => void;
  onTargetShow: (id: string) => void;
  onStage: (stage: GuestStage) => void;
  onAddPipeline: () => void;
}

function PersonDrawer(props: PersonDrawerProps) {
  const { candidate, prospect, appearances, appearancesLoading, appearancesError } = props;
  return <Sheet open={Boolean(candidate)} onOpenChange={(open) => !open && props.onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">{candidate ? <><SheetHeader><div className="flex items-center gap-3"><PersonAvatar candidate={candidate} size="lg" /><div className="min-w-0"><SheetTitle className="truncate text-left">{candidate.name}</SheetTitle><p className="mt-1 line-clamp-2 text-sm text-zinc-500">{candidate.subtitle || candidate.location || "Guest profile"}</p></div></div></SheetHeader><div className="mt-6 space-y-6">
    <div className="grid gap-2 sm:grid-cols-3"><Button variant="outline" onClick={props.onSave} disabled={Boolean(prospect) || props.savePending}>{prospect ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <BookmarkPlus className="mr-1.5 h-4 w-4" />}{prospect ? "Saved as Prospect" : "Save as Prospect"}</Button><MasterContactButton masterContactId={prospect?.masterContactId} isPending={props.contactPending} onAdd={props.onAddContact} /><RevealEmailButton email={prospect?.email} canReveal={hasEnrichmentProfile(candidate.socialLinks)} isPending={props.revealPending} onConfirm={props.onReveal} /></div>
    <GuestSocialProfiles socialLinks={candidate.socialLinks} hostedPodcasts={appearances?.hostedPodcasts} />
    <section><SectionHeader title="Guest research" /><GuestResearchSummary subtitle={candidate.subtitle} bio={candidate.bio} location={candidate.location} creditedEpisodes={candidate.episodeAppearanceCount} /></section>
    <GuestAppearanceHistory guestName={candidate.name} appearances={appearances} isLoading={appearancesLoading} error={appearancesError} />
    <section><SectionHeader title="Add to guest pipeline" />{props.ownedPodcasts.length > 0 ? <div className="space-y-2.5 rounded-xl border border-zinc-200 p-4"><Select value={props.targetShowId} onValueChange={props.onTargetShow}><SelectTrigger><SelectValue placeholder="Choose your show" /></SelectTrigger><SelectContent>{props.ownedPodcasts.map((podcast) => <SelectItem key={podcast.id} value={podcast.id}>{podcast.title}</SelectItem>)}</SelectContent></Select><Select value={props.pipelineStage} onValueChange={(value) => props.onStage(value as GuestStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GUEST_STAGES.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}</SelectContent></Select><Button className="w-full" onClick={props.onAddPipeline} disabled={!props.targetShowId || props.pipelinePending || props.addedToPodcastId === props.targetShowId}>{props.addedToPodcastId === props.targetShowId ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}{props.addedToPodcastId === props.targetShowId ? "Added to Pipeline" : "Add to Guest Pipeline"}</Button></div> : <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">Connect a show to add this guest to a pipeline. <Link href="/dashboard/rss" className="underline">Connect a show →</Link></p>}</section>
  </div></> : null}</SheetContent></Sheet>;
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
