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
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";
import { GuestResearchSummary } from "@/components/guest/GuestResearchSummary";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { 
  ChevronRight,
  Mail, 
  Users, 
  Sparkles, 
  Plus, 
  Send, 
  Trash2, 
  Edit3,
  Loader2,
  FileText,
  Wand2,
  RefreshCw
} from "lucide-react";
import type { EmailContact, EmailCampaign, EmailTemplate, GuestProspect } from "@shared/schema";

export default function EmailHub() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<Partial<EmailContact>>({});
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
  const prospects = prospectData?.prospects ?? [];
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? null;
  const linkedProspect = selectedContact
    ? prospects.find((prospect) => prospect.email?.trim().toLowerCase() === selectedContact.email.trim().toLowerCase()) ?? null
    : null;
  const linkedAppearanceQuery = useGuestAppearances(linkedProspect?.providerPersonId);
  const peopleCount = contacts.length;
  const prospectImageByEmail = useMemo(() => new Map(
    (prospectData?.prospects ?? [])
      .filter((prospect) => Boolean(prospect.email && prospect.imageUrl))
      .map((prospect) => [prospect.email!.trim().toLowerCase(), prospect.imageUrl!] as const),
  ), [prospectData?.prospects]);

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

  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContact) throw new Error("Choose a contact first");
      const res = await apiRequest('PATCH', `/api/email/contacts/${selectedContact.id}`, contactDraft);
      return res.json() as Promise<EmailContact>;
    },
    onSuccess: (contact) => {
      queryClient.setQueryData<EmailContact[]>(['/api/email/contacts'], (current = []) =>
        current.map((item) => item.id === contact.id ? contact : item));
      queryClient.invalidateQueries({ queryKey: ['/api/email/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guest-prospects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts'] });
      setContactDraft({});
      toast({ title: "Contact saved" });
    },
    onError: (error: Error) => toast({ title: "Couldn't save contact", description: error.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/email/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/contacts'] });
      toast({ title: "Contact deleted" });
    },
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
    setContactDraft({});
  };

  const contactDraftValue = (field: keyof EmailContact): string =>
    String((contactDraft[field] ?? selectedContact?.[field] ?? "") as string);

  return (
    <div className="w-full max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Contacts & Email
          </h1>
          <p className="text-muted-foreground">People you can actually reach by email, including guests, sponsors, subscribers, and team members</p>
        </div>
        {emailStatus?.configured ? (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            Email Connected
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            Setup Required
          </Badge>
        )}
      </div>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts" data-testid="tab-contacts">
            <Users className="h-4 w-4 mr-2" />
            Contacts ({peopleCount})
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Send className="h-4 w-4 mr-2" />
            Campaigns ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="compose" data-testid="tab-compose">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Compose
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Guest prospects appear here only after an email address is saved or revealed
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
                <h3 className="font-semibold mb-2">No contacts yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Add someone with an email address, or reveal an email from a Guest Prospect.</p>
                <Button onClick={() => setShowAddContact(true)} data-testid="button-add-first-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {contacts.map((contact) => (
                <Card key={contact.id} className="p-0">
                  <div className="flex items-center gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => openContact(contact.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {prospectImageByEmail.get(contact.email.trim().toLowerCase()) ? (
                        <img src={prospectImageByEmail.get(contact.email.trim().toLowerCase())} alt="" className="h-10 w-10 rounded-full border border-zinc-200 object-cover" />
                      ) : <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">{contact.firstName?.[0] || contact.email[0].toUpperCase()}</div>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {contact.firstName || contact.lastName 
                            ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                            : contact.email}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">{contact.email}</span>
                      </span>
                      <Badge className={categoryColors[contact.category || 'subscriber']}>
                        {contact.category}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteContactMutation.mutate(contact.id)}
                      data-testid={`button-delete-contact-${contact.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
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

      <Sheet open={Boolean(selectedContact)} onOpenChange={(open) => !open && setSelectedContactId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-[50vw]">
          {selectedContact ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  {linkedProspect?.imageUrl ? (
                    <img src={linkedProspect.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
                      {(selectedContact.firstName || selectedContact.email || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left">
                      {linkedProspect?.name || [selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(" ") || selectedContact.email}
                    </SheetTitle>
                    <p className="truncate text-sm text-zinc-500">{selectedContact.email}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedContact ? (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Contact details</h3>
                    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                      <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
                        Email address
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                          <Input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            className="pl-9"
                            value={contactDraftValue("email")}
                            onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })}
                            data-testid="input-official-contact-email"
                          />
                        </div>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1.5 text-xs font-medium text-zinc-500">
                          First name
                          <Input value={contactDraftValue("firstName")} onChange={(event) => setContactDraft({ ...contactDraft, firstName: event.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium text-zinc-500">
                          Last name
                          <Input value={contactDraftValue("lastName")} onChange={(event) => setContactDraft({ ...contactDraft, lastName: event.target.value })} />
                        </label>
                      </div>
                      <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
                        Company
                        <Input value={contactDraftValue("company")} onChange={(event) => setContactDraft({ ...contactDraft, company: event.target.value })} />
                      </label>
                      <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
                        Role / title
                        <Input value={contactDraftValue("title")} onChange={(event) => setContactDraft({ ...contactDraft, title: event.target.value })} />
                      </label>
                      <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
                        Category
                        <Select
                          value={String(contactDraft.category ?? selectedContact.category ?? "subscriber")}
                          onValueChange={(category) => setContactDraft({ ...contactDraft, category })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="subscriber">Subscriber</SelectItem>
                            <SelectItem value="sponsor">Sponsor</SelectItem>
                            <SelectItem value="collaborator">Collaborator</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      {Object.keys(contactDraft).length > 0 ? (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => updateContactMutation.mutate()}
                          disabled={updateContactMutation.isPending}
                        >
                          {updateContactMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                          Save contact details
                        </Button>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {linkedProspect ? (
                  <>
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Linked guest research</h3>
                      <GuestResearchSummary
                        subtitle={linkedProspect.subtitle}
                        bio={linkedProspect.bio}
                        location={linkedProspect.location}
                        creditedEpisodes={linkedProspect.episodeAppearanceCount}
                        socialLinks={linkedProspect.socialLinks}
                      />
                    </section>
                    <GuestAppearanceHistory
                      appearances={linkedAppearanceQuery.data}
                      isLoading={linkedAppearanceQuery.isFetching}
                      error={linkedAppearanceQuery.error}
                    />
                  </>
                ) : selectedContact.category === "guest" ? (
                  <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                    This guest contact is not linked to a researched Guest Prospect yet.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
