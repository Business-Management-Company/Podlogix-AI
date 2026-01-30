import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PhoneMockup } from "@/components/PhoneMockup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  GripVertical,
  Loader2,
  Mic,
  Smartphone,
  Sparkles,
  Wand2,
  Link2,
  Lightbulb,
  RefreshCw,
  Check,
  Video,
  X
} from "lucide-react";
import { SiSpotify, SiApplepodcasts, SiYoutube, SiInstagram, SiTiktok, SiX, SiLinkedin, SiPatreon, SiDiscord, SiFacebook } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import type { Profile, ProfileLink } from "@shared/schema";

const profileSchema = z.object({
  slug: z.string().min(3, "URL must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  headline: z.string().optional(),
  bio: z.string().optional(),
  isPublished: z.boolean().default(false),
});

const linkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
});

interface QuickTemplate {
  platform: string;
  icon: string;
  placeholder: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  spotify: <SiSpotify className="h-4 w-4" />,
  apple: <SiApplepodcasts className="h-4 w-4" />,
  youtube: <SiYoutube className="h-4 w-4" />,
  instagram: <SiInstagram className="h-4 w-4" />,
  tiktok: <SiTiktok className="h-4 w-4" />,
  twitter: <SiX className="h-4 w-4" />,
  linkedin: <SiLinkedin className="h-4 w-4" />,
  patreon: <SiPatreon className="h-4 w-4" />,
  discord: <SiDiscord className="h-4 w-4" />,
};

