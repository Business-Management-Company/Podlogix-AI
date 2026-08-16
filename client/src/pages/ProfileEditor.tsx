import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjectUploader } from "@/components/ObjectUploader";
import { PhoneMockup, type PreviewDevice } from "@/components/PhoneMockup";
import { getSectionCatalogIcon } from "@/components/ProfilePageRenderer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Palette, Layers, Share2 as ShareIcon, Plus, GripVertical, ChevronUp, ChevronDown,
  Trash2, Loader2, Eye, EyeOff, Copy, Smartphone, Tablet, Monitor, Pencil, MessageSquare,
  CreditCard, Wifi, Upload, ImagePlus, Settings, Type, Contrast, Shapes, Paintbrush, Droplets,
  QrCode, X, Check, Sparkles, Wand2, ExternalLink, ChevronRight,
} from "lucide-react";
import { SiSpotify, SiApplepodcasts, SiYoutube, SiInstagram, SiTiktok, SiX, SiLinkedin, SiPatreon, SiDiscord, SiFacebook } from "react-icons/si";
import type { Profile, ProfileLink, ProfileSection, ProfileDesignSettings } from "@shared/schema";
import { DEFAULT_PROFILE_DESIGN_SETTINGS, PROFILE_SECTION_CATALOG, type ProfileSectionType } from "@shared/schema";
import {
  SWATCH_COLORS, FONT_OPTIONS, LINK_SHAPES, LINK_STYLES, SHADE_OPTIONS,
  PROFILE_TEMPLATES, type TemplateId,
} from "@/lib/profile-design";

type EditorTab = "profile" | "design" | "content" | "share";
type DesignSubTab = "color" | "shade" | "font" | "link-shape" | "link-style" | "link-color" | "background" | "branding";

const DESIGN_ITEMS: { id: DesignSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "color", label: "Color", icon: Palette },
  { id: "shade", label: "Shade", icon: Contrast },
  { id: "font", label: "Font", icon: Type },
  { id: "link-shape", label: "Shape", icon: Shapes },
  { id: "link-style", label: "Style", icon: Paintbrush },
  { id: "link-color", label: "Link", icon: Droplets },
  { id: "background", label: "BG", icon: ImagePlus },
  { id: "branding", label: "Brand", icon: QrCode },
];

const SOCIAL_PLATFORM_ICONS: Record<string, React.ReactNode> = {
  spotify: <SiSpotify className="h-4 w-4" />, apple: <SiApplepodcasts className="h-4 w-4" />,
  youtube: <SiYoutube className="h-4 w-4" />, instagram: <SiInstagram className="h-4 w-4" />,
  tiktok: <SiTiktok className="h-4 w-4" />, twitter: <SiX className="h-4 w-4" />,
  linkedin: <SiLinkedin className="h-4 w-4" />, patreon: <SiPatreon className="h-4 w-4" />,
  discord: <SiDiscord className="h-4 w-4" />, facebook: <SiFacebook className="h-4 w-4" />,
};

interface QuickTemplate { platform: string; icon: string; placeholder: string }
interface CustomLink { id: string; label: string; url: string; description?: string; imageDisplayType?: "none" | "icon" | "featured"; imageUrl?: string }

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}

