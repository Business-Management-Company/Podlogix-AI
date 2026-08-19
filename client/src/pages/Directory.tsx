import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, BookMarked, ChevronRight, Loader2, Mail, Mic2, Trash2, Users } from "lucide-react";
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { RevealEmailButton } from "@/components/guest/RevealEmailButton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { GUEST_STAGES, socialProfileSummary, type GuestStage } from "@/lib/guest-workflow";
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
  const prospects = prospectData?.prospects ?? [];
  const selectedProspect = prospects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const appearanceQuery = useGuestAppearances(selectedProspect?.providerPersonId);
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

  const deleteProspectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/guest-prospects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      toast({ title: "Removed from Shortlist" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't remove guest", description: error.message, variant: "destructive" });
    },
  });

  const addToPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProspect || !selectedPodcastId) throw new Error("Choose a guest and show first");
      const response = await apiRequest("POST", `/api/podcasts/${encodeURIComponent(selectedPodcastId)}/guests`, {
        guestProspectId: selectedProspect.id,
        stage: pipelineStage,
        notes: "Added from Shortlist",
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
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Shortlist</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saved guest profiles you can review and add to any show's pipeline.
        </p>
      </div>

      {isLoading ? null : lists.size === 0 && prospects.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No shortlisted guests yet"
          description="When you research a guest on Discover, save them here for later."
          action={{ label: "Go to Discover", href: "/social/discover" }}
        />
      ) : (
        <div className="space-y-6">
          {prospects.length > 0 ? (
            <section>
              <SectionHeader title={`Saved guests · ${prospects.length}`} />
              <Card padding="none">
                <div className="divide-y divide-zinc-100">
                  {prospects.map((prospect) => (
                    <CardRow key={prospect.id}>
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
                      <button
                        onClick={() => deleteProspectMutation.mutate(prospect.id)}
                        disabled={deleteProspectMutation.isPending}
                        className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${prospect.name}`}
                      >
                        {deleteProspectMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
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
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left">{selectedProspect.name}</SheetTitle>
                    {selectedProspect.email ? (
                      <p className="flex items-center gap-1 truncate text-sm text-zinc-500"><Mail size={12} />{selectedProspect.email}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Contact details not added</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <RevealEmailButton
                  email={selectedProspect.email}
                  canReveal={hasEnrichmentProfile(selectedProspect.socialLinks)}
                  isPending={revealEmailMutation.isPending}
                  onConfirm={() => revealEmailMutation.mutate(selectedProspect.id)}
                  className="w-full"
                />
                <section>
                  <SectionHeader title="Guest research" />
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    {selectedProspect.subtitle ? <p className="text-sm font-medium text-zinc-900">{selectedProspect.subtitle}</p> : null}
                    {selectedProspect.bio ? <p className="mt-2 text-sm leading-6 text-zinc-600">{selectedProspect.bio}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                      {selectedProspect.location ? <span>{selectedProspect.location}</span> : null}
                      {selectedProspect.episodeAppearanceCount != null ? <span>{selectedProspect.episodeAppearanceCount.toLocaleString()} credited episodes (all roles)</span> : null}
                    </div>
                    {Object.keys(selectedProspect.socialLinks ?? {}).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(selectedProspect.socialLinks ?? {}).map(([platform, url]) => (
                          <span key={platform} className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600">
                            {socialProfileSummary(platform, url)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
                <GuestAppearanceHistory
                  appearances={appearanceQuery.data}
                  isLoading={appearanceQuery.isFetching}
                  error={appearanceQuery.error}
                />
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
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
