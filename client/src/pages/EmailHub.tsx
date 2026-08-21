import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { StarButton } from "@/components/guest/StarButton";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { useToggleProspectStar } from "@/hooks/use-toggle-prospect-star";
import { GUEST_STAGES, guestStageMeta } from "@/lib/guest-workflow";
import {
  ChevronRight,
  Mail,
  Users,
  Sparkles,
  Plus,
  Send,
  Star,
  Trash2,
  Edit3,
  Loader2,
  FileText,
  Wand2,
  RefreshCw,
  MapPin,
  Briefcase,
  IdCard,
  Info,
  Search,
  Pencil,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import type { EmailContact, EmailCampaign, EmailTemplate, GuestProspect as BaseGuestProspect } from "@shared/schema";

// pipelineStage is computed by the server (most recent pipeline entry, if any),
// not a schema column, so it's added here rather than in shared/schema.ts.
type GuestProspect = BaseGuestProspect & { pipelineStage?: string | null };

const EMPTY_PROSPECTS: GuestProspect[] = [];

function HeaderFact({ icon: Icon, label, value, onEdit }: { icon: LucideIcon; label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="group relative flex items-center gap-2.5 rounded-lg border p-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {onEdit ? (
        <button type="button" onClick={onEdit} className="absolute right-2 top-2 rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:text-zinc-700 group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

function contactDisplayName(contact: EmailContact, prospect?: GuestProspect | null): string {
  return prospect?.name
    || [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    || contact.email
    || "Unnamed contact";
}

function linkedGuestProspect(contact: EmailContact, prospects: GuestProspect[]): GuestProspect | null {
  if (contact.guestProspectId) {
    const directMatch = prospects.find((prospect) => prospect.id === contact.guestProspectId);
    if (directMatch) return directMatch;
  }
  if (!contact.email) return null;
  const normalizedEmail = contact.email.trim().toLowerCase();
  return prospects.find((prospect) => prospect.email?.trim().toLowerCase() === normalizedEmail) ?? null;
}

function MasterContactAvatar({
  contact,
  prospectImageById,
  prospectImageByEmail,
}: {
  contact: EmailContact;
  prospectImageById: Map<string, string>;
  prospectImageByEmail: Map<string, string>;
}) {
  const imageUrl = (contact.guestProspectId ? prospectImageById.get(contact.guestProspectId) : undefined)
    ?? (contact.email ? prospectImageByEmail.get(contact.email.trim().toLowerCase()) : undefined);
  return imageUrl ? (
    <img src={imageUrl} alt="" className="h-10 w-10 rounded-full border border-zinc-200 object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-medium text-primary">
      {contactDisplayName(contact).slice(0, 1).toUpperCase()}
    </div>
  );
}

interface EmailHubProps {
  mode?: "all" | "contacts" | "email";
}

export default function EmailHub({ mode = "all" }: EmailHubProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<Partial<EmailContact>>({});
  const [contactFilter, setContactFilter] = useState<string>("all");
  const [contactSearch, setContactSearch] = useState("");
  const [contactSort, setContactSort] = useState<"recent" | "name">("recent");
  const [newContact, setNewContact] = useState({ email: "", firstName: "", lastName: "", category: "subscriber" });
  const [composeEmail, setComposeEmail] = useState({ name: "", subject: "", body: "", recipientType: "all" });
  const [aiPrompt, setAiPrompt] = useState({ purpose: "guest_invite", podcastName: "", recipientName: "", customPrompt: "" });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<EmailContact[]>({
    queryKey: ['/api/email/contacts'],
    enabled: isAuthenticated,
  });

  const { data: prospectData } = useQuery<{ prospects: GuestProspect[] }>({
    queryKey: ['/api/guest-prospects'],
    enabled: isAuthenticated,
  });
  const prospects = prospectData?.prospects ?? EMPTY_PROSPECTS;
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const linkedProspect = selectedContact
    ? linkedGuestProspect(selectedContact, prospects)
    : null;
  const linkedAppearanceQuery = useGuestAppearances(linkedProspect?.providerPersonId);
  const peopleCount = contacts.length;
  const prospectImageById = useMemo(() => new Map(
    prospects.filter((prospect) => Boolean(prospect.imageUrl)).map((prospect) => [prospect.id, prospect.imageUrl!] as const),
  ), [prospects]);
  const prospectImageByEmail = useMemo(() => new Map(
    prospects
      .filter((prospect) => Boolean(prospect.email && prospect.imageUrl))
      .map((prospect) => [prospect.email!.trim().toLowerCase(), prospect.imageUrl!] as const),
  ), [prospects]);
  const toggleStarMutation = useToggleProspectStar();

  const starredCount = contacts.filter((contact) => linkedGuestProspect(contact, prospects)?.starred).length;
  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of contacts) {
      const stage = linkedGuestProspect(contact, prospects)?.pipelineStage;
      if (stage) counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return counts;
  }, [contacts, prospects]);
  const filteredContacts = useMemo(() => {
    let list = contacts;
    if (contactFilter === "starred") {
      list = list.filter((contact) => linkedGuestProspect(contact, prospects)?.starred);
    } else if (contactFilter !== "all") {
      list = list.filter((contact) => linkedGuestProspect(contact, prospects)?.pipelineStage === contactFilter);
    }
    const query = contactSearch.trim().toLowerCase();
    if (query) {
      list = list.filter((contact) => {
        const prospect = linkedGuestProspect(contact, prospects);
        const name = contactDisplayName(contact, prospect).toLowerCase();
        return name.includes(query) || (contact.email ?? "").toLowerCase().includes(query);
      });
    }
    list = [...list];
    if (contactSort === "name") {
      list.sort((a, b) => contactDisplayName(a, linkedGuestProspect(a, prospects)).localeCompare(contactDisplayName(b, linkedGuestProspect(b, prospects))));
    } else {
      list.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    }
    return list;
  }, [contacts, prospects, contactFilter, contactSearch, contactSort]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/email/campaigns'],
    enabled: isAuthenticated,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email/templates'],
    enabled: isAuthenticated,
  });

  const { data: emailStatus } = useQuery<{ configured: boolean }>({
    queryKey: ['/api/email/status'],
    enabled: isAuthenticated,
  });

  const addContactMutation = useMutation({
    mutationFn: async (contact: typeof newContact) => {
      const res = await apiRequest('POST', '/api/email/contacts', contact);
      return res.json();
    },
    onSuccess: (contact) => {
      queryClient.setQueryData<EmailContact[]>(['/api/email/contacts'], (current = []) => [contact, ...current]);
      queryClient.invalidateQueries({ queryKey: ['/api/email/contacts'] });
      setShowAddContact(false);
      setNewContact({ email: "", firstName: "", lastName: "", category: "subscriber" });
      toast({ title: "Contact added!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add contact", variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/email/contacts/${id}`);
    },
    onSuccess: () => {
      setSelectedContactId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/email/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guest-prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts'] });
      toast({ title: "Contact deleted" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ prospectId, stage }: { prospectId: string; stage: string }) => {
      const res = await apiRequest('PATCH', `/api/guest-prospects/${prospectId}/stage`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guest-prospects'] });
    },
    onError: (error: Error) => toast({ title: "Couldn't update stage", description: error.message, variant: "destructive" }),
  });

  const updateContactMutation = useMutation({
    mutationFn: async (patch: Partial<EmailContact>) => {
      if (!selectedContactId) throw new Error("no contact");
      const res = await apiRequest('PATCH', `/api/email/contacts/${selectedContactId}`, patch);
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guest-prospects'] });
      setEditingField(null);
      setContactDraft({});
      toast({ title: "Contact updated" });
    },
    onError: (error: Error) => toast({ title: "Couldn't update contact", description: error.message, variant: "destructive" }),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: typeof composeEmail) => {
      const res = await apiRequest('POST', '/api/email/campaigns', campaign);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/campaigns'] });
      setShowCompose(false);
      setComposeEmail({ name: "", subject: "", body: "", recipientType: "all" });
      toast({ title: "Email saved as draft!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest('POST', `/api/email/campaigns/${campaignId}/send`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/campaigns'] });
      toast({ title: "Emails sent!", description: `Sent to ${data.sent} recipients` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send emails", variant: "destructive" });
    },
  });

  const generateEmailMutation = useMutation({
    mutationFn: async (params: typeof aiPrompt) => {
      const res = await apiRequest('POST', '/api/email/generate', params);
      return res.json();
    },
    onSuccess: (data) => {
      setComposeEmail(prev => ({
        ...prev,
        subject: data.subject,
        body: data.body,
      }));
      toast({ title: "Email generated!", description: "AI has drafted your email" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate email", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="w-full max-w-6xl px-6 py-8">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    guest: "bg-blue-600/20 text-blue-500",
    subscriber: "bg-blue-500/20 text-blue-400",
    sponsor: "bg-green-500/20 text-green-400",
    collaborator: "bg-orange-500/20 text-orange-400",
    team: "bg-pink-500/20 text-pink-400",
  };

  const openContact = (id: string) => {
    setSelectedContactId(id);
  };

  return (
    <div className="w-full max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {mode === "contacts" ? (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="inline-flex cursor-default items-center gap-1.5 text-sm text-muted-foreground">
                    Your master people list for relationship details, notes, and outreach history
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-64">Learn more about your contacts.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                {mode === "email" ? "Email" : "Master Contacts & Email"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "email"
                  ? "Create campaigns and personalized outreach for your saved contacts"
                  : "Your reusable people list, including guest prospects you choose to promote—even before an email is known"}
              </p>
            </>
          )}
        </div>
        {mode !== "contacts" && (emailStatus?.configured ? (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            Email Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            Setup Required
          </Badge>
        ))}
      </div>

      <Tabs defaultValue={mode === "email" ? "campaigns" : "contacts"} className="space-y-4">
        {mode !== "contacts" ? <TabsList>
          {mode === "all" ? <TabsTrigger value="contacts" data-testid="tab-contacts">
            <Users className="h-4 w-4 mr-2" />
            Master Contacts ({peopleCount})
          </TabsTrigger> : null}
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Send className="h-4 w-4 mr-2" />
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="compose" data-testid="tab-compose">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Compose
          </TabsTrigger>
        </TabsList> : null}

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Guest prospects appear here when you choose Add to Contacts; email can be added later
            </p>
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Email address
                    <Input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      data-testid="input-contact-email"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="First name"
                      value={newContact.firstName}
                      onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                      data-testid="input-contact-firstname"
                    />
                    <Input
                      placeholder="Last name"
                      value={newContact.lastName}
                      onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                      data-testid="input-contact-lastname"
                    />
                  </div>
                  <Select value={newContact.category} onValueChange={(v) => setNewContact({ ...newContact, category: v })}>
                    <SelectTrigger data-testid="select-contact-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="subscriber">Subscriber</SelectItem>
                      <SelectItem value="sponsor">Sponsor</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => addContactMutation.mutate(newContact)}
                    disabled={addContactMutation.isPending || !newContact.email}
                    data-testid="button-save-contact"
                  >
                    {addContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Contact
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {contactsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : peopleCount === 0 ? (
            <Card>
              <CardContent className="p-8 text-left">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Master Contacts yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Add someone manually, or choose Add to Contacts from a Guest Prospect.</p>
                <Button onClick={() => setShowAddContact(true)} data-testid="button-add-first-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search contacts…"
                    className="pl-9"
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    data-testid="input-contact-search"
                  />
                </div>
                <Select value={contactSort} onValueChange={(value) => setContactSort(value as "recent" | "name")}>
                  <SelectTrigger className="w-full sm:w-44" data-testid="select-contact-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently added</SelectItem>
                    <SelectItem value="name">Name A–Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setContactFilter("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    contactFilter === "all" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  All · {peopleCount}
                </button>
                {starredCount > 0 ? (
                  <button
                    onClick={() => setContactFilter(contactFilter === "starred" ? "all" : "starred")}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      contactFilter === "starred" ? "bg-amber-500 text-white" : "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"
                    }`}
                  >
                    <Star size={11} fill="currentColor" aria-hidden="true" />
                    Starred · {starredCount}
                  </button>
                ) : null}
                {GUEST_STAGES.map((stage) => {
                  const count = stageCounts.get(stage.id) ?? 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => setContactFilter(contactFilter === stage.id ? "all" : stage.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        contactFilter === stage.id ? "bg-zinc-950 text-white" : `${stage.chip} hover:opacity-80`
                      }`}
                    >
                      {stage.label} · {count}
                    </button>
                  );
                })}
              </div>

              {filteredContacts.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">No contacts match this filter.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {filteredContacts.map((contact) => {
                    const linkedProspect = linkedGuestProspect(contact, prospects);
                    // Only guests with a real pipeline entry get an editable stage
                    // chip — everyone else (sponsors, subscribers, guests never
                    // added to a pipeline) falls back to their static category.
                    const stage = linkedProspect?.pipelineStage ? guestStageMeta(linkedProspect.pipelineStage) : null;
                    return (
                      <div key={contact.id} className="flex items-center gap-3 px-4 py-3">
                        {linkedProspect ? (
                          <StarButton
                            size="sm"
                            starred={linkedProspect.starred}
                            isPending={toggleStarMutation.isPending && toggleStarMutation.variables?.id === linkedProspect.id}
                            onToggle={() => toggleStarMutation.mutate({ id: linkedProspect.id, starred: !linkedProspect.starred })}
                            className="shrink-0 border-transparent bg-transparent hover:border-transparent hover:bg-transparent"
                          />
                        ) : (
                          <span className="w-9 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => openContact(contact.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                        >
                          <MasterContactAvatar
                            contact={contact}
                            prospectImageById={prospectImageById}
                            prospectImageByEmail={prospectImageByEmail}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {contactDisplayName(contact, linkedProspect)}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{contact.email || "Email not added"}</span>
                          </span>
                        </button>
                        {stage ? (
                          <Select
                            value={stage.id}
                            onValueChange={(value) => updateStageMutation.mutate({ prospectId: linkedProspect!.id, stage: value })}
                          >
                            <SelectTrigger
                              className={`h-6 w-auto shrink-0 gap-1 rounded-full border-0 px-2.5 text-xs font-medium [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60 ${stage.chip}`}
                              data-testid={`select-stage-${contact.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GUEST_STAGES.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`shrink-0 ${categoryColors[contact.category || 'subscriber']}`}>
                            {contact.category}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        <button
                          type="button"
                          onClick={() => openContact(contact.id)}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="View contact"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              View and manage your email campaigns
            </p>
            <Button onClick={() => setShowCompose(true)} data-testid="button-new-campaign">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>

          {campaignsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-left">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Create your first email campaign</p>
                <Button onClick={() => setShowCompose(true)} data-testid="button-create-first-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{campaign.name || campaign.subject}</p>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => sendCampaignMutation.mutate(campaign.id)}
                          disabled={sendCampaignMutation.isPending || !emailStatus?.configured}
                          data-testid={`button-send-campaign-${campaign.id}`}
                        >
                          {sendCampaignMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
                      )}
                      {campaign.status === 'sent' && (
                        <span className="text-sm text-muted-foreground">
                          Sent to {campaign.recipientCount} recipients
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Campaign name"
                  value={composeEmail.name}
                  onChange={(e) => setComposeEmail({ ...composeEmail, name: e.target.value })}
                  data-testid="input-campaign-name"
                />
                <Input
                  placeholder="Subject line"
                  value={composeEmail.subject}
                  onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                  data-testid="input-campaign-subject"
                />
                <Textarea
                  placeholder="Email body (HTML supported)..."
                  value={composeEmail.body}
                  onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                  className="min-h-48"
                  data-testid="input-campaign-body"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{firstName}}"} and {"{{lastName}}"} for personalization
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createCampaignMutation.mutate(composeEmail)}
                  disabled={createCampaignMutation.isPending || !composeEmail.subject || !composeEmail.body}
                  data-testid="button-save-campaign"
                >
                  {createCampaignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                AI Email Generator
              </CardTitle>
              <CardDescription>
                Let AI help you write professional emails for guests, newsletters, and more
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Purpose</label>
                  <Select value={aiPrompt.purpose} onValueChange={(v) => setAiPrompt({ ...aiPrompt, purpose: v })}>
                    <SelectTrigger data-testid="select-email-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest_invite">Guest Invitation</SelectItem>
                      <SelectItem value="newsletter">Newsletter Update</SelectItem>
                      <SelectItem value="thank_you">Thank You (Post-Episode)</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Podcast Name</label>
                  <Input
                    placeholder="Your Podcast Name"
                    value={aiPrompt.podcastName}
                    onChange={(e) => setAiPrompt({ ...aiPrompt, podcastName: e.target.value })}
                    data-testid="input-podcast-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Name (optional)</label>
                <Input
                  placeholder="Guest or recipient name"
                  value={aiPrompt.recipientName}
                  onChange={(e) => setAiPrompt({ ...aiPrompt, recipientName: e.target.value })}
                  data-testid="input-recipient-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Context</label>
                <Textarea
                  placeholder="Any specific topics, talking points, or details..."
                  value={aiPrompt.customPrompt}
                  onChange={(e) => setAiPrompt({ ...aiPrompt, customPrompt: e.target.value })}
                  data-testid="input-ai-context"
                />
              </div>
              <Button 
                onClick={() => generateEmailMutation.mutate(aiPrompt)}
                disabled={generateEmailMutation.isPending}
                data-testid="button-generate-email"
              >
                {generateEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate Email
              </Button>

              {composeEmail.subject && (
                <div className="mt-6 p-4 border rounded-lg space-y-4">
                  <h3 className="font-semibold">Generated Email</h3>
                  <div>
                    <p className="text-sm text-muted-foreground">Subject:</p>
                    <p className="font-medium">{composeEmail.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Body:</p>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none mt-2"
                      dangerouslySetInnerHTML={{ __html: composeEmail.body }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setComposeEmail({ ...composeEmail, name: `AI: ${aiPrompt.purpose}` });
                        createCampaignMutation.mutate({ ...composeEmail, name: `AI: ${aiPrompt.purpose}` });
                      }}
                      disabled={createCampaignMutation.isPending}
                      data-testid="button-save-generated"
                    >
                      Save as Campaign
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => generateEmailMutation.mutate(aiPrompt)}
                      disabled={generateEmailMutation.isPending}
                      data-testid="button-regenerate"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={Boolean(selectedContact)} onOpenChange={(open) => { if (!open) { setSelectedContactId(null); setEditingField(null); setContactDraft({}); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">
          {selectedContact ? (
            <>
              <SheetHeader>
                <div className="flex items-start gap-5">
                  {linkedProspect?.imageUrl ? (
                    <img src={linkedProspect.imageUrl} alt="" className="h-36 w-36 shrink-0 rounded-2xl border object-cover" />
                  ) : (
                    <span className="flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-4xl font-semibold text-primary">
                      {(selectedContact.firstName || selectedContact.email || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 pt-1">
                    <SheetTitle className="truncate text-left text-xl">
                      {contactDisplayName(selectedContact, linkedProspect)}
                    </SheetTitle>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {linkedProspect?.pipelineStage ? (
                        <Badge className={`${guestStageMeta(linkedProspect.pipelineStage).chip} font-medium`}>
                          {guestStageMeta(linkedProspect.pipelineStage).label}
                        </Badge>
                      ) : (
                        <Badge className={categoryColors[selectedContact.category || 'subscriber']}>
                          {selectedContact.category}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {editingField === "email" ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-primary p-2">
                          <Input
                            autoFocus
                            type="email"
                            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                            defaultValue={selectedContact.email || ""}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== selectedContact.email) updateContactMutation.mutate({ email: val });
                              else setEditingField(null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingField(null); }}
                          />
                        </div>
                      ) : (
                        <HeaderFact icon={Mail} label="Email" value={selectedContact.email || "Not added"} onEdit={() => setEditingField("email")} />
                      )}
                      {editingField === "location" ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-primary p-2">
                          <Input
                            autoFocus
                            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                            defaultValue={linkedProspect?.location || ""}
                            onBlur={(e) => { setEditingField(null); }}
                            onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); }}
                            placeholder="Location"
                          />
                        </div>
                      ) : (
                        <HeaderFact icon={MapPin} label="Location" value={linkedProspect?.location || "—"} />
                      )}
                      {editingField === "company" ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-primary p-2">
                          <Input
                            autoFocus
                            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                            defaultValue={selectedContact.company || ""}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (selectedContact.company || "")) updateContactMutation.mutate({ company: val });
                              else setEditingField(null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingField(null); }}
                          />
                        </div>
                      ) : (
                        <HeaderFact icon={Briefcase} label="Company" value={selectedContact.company || "—"} onEdit={() => setEditingField("company")} />
                      )}
                      {editingField === "title" ? (
                        <div className="flex items-center gap-1.5 rounded-lg border border-primary p-2">
                          <Input
                            autoFocus
                            className="h-7 border-0 p-0 text-sm shadow-none focus-visible:ring-0"
                            defaultValue={selectedContact.title || ""}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val !== (selectedContact.title || "")) updateContactMutation.mutate({ title: val });
                              else setEditingField(null);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingField(null); }}
                          />
                        </div>
                      ) : (
                        <HeaderFact icon={IdCard} label="Role" value={selectedContact.title || "—"} onEdit={() => setEditingField("title")} />
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {linkedProspect ? (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-700">Pipeline stage</h3>
                    {linkedProspect.pipelineStage ? (
                      <Select
                        value={linkedProspect.pipelineStage}
                        onValueChange={(value) => updateStageMutation.mutate({ prospectId: linkedProspect.id, stage: value })}
                      >
                        <SelectTrigger className={`w-48 border-0 font-medium ${guestStageMeta(linkedProspect.pipelineStage).chip}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GUEST_STAGES.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Link href="/guests" className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-primary hover:text-primary">
                        <UserPlus className="h-4 w-4" />
                        Add to Guest Pipeline
                      </Link>
                    )}
                  </section>
                ) : (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-700">Guest Pipeline</h3>
                    <Link href="/guests" className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-primary hover:text-primary">
                      <UserPlus className="h-4 w-4" />
                      Add to Guest Pipeline
                    </Link>
                  </section>
                )}

                {linkedProspect ? (
                  <>
                    <GuestSocialProfiles
                      socialLinks={linkedProspect.socialLinks}
                      hostedPodcasts={linkedAppearanceQuery.data?.hostedPodcasts}
                    />
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-700">Guest research</h3>
                      <GuestResearchSummary
                        subtitle={linkedProspect.subtitle}
                        bio={linkedProspect.bio}
                        location={linkedProspect.location}
                        creditedEpisodes={linkedProspect.episodeAppearanceCount}
                      />
                    </section>
                    <GuestAppearanceHistory
                      guestName={linkedProspect.name}
                      appearances={linkedAppearanceQuery.data}
                      isLoading={linkedAppearanceQuery.isFetching}
                      error={linkedAppearanceQuery.error}
                    />
                  </>
                ) : null}

                <section className="border-t border-zinc-200 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteContactMutation.mutate(selectedContact.id)}
                    disabled={deleteContactMutation.isPending}
                  >
                    {deleteContactMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                    Delete contact
                  </Button>
                </section>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
