import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Briefcase, ChevronRight, Loader2, Mail, Mic2, Plus, Search, Send, StickyNote, Users,
} from "lucide-react";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ContactNote, EmailContact, GuestPipelineEntry } from "@shared/schema";

interface DashboardData {
  podcasts: Array<{ id: string; title: string }>;
}

type GuestEntry = GuestPipelineEntry & { contact: EmailContact | undefined };

const STAGES = [
  { id: "prospect", label: "Prospect", chip: "bg-zinc-100 text-zinc-600" },
  { id: "invited", label: "Invited", chip: "bg-amber-100 text-amber-800" },
  { id: "booked", label: "Booked", chip: "bg-blue-100 text-blue-800" },
  { id: "recorded", label: "Recorded", chip: "bg-purple-100 text-purple-800" },
  { id: "published", label: "Published", chip: "bg-emerald-100 text-emerald-800" },
  { id: "follow_up", label: "Follow up", chip: "bg-orange-100 text-orange-800" },
  { id: "alumni", label: "Alumni", chip: "bg-slate-100 text-slate-600" },
] as const;

const AVATAR_TONES = [
  "bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-rose-600",
  "bg-amber-600", "bg-cyan-600", "bg-indigo-600",
];

function guestName(contact: EmailContact | undefined) {
  if (!contact) return "Unknown guest";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.email;
}

function initials(contact: EmailContact | undefined) {
  const name = guestName(contact);
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

function avatarTone(contact: EmailContact | undefined) {
  const key = contact?.email ?? "?";
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function stageMeta(stage: string) {
  return STAGES.find((s) => s.id === stage) ?? STAGES[0];
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

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });
  const podcast = dashboard?.podcasts?.[0];

  const { data: guests, isLoading: guestsLoading } = useQuery<GuestEntry[]>({
    queryKey: ["/api/podcasts", podcast?.id, "guests"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${podcast!.id}/guests`);
      return res.json();
    },
    enabled: !!podcast,
  });

  const selected = (guests ?? []).find((g) => g.id === selectedId) ?? null;

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
      const res = await apiRequest("POST", `/api/podcasts/${podcast!.id}/guests`, guest);
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
      setDraft({});
      toast({ title: "Contact saved" });
    },
    onError: () => toast({ title: "Couldn't save contact", variant: "destructive" }),
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

  const inviteGuest = (entry: GuestEntry) => {
    updateStageMutation.mutate({ id: entry.id, stage: "invited" });
    const name = entry.contact?.firstName || guestName(entry.contact);
    const subject = encodeURIComponent(`Invitation to join ${podcast?.title ?? "our podcast"}`);
    const body = encodeURIComponent(
      `Hi ${name},\n\nI'd love to have you on ${podcast?.title ?? "the show"} as a guest. ` +
      `I think our audience would get a lot from your perspective.\n\n` +
      `Would you be open to it? Happy to work around your schedule.\n\nBest,\n`
    );
    window.open(`mailto:${entry.contact?.email}?subject=${subject}&body=${body}`);
    toast({ title: "Marked as invited", description: "Your invitation email is ready to send." });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guests ?? [])
      .filter((g) => stageFilter === "all" || g.stage === stageFilter)
      .filter((g) => {
        if (!q) return true;
        const hay = [
          guestName(g.contact), g.contact?.email, g.contact?.company, g.contact?.title,
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

  const isLoading = dashboardLoading || (!!podcast && guestsLoading);
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Guests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your guest CRM — every contact, their stage, and the story so far.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!podcast}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add guest
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
          description="Add a prospective guest to start tracking them through your booking pipeline."
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
              {STAGES.map((stage) => {
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
                const meta = stageMeta(entry.stage);
                return (
                  <button
                    key={entry.id}
                    onClick={() => openDrawer(entry)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarTone(entry.contact)}`}>
                      {initials(entry.contact)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-950">
                        {guestName(entry.contact)}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        {[entry.contact?.email, [entry.contact?.title, entry.contact?.company].filter(Boolean).join(" · ")]
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${avatarTone(selected.contact)}`}>
                    {initials(selected.contact)}
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left">{guestName(selected.contact)}</SheetTitle>
                    <a
                      href={`mailto:${selected.contact?.email}`}
                      className="flex items-center gap-1 truncate text-sm text-zinc-500 hover:text-zinc-800"
                    >
                      <Mail size={12} className="shrink-0" />
                      {selected.contact?.email}
                    </a>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-5 space-y-6">
                {/* Stage + invite */}
                <div className="flex items-center gap-2">
                  <Select
                    value={selected.stage}
                    onValueChange={(value) => updateStageMutation.mutate({ id: selected.id, stage: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected.stage === "prospect" && (
                    <Button size="sm" onClick={() => inviteGuest(selected)}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Invite
                    </Button>
                  )}
                </div>

                {/* Guest-perspective coaching: analyze how they come across on camera */}
                <Link
                  href="/dashboard/video-analysis"
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-white"
                >
                  <Mic2 className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="flex-1">
                    <span className="font-medium text-zinc-900">Analyze their speaking</span>
                    <span className="block text-xs text-zinc-500">Run a clip through AI coaching — presence, pace, and fillers.</span>
                  </span>
                </Link>

                {/* Details */}
                <section>
                  <SectionHeader title="Details" />
                  <div className="space-y-2.5">
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
                  </div>
                </section>

                {/* Notes */}
                <section>
                  <SectionHeader title={`Notes (${notes.length})`} />
                  <div className="space-y-2.5">
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
                        {addNoteMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <StickyNote className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
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