export default function ProfileEditor() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newLink, setNewLink] = useState({ title: "", url: "" });
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showAddLinkDialog, setShowAddLinkDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuickTemplate | null>(null);
  const [suggestedHeadlines, setSuggestedHeadlines] = useState<string[]>([]);
  
  // Social icons state
  const [socialIcons, setSocialIcons] = useState<{ platform: string; url: string }[]>([]);
  const [showAddSocialDialog, setShowAddSocialDialog] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState('instagram');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  
  // YouTube video state
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [youtubeVideoMode, setYoutubeVideoMode] = useState<'specific' | 'latest' | 'channel' | 'latestLink'>('specific');

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      slug: "",
      displayName: "",
      headline: "",
      bio: "",
      isPublished: false,
    },
  });

  const watchedValues = form.watch();

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: links = [], isLoading: linksLoading } = useQuery<ProfileLink[]>({
    queryKey: ['/api/profile/links'],
    enabled: isAuthenticated,
  });

  const { data: templates } = useQuery<{ templates: QuickTemplate[] }>({
    queryKey: ['/api/profile/ai/quick-templates'],
    enabled: isAuthenticated,
  });

  interface ConnectedProfile {
    id: string;
    platform: string;
    profileUrl: string;
    username?: string;
    displayName?: string;
    followersCount?: number;
    subscriberCount?: number;
    facebookFansCount?: number;
  }

  const { data: connectedProfiles = [] } = useQuery<ConnectedProfile[]>({
    queryKey: ['/api/creator/social-profiles'],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        slug: profile.slug,
        displayName: profile.displayName,
        headline: profile.headline || "",
        bio: profile.bio || "",
        isPublished: profile.isPublished || false,
      });
      // Load social icons and YouTube settings
      if (profile.socialIcons) {
        setSocialIcons(profile.socialIcons as { platform: string; url: string }[]);
      }
      if (profile.youtubeVideoUrl) {
        setYoutubeVideoUrl(profile.youtubeVideoUrl);
      }
      if (profile.youtubeVideoMode) {
        setYoutubeVideoMode(profile.youtubeVideoMode as 'specific' | 'latest' | 'channel' | 'latestLink');
      }
    }
  }, [profile, form]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const createProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest('POST', '/api/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: "Profile created!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create profile.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const res = await apiRequest('PATCH', '/api/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: "Profile updated!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async (data: { title: string; url: string }) => {
      const res = await apiRequest('POST', '/api/profile/links', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/links'] });
      setNewLink({ title: "", url: "" });
      setShowAddLinkDialog(false);
      setSelectedTemplate(null);
      toast({ title: "Link added!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add link.", variant: "destructive" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/profile/links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile/links'] });
      toast({ title: "Link deleted" });
    },
  });

  const analyzeLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest('POST', '/api/profile/ai/analyze-link', { url });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.suggestedTitle && !newLink.title) {
        setNewLink(prev => ({ ...prev, title: data.suggestedTitle }));
      }
    },
  });

  const generateBioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/profile/ai/generate-bio', {
        podcastName: watchedValues.displayName,
        hostName: user?.firstName,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.bio) {
        form.setValue('bio', data.bio);
      }
      if (data.headlines) {
        setSuggestedHeadlines(data.headlines);
      }
      toast({ title: "AI suggestions generated!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate suggestions", variant: "destructive" });
    },
  });

  const improveBioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/profile/ai/improve-bio', {
        bio: watchedValues.bio,
        hostName: user?.firstName,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.bio) {
        form.setValue('bio', data.bio);
        toast({ title: "Bio improved!" });
      }
    },
  });

  const updateSocialIconsMutation = useMutation({
    mutationFn: async (icons: { platform: string; url: string }[]) => {
      const res = await apiRequest('PATCH', '/api/profile', { socialIcons: icons });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      toast({ title: "Social icons updated!" });
    },
  });

  const updateYouTubeVideoMutation = useMutation({
    mutationFn: async (data: { youtubeVideoUrl: string | null; youtubeVideoMode: string }) => {
      const res = await apiRequest('PATCH', '/api/profile', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      setShowYouTubeDialog(false);
      toast({ title: "YouTube video updated!" });
    },
  });

  const handleSubmit = (values: z.infer<typeof profileSchema>) => {
    if (profile) {
      updateProfileMutation.mutate(values);
    } else {
      createProfileMutation.mutate(values);
    }
  };

  const handleAddLink = () => {
    const result = linkSchema.safeParse(newLink);
    if (!result.success) {
      toast({ title: "Invalid link", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    addLinkMutation.mutate(newLink);
  };

  const handleUrlChange = (url: string) => {
    setNewLink(prev => ({ ...prev, url }));
    if (url.length > 10 && url.startsWith('http')) {
      analyzeLinkMutation.mutate(url);
    }
  };

  const handleSelectTemplate = (template: QuickTemplate) => {
    setSelectedTemplate(template);
    setNewLink({ title: template.platform, url: "" });
  };

  const getIconForLink = (url: string) => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('spotify')) return platformIcons.spotify;
    if (lowerUrl.includes('apple')) return platformIcons.apple;
    if (lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) return platformIcons.youtube;
    if (lowerUrl.includes('instagram')) return platformIcons.instagram;
    if (lowerUrl.includes('tiktok')) return platformIcons.tiktok;
    if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) return platformIcons.twitter;
    if (lowerUrl.includes('linkedin')) return platformIcons.linkedin;
    if (lowerUrl.includes('patreon')) return platformIcons.patreon;
    if (lowerUrl.includes('discord')) return platformIcons.discord;
    return <Link2 className="h-4 w-4" />;
  };

  const handleAddSocialIcon = () => {
    if (!newSocialUrl.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }
    const newIcons = [...socialIcons, { platform: newSocialPlatform, url: newSocialUrl }];
    setSocialIcons(newIcons);
    updateSocialIconsMutation.mutate(newIcons);
    setNewSocialUrl('');
    setShowAddSocialDialog(false);
  };

  const handleRemoveSocialIcon = (index: number) => {
    const newIcons = socialIcons.filter((_, i) => i !== index);
    setSocialIcons(newIcons);
    updateSocialIconsMutation.mutate(newIcons);
  };

  const handleSaveYouTubeVideo = () => {
    updateYouTubeVideoMutation.mutate({
      youtubeVideoUrl: youtubeVideoUrl || null,
      youtubeVideoMode,
    });
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const socialPlatformOptions = [
    { value: 'instagram', label: 'Instagram', icon: <SiInstagram className="h-4 w-4" /> },
    { value: 'youtube', label: 'YouTube', icon: <SiYoutube className="h-4 w-4" /> },
    { value: 'facebook', label: 'Facebook', icon: <SiFacebook className="h-4 w-4" /> },
    { value: 'spotify', label: 'Spotify', icon: <SiSpotify className="h-4 w-4" /> },
    { value: 'tiktok', label: 'TikTok', icon: <SiTiktok className="h-4 w-4" /> },
    { value: 'twitter', label: 'X (Twitter)', icon: <SiX className="h-4 w-4" /> },
    { value: 'linkedin', label: 'LinkedIn', icon: <SiLinkedin className="h-4 w-4" /> },
    { value: 'apple', label: 'Apple Podcasts', icon: <SiApplepodcasts className="h-4 w-4" /> },
    { value: 'patreon', label: 'Patreon', icon: <SiPatreon className="h-4 w-4" /> },
    { value: 'discord', label: 'Discord', icon: <SiDiscord className="h-4 w-4" /> },
  ];

  if (authLoading || profileLoading) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Link Page Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobilePreview(!showMobilePreview)}
              data-testid="button-toggle-preview"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {showMobilePreview ? "Edit" : "Preview"}
            </Button>
            {profile?.isPublished && (
              <Button variant="outline" size="sm" asChild data-testid="button-view-live">
                <Link href={`/p/${profile.slug}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Live
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`flex-1 space-y-6 max-w-2xl ${showMobilePreview ? 'hidden lg:block' : ''}`}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{profile ? "Edit Your Link Page" : "Create Your Link Page"}</CardTitle>
                      <CardDescription>
                        Your personal page to share everything in one link
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateBioMutation.mutate()}
                      disabled={generateBioMutation.isPending}
                      data-testid="button-ai-suggest"
                    >
                      {generateBioMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      AI Suggest
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profile URL</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">podlogix.io/p/</span>
                                <Input {...field} placeholder="your-name" data-testid="input-slug" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Your Name or Podcast Name" data-testid="input-display-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="headline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Headline</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="A catchy tagline" data-testid="input-headline" />
                            </FormControl>
                            {suggestedHeadlines.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {suggestedHeadlines.map((headline, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="cursor-pointer hover-elevate"
                                    onClick={() => {
                                      form.setValue('headline', headline);
                                      setSuggestedHeadlines([]);
                                    }}
                                    data-testid={`badge-headline-${i}`}
                                  >
                                    <Lightbulb className="h-3 w-3 mr-1" />
                                    {headline}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Bio</FormLabel>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => improveBioMutation.mutate()}
                                  disabled={improveBioMutation.isPending}
                                  data-testid="button-improve-bio"
                                >
                                  {improveBioMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Wand2 className="h-3 w-3 mr-1" />
                                  )}
                                  Improve with AI
                                </Button>
                              )}
                            </div>
                            <FormControl>
                              <Textarea {...field} placeholder="Tell your audience about yourself..." className="min-h-20" data-testid="input-bio" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isPublished"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Publish Profile</FormLabel>
                              <FormDescription className="text-xs">
                                Make visible to the public
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-published" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {(createProfileMutation.isPending || updateProfileMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {profile ? "Save Changes" : "Create Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>

            {profile && (
              <>
              {/* Social Icons Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">Social Icons</CardTitle>
                        <CardDescription>Display social media icons at the top of your page</CardDescription>
                      </div>
                      <Dialog open={showAddSocialDialog} onOpenChange={setShowAddSocialDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-social-icon">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Icon
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Add Social Icon</DialogTitle>
                            <DialogDescription>Add from your connected accounts or enter a URL</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {connectedProfiles.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Connected Accounts</Label>
                                <div className="space-y-2">
                                  {connectedProfiles
                                    .filter(p => !socialIcons.some(icon => icon.platform === p.platform))
                                    .map(profile => {
                                      const opt = socialPlatformOptions.find(o => o.value === profile.platform);
                                      const alreadyAsLink = links.some(link => link.url === profile.profileUrl);
                                      return (
                                        <div
                                          key={profile.id}
                                          className="p-3 border rounded-lg"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              {opt?.icon || <Link2 className="h-4 w-4" />}
                                              <div>
                                                <p className="text-sm font-medium">{profile.displayName || profile.username || opt?.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {profile.platform === 'youtube' && profile.subscriberCount && `${profile.subscriberCount.toLocaleString()} subscribers`}
                                                  {profile.platform === 'instagram' && profile.followersCount && `${profile.followersCount.toLocaleString()} followers`}
                                                  {profile.platform === 'facebook' && profile.facebookFansCount && `${profile.facebookFansCount.toLocaleString()} fans`}
                                                  {!profile.subscriberCount && !profile.followersCount && !profile.facebookFansCount && 'Connected'}
                                                </p>
                                              </div>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">Connected</Badge>
                                          </div>
                                          <div className="flex gap-2 mt-3">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                              onClick={() => {
                                                setNewSocialPlatform(profile.platform);
                                                setNewSocialUrl(profile.profileUrl);
                                              }}
                                              data-testid={`add-icon-${profile.platform}`}
                                            >
                                              <Sparkles className="h-3 w-3 mr-1" />
                                              Add as Icon
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                              disabled={alreadyAsLink}
                                              onClick={async () => {
                                                const title = profile.displayName || profile.username || opt?.label || profile.platform;
                                                try {
                                                  await apiRequest('POST', '/api/profile/links', { title, url: profile.profileUrl });
                                                  queryClient.invalidateQueries({ queryKey: ['/api/profile/links'] });
                                                  toast({ title: "Link added!" });
                                                  setShowAddSocialDialog(false);
                                                } catch {
                                                  toast({ title: "Error", description: "Failed to add link", variant: "destructive" });
                                                }
                                              }}
                                              data-testid={`add-link-${profile.platform}`}
                                            >
                                              <Link2 className="h-3 w-3 mr-1" />
                                              {alreadyAsLink ? 'Already a Link' : 'Add as Link'}
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                                {connectedProfiles.filter(p => !socialIcons.some(icon => icon.platform === p.platform)).length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-2">All connected accounts added as icons</p>
                                )}
                              </div>
                            )}
                            
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or add manually</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Platform</Label>
                              <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                                <SelectTrigger data-testid="select-social-platform">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {socialPlatformOptions.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <div className="flex items-center gap-2">
                                        {opt.icon}
                                        {opt.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Profile URL</Label>
                              <Input
                                placeholder="https://instagram.com/yourprofile"
                                value={newSocialUrl}
                                onChange={(e) => setNewSocialUrl(e.target.value)}
                                data-testid="input-social-url"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleAddSocialIcon}
                              disabled={updateSocialIconsMutation.isPending}
                              data-testid="button-save-social-icon"
                            >
                              {updateSocialIconsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Add Icon
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {socialIcons.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <div className="flex justify-center gap-3 mb-3 opacity-50">
                          <SiInstagram className="h-6 w-6" />
                          <SiYoutube className="h-6 w-6" />
                          <SiSpotify className="h-6 w-6" />
                        </div>
                        <p className="text-sm">Add social icons to display at the top of your page</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {socialIcons.map((icon, index) => {
                          const platformOption = socialPlatformOptions.find(p => p.value === icon.platform);
                          return (
                            <div 
                              key={index}
                              className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg group"
                            >
                              {platformOption?.icon || <Link2 className="h-4 w-4" />}
                              <span className="text-sm">{platformOption?.label || icon.platform}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={() => handleRemoveSocialIcon(index)}
                                data-testid={`button-remove-social-${index}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* YouTube Video Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <SiYoutube className="h-5 w-5 text-red-500" />
                          YouTube Video
                        </CardTitle>
                        <CardDescription>Embed a YouTube video on your page</CardDescription>
                      </div>
                      <Dialog open={showYouTubeDialog} onOpenChange={setShowYouTubeDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant={youtubeVideoUrl ? "outline" : "default"} data-testid="button-setup-youtube">
                            {youtubeVideoUrl ? (
                              <>
                                <Video className="h-4 w-4 mr-2" />
                                Edit Video
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Video
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Set up your YouTube link</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            {youtubeVideoUrl && getYouTubeVideoId(youtubeVideoUrl) && (
                              <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
                                <div className="relative rounded-lg overflow-hidden shadow-lg" style={{ width: '280px' }}>
                                  <img 
                                    src={`https://img.youtube.com/vi/${getYouTubeVideoId(youtubeVideoUrl)}/mqdefault.jpg`}
                                    alt="Video thumbnail"
                                    className="w-full aspect-video object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-red-600 rounded-full p-3">
                                      <Video className="h-5 w-5 text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label>YouTube Video URL</Label>
                              <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={youtubeVideoUrl}
                                onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                                data-testid="input-youtube-url"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label>This link should:</Label>
                              <RadioGroup value={youtubeVideoMode} onValueChange={(val) => setYoutubeVideoMode(val as typeof youtubeVideoMode)}>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="specific" id="specific" />
                                  <Label htmlFor="specific" className="font-normal cursor-pointer">Display the video I've linked to</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="latest" id="latest" />
                                  <Label htmlFor="latest" className="font-normal cursor-pointer flex items-center gap-1">
                                    Always display my latest video
                                    <Badge variant="secondary" className="text-xs">Pro</Badge>
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="channel" id="channel" />
                                  <Label htmlFor="channel" className="font-normal cursor-pointer">Link out to my YouTube channel</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="latestLink" id="latestLink" />
                                  <Label htmlFor="latestLink" className="font-normal cursor-pointer flex items-center gap-1">
                                    Always link out to my latest video
                                    <Badge variant="secondary" className="text-xs">Pro</Badge>
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </div>
                          <DialogFooter className="flex-col sm:flex-row gap-2">
                            {youtubeVideoUrl && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setYoutubeVideoUrl('');
                                  updateYouTubeVideoMutation.mutate({ youtubeVideoUrl: null, youtubeVideoMode: 'specific' });
                                }}
                                className="sm:mr-auto"
                                data-testid="button-remove-youtube"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Video
                              </Button>
                            )}
                            <Button
                              onClick={handleSaveYouTubeVideo}
                              disabled={updateYouTubeVideoMutation.isPending}
                              data-testid="button-save-youtube"
                            >
                              {updateYouTubeVideoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Add YouTube video layout
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  {youtubeVideoUrl && (
                    <CardContent>
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-16 h-10 rounded overflow-hidden bg-black shrink-0">
                          {getYouTubeVideoId(youtubeVideoUrl) && (
                            <img 
                              src={`https://img.youtube.com/vi/${getYouTubeVideoId(youtubeVideoUrl)}/default.jpg`}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">YouTube Video</p>
                          <p className="text-xs text-muted-foreground truncate">{youtubeVideoUrl}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {youtubeVideoMode === 'specific' ? 'Specific Video' : 
                           youtubeVideoMode === 'latest' ? 'Latest Video' :
                           youtubeVideoMode === 'channel' ? 'Channel Link' : 'Latest Link'}
                        </Badge>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>

              {/* Links Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Your Links</CardTitle>
                        <CardDescription>Add links to share with your audience</CardDescription>
                      </div>
                      <Dialog open={showAddLinkDialog} onOpenChange={setShowAddLinkDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-link">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Link
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Add a Link</DialogTitle>
                            <DialogDescription>
                              Add from connected accounts or paste any URL
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            {connectedProfiles.length > 0 && !selectedTemplate && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Connected Accounts</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {connectedProfiles
                                    .filter(p => !links.some(link => link.url === p.profileUrl))
                                    .map(profile => {
                                      const opt = socialPlatformOptions.find(o => o.value === profile.platform);
                                      return (
                                        <Button
                                          key={profile.id}
                                          variant="outline"
                                          className="flex items-center justify-start gap-2 h-auto py-2 px-3"
                                          onClick={() => {
                                            setNewLink({
                                              title: profile.displayName || profile.username || opt?.label || profile.platform,
                                              url: profile.profileUrl
                                            });
                                          }}
                                          data-testid={`link-connected-${profile.platform}`}
                                        >
                                          {opt?.icon || <Link2 className="h-4 w-4" />}
                                          <div className="text-left">
                                            <p className="text-xs font-medium truncate">{profile.displayName || profile.username || opt?.label}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {profile.platform === 'youtube' && profile.subscriberCount && `${profile.subscriberCount.toLocaleString()} subs`}
                                              {profile.platform === 'instagram' && profile.followersCount && `${profile.followersCount.toLocaleString()} followers`}
                                              {profile.platform === 'facebook' && profile.facebookFansCount && `${profile.facebookFansCount.toLocaleString()} fans`}
                                              {!profile.subscriberCount && !profile.followersCount && !profile.facebookFansCount && 'Connected'}
                                            </p>
                                          </div>
                                        </Button>
                                      );
                                    })}
                                </div>
                                <div className="relative pt-2">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or choose platform</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {!selectedTemplate && (
                              <div className="grid grid-cols-3 gap-2">
                                {templates?.templates?.slice(0, 9).map((template) => (
                                  <Button
                                    key={template.platform}
                                    variant="outline"
                                    className="flex flex-col h-auto py-3 gap-1"
                                    onClick={() => handleSelectTemplate(template)}
                                    data-testid={`button-template-${template.platform.toLowerCase().replace(/\s/g, '-')}`}
                                  >
                                    {platformIcons[template.icon] || <Link2 className="h-4 w-4" />}
                                    <span className="text-xs">{template.platform}</span>
                                  </Button>
                                ))}
                              </div>
                            )}

                            {selectedTemplate && (
                              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                {platformIcons[selectedTemplate.icon] || <Link2 className="h-4 w-4" />}
                                <span className="font-medium">{selectedTemplate.platform}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                  onClick={() => {
                                    setSelectedTemplate(null);
                                    setNewLink({ title: "", url: "" });
                                  }}
                                >
                                  Change
                                </Button>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium">URL</label>
                                <Input
                                  value={newLink.url}
                                  onChange={(e) => handleUrlChange(e.target.value)}
                                  placeholder={selectedTemplate?.placeholder || "https://..."}
                                  data-testid="input-link-url"
                                />
                                {analyzeLinkMutation.isPending && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Detecting platform...
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                  value={newLink.title}
                                  onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Link title"
                                  data-testid="input-link-title"
                                />
                              </div>
                            </div>

                            <Button
                              onClick={handleAddLink}
                              disabled={addLinkMutation.isPending || !newLink.url || !newLink.title}
                              className="w-full"
                              data-testid="button-save-link"
                            >
                              {addLinkMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Add Link
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <AnimatePresence>
                      {links.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No links yet. Add your first link above!</p>
                        </div>
                      ) : (
                        links.map((link) => (
                          <motion.div
                            key={link.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                              {getIconForLink(link.url)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{link.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteLinkMutation.mutate(link.id)}
                              data-testid={`button-delete-link-${link.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
              </>
            )}
          </div>

          <div className={`lg:w-80 shrink-0 ${!showMobilePreview && 'hidden lg:block'}`}>
            <div className="sticky top-20">
              <PhoneMockup
                displayName={watchedValues.displayName || "Your Name"}
                headline={watchedValues.headline}
                bio={watchedValues.bio}
                socialIcons={socialIcons}
                youtubeVideoUrl={youtubeVideoUrl}
                links={links}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
