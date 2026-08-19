import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BookmarkPlus,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Mic2,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  socialLinks: { twitter: string | null; wikipedia: string | null };
}

interface GuestEpisode {
  creditId: string | null;
  episodeId: string;
  episodeTitle: string;
  airDate: string | null;
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
}

interface GuestPodcast {
  podcastId: string;
  podcastTitle: string;
  podcastImageUrl: string | null;
  episodeCount: number;
}

interface AppearanceResult {
  creatorId: string;
  guestEpisodes: GuestEpisode[];
  guestPodcasts: GuestPodcast[];
  pagination: { guestEpisodesTotal: number; guestPodcastsTotal: number };
}

interface GuestProspect {
  id: string;
  providerPersonId: string;
  name: string;
  email: string | null;
  socialLinks: Record<string, string> | null;
}

interface IcCreator {
  handle?: string;
  platform?: string;
  name?: string;
  profilePicture?: string | null;
  followers?: number;
  email?: string | null;
  location?: string | null;
}

interface PodcastOption {
  id: string;
  title: string;
}

interface BuzzsproutStatus {
  connected: boolean;
  connection?: { id: string; podcastTitle?: string | null };
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  twitch: "Twitch",
};

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
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function socialProfileUrl(platform: string, handle: string): string {
  const normalized = handle.replace(/^@/, "");
  const bases: Record<string, string> = {
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/@",
    youtube: "https://youtube.com/@",
    twitter: "https://x.com/",
    twitch: "https://twitch.tv/",
  };
  return `${bases[platform] ?? "https://"}${normalized}`;
}

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

function PersonAvatar({ candidate, size = "lg" }: { candidate: CreatorCandidate; size?: "md" | "lg" }) {
  const classes = size === "lg" ? "h-16 w-16" : "h-11 w-11";
  if (candidate.imageUrl) {
    return <img src={candidate.imageUrl} alt="" className={`${classes} shrink-0 rounded-full border border-zinc-200 object-cover`} />;
  }
  return (
    <div className={`flex ${classes} shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50`}>
      <Users size={size === "lg" ? 22 : 17} className="text-zinc-400" strokeWidth={1.75} />
    </div>
  );
}