export default function ProfileEditor() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<EditorTab>("profile");
  const [device, setDevice] = useState<PreviewDevice>("mobile");

  // ── Profile tab local state ──
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageFormat, setHeroImageFormat] = useState<"portrait" | "landscape" | "full_blend">("portrait");
  const [isPublished, setIsPublished] = useState(false);
  const [socialIcons, setSocialIcons] = useState<{ platform: string; url: string }[]>([]);
  const [showAddSocialDialog, setShowAddSocialDialog] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState("instagram");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState("");

  // ── Design state ──
  const [design, setDesign] = useState<ProfileDesignSettings>(DEFAULT_PROFILE_DESIGN_SETTINGS);
  const [designSubTab, setDesignSubTab] = useState<DesignSubTab>("color");
  const designScrollRef = useRef<HTMLDivElement>(null);
  const designSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // ── Content state ──
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const loadedOnceRef = useRef(false);

  // ── Data ──
  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: legacyLinks = [] } = useQuery<ProfileLink[]>({
    queryKey: ["/api/profile/links"],
    enabled: isAuthenticated,
  });
  const { data: sectionsData, isLoading: sectionsLoading } = useQuery<ProfileSection[]>({
    queryKey: ["/api/profile/sections"],
    enabled: isAuthenticated && !!profile,
  });
  const { data: templatesData } = useQuery<{ templates: QuickTemplate[] }>({
    queryKey: ["/api/profile/ai/quick-templates"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/login";
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setUsername(profile.slug || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatarUrl || null);
    setHeroImageUrl(profile.heroImageUrl || null);
    setHeroImageFormat((profile.heroImageFormat as any) || "portrait");
    setIsPublished(!!profile.isPublished);
    setSocialIcons((profile.socialIcons as { platform: string; url: string }[]) || []);
    setYoutubeVideoUrl(profile.youtubeVideoUrl || "");
    setDesign({ ...DEFAULT_PROFILE_DESIGN_SETTINGS, ...(profile.designSettings as Partial<ProfileDesignSettings> | undefined) });
  }, [profile?.id]);

  // Migrate legacy flat links into a Custom Links section, once, if no sections exist yet.
  const migrateMutation = useMutation({
    mutationFn: async (links: ProfileLink[]) => {
      const res = await apiRequest("POST", "/api/profile/sections", {
        type: "custom_links",
        label: "My Links",
        order: 0,
        config: {
          links: links.map((l) => ({ id: newId(), label: l.title, url: l.url, imageDisplayType: "none" })),
        },
      });
      return res.json();
    },
    onSuccess: (created: ProfileSection) => {
      setSections([created]);
      queryClient.invalidateQueries({ queryKey: ["/api/profile/sections"] });
    },
  });

  useEffect(() => {
    if (loadedOnceRef.current) return;
    if (!sectionsData) return;
    loadedOnceRef.current = true;
    if (sectionsData.length === 0 && legacyLinks.length > 0) {
      migrateMutation.mutate(legacyLinks);
    } else {
      setSections(sectionsData);
    }
    setSectionsLoaded(true);
  }, [sectionsData, legacyLinks]);

  useEffect(() => {
    if (!profile && !profileLoading && isAuthenticated) setActiveTab("profile");
  }, [profile, profileLoading, isAuthenticated]);

  // ── Profile mutations ──
  const createProfileMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const res = await apiRequest("POST", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile created!" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const debouncedProfileSave = useDebounce((data: Partial<Profile>) => {
    if (!profile) return;
    updateProfileMutation.mutate(data);
  }, 1000);

  const saveDesign = (next: ProfileDesignSettings) => {
    setDesign(next);
    if (!profile) return;
    updateProfileMutation.mutate({ designSettings: next } as Partial<Profile>);
  };
  const updateDesign = (patch: Partial<ProfileDesignSettings>) => saveDesign({ ...design, ...patch });

  const handleCreateOrSave = () => {
    if (!profile) {
      createProfileMutation.mutate({ slug: username || `user-${Date.now()}`, displayName: displayName || "New profile", bio, isPublished } as Partial<Profile>);
      return;
    }
    updateProfileMutation.mutate({ displayName, slug: username, bio, isPublished, heroImageFormat } as Partial<Profile>);
  };

  // ── Bio AI assist ──
  const generateBioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/ai/generate-bio", { podcastName: displayName, hostName: user?.firstName });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.bio) { setBio(data.bio); debouncedProfileSave({ bio: data.bio }); }
      toast({ title: "AI suggestions generated!" });
    },
  });
  const improveBioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/ai/improve-bio", { bio, hostName: user?.firstName });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.bio) { setBio(data.bio); debouncedProfileSave({ bio: data.bio }); toast({ title: "Bio improved!" }); }
    },
  });
  const analyzeLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/profile/ai/analyze-link", { url });
      return res.json();
    },
  });

  // ── Section mutations ──
  const createSectionMutation = useMutation({
    mutationFn: async (data: Partial<ProfileSection>) => {
      const res = await apiRequest("POST", "/api/profile/sections", data);
      return res.json();
    },
  });
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProfileSection> & { id: string }) => {
      const res = await apiRequest("PATCH", `/api/profile/sections/${id}`, data);
      return res.json();
    },
  });
  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/profile/sections/${id}`),
  });

  const persistSection = (section: ProfileSection) => {
    updateSectionMutation.mutate({ id: section.id, label: section.label, visible: section.visible, order: section.order, groupId: section.groupId ?? null, config: section.config });
  };

  const updateSectionConfig = (id: string, patch: Record<string, unknown>) => {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, config: { ...(s.config as any), ...patch } } : s));
      return next;
    });
  };

  const debouncedSaveSection = useDebounce((section: ProfileSection) => persistSection(section), 800);

  const addSection = (type: ProfileSectionType) => {
    const entry = PROFILE_SECTION_CATALOG.find((c) => c.type === type)!;
    const order = sections.length;
    const label = type === "section_title" ? "New Section" : entry.label;
    const groupId = type === "section_title" ? null : targetGroupId;
    createSectionMutation.mutate(
      { type, label, order, visible: true, groupId, config: type === "custom_links" ? { links: [] } : {} },
      {
        onSuccess: (created: ProfileSection) => {
          setSections((prev) => [...prev, created]);
          setAddContentOpen(false);
          toast({ title: `Added ${label}` });
          if (type === "section_title") setTimeout(() => setRenamingId(created.id), 100);
        },
      }
    );
  };

  const removeSection = (id: string) => {
    const isGroup = sections.find((s) => s.id === id)?.type === "section_title";
    deleteSectionMutation.mutate(id);
    setSections((prev) => {
      let next = prev.filter((s) => s.id !== id);
      if (isGroup) {
        next = next.map((s) => (s.groupId === id ? { ...s, groupId: null } : s));
        next.filter((s) => s.groupId == null).forEach((s) => updateSectionMutation.mutate({ id: s.id, groupId: null }));
      }
      return next;
    });
  };

  const toggleVisibility = (id: string) => {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
      const updated = next.find((s) => s.id === id)!;
      updateSectionMutation.mutate({ id, visible: updated.visible });
      return next;
    });
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      next.forEach((s, i) => {
        if (s.order !== i) updateSectionMutation.mutate({ id: s.id, order: i });
        s.order = i;
      });
      return next;
    });
  };

  const renameSection = (id: string, label: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  };
  const saveRename = (id: string) => {
    const s = sections.find((s) => s.id === id);
    if (s) updateSectionMutation.mutate({ id, label: s.label });
    setRenamingId(null);
  };

  const toggleGroupCollapse = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyTemplate = (id: TemplateId) => {
    const tpl = PROFILE_TEMPLATES.find((t) => t.id === id)!;
    const next: ProfileDesignSettings = { ...design, ...tpl.overrides, template: id };
    saveDesign(next);
    setTemplateModalOpen(false);
    toast({ title: `Applied ${tpl.label} template` });
  };

  const scrollToDesignSection = (id: DesignSubTab) => {
    const el = designSectionRefs.current[id];
    if (!el) return;
    isScrollingRef.current = true;
    setDesignSubTab(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  };

  useEffect(() => {
    if (activeTab !== "design") return;
    const container = designScrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-section") as DesignSubTab;
            if (id) setDesignSubTab(id);
          }
        }
      },
      { root: container, rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );
    DESIGN_ITEMS.forEach((item) => {
      const el = designSectionRefs.current[item.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activeTab]);

  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const bioUrl = username ? `${typeof window !== "undefined" ? window.location.origin : ""}/${username}` : "";

  const saving = updateProfileMutation.isPending || createProfileMutation.isPending;

  if (authLoading || profileLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sectionTitles = sections.filter((s) => s.type === "section_title");
  const topLevelSections = sections
    .filter((s) => s.type === "section_title" || !s.groupId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const childrenOf = (groupId: string) => sections.filter((s) => s.groupId === groupId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <h1 className="text-lg font-bold text-zinc-950">My Page Builder</h1>
        <Button onClick={handleCreateOrSave} disabled={saving} data-testid="button-publish">
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {profile ? (isPublished ? "Save" : "Publish") : "Create"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-2.5">
        {([
          ["profile", "Profile", User],
          ["design", "Design", Palette],
          ["content", "Content", Layers],
          ["share", "Share", ShareIcon],
        ] as [EditorTab, string, React.ComponentType<{ className?: string }>][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === id ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
            }`}
            data-testid={`tab-${id}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[420px] shrink-0 overflow-y-auto border-r border-zinc-200 px-6 py-6">
          {activeTab === "profile" && (
            <ProfileTab
              displayName={displayName} setDisplayName={(v) => { setDisplayName(v); debouncedProfileSave({ displayName: v }); }}
              username={username} setUsername={(v) => { setUsername(v); debouncedProfileSave({ slug: v } as Partial<Profile>); }}
              bio={bio} setBio={(v) => { setBio(v); debouncedProfileSave({ bio: v }); }}
              avatarUrl={avatarUrl} heroImageUrl={heroImageUrl}
              heroImageFormat={heroImageFormat}
              setHeroImageFormat={(v) => { setHeroImageFormat(v); if (profile) updateProfileMutation.mutate({ heroImageFormat: v } as Partial<Profile>); }}
              design={design} updateDesign={updateDesign}
              getUploadParams={getUploadParams}
              onAvatarUploaded={(url) => { setAvatarUrl(url); if (profile) updateProfileMutation.mutate({ avatarUrl: url }); }}
              onHeroUploaded={(url) => { setHeroImageUrl(url); if (profile) updateProfileMutation.mutate({ heroImageUrl: url }); }}
              socialIcons={socialIcons}
              onRemoveSocial={(i) => {
                const next = socialIcons.filter((_, idx) => idx !== i);
                setSocialIcons(next);
                if (profile) updateProfileMutation.mutate({ socialIcons: next } as Partial<Profile>);
              }}
              onAddSocialClick={() => setShowAddSocialDialog(true)}
              youtubeVideoUrl={youtubeVideoUrl}
              setYoutubeVideoUrl={(v) => { setYoutubeVideoUrl(v); debouncedProfileSave({ youtubeVideoUrl: v || null } as Partial<Profile>); }}
              generateBioMutation={generateBioMutation}
              improveBioMutation={improveBioMutation}
              onBrowseTemplates={() => setTemplateModalOpen(true)}
              currentTemplateLabel={PROFILE_TEMPLATES.find((t) => t.id === design.template)?.label}
            />
          )}

          {activeTab === "design" && (
            <DesignTab
              design={design} updateDesign={updateDesign}
              designSubTab={designSubTab} onSubTabClick={scrollToDesignSection}
              designScrollRef={designScrollRef} designSectionRefs={designSectionRefs}
              getUploadParams={getUploadParams}
            />
          )}

          {activeTab === "content" && (
            <ContentTab
              sections={sections} topLevelSections={topLevelSections} sectionTitles={sectionTitles}
              childrenOf={childrenOf} collapsedGroups={collapsedGroups} onToggleCollapse={toggleGroupCollapse}
              onAddContent={() => {
                const lastTitle = sectionTitles[sectionTitles.length - 1];
                setTargetGroupId(lastTitle ? lastTitle.id : null);
                setAddContentOpen(true);
              }}
              onEditSection={setEditingSectionId}
              onToggleVisibility={toggleVisibility}
              onMoveSection={moveSection}
              onRemoveSection={removeSection}
              renamingId={renamingId} onStartRename={setRenamingId}
              onRenameChange={renameSection} onRenameSave={saveRename}
            />
          )}

          {activeTab === "share" && <ShareTab bioUrl={bioUrl} displayName={displayName} />}
        </div>

        {/* Right preview */}
        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto bg-zinc-50 px-8 py-8">
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
            {([
              ["mobile", Smartphone, "Mobile"],
              ["tablet", Tablet, "Tablet"],
              ["desktop", Monitor, "Desktop"],
            ] as [PreviewDevice, React.ComponentType<{ className?: string }>, string][]).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setDevice(id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  device === id ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <PhoneMockup
            device={device}
            displayName={displayName || "Your Name"}
            username={username}
            bio={bio}
            avatarUrl={avatarUrl}
            heroImageUrl={heroImageUrl}
            heroImageFormat={heroImageFormat}
            socialIcons={socialIcons}
            youtubeVideoUrl={youtubeVideoUrl}
            sections={sections}
            design={design}
          />
        </div>
      </div>

      {/* Add Content modal */}
      <AddContentDialog
        open={addContentOpen} onOpenChange={setAddContentOpen}
        sectionTitles={sectionTitles} targetGroupId={targetGroupId} onTargetGroupChange={setTargetGroupId}
        onPick={addSection}
      />

      {/* Section editor slide-out */}
      <SectionEditorSheet
        section={sections.find((s) => s.id === editingSectionId) ?? null}
        onClose={() => setEditingSectionId(null)}
        onUpdateConfig={(patch) => editingSectionId && updateSectionConfig(editingSectionId, patch)}
        onSave={() => {
          const s = sections.find((s) => s.id === editingSectionId);
          if (s) persistSection(s);
          setEditingSectionId(null);
        }}
        getUploadParams={getUploadParams}
        analyzeLinkMutation={analyzeLinkMutation}
        quickTemplates={templatesData?.templates ?? []}
      />

      {/* Template picker */}
      <TemplatePickerDialog open={templateModalOpen} onOpenChange={setTemplateModalOpen} onApply={applyTemplate} current={design.template as TemplateId | undefined} />

      {/* Add social dialog */}
      <Dialog open={showAddSocialDialog} onOpenChange={setShowAddSocialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Social Link</DialogTitle>
            <DialogDescription>Shown as an icon row on your profile page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(SOCIAL_PLATFORM_ICONS).map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2 capitalize">{SOCIAL_PLATFORM_ICONS[p]} {p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="https://..." value={newSocialUrl} onChange={(e) => setNewSocialUrl(e.target.value)} />
            <Button
              className="w-full"
              disabled={!newSocialUrl.trim()}
              onClick={() => {
                const next = [...socialIcons, { platform: newSocialPlatform, url: newSocialUrl.trim() }];
                setSocialIcons(next);
                if (profile) updateProfileMutation.mutate({ socialIcons: next } as Partial<Profile>);
                setNewSocialUrl("");
                setShowAddSocialDialog(false);
              }}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════════════════════════ Profile Tab ══════════════════════════ */

function ProfileTab(props: {
  displayName: string; setDisplayName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  avatarUrl: string | null; heroImageUrl: string | null;
  heroImageFormat: "portrait" | "landscape" | "full_blend";
  setHeroImageFormat: (v: "portrait" | "landscape" | "full_blend") => void;
  design: ProfileDesignSettings; updateDesign: (patch: Partial<ProfileDesignSettings>) => void;
  getUploadParams: (file: File) => Promise<{ method: "PUT"; url: string }>;
  onAvatarUploaded: (url: string) => void; onHeroUploaded: (url: string) => void;
  socialIcons: { platform: string; url: string }[]; onRemoveSocial: (i: number) => void; onAddSocialClick: () => void;
  youtubeVideoUrl: string; setYoutubeVideoUrl: (v: string) => void;
  generateBioMutation: { mutate: () => void; isPending: boolean };
  improveBioMutation: { mutate: () => void; isPending: boolean };
  onBrowseTemplates: () => void;
  currentTemplateLabel?: string;
}) {
  const { design, updateDesign } = props;
  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-zinc-950">Profile</h2>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Choose a Template</p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={props.onBrowseTemplates}>
          <Palette className="mr-1.5 h-3.5 w-3.5" /> Browse Templates
        </Button>
        {props.currentTemplateLabel && <p className="text-[11px] text-zinc-400">Current: {props.currentTemplateLabel}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">Profile Image</p>
          <Switch checked={design.showProfileImage} onCheckedChange={(v) => updateDesign({ showProfileImage: v })} />
        </div>
        {design.showProfileImage && (
          <ObjectUploader
            maxFileSize={5 * 1024 * 1024}
            onGetUploadParameters={props.getUploadParams}
            onComplete={(r) => r.successful[0] && props.onAvatarUploaded(r.successful[0].uploadURL)}
            buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-8 !text-zinc-500 hover:!bg-zinc-50"
          >
            {props.avatarUrl ? (
              <img src={props.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            <span className="text-xs font-medium">{props.avatarUrl ? "Replace profile image" : "Upload profile image"}</span>
            <span className="text-[11px] text-zinc-400">PNG, JPG up to 5MB</span>
          </ObjectUploader>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Layout Mode</p>
        <p className="text-[11px] text-zinc-400">Controls how your profile and hero images display on your bio page.</p>
        <div className="flex rounded-full border border-zinc-200 p-1">
          {(["portrait", "landscape", "full_blend"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => props.setHeroImageFormat(mode)}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition-colors ${
                props.heroImageFormat === mode ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {mode === "full_blend" ? "Full Blend" : mode}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Profile Image Size</p>
        <div className="flex rounded-full border border-zinc-200 p-1">
          {(["s", "m", "l"] as const).map((size) => (
            <button
              key={size}
              onClick={() => updateDesign({ profileImageSize: size })}
              className={`flex-1 rounded-full py-1.5 text-xs font-medium uppercase transition-colors ${
                design.profileImageSize === size ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">Hero / Cover Image</p>
          <Switch checked={design.showHeroImage} onCheckedChange={(v) => updateDesign({ showHeroImage: v })} />
        </div>
        {design.showHeroImage && (
          <ObjectUploader
            maxFileSize={10 * 1024 * 1024}
            onGetUploadParameters={props.getUploadParams}
            onComplete={(r) => r.successful[0] && props.onHeroUploaded(r.successful[0].uploadURL)}
            buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-8 !text-zinc-500 hover:!bg-zinc-50"
          >
            {props.heroImageUrl ? (
              <img src={props.heroImageUrl} alt="" className="h-12 w-20 rounded-md object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-xs font-medium">{props.heroImageUrl ? "Replace hero image" : "Upload hero image"}</span>
            <span className="text-[11px] text-zinc-400">PNG, JPG up to 10MB</span>
          </ObjectUploader>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Display Name</p>
        <Input value={props.displayName} onChange={(e) => props.setDisplayName(e.target.value)} placeholder="Your name" data-testid="input-display-name" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">Show Username</p>
          <Switch checked={design.showUsername} onCheckedChange={(v) => updateDesign({ showUsername: v })} />
        </div>
        <p className="text-xs font-medium text-zinc-500 pt-1">Username</p>
        <div className="flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-2">
          <span className="text-xs text-zinc-400">podlogix.io/</span>
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            value={props.username}
            onChange={(e) => props.setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            data-testid="input-username"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500">Bio</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => props.generateBioMutation.mutate()} disabled={props.generateBioMutation.isPending}>
              <Sparkles className="mr-1 h-3 w-3" /> Generate
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => props.improveBioMutation.mutate()} disabled={props.improveBioMutation.isPending || !props.bio}>
              <Wand2 className="mr-1 h-3 w-3" /> Improve
            </Button>
          </div>
        </div>
        <Textarea rows={3} value={props.bio} onChange={(e) => props.setBio(e.target.value)} placeholder="Tell visitors about yourself..." data-testid="input-bio" />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Social Icons</p>
        <div className="space-y-1.5">
          {props.socialIcons.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2">
              <span className="text-zinc-500">{SOCIAL_PLATFORM_ICONS[s.platform] || <ShareIcon className="h-4 w-4" />}</span>
              <span className="flex-1 truncate text-xs text-zinc-600">{s.url}</span>
              <button onClick={() => props.onRemoveSocial(i)} className="text-zinc-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={props.onAddSocialClick}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Social Link
        </Button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Featured YouTube Video</p>
        <Input placeholder="https://youtube.com/watch?v=..." value={props.youtubeVideoUrl} onChange={(e) => props.setYoutubeVideoUrl(e.target.value)} />
      </div>
    </div>
  );
}

/* ══════════════════════════ Design Tab ══════════════════════════ */

function ColorSwatchGrid({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-7 gap-2">
        {SWATCH_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`h-8 w-8 rounded-full border transition-transform ${value.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-offset-2" : "border-zinc-200"}`}
            style={{ background: c, borderColor: c === "#FFFFFF" ? "#e5e7eb" : c, ...(value.toLowerCase() === c.toLowerCase() ? ({ ["--tw-ring-color" as any]: c }) : {}) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2">
        <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-200" style={{ background: value }} />
        <input className="flex-1 bg-transparent font-mono text-xs uppercase outline-none" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function DesignSection({ id, title, description, refs, children }: { id: DesignSubTab; title: string; description?: string; refs: React.MutableRefObject<Record<string, HTMLDivElement | null>>; children: React.ReactNode }) {
  return (
    <div ref={(el) => { refs.current[id] = el; }} data-section={id} className="space-y-2.5 border-b border-zinc-100 pb-6">
      <h3 className="text-sm font-bold text-zinc-950">{title}</h3>
      {description && <p className="text-[11px] text-zinc-400">{description}</p>}
      {children}
    </div>
  );
}

function DesignTab({
  design, updateDesign, designSubTab, onSubTabClick, designScrollRef, designSectionRefs, getUploadParams,
}: {
  design: ProfileDesignSettings; updateDesign: (p: Partial<ProfileDesignSettings>) => void;
  designSubTab: DesignSubTab; onSubTabClick: (id: DesignSubTab) => void;
  designScrollRef: React.RefObject<HTMLDivElement>; designSectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  getUploadParams: (file: File) => Promise<{ method: "PUT"; url: string }>;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex shrink-0 flex-col items-center gap-1">
        {DESIGN_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSubTabClick(item.id)}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors ${
              designSubTab === item.id ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      <div ref={designScrollRef} className="max-h-[calc(100vh-260px)] flex-1 space-y-6 overflow-y-auto pr-1">
        <DesignSection id="color" title="Theme Color" description="Accent for headings, badges, and buttons." refs={designSectionRefs}>
          <ColorSwatchGrid value={design.themeColor} onChange={(hex) => updateDesign({ themeColor: hex })} />
        </DesignSection>

        <DesignSection id="shade" title="Shade" description="Overall page brightness tone." refs={designSectionRefs}>
          <div className="space-y-2">
            {SHADE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateDesign({ shade: opt.value, darkMode: opt.value === "dark", bgColor: opt.value === "color" ? design.bgColor : (opt.preview || design.bgColor) })}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${design.shade === opt.value ? "border-zinc-950" : "border-zinc-200"}`}
              >
                <div className="h-6 w-10 rounded border border-zinc-200" style={{ background: opt.value === "color" ? `${design.themeColor}26` : opt.preview }} />
                <span className="flex-1 font-medium">{opt.label}</span>
                {design.shade === opt.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </DesignSection>

        <DesignSection id="font" title="Font" description="Choose a typeface for your page." refs={designSectionRefs}>
          <div className="space-y-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateDesign({ fontFamily: f.value })}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left ${design.fontFamily === f.value ? "border-zinc-950" : "border-zinc-200"}`}
                style={{ fontFamily: f.value }}
              >
                <span className="text-sm">{f.label}</span>
                <span className="text-lg font-bold">Aa</span>
              </button>
            ))}
          </div>
        </DesignSection>

        <DesignSection id="link-shape" title="Link Shape" refs={designSectionRefs}>
          <div className="grid grid-cols-2 gap-2.5">
            {LINK_SHAPES.map((shape) => (
              <button
                key={shape.value}
                onClick={() => updateDesign({ linkShape: shape.value })}
                className={`rounded-lg border p-3 ${design.linkShape === shape.value ? "border-zinc-950" : "border-zinc-200"}`}
              >
                <div className="mb-2 h-6 w-full bg-zinc-900" style={{ borderRadius: shape.radius }} />
                <span className="text-xs font-medium">{shape.label}</span>
              </button>
            ))}
          </div>
        </DesignSection>

        <DesignSection id="link-style" title="Link Style" refs={designSectionRefs}>
          <div className="grid grid-cols-2 gap-2.5">
            {LINK_STYLES.map((style) => {
              const preview: React.CSSProperties = style.value === "outline"
                ? { background: "transparent", border: `1.5px solid ${design.linkColor}`, color: design.linkColor }
                : style.value === "soft-shadow"
                ? { background: "#fff", color: design.linkColor, boxShadow: `0 2px 8px ${design.linkColor}33` }
                : style.value === "hard-shadow"
                ? { background: "#fff", color: design.linkColor, border: `1.5px solid ${design.linkColor}`, boxShadow: `2px 2px 0 ${design.linkColor}` }
                : { background: design.linkColor, color: "#fff" };
              return (
                <button
                  key={style.value}
                  onClick={() => updateDesign({ linkStyle: style.value })}
                  className={`rounded-lg border p-3 ${design.linkStyle === style.value ? "border-zinc-950" : "border-zinc-200"}`}
                >
                  <div style={{ ...preview, borderRadius: 8 }} className="mb-2 py-1.5 text-center text-[11px] font-medium">Sample</div>
                  <span className="text-xs font-medium">{style.label}</span>
                </button>
              );
            })}
          </div>
        </DesignSection>

        <DesignSection id="link-color" title="Link Color" refs={designSectionRefs}>
          <ColorSwatchGrid value={design.linkColor} onChange={(hex) => updateDesign({ linkColor: hex })} />
          <button className="text-[11px] text-zinc-400 underline" onClick={() => updateDesign({ linkColor: design.themeColor })}>Reset to theme color</button>
        </DesignSection>

        <DesignSection id="background" title="Background" refs={designSectionRefs}>
          <div className="flex rounded-full border border-zinc-200 p-1">
            {(["solid", "gradient", "image"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateDesign({ bgMode: mode })}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition-colors ${design.bgMode === mode ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {design.bgMode === "solid" && <ColorSwatchGrid value={design.bgColor} onChange={(hex) => updateDesign({ bgColor: hex })} />}
          {design.bgMode === "gradient" && (
            <>
              <div className="h-10 w-full rounded-lg" style={{ background: `linear-gradient(180deg, ${design.themeColor}33 0%, ${design.bgColor} 100%)` }} />
              <ColorSwatchGrid value={design.bgColor} onChange={(hex) => updateDesign({ bgColor: hex })} />
            </>
          )}
          {design.bgMode === "image" && (
            <div className="space-y-2">
              <ObjectUploader
                maxFileSize={10 * 1024 * 1024}
                onGetUploadParameters={getUploadParams}
                onComplete={(r) => r.successful[0] && updateDesign({ bgImageUrl: r.successful[0].uploadURL })}
                buttonClassName="!h-auto !w-full !flex-col !gap-1.5 !border !border-dashed !border-zinc-300 !bg-white !py-6 !text-zinc-500 hover:!bg-zinc-50"
              >
                <Upload className="h-4 w-4" />
                <span className="text-xs font-medium">{design.bgImageUrl ? "Replace background" : "Upload background image"}</span>
              </ObjectUploader>
              {design.bgImageUrl && (
                <button className="text-[11px] text-red-500 underline" onClick={() => updateDesign({ bgImageUrl: undefined })}>Remove image</button>
              )}
            </div>
          )}
        </DesignSection>

        <DesignSection id="branding" title="Branding" refs={designSectionRefs}>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <span className="text-sm font-medium">Show "Powered by Podlogix"</span>
            <Switch checked={design.showBranding} onCheckedChange={(v) => updateDesign({ showBranding: v })} />
          </div>
        </DesignSection>
      </div>
    </div>
  );
}

/* ══════════════════════════ Content Tab ══════════════════════════ */

function ContentTab({
  sections, topLevelSections, sectionTitles, childrenOf, collapsedGroups, onToggleCollapse,
  onAddContent, onEditSection, onToggleVisibility, onMoveSection, onRemoveSection,
  renamingId, onStartRename, onRenameChange, onRenameSave,
}: {
  sections: ProfileSection[]; topLevelSections: ProfileSection[]; sectionTitles: ProfileSection[];
  childrenOf: (id: string) => ProfileSection[]; collapsedGroups: Set<string>; onToggleCollapse: (id: string) => void;
  onAddContent: () => void; onEditSection: (id: string) => void; onToggleVisibility: (id: string) => void;
  onMoveSection: (id: string, dir: "up" | "down") => void; onRemoveSection: (id: string) => void;
  renamingId: string | null; onStartRename: (id: string | null) => void;
  onRenameChange: (id: string, label: string) => void; onRenameSave: (id: string) => void;
}) {
  const renderRow = (section: ProfileSection, grouped: boolean) => {
    const Icon = getSectionCatalogIcon(PROFILE_SECTION_CATALOG.find((c) => c.type === section.type)?.icon ?? "Link");
    const isTitle = section.type === "section_title";
    const isCollapsed = isTitle && collapsedGroups.has(section.id);

    return (
      <div
        key={section.id}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
          isTitle ? "border-[#1B3A6B]/15 bg-[#F0F4FF]" : "border-zinc-200 bg-white"
        } ${grouped ? "ml-5 border-l-[3px] border-l-zinc-300" : ""}`}
      >
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-300" />
        {isTitle && (
          <button onClick={() => onToggleCollapse(section.id)}>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${!isCollapsed ? "rotate-90" : ""}`} />
          </button>
        )}
        <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
        {renamingId === section.id ? (
          <input
            autoFocus
            className="flex-1 border-b border-zinc-400 bg-transparent text-sm font-medium outline-none"
            value={section.label}
            onChange={(e) => onRenameChange(section.id, e.target.value)}
            onBlur={() => onRenameSave(section.id)}
            onKeyDown={(e) => e.key === "Enter" && onRenameSave(section.id)}
          />
        ) : (
          <span className="flex-1 truncate text-sm font-medium text-zinc-900">
            {section.label}
            {isTitle && <span className="ml-1.5 text-[11px] font-normal text-zinc-400">({childrenOf(section.id).length} items)</span>}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {isTitle ? (
            <button onClick={() => onStartRename(section.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><Pencil className="h-3.5 w-3.5" /></button>
          ) : (
            <>
              <Switch checked={section.visible !== false} onCheckedChange={() => onToggleVisibility(section.id)} className="scale-75" />
              <button onClick={() => onEditSection(section.id)} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><Settings className="h-3.5 w-3.5" /></button>
            </>
          )}
          <button onClick={() => onMoveSection(section.id, "up")} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button onClick={() => onMoveSection(section.id, "down")} className="rounded p-1 text-zinc-400 hover:bg-zinc-100"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button onClick={() => onRemoveSection(section.id)} className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-zinc-950">Content</h2>
      <p className="text-xs text-zinc-400">Drag to reorder · Click the gear to edit a block.</p>

      <div className="space-y-2">
        {topLevelSections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">No content yet</p>
          </div>
        ) : (
          topLevelSections.map((section) => (
            <div key={section.id} className="space-y-2">
              {renderRow(section, false)}
              {section.type === "section_title" && !collapsedGroups.has(section.id) &&
                childrenOf(section.id).map((child) => renderRow(child, true))}
            </div>
          ))
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={onAddContent} data-testid="button-add-content">
        <Plus className="mr-1.5 h-4 w-4" /> Add Content
      </Button>
    </div>
  );
}

function AddContentDialog({
  open, onOpenChange, sectionTitles, targetGroupId, onTargetGroupChange, onPick,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; sectionTitles: ProfileSection[];
  targetGroupId: string | null; onTargetGroupChange: (id: string | null) => void;
  onPick: (type: ProfileSectionType) => void;
}) {
  const titleEntry = PROFILE_SECTION_CATALOG.find((c) => c.type === "section_title")!;
  const rest = PROFILE_SECTION_CATALOG.filter((c) => c.type !== "section_title");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Content</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <button
            onClick={() => onPick(titleEntry.type)}
            className="flex w-full items-center gap-3 rounded-lg border-2 border-[#1B3A6B]/30 bg-[#F0F4FF] px-4 py-3 text-left"
          >
            <Type className="h-5 w-5 shrink-0 text-[#1B3A6B]" />
            <div>
              <p className="text-sm font-semibold text-zinc-900">{titleEntry.label}</p>
              <p className="text-xs text-zinc-500">{titleEntry.description}</p>
            </div>
          </button>

          <div className="h-px bg-zinc-100" />

          <div className="space-y-2">
            {rest.map((entry) => {
              const Icon = getSectionCatalogIcon(entry.icon);
              return (
                <button
                  key={entry.type}
                  disabled={entry.comingSoon}
                  onClick={() => onPick(entry.type)}
                  className={`flex w-full items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-left ${
                    entry.comingSoon ? "cursor-not-allowed opacity-50" : "hover:border-zinc-400"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      {entry.label}
                      {entry.comingSoon && <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>}
                    </span>
                    <p className="text-xs text-zinc-500">{entry.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {sectionTitles.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-medium text-zinc-500">Add to:</p>
              <Select value={targetGroupId ?? "__top__"} onValueChange={(v) => onTargetGroupChange(v === "__top__" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__top__">Top of page</SelectItem>
                  {sectionTitles.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionEditorSheet({
  section, onClose, onUpdateConfig, onSave, getUploadParams, analyzeLinkMutation, quickTemplates,
}: {
  section: ProfileSection | null; onClose: () => void; onUpdateConfig: (patch: Record<string, unknown>) => void; onSave: () => void;
  getUploadParams: (file: File) => Promise<{ method: "PUT"; url: string }>;
  analyzeLinkMutation: ReturnType<typeof useMutation<any, Error, string>>;
  quickTemplates: QuickTemplate[];
}) {
  if (!section) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const cfg = (section.config as any) ?? {};
  const catalogLabel = PROFILE_SECTION_CATALOG.find((c) => c.type === section.type)?.label ?? section.label;

  const links: CustomLink[] = Array.isArray(cfg.links) ? cfg.links : [];
  const setLinks = (next: CustomLink[]) => onUpdateConfig({ links: next });
  const addLink = () => setLinks([...links, { id: newId(), label: "", url: "", imageDisplayType: "none" }]);
  const updateLink = (id: string, patch: Partial<CustomLink>) => setLinks(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLink = (id: string) => setLinks(links.filter((l) => l.id !== id));

  return (
    <Sheet open={!!section} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-zinc-200 px-5 py-4">
          <SheetTitle>{catalogLabel}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {section.type === "custom_links" && (
            <div className="space-y-3">
              {quickTemplates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickTemplates.slice(0, 8).map((t) => (
                    <button
                      key={t.platform}
                      onClick={() => setLinks([...links, { id: newId(), label: t.platform, url: "", imageDisplayType: "none" }])}
                      className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium capitalize text-zinc-600 hover:border-zinc-400"
                    >
                      + {t.platform}
                    </button>
                  ))}
                </div>
              )}
              {links.map((link) => (
                <div key={link.id} className="space-y-2 rounded-lg border border-zinc-200 p-3">
                  <div className="flex rounded-full border border-zinc-200 p-0.5">
                    {(["none", "icon", "featured"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateLink(link.id, { imageDisplayType: t })}
                        className={`flex-1 rounded-full py-1 text-[10px] font-medium capitalize ${(link.imageDisplayType ?? "none") === t ? "bg-zinc-950 text-white" : "text-zinc-500"}`}
                      >
                        {t === "none" ? "No image" : t}
                      </button>
                    ))}
                  </div>
                  {link.imageDisplayType && link.imageDisplayType !== "none" && (
                    <ObjectUploader
                      maxFileSize={5 * 1024 * 1024}
                      onGetUploadParameters={getUploadParams}
                      onComplete={(r) => r.successful[0] && updateLink(link.id, { imageUrl: r.successful[0].uploadURL })}
                      buttonClassName="!h-8 !w-full !border !border-dashed !border-zinc-300 !bg-white !text-[11px] !text-zinc-500"
                    >
                      {link.imageUrl ? "Replace image" : "Upload image"}
                    </ObjectUploader>
                  )}
                  <Input
                    placeholder="Title" value={link.label} className="h-8 text-xs"
                    onChange={(e) => updateLink(link.id, { label: e.target.value })}
                  />
                  <Input
                    placeholder="https://..." value={link.url} className="h-8 text-xs"
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    onBlur={() => {
                      if (link.url && !link.label) {
                        analyzeLinkMutation.mutate(link.url, {
                          onSuccess: (data: any) => data?.suggestedTitle && updateLink(link.id, { label: data.suggestedTitle }),
                        });
                      }
                    }}
                  />
                  <Textarea
                    placeholder="Description (optional)" rows={2} className="resize-none text-xs" value={link.description ?? ""}
                    onChange={(e) => updateLink(link.id, { description: e.target.value })}
                  />
                  <button onClick={() => removeLink(link.id)} className="text-[11px] font-medium text-red-500">Remove</button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={addLink}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Another Link
              </Button>
            </div>
          )}

          {section.type === "section_title" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Style</label>
              <div className="flex rounded-full border border-zinc-200 p-1">
                {(["heading", "divider", "both"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateConfig({ style: s })}
                    className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize ${(cfg.style ?? "heading") === s ? "bg-zinc-950 text-white" : "text-zinc-500"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section.type === "book_meeting" && (
            <div className="space-y-3">
              <Field label="Calendly URL" value={cfg.calendlyUrl ?? ""} onChange={(v) => onUpdateConfig({ calendlyUrl: v })} placeholder="https://calendly.com/yourname" />
              <Field label="Button Label" value={cfg.buttonLabel ?? ""} onChange={(v) => onUpdateConfig({ buttonLabel: v })} placeholder="Book a Meeting" />
              <FieldArea label="Description" value={cfg.description ?? ""} onChange={(v) => onUpdateConfig({ description: v })} placeholder="Describe what the meeting is about..." />
            </div>
          )}

          {section.type === "podcast" && (
            <div className="space-y-3">
              <Field label="RSS Feed or Podcast URL" value={cfg.feedUrl ?? ""} onChange={(v) => onUpdateConfig({ feedUrl: v })} placeholder="https://feeds.example.com/podcast" />
              <Field label="Display Title" value={cfg.displayTitle ?? ""} onChange={(v) => onUpdateConfig({ displayTitle: v })} placeholder="My Podcast" />
            </div>
          )}

          {!["custom_links", "section_title", "book_meeting", "podcast"].includes(section.type) && (
            <div className="space-y-3">
              <Field label="Title" value={cfg.title ?? ""} onChange={(v) => onUpdateConfig({ title: v })} placeholder="Section title" />
              <FieldArea label="Description" value={cfg.sectionDescription ?? ""} onChange={(v) => onUpdateConfig({ sectionDescription: v })} placeholder="Section description..." />
              {section.type === "featured_video" && <Field label="Video URL" value={cfg.videoUrl ?? ""} onChange={(v) => onUpdateConfig({ videoUrl: v })} placeholder="https://youtube.com/watch?v=..." />}
              {section.type === "streaming_channel" && <Field label="Channel URL" value={cfg.channelUrl ?? ""} onChange={(v) => onUpdateConfig({ channelUrl: v })} placeholder="https://twitch.tv/yourchannel" />}
              {section.type === "store" && <Field label="Store URL" value={cfg.storeUrl ?? ""} onChange={(v) => onUpdateConfig({ storeUrl: v })} placeholder="https://your-store.com" />}
              {section.type === "tips" && <Field label="Tips / Donation URL" value={cfg.tipsUrl ?? ""} onChange={(v) => onUpdateConfig({ tipsUrl: v })} placeholder="https://buymeacoffee.com/you" />}
              {section.type === "blog" && <Field label="Blog URL" value={cfg.blogUrl ?? ""} onChange={(v) => onUpdateConfig({ blogUrl: v })} placeholder="https://yourblog.com" />}
              {section.type === "promo_codes" && (
                <>
                  <Field label="Promo Code" value={cfg.promoCode ?? ""} onChange={(v) => onUpdateConfig({ promoCode: v })} placeholder="SAVE20" />
                  <Field label="Promo URL" value={cfg.promoUrl ?? ""} onChange={(v) => onUpdateConfig({ promoUrl: v })} placeholder="https://store.com?code=SAVE20" />
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 px-5 py-3">
          <Button className="w-full" onClick={onSave}>Save &amp; Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FieldArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500">{label}</label>
      <Textarea className="resize-none text-xs" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ══════════════════════════ Template Picker ══════════════════════════ */

function TemplatePickerDialog({ open, onOpenChange, onApply, current }: { open: boolean; onOpenChange: (v: boolean) => void; onApply: (id: TemplateId) => void; current?: TemplateId }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Browse Templates</DialogTitle>
          <DialogDescription>Pick a starting point — you can fine-tune every setting afterward in Design.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROFILE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onApply(tpl.id)}
              className={`space-y-2 rounded-xl border p-3 text-left transition-colors hover:border-zinc-400 ${current === tpl.id ? "border-zinc-950" : "border-zinc-200"}`}
            >
              <div
                className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg"
                style={{ background: tpl.overrides.bgColor ?? "#fff" }}
              >
                <div className="h-6 w-6 rounded-full" style={{ background: tpl.overrides.darkMode ? "#fff" : "#111" }} />
                <div className="h-2 w-12 rounded-full" style={{ background: tpl.overrides.darkMode ? "#fff3" : "#0002" }} />
              </div>
              <p className="text-sm font-semibold">{tpl.label}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════ Share Tab ══════════════════════════ */

function ShareTab({ bioUrl, displayName }: { bioUrl: string; displayName: string }) {
  const { toast } = useToast();
  const copyUrl = () => {
    navigator.clipboard.writeText(bioUrl);
    toast({ title: "Link copied!" });
  };
  const shareVia = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: displayName, url: bioUrl }); } catch { /* user cancelled */ }
    } else copyUrl();
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold text-zinc-950">Share Your Page</h2>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-500">Your Page URL</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={bioUrl} onClick={(e) => (e.target as HTMLInputElement).select()} className="text-xs" />
          <Button variant="outline" size="icon" onClick={copyUrl}><Copy className="h-4 w-4" /></Button>
        </div>
      </div>

      <Button className="w-full" onClick={copyUrl}><Copy className="mr-1.5 h-4 w-4" /> Copy My Page Link</Button>
      <Button variant="outline" className="w-full" onClick={shareVia}><ShareIcon className="mr-1.5 h-4 w-4" /> Share via...</Button>
      <Button
        variant="outline" className="w-full"
        onClick={() => window.open(`sms:?body=${encodeURIComponent("Check out my page: " + bioUrl)}`)}
      >
        <MessageSquare className="mr-1.5 h-4 w-4" /> Share via Text Message
      </Button>
      <a href={bioUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" className="w-full"><ExternalLink className="mr-1.5 h-4 w-4" /> Open My Page</Button>
      </a>

      {bioUrl && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-4 text-center">
          <p className="text-xs font-medium text-zinc-500">QR Code</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bioUrl)}`}
            alt="QR code"
            className="mx-auto h-[180px] w-[180px]"
          />
          <p className="text-[11px] text-zinc-400">Scan to visit your page</p>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-dashed border-zinc-200 p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-semibold">NFC Creator Card</p>
          <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
        </div>
        <p className="text-xs text-zinc-500">Tap-to-share physical card linked to your bio page</p>
        <Button
          variant="outline" size="sm" className="w-full"
          onClick={() => toast({ title: "NFC Creator Cards are coming soon!" })}
        >
          <Wifi className="mr-1.5 h-3.5 w-3.5" /> Join Waitlist
        </Button>
      </div>
    </div>
  );
}
