import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Loader2, Mail, Mic2, Star, Trash2, Users } from "lucide-react";
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";
import { MasterContactButton } from "@/components/guest/MasterContactButton";
import { StarButton } from "@/components/guest/StarButton";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { RevealEmailButton } from "@/components/guest/RevealEmailButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { usePromoteGuestContact } from "@/hooks/use-promote-guest-contact";
import { useToggleProspectStar } from "@/hooks/use-toggle-prospect-star";
import { GUEST_STAGES, type GuestStage } from "@/lib/guest-workflow";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SavedCreator {
  id: string;
  listName: string;
  handle: string;
  platform: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  followers?: number | null;
  engagementRate?: number | null;
  isVerified?: boolean | null;
}

interface GuestProspect {
  id: string;
  providerPersonId: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  profileUrl?: string | null;
  location?: string | null;
  bio?: string | null;
  email?: string | null;
  masterContactId?: string | null;
  pipelineStage?: string | null;
  starred?: boolean;
  episodeAppearanceCount?: number | null;
  socialLinks?: Record<string, string> | null;
}

interface PodcastOption {
  id: string;
  title: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  twitch: "Twitch",
};

function formatCount(n?: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function hasEnrichmentProfile(socialLinks?: Record<string, string> | null): boolean {
  return ["instagram", "youtube", "tiktok", "twitter", "twitch"].some((platform) => Boolean(socialLinks?.[platform]));
}

export default function Directory() {
  const { toast } = useToast();
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [pipelineStage, setPipelineStage] = useState<GuestStage>("prospect");
  const [addedToPodcastId, setAddedToPodcastId] = useState<string | null>(null);

  const { data: dashboard } = useQuery<{ podcasts: PodcastOption[] }>({ queryKey: ["/api/dashboard"] });
  const podcasts = dashboard?.podcasts ?? [];

  const { data, isLoading: creatorsLoading } = useQuery<{ creators: SavedCreator[] }>({
    queryKey: ["/api/discover/saved"],
  });
  const creators = data?.creators ?? [];

  const { data: prospectData, isLoading: prospectsLoading } = useQuery<{ prospects: GuestProspect[] }>({
    queryKey: ["/api/guest-prospects"],
  });
  const prospects = (prospectData?.prospects ?? []).filter((prospect) => prospect.starred);
  const selectedProspect = prospects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const appearanceQuery = useGuestAppearances(selectedProspect?.providerPersonId);
  const promoteContactMutation = usePromoteGuestContact();
  const toggleStarMutation = useToggleProspectStar();
  const isLoading = creatorsLoading || prospectsLoading;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/discover/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discover/saved"] });
      toast({ title: "Removed from directory" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove creator", variant: "destructive" });
    },
  });

  const addToPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProspect || !selectedPodcastId) throw new Error("Choose a guest and show first");
      const response = await apiRequest("POST", `/api/podcasts/${encodeURIComponent(selectedPodcastId)}/guests`, {
        guestProspectId: selectedProspect.id,
        stage: pipelineStage,
        notes: "Added from Guest Prospects",
      });
      return response.json();
    },
    onSuccess: () => {
      setAddedToPodcastId(selectedPodcastId);
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", selectedPodcastId, "guests"] });
      toast({ title: "Added to guest pipeline" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't add guest", description: error.message, variant: "destructive" });
    },
  });

  const revealEmailMutation = useMutation({
    mutationFn: async (prospectId: string) => {
      const response = await apiRequest("POST", `/api/guest-prospects/${encodeURIComponent(prospectId)}/reveal-email`);
      return response.json() as Promise<{ email: string; charged: boolean }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({
        title: result.charged ? "Email revealed" : "Saved email loaded",
        description: result.email,
      });
    },
    onError: (error: Error) => toast({ title: "Couldn't reveal email", description: error.message, variant: "destructive" }),
  });

  const openProspect = (id: string) => {
    setSelectedProspectId(id);
    setAddedToPodcastId(null);
  };

  const lists = new Map<string, SavedCreator[]>();
  for (const creator of creators) {
    const key = creator.listName || "Saved creators";
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key)!.push(creator);
  }

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm text-zinc-500">
          Your top picks — starred from Discover, Guest Pipeline, or Contacts. Star or unstar anywhere; this is just the filtered view.
        </p>
      </div>

      {isLoading ? null : lists.size === 0 && prospects.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No starred guests yet"
          description="Star your top picks anywhere you research a guest — Discover, Guest Pipeline, or Contacts — and they'll show up here."
          action={{ label: "Go to Discover", href: "/social/discover" }}
        />
      ) : (
        <div className="space-y-6">
          {prospects.length > 0 ? (
            <section>
              <SectionHeader title={`Starred guests · ${prospects.length}`} />
              <Card padding="none">
                <div className="divide-y divide-zinc-100">
                  {prospects.map((prospect) => (
                    <CardRow key={prospect.id}>
                      <StarButton
                        size="sm"
                        starred={prospect.starred}
                        isPending={toggleStarMutation.isPending && toggleStarMutation.variables?.id === prospect.id}
                        onToggle={() => toggleStarMutation.mutate({ id: prospect.id, starred: !prospect.starred })}
                        className="border-transparent bg-transparent hover:border-transparent hover:bg-transparent"
                      />
                      <button type="button" onClick={() => openProspect(prospect.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        {prospect.imageUrl ? (
                          <img src={prospect.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                            <Mic2 size={16} className="text-zinc-400" strokeWidth={1.75} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-950">{prospect.name}</span>
                          <span className="block truncate text-xs text-zinc-500">{prospect.subtitle || prospect.location || "Saved guest profile"}</span>
                        </span>
                        <span className="hidden shrink-0 text-right sm:block">
                          <span className="block text-sm font-medium text-zinc-950">{formatCount(prospect.episodeAppearanceCount)}</span>
                          <span className="block text-[11px] text-zinc-500">credited episodes</span>
                        </span>
                        <ChevronRight size={14} className="shrink-0 text-zinc-300" />
                      </button>
                    </CardRow>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {Array.from(lists.entries()).map(([listName, list]) => (
            <section key={listName}>
              <SectionHeader title={`Social profiles — ${listName} · ${list.length}`} />
              <Card padding="none">
                <div className="divide-y divide-zinc-100">
                  {list.map((creator) => (
                    <CardRow key={creator.id}>
                      {creator.profilePictureUrl ? (
                        <img
                          src={creator.profilePictureUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
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
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-sm font-medium text-zinc-950">
                          {formatCount(creator.followers)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {(creator.engagementRate ?? 0).toFixed(1)}% eng.
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(creator.id)}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${creator.handle}`}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </CardRow>
                  ))}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}

      <Sheet open={Boolean(selectedProspect)} onOpenChange={(open) => !open && setSelectedProspectId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">
          {selectedProspect ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {selectedProspect.imageUrl ? (
                    <img src={selectedProspect.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500">
                      {selectedProspect.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-left">{selectedProspect.name}</SheetTitle>
                    {selectedProspect.email ? (
                      <p className="flex items-center gap-1 truncate text-sm text-zinc-500"><Mail size={12} />{selectedProspect.email}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Contact details not added</p>
                    )}
                  </div>
                  <StarButton
                    starred={selectedProspect.starred}
                    isPending={toggleStarMutation.isPending}
                    onToggle={() => toggleStarMutation.mutate({ id: selectedProspect.id, starred: !selectedProspect.starred })}
                  />
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid gap-2 sm:grid-cols-2">
                  <MasterContactButton
                    masterContactId={selectedProspect.masterContactId}
                    isPending={promoteContactMutation.isPending}
                    onAdd={() => promoteContactMutation.mutate(selectedProspect.id)}
                    className="w-full"
                  />
                  <RevealEmailButton
                    email={selectedProspect.email}
                    canReveal={hasEnrichmentProfile(selectedProspect.socialLinks)}
                    isPending={revealEmailMutation.isPending}
                    onConfirm={() => revealEmailMutation.mutate(selectedProspect.id)}
                    className="w-full"
                  />
                </div>
                {/* The pipeline CTA is the other action a host reaches for
                    immediately — it sits with the rest of the CTAs instead of
                    after a full scroll through research and history. */}
                <section>
                  <SectionHeader title="Add to guest pipeline" />
                  {podcasts.length > 0 ? (
                    <div className="space-y-2.5 rounded-xl border border-zinc-200 p-4">
                      <Select value={selectedPodcastId} onValueChange={setSelectedPodcastId}>
                        <SelectTrigger><SelectValue placeholder="Choose a show" /></SelectTrigger>
                        <SelectContent>{podcasts.map((podcast) => <SelectItem key={podcast.id} value={podcast.id}>{podcast.title}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={pipelineStage} onValueChange={(value) => setPipelineStage(value as GuestStage)}>
                        <SelectTrigger><SelectValue placeholder="Choose a stage" /></SelectTrigger>
                        <SelectContent>{GUEST_STAGES.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button
                        className="w-full"
                        onClick={() => addToPipelineMutation.mutate()}
                        disabled={!selectedPodcastId || addToPipelineMutation.isPending || addedToPodcastId === selectedPodcastId}
                      >
                        {addedToPodcastId === selectedPodcastId ? "Added to Pipeline" : "Add to Guest Pipeline"}
                      </Button>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">Connect a show before adding this person to a pipeline.</p>
                  )}
                </section>
                <GuestSocialProfiles socialLinks={selectedProspect.socialLinks} hostedPodcasts={appearanceQuery.data?.hostedPodcasts} />
                <section>
                  <SectionHeader title="Guest research" />
                  <GuestResearchSummary
                    subtitle={selectedProspect.subtitle}
                    bio={selectedProspect.bio}
                    location={selectedProspect.location}
                    creditedEpisodes={selectedProspect.episodeAppearanceCount}
                  />
                </section>
                <GuestAppearanceHistory
                  guestName={selectedProspect.name}
                  appearances={appearanceQuery.data}
                  isLoading={appearanceQuery.isFetching}
                  error={appearanceQuery.error}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
