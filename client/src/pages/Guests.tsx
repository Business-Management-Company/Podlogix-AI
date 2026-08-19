import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Briefcase, ChevronRight, Compass, Loader2, Mail, Plus, Search, Send, StickyNote, Users,
} from "lucide-react";
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";
import { MasterContactButton } from "@/components/guest/MasterContactButton";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { RevealEmailButton } from "@/components/guest/RevealEmailButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { usePromoteGuestContact } from "@/hooks/use-promote-guest-contact";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GUEST_STAGES, guestStageMeta } from "@/lib/guest-workflow";
import type { ContactNote, EmailContact, GuestPipelineEntry, GuestProspect } from "@shared/schema";

interface DashboardData {
  podcasts: Array<{ id: string; title: string }>;
}

interface BuzzsproutStatus {
  connected: boolean;
  connection?: { id: string; podcastTitle?: string | null };
}

type GuestEntry = GuestPipelineEntry & {
  contact: EmailContact | undefined;
  prospect: GuestProspect | undefined;
};

const AVATAR_TONES = [
  "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-rose-600",
  "bg-amber-600", "bg-cyan-600", "bg-indigo-600",
];

function guestName(contact: EmailContact | undefined, prospect?: GuestProspect) {
  if (prospect?.name) return prospect.name;
  if (!contact) return "Unknown guest";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.email || "Unknown guest";
}

function guestEmail(contact: EmailContact | undefined, prospect?: GuestProspect): string | null {
  return contact?.email || prospect?.email || null;
}

