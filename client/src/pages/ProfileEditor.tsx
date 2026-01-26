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
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  GripVertical,
  Loader2,
  Mic
} from "lucide-react";
import { motion } from "framer-motion";
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

export default function ProfileEditor() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newLink, setNewLink] = useState({ title: "", url: "" });

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

  const { data: profile, isLoading: profileLoading } = useQuery<Profile>({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: links = [], isLoading: linksLoading } = useQuery<ProfileLink[]>({
    queryKey: ['/api/profile/links'],
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
      toast({ title: "Profile created!", description: "Your profile has been created." });
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
      toast({ title: "Profile updated!", description: "Your changes have been saved." });
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl">Profile Editor</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>{profile ? "Edit Your Profile" : "Create Your Profile"}</CardTitle>
              <CardDescription>
                This is your public podcaster profile page. Make it stand out!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile URL</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">podlogix.com/p/</span>
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
                          <Input {...field} placeholder="Your Name" data-testid="input-display-name" />
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
                          <Input {...field} placeholder="Host of The Best Podcast" data-testid="input-headline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Tell your audience about yourself..." className="min-h-24" data-testid="input-bio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Publish Profile</FormLabel>
                          <FormDescription>
                            Make your profile visible to the public
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-published" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
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
                    {profile?.isPublished && (
                      <Button variant="outline" asChild>
                        <Link href={`/p/${profile.slug}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Profile
                        </Link>
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Links Section */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle>Profile Links</CardTitle>
                <CardDescription>Add links to your podcast, social media, and more</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Links */}
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{link.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteLinkMutation.mutate(link.id)}
                      data-testid={`button-delete-link-${link.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {/* Add New Link */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium">Add New Link</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Link Title"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                      data-testid="input-new-link-title"
                    />
                    <Input
                      placeholder="https://..."
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      data-testid="input-new-link-url"
                    />
                    <Button 
                      onClick={handleAddLink} 
                      disabled={addLinkMutation.isPending}
                      data-testid="button-add-link"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