function CandidateRow({ candidate, selected, onSelect }: { candidate: CreatorCandidate; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${selected ? "bg-orange-50" : "hover:bg-zinc-50"}`}
    >
      <PersonAvatar candidate={candidate} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-950">{candidate.name}</span>
        <span className="mt-0.5 block truncate text-xs text-zinc-500">
          {candidate.subtitle || candidate.location || "Podchaser creator profile"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-medium text-zinc-900">{formatCount(candidate.episodeAppearanceCount)}</span>
        <span className="block text-[11px] text-zinc-500">appearances</span>
      </span>
    </button>
  );
}

export default function SocialDiscover() {
  const { toast } = useToast();
  const [searchInput, setSearchInput] = useState(() => queryParam("person"));
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<CreatorCandidate | null>(null);
  const [selectedPodcastId, setSelectedPodcastId] = useState(() => queryParam("showId"));
  const [showIcPanel, setShowIcPanel] = useState(false);
  const [icPlatform, setIcPlatform] = useState("instagram");
  const [addedToPodcastId, setAddedToPodcastId] = useState<string | null>(null);

  const { data: dashboard } = useQuery<{ podcasts: PodcastOption[] }>({ queryKey: ["/api/dashboard"] });
  const { data: buzzsprout } = useQuery<BuzzsproutStatus>({
    queryKey: ["/api/connectors/buzzsprout/status"],
    retry: false,
  });
  const nativePodcasts = dashboard?.podcasts ?? [];
  const buzzsproutPodcast = buzzsprout?.connected && buzzsprout.connection?.id
    && !nativePodcasts.some((podcast) => podcast.title.trim().toLowerCase() === buzzsprout.connection?.podcastTitle?.trim().toLowerCase())
    ? [{ id: `buzzsprout:${buzzsprout.connection.id}`, title: buzzsprout.connection.podcastTitle || "Buzzsprout show" }]
    : [];
  const podcasts = [...nativePodcasts, ...buzzsproutPodcast];
  const targetPodcastId = podcasts.some((podcast) => podcast.id === selectedPodcastId)
    ? selectedPodcastId
    : "";

  const searchQuery = useQuery<{ creatorCandidates: CreatorCandidate[] }>({
    queryKey: ["/api/guest-discovery/search", submittedQuery],
    queryFn: () => fetchJson(`/api/guest-discovery/search?q=${encodeURIComponent(submittedQuery)}&max=10`),
    enabled: submittedQuery.length >= 2,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const appearanceQuery = useQuery<AppearanceResult>({
    queryKey: ["/api/guest-discovery/creators", selectedCreator?.id, "appearances"],
    queryFn: () => fetchJson(`/api/guest-discovery/creators/${encodeURIComponent(selectedCreator!.id)}/appearances?max=10`),
    enabled: Boolean(selectedCreator?.id),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });

  const { data: prospectData } = useQuery<{ prospects: GuestProspect[] }>({ queryKey: ["/api/guest-prospects"] });
  const savedProspect = selectedCreator
    ? prospectData?.prospects.find((prospect) => prospect.providerPersonId === selectedCreator.id) ?? null
    : null;

  const saveProspectMutation = useMutation({
    mutationFn: async (candidate: CreatorCandidate) => {
      const response = await apiRequest("POST", "/api/guest-prospects", candidatePayload(candidate));
      return response.json() as Promise<GuestProspect>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      toast({ title: "Saved to Shortlist" });
    },
    onError: (error: Error) => toast({ title: "Couldn't save guest", description: error.message, variant: "destructive" }),
  });

  const addToPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCreator || !targetPodcastId) throw new Error("Choose a guest and show first");
      let prospect = savedProspect;
      if (!prospect) {
        const saveResponse = await apiRequest("POST", "/api/guest-prospects", candidatePayload(selectedCreator));
        prospect = await saveResponse.json() as GuestProspect;
      }
      const response = await apiRequest("POST", `/api/podcasts/${encodeURIComponent(targetPodcastId)}/guests`, {
        guestProspectId: prospect.id,
        stage: "prospect",
        notes: `Researched through Podchaser · ${appearanceQuery.data?.pagination.guestEpisodesTotal ?? 0} guest episodes found`,
      });
      return response.json();
    },
    onSuccess: () => {
      setAddedToPodcastId(targetPodcastId);
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", targetPodcastId, "guests"] });
      toast({ title: "Added as a prospect" });
    },
    onError: (error: Error) => toast({ title: "Couldn't add prospect", description: error.message, variant: "destructive" }),
  });

  const { data: creditsData } = useQuery<{ credits?: { available?: number } }>({
    queryKey: ["/api/social-analytics/credits"],
    enabled: showIcPanel,
    retry: false,
  });

  const icSearchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCreator) throw new Error("Choose a guest first");
      const response = await apiRequest("POST", "/api/social-analytics/discover", {
        platform: icPlatform,
        aiPrompt: [selectedCreator.name, selectedCreator.location, selectedCreator.subtitle].filter(Boolean).join(", "),
        limit: 5,
        offset: 0,
      });
      return response.json() as Promise<{ creators: IcCreator[] }>;
    },
    onError: (error: Error) => toast({ title: "IC search failed", description: error.message, variant: "destructive" }),
  });

  const saveIcProfileMutation = useMutation({
    mutationFn: async (creator: IcCreator) => {
      if (!selectedCreator || !creator.handle) throw new Error("That result has no social handle");
      let prospect = savedProspect;
      if (!prospect) {
        const saveResponse = await apiRequest("POST", "/api/guest-prospects", candidatePayload(selectedCreator));
        prospect = await saveResponse.json() as GuestProspect;
      }
      const platform = creator.platform || icPlatform;
      const response = await apiRequest("PATCH", `/api/guest-prospects/${prospect.id}/enrichment`, {
        email: creator.email || undefined,
        socialLinks: { [platform]: socialProfileUrl(platform, creator.handle) },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      toast({ title: "Social profile saved" });
    },
    onError: (error: Error) => toast({ title: "Couldn't save profile", description: error.message, variant: "destructive" }),
  });

  const submitSearch = () => {
    const query = searchInput.trim();
    if (query.length < 2) return;
    setSelectedCreator(null);
    setSubmittedQuery(query);
    setShowIcPanel(false);
    icSearchMutation.reset();
  };

  const chooseCreator = (candidate: CreatorCandidate) => {
    setSelectedCreator(candidate);
    setShowIcPanel(false);
    setIcPlatform(candidate.socialLinks.twitter ? "twitter" : "instagram");
    setAddedToPodcastId(null);
    icSearchMutation.reset();
  };

  const candidates = searchQuery.data?.creatorCandidates ?? [];
  const appearances = appearanceQuery.data;

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Discover guests</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Find the right person through their podcast history. Social enrichment is optional and only runs when you request it.
        </p>
      </div>

      <section>
        <SectionHeader title="Search Podchaser" />
        <Card padding="lg">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Guest name"
              placeholder="Search by guest name, e.g. Andrew Huberman"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitSearch()}
              className="flex-1"
            />
            <Button onClick={submitSearch} disabled={searchInput.trim().length < 2 || searchQuery.isFetching}>
              {searchQuery.isFetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              Find guests
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Search runs only when submitted, preserving the shared Podchaser allowance.</p>
        </Card>
      </section>

      {searchQuery.isError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{searchQuery.error.message}</p>
      ) : submittedQuery && !searchQuery.isFetching && candidates.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Search} title="No matching guests" description="Try the person's full name or a different spelling." /></div>
      ) : candidates.length > 0 ? (
        <section className="mt-6">
          <SectionHeader title={`Choose the right person · ${candidates.length} matches`} />
          <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">
            {candidates.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} selected={candidate.id === selectedCreator?.id} onSelect={() => chooseCreator(candidate)} />
            ))}
          </Card>
        </section>
      ) : !submittedQuery ? (
        <div className="mt-4">
          <EmptyState icon={Mic2} title="Start with a guest's name" description="We'll show possible identities first, then load podcast and episode appearances after you choose one." />
        </div>
      ) : null}

      {selectedCreator ? (
        <div className="mt-7 space-y-6">
          <section>
            <SectionHeader title="Guest research" />
            <Card padding="lg">
              <div className="flex flex-col gap-4 sm:flex-row">
                <PersonAvatar candidate={selectedCreator} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-zinc-950">{selectedCreator.name}</h2>
                  {selectedCreator.subtitle ? <p className="mt-1 text-sm text-zinc-600">{selectedCreator.subtitle}</p> : null}
                  {selectedCreator.location ? <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500"><MapPin size={12} />{selectedCreator.location}</p> : null}
                  {selectedCreator.bio ? <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{selectedCreator.bio}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {selectedCreator.profileUrl ? <a href={selectedCreator.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950">Podchaser <ExternalLink size={11} /></a> : null}
                    {selectedCreator.socialLinks.twitter ? <a href={selectedCreator.socialLinks.twitter} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950">X profile <ExternalLink size={11} /></a> : null}
                    {selectedCreator.socialLinks.wikipedia ? <a href={selectedCreator.socialLinks.wikipedia} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-950">Wikipedia <ExternalLink size={11} /></a> : null}
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-2xl font-semibold text-zinc-950">{appearanceQuery.isFetching ? "—" : formatCount(appearances?.pagination.guestEpisodesTotal)}</p>
                  <p className="text-xs text-zinc-500">Structured guest episodes</p>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-2xl font-semibold text-zinc-950">{appearanceQuery.isFetching ? "—" : formatCount(appearances?.pagination.guestPodcastsTotal)}</p>
                  <p className="text-xs text-zinc-500">Podcasts appeared on</p>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader title="Next step" />
            <Card padding="lg">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <Button variant="outline" onClick={() => saveProspectMutation.mutate(selectedCreator)} disabled={Boolean(savedProspect) || saveProspectMutation.isPending} className="lg:flex-1">
                  {savedProspect ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <BookmarkPlus className="mr-1.5 h-4 w-4" />}
                  {savedProspect ? "Saved to Shortlist" : "Save to Shortlist"}
                </Button>
                {podcasts.length > 0 ? (
                  <>
                  <Select value={targetPodcastId} onValueChange={setSelectedPodcastId}>
                    <SelectTrigger className="w-full lg:w-64"><SelectValue placeholder="Choose a show" /></SelectTrigger>
                    <SelectContent>{podcasts.map((podcast) => <SelectItem key={podcast.id} value={podcast.id}>{podcast.title}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={() => addToPipelineMutation.mutate()} disabled={!targetPodcastId || addToPipelineMutation.isPending || addedToPodcastId === targetPodcastId} className="lg:flex-1">
                    {addedToPodcastId === targetPodcastId ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                    {addedToPodcastId === targetPodcastId ? "Added as Prospect" : "Add as Prospect"}
                  </Button>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Connect a show to add this guest to a pipeline. <Link href="/dashboard/rss" className="underline">Connect a show →</Link></p>
                )}
              </div>
            </Card>
          </section>

          {appearanceQuery.isError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{appearanceQuery.error.message}</p>
          ) : appearanceQuery.isFetching ? (
            <Card padding="lg"><p className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading guest appearances…</p></Card>
          ) : appearances ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <SectionHeader title="Podcast history" />
                <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">
                  {appearances.guestPodcasts.map((podcast) => (
                    <CardRow key={`${podcast.podcastId}-${podcast.podcastTitle}`}>
                      {podcast.podcastImageUrl ? <img src={podcast.podcastImageUrl} alt="" className="h-10 w-10 rounded-lg border border-zinc-200 object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100"><Mic2 size={15} className="text-zinc-400" /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-950">{podcast.podcastTitle}</p>
                        <p className="text-xs text-zinc-500">{podcast.episodeCount} credited appearance{podcast.episodeCount === 1 ? "" : "s"}</p>
                      </div>
                    </CardRow>
                  ))}
                </Card>
              </section>
              <section>
                <SectionHeader title="Recent guest episodes" />
                <Card padding="none" className="divide-y divide-zinc-100 overflow-hidden">
                  {appearances.guestEpisodes.map((episode) => (
                    <CardRow key={`${episode.creditId}-${episode.episodeId}`}>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium text-zinc-950">{episode.episodeTitle}</p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{episode.podcastTitle} · {formatDate(episode.airDate)}</p>
                      </div>
                    </CardRow>
                  ))}
                </Card>
              </section>
            </div>
          ) : null}

          <section>
            <SectionHeader title="Optional social enrichment" />
            <Card padding="lg">
              {!showIcPanel ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-950">Need another social profile or contact email?</p>
                    <p className="mt-1 text-xs text-zinc-500">IC is never called automatically. Search only after confirming this is the right person.</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowIcPanel(true)}><Sparkles className="mr-1.5 h-4 w-4" />Find with IC</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={icPlatform} onValueChange={setIcPlatform}>
                      <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(PLATFORM_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={() => icSearchMutation.mutate()} disabled={icSearchMutation.isPending}>
                      {icSearchMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
                      Search IC — uses credits
                    </Button>
                    {creditsData?.credits?.available !== undefined ? <span className="self-center text-xs text-zinc-500">{creditsData.credits.available.toFixed(2)} IC credits left</span> : null}
                  </div>
                  {icSearchMutation.data?.creators?.length === 0 ? <p className="text-sm text-zinc-500">No matching social profiles found.</p> : null}
                  {icSearchMutation.data?.creators?.length ? (
                    <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                      {icSearchMutation.data.creators.map((creator, index) => (
                        <div key={`${creator.handle}-${index}`} className="flex items-center gap-3 px-3 py-3">
                          {creator.profilePicture ? <img src={creator.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100"><Users size={14} className="text-zinc-400" /></div>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-950">{creator.name || creator.handle}</p>
                            <p className="truncate text-xs text-zinc-500">@{creator.handle} · {formatCount(creator.followers)} followers{creator.location ? ` · ${creator.location}` : ""}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => saveIcProfileMutation.mutate(creator)} disabled={!creator.handle || saveIcProfileMutation.isPending}>Use profile</Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          </section>
        </div>
      ) : null}
    </div>
  );
}