function initials(contact: EmailContact | undefined, prospect?: GuestProspect) {
  const name = guestName(contact, prospect);
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function avatarTone(contact: EmailContact | undefined, prospect?: GuestProspect) {
  const key = contact?.email ?? prospect?.providerPersonId ?? "?";
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function hasEnrichmentProfile(prospect?: GuestProspect): boolean {
  return ["instagram", "youtube", "tiktok", "twitter", "twitch"]
    .some((platform) => Boolean(prospect?.socialLinks?.[platform]));
}

function relativeDate(iso: string | Date | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Guests() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newGuest, setNewGuest] = useState({ email: "", firstName: "", lastName: "", notes: "" });
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<EmailContact>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [selectedPodcastId, setSelectedPodcastId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("showId") ?? "";
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });
  const { data: buzzsprout, isLoading: buzzsproutLoading } = useQuery<BuzzsproutStatus>({
    queryKey: ["/api/connectors/buzzsprout/status"],
    retry: false,
  });
  const nativePodcasts = dashboard?.podcasts ?? [];
  const buzzsproutPodcast = buzzsprout?.connected && buzzsprout.connection?.id
    && !nativePodcasts.some((item) => item.title.trim().toLowerCase() === buzzsprout.connection?.podcastTitle?.trim().toLowerCase())
    ? [{ id: `buzzsprout:${buzzsprout.connection.id}`, title: buzzsprout.connection.podcastTitle || "Buzzsprout show" }]
    : [];
  const podcasts = [...nativePodcasts, ...buzzsproutPodcast];
  const podcast = podcasts.find((item) => item.id === selectedPodcastId) ?? podcasts[0];

  const { data: guests, isLoading: guestsLoading } = useQuery<GuestEntry[]>({
    queryKey: ["/api/podcasts", podcast?.id, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${encodeURIComponent(podcast!.id)}/guests`);
      if (!res.ok) throw new Error("guest pipeline unavailable");
      return res.json();
    },
    enabled: !!podcast,
  });

  const selected = (guests ?? []).find((g) => g.id === selectedId) ?? null;
  const appearanceQuery = useGuestAppearances(selected?.prospect?.providerPersonId);

  const { data: notesData } = useQuery<{ notes: ContactNote[] }>({
    queryKey: ["/api/email/contacts", selected?.contactId, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/email/contacts/${selected!.contactId}/notes`);
      if (!res.ok) throw new Error("notes unavailable");
      return res.json();
    },
    enabled: !!selected?.contactId,
  });
  const notes = notesData?.notes ?? [];

  const invalidateGuests = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "guests"] });

  const addGuestMutation = useMutation({
    mutationFn: async (guest: typeof newGuest) => {
      const res = await apiRequest("POST", `/api/podcasts/${encodeURIComponent(podcast!.id)}/guests`, guest);
      return res.json();
    },
    onSuccess: () => {
      invalidateGuests();
      setShowAdd(false);
      setNewGuest({ email: "", firstName: "", lastName: "", notes: "" });
      toast({ title: "Guest added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add guest", variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/guest-pipeline/${id}`, { stage });
      return res.json();
    },
    onSuccess: invalidateGuests,
    onError: () => {
      toast({ title: "Error", description: "Failed to update stage", variant: "destructive" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!selected?.contactId) throw new Error("no contact");
      const res = await apiRequest("PATCH", `/api/email/contacts/${selected.contactId}`, draft);
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    onSuccess: () => {
      invalidateGuests();
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      setDraft({});
      toast({ title: "Contact saved" });
    },
    onError: (error: Error) => toast({ title: "Couldn't save contact", description: error.message, variant: "destructive" }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/email/contacts/${selected!.contactId}/notes`, {
        body: noteDraft,
      });
      if (!res.ok) throw new Error("note failed");
      return res.json();
    },
    onSuccess: () => {
      setNoteDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts", selected?.contactId, "notes"] });
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Couldn't add note", variant: "destructive" }),
  });

  const revealEmailMutation = useMutation({
    mutationFn: async (prospectId: string) => {
      const res = await apiRequest("POST", `/api/guest-prospects/${encodeURIComponent(prospectId)}/reveal-email`);
      return res.json() as Promise<{ email: string; charged: boolean }>;
    },
    onSuccess: (result) => {
      invalidateGuests();
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts"] });
      toast({ title: result.charged ? "Email revealed" : "Saved email loaded", description: result.email });
    },
    onError: (error: Error) => toast({ title: "Couldn't reveal email", description: error.message, variant: "destructive" }),
  });

  const promoteContactMutation = usePromoteGuestContact();

  const inviteGuest = (entry: GuestEntry) => {
    const email = guestEmail(entry.contact, entry.prospect);
    if (!email) {
      toast({ title: "Contact details needed", description: "Find or add an email address before inviting this guest." });
      return;
    }
    updateStageMutation.mutate({ id: entry.id, stage: "invited" });
    const name = entry.contact?.firstName || entry.prospect?.informalName || guestName(entry.contact, entry.prospect);
    const subject = encodeURIComponent(`Invitation to join ${podcast?.title ?? "our podcast"}`);
    const body = encodeURIComponent(
      `Hi ${name},\n\nI'd love to have you on ${podcast?.title ?? "the show"} as a guest. ` +
      `I think our audience would get a lot from your perspective.\n\n` +
      `Would you be open to it? Happy to work around your schedule.\n\nBest,\n`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    toast({ title: "Marked as invited", description: "Your invitation email is ready to send." });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guests ?? [])
      .filter((g) => stageFilter === "all" || g.stage === stageFilter)
      .filter((g) => {
        if (!q) return true;
        const hay = [
          guestName(g.contact, g.prospect), guestEmail(g.contact, g.prospect), g.contact?.company,
          g.contact?.title, g.prospect?.subtitle, g.prospect?.location,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
  }, [guests, search, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of guests ?? []) counts.set(g.stage, (counts.get(g.stage) ?? 0) + 1);
    return counts;
  }, [guests]);

  const isLoading = dashboardLoading || buzzsproutLoading || (!!podcast && guestsLoading);
  const totalGuests = guests?.length ?? 0;

  const openDrawer = (entry: GuestEntry) => {
    setSelectedId(entry.id);
    setDraft({});
    setNoteDraft("");
  };

  const draftValue = (field: keyof EmailContact): string =>
    String((draft[field] ?? selected?.contact?.[field] ?? "") as string);

  return (
    <div className="w-full max-w-[1100px] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Guest pipeline</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track each show's guests from prospect through published and follow-up.
          </p>
        </div>
        <div className="flex gap-2">
          {podcast ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/social/discover?showId=${encodeURIComponent(podcast.id)}`}>
                <Compass className="mr-1.5 h-3.5 w-3.5" />
                Find a guest
              </Link>
            </Button>
          ) : null}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!podcast}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add manually
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a guest</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Email"
                type="email"
                value={newGuest.email}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="First name"
                  value={newGuest.firstName}
                  onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                />
                <Input
                  placeholder="Last name"
                  value={newGuest.lastName}
                  onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Notes (optional)"
                value={newGuest.notes}
                onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => addGuestMutation.mutate(newGuest)}
                disabled={addGuestMutation.isPending || !newGuest.email}
              >
                {addGuestMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Add guest
              </Button>
            </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {podcasts.length > 1 ? (
        <div className="mb-5 max-w-sm">
          <Select value={podcast?.id ?? ""} onValueChange={setSelectedPodcastId}>
            <SelectTrigger><SelectValue placeholder="Choose a show" /></SelectTrigger>
            <SelectContent>
              {podcasts.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : !podcast ? (
        <EmptyState
          icon={Users}
          title="Connect a show first"
          description="Guests are tracked per show. Add your podcast's RSS feed to get started."
          action={{ label: "Connect a show", href: "/dashboard/rss" }}
        />
      ) : totalGuests === 0 ? (
        <EmptyState
          icon={Users}
          title="No guests yet"
          description="Discover a potential guest or add someone you already know."
          action={{ label: "Find a guest", href: `/social/discover?showId=${encodeURIComponent(podcast.id)}` }}
        />
      ) : (
        <>
          {/* Search + stage filters */}
          <div className="mb-4 space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search guests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStageFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  stageFilter === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
                }`}
              >
                All · {totalGuests}
              </button>
              {GUEST_STAGES.map((stage) => {
                const count = stageCounts.get(stage.id) ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setStageFilter(stageFilter === stage.id ? "all" : stage.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      stageFilter === stage.id ? "bg-zinc-950 text-white" : `${stage.chip} hover:opacity-80`
                    }`}
                  >
                    {stage.label} · {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact list */}
          <Card padding="none" className="divide-y divide-zinc-100">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">No guests match.</p>
            ) : (
              filtered.map((entry) => {
                const meta = guestStageMeta(entry.stage);
                return (
                  <button
                    key={entry.id}
                    onClick={() => openDrawer(entry)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    {entry.prospect?.imageUrl ? (
                      <img src={entry.prospect.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover" />
                    ) : (
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarTone(entry.contact, entry.prospect)}`}>
                        {initials(entry.contact, entry.prospect)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-950">
                        {guestName(entry.contact, entry.prospect)}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {[guestEmail(entry.contact, entry.prospect), entry.prospect?.subtitle, [entry.contact?.title, entry.contact?.company].filter(Boolean).join(" · ")]
                          .filter(Boolean)
                          .join("  ·  ")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-zinc-300" />
                  </button>
                );
              })
            )}
          </Card>
        </>
      )}

      {/* ── Contact drawer ── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {selected.prospect?.imageUrl ? (
                    <img src={selected.prospect.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 object-cover" />
                  ) : (
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${avatarTone(selected.contact, selected.prospect)}`}>
                      {initials(selected.contact, selected.prospect)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left">{guestName(selected.contact, selected.prospect)}</SheetTitle>
                    {guestEmail(selected.contact, selected.prospect) ? (
                      <a href={`mailto:${guestEmail(selected.contact, selected.prospect)}`} className="flex items-center gap-1 truncate text-sm text-zinc-500 hover:text-zinc-800">
                        <Mail size={12} className="shrink-0" />
                        {guestEmail(selected.contact, selected.prospect)}
                      </a>
                    ) : (
                      <p className="text-sm text-zinc-400">Contact details not added</p>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-6">
                {/* Stage + invite */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-zinc-500">Pipeline stage</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selected.stage}
                      onValueChange={(value) => updateStageMutation.mutate({ id: selected.id, stage: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GUEST_STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selected.stage === "prospect" && guestEmail(selected.contact, selected.prospect) ? (
                      <Button size="sm" onClick={() => inviteGuest(selected)}>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Invite
                      </Button>
                    ) : null}
                  </div>
                </div>

                <section>
                  <SectionHeader title="Contact information" />
                  <div className="space-y-2.5">
                    {selected.prospect ? (
                      <MasterContactButton
                        masterContactId={selected.contactId}
                        isPending={promoteContactMutation.isPending}
                        onAdd={() => promoteContactMutation.mutate(selected.prospect!.id)}
                        className="w-full"
                      />
                    ) : null}

                    {selected.prospect && !guestEmail(selected.contact, selected.prospect) ? (
                      <RevealEmailButton
                        canReveal={hasEnrichmentProfile(selected.prospect)}
                        isPending={revealEmailMutation.isPending}
                        onConfirm={() => revealEmailMutation.mutate(selected.prospect!.id)}
                        className="w-full"
                      />
                    ) : null}

                    {selected.contact ? (
                      <>
                        <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
                          Email address
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              className="pl-9"
                              value={draftValue("email")}
                              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                              data-testid="input-guest-contact-email"
                            />
                          </div>
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <Input
                            placeholder="First name"
                            value={draftValue("firstName")}
                            onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                          />
                          <Input
                            placeholder="Last name"
                            value={draftValue("lastName")}
                            onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                          />
                        </div>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                          <Input
                            placeholder="Company"
                            className="pl-9"
                            value={draftValue("company")}
                            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                          />
                        </div>
                        <Input
                          placeholder="Role / title"
                          value={draftValue("title")}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        />
                        {Object.keys(draft).length > 0 && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => updateContactMutation.mutate()}
                            disabled={updateContactMutation.isPending}
                          >
                            {updateContactMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Save details
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Add this prospect to Master Contacts to save their contact details and notes.
                      </p>
                    )}
                  </div>
                </section>

                {selected.prospect ? (
                  <GuestSocialProfiles socialLinks={selected.prospect.socialLinks} />
                ) : null}

                {selected.prospect ? (
                  <section>
                    <SectionHeader title="Guest research" />
                    <GuestResearchSummary
                      subtitle={selected.prospect.subtitle}
                      bio={selected.prospect.bio}
                      location={selected.prospect.location}
                      creditedEpisodes={selected.prospect.episodeAppearanceCount}
                      compact
                    />
                  </section>
                ) : null}

                {selected.prospect?.providerPersonId ? (
                  <GuestAppearanceHistory
                    guestName={selected.prospect.name}
                    appearances={appearanceQuery.data}
                    isLoading={appearanceQuery.isFetching}
                    error={appearanceQuery.error}
                  />
                ) : null}

                {/* Notes */}
                <section>
                  <SectionHeader title={`Notes (${notes.length})`} />
                  <div className="space-y-2.5">
                    {selected.contactId ? (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Add a note — calls, topics, follow-ups…"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={2}
                          className="flex-1 resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          className="self-end"
                          onClick={() => addNoteMutation.mutate()}
                          disabled={!noteDraft.trim() || addNoteMutation.isPending}
                        >
                          {addNoteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">Contact notes become available after an email contact is attached.</p>
                    )}
                    {selected.notes && (
                      <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Pipeline note</p>
                        <p className="whitespace-pre-wrap text-sm text-zinc-700">{selected.notes}</p>
                      </div>
                    )}
                    {notes.map((note) => (
                      <div key={note.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                        <p className="whitespace-pre-wrap text-sm text-zinc-800">{note.body}</p>
                        <p className="mt-1 text-[10px] text-zinc-400">{relativeDate(note.createdAt)}</p>
                      </div>
                    ))}
                    {notes.length === 0 && !selected.notes && (
                      <p className="text-xs text-zinc-400">No notes yet — the story starts here.</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
