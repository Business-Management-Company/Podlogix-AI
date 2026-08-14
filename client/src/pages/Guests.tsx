import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Plus, Users } from "lucide-react";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { EmailContact, GuestPipelineEntry } from "@shared/schema";

interface DashboardData {
  podcasts: Array<{ id: string; title: string }>;
}

type GuestEntry = GuestPipelineEntry & { contact: EmailContact | undefined };

const STAGES = [
  { id: "prospect", label: "Prospect" },
  { id: "invited", label: "Invited" },
  { id: "booked", label: "Booked" },
  { id: "recorded", label: "Recorded" },
  { id: "published", label: "Published" },
  { id: "follow_up", label: "Follow up" },
  { id: "alumni", label: "Alumni" },
] as const;

function guestName(contact: EmailContact | undefined) {
  if (!contact) return "Unknown guest";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.email;
}

function initials(contact: EmailContact | undefined) {
  const name = guestName(contact);
  return name.slice(0, 2).toUpperCase();
}

export default function Guests() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newGuest, setNewGuest] = useState({ email: "", firstName: "", lastName: "", notes: "" });

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

  const addGuestMutation = useMutation({
    mutationFn: async (guest: typeof newGuest) => {
      const res = await apiRequest("POST", `/api/podcasts/${podcast!.id}/guests`, guest);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "guests"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", podcast?.id, "guests"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update stage", variant: "destructive" });
    },
  });

  const grouped = useMemo(() => {
    const byStage = new Map<string, GuestEntry[]>();
    for (const stage of STAGES) byStage.set(stage.id, []);
    for (const entry of guests ?? []) {
      const bucket = byStage.get(entry.stage) ?? byStage.get("prospect")!;
      bucket.push(entry);
    }
    return byStage;
  }, [guests]);

  const isLoading = dashboardLoading || (!!podcast && guestsLoading);
  const totalGuests = guests?.length ?? 0;

  return (
    <div className="w-full max-w-[1200px] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Guests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track prospective and booked guests through your show's pipeline.
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
        <div className="space-y-6">
          {STAGES.map((stage) => {
            const entries = grouped.get(stage.id) ?? [];
            if (entries.length === 0) return null;
            return (
              <section key={stage.id}>
                <SectionHeader title={`${stage.label} (${entries.length})`} />
                <Card className="divide-y divide-zinc-100 overflow-hidden">
                  {entries.map((entry) => (
                    <CardRow key={entry.id} className="px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[11px] font-medium text-zinc-500">
                        {initials(entry.contact)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-950">{guestName(entry.contact)}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-zinc-500">
                          <Mail size={11} className="shrink-0" />
                          {entry.contact?.email}
                        </p>
                      </div>
                      <Select
                        value={entry.stage}
                        onValueChange={(value) => updateStageMutation.mutate({ id: entry.id, stage: value })}
                      >
                        <SelectTrigger className="w-36 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardRow>
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
