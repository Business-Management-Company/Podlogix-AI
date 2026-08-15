import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Link2,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiFacebook, SiLinkedin, SiX } from "react-icons/si";

interface UploadPostAccount {
  id: string;
  platform: string;
  platformUsername: string;
  profilePictureUrl: string | null;
  isConnected: boolean;
}

interface UploadPostPost {
  id: string;
  platforms: string[];
  content: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
}

interface AccountAnalytics {
  platform: string;
  followers: number;
  engagementRate: number;
}

const platformIcons: Record<string, any> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  facebook: SiFacebook,
  linkedin: SiLinkedin,
  twitter: SiX,
  x: SiX,
};

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  tiktok: "bg-black",
  youtube: "bg-red-600",
  facebook: "bg-blue-600",
  linkedin: "bg-blue-700",
  twitter: "bg-black",
  x: "bg-black",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

export default function SocialHub() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [postContent, setPostContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const justConnected = urlParams.get("connected") === "true";

  const { data: accountsData, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<{ accounts: UploadPostAccount[]; hasProfile?: boolean }>({
    queryKey: ["/api/upload-post/accounts"],
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: UploadPostPost[] }>({
    queryKey: ["/api/upload-post/posts"],
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{ accounts: AccountAnalytics[] }>({
    queryKey: ["/api/social-analytics/my-accounts"],
    retry: false,
  });
  const analyticsByPlatform = new Map(
    (analyticsData?.accounts ?? []).map((a) => [a.platform.toLowerCase(), a])
  );

  useEffect(() => {
    if (justConnected) {
      refetchAccounts();
      toast({
        title: "Accounts Connected",
        description: "Your social media accounts have been connected successfully.",
      });
      window.history.replaceState({}, "", "/dashboard/social-hub");
    }
  }, [justConnected, refetchAccounts, toast]);

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/upload-post/create-profile");
      return res.json();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (platforms: string[]) => {
      const res = await apiRequest("POST", "/api/upload-post/connect-url", { platforms });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.access_url) {
        window.location.href = data.access_url;
      } else {
        toast({
          title: "Error",
          description: "Failed to get connection URL",
          variant: "destructive",
        });
      }
      setIsConnecting(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to connect accounts",
        variant: "destructive",
      });
      setIsConnecting(false);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ platforms, content }: { platforms: string[]; content: string }) => {
      const res = await apiRequest("POST", "/api/upload-post/posts", { platforms, content });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Created",
        description: "Your post has been published to the selected platforms.",
      });
      setPostContent("");
      setSelectedPlatforms([]);
      queryClient.invalidateQueries({ queryKey: ["/api/upload-post/posts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await createProfileMutation.mutateAsync();
      connectMutation.mutate(["instagram", "tiktok", "youtube", "facebook", "linkedin"]);
    } catch {
      setIsConnecting(false);
    }
  };

  const handlePost = () => {
    if (!postContent.trim()) {
      toast({ title: "Error", description: "Please enter some content for your post", variant: "destructive" });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({ title: "Error", description: "Please select at least one platform", variant: "destructive" });
      return;
    }
    createPostMutation.mutate({ platforms: selectedPlatforms, content: postContent });
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const accounts = accountsData?.accounts || [];
  const posts = postsData?.posts || [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Social Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Connect your social accounts and post across platforms</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchAccounts()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Connected accounts" />
          {accountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No accounts connected yet"
              description="Connect your social media accounts to post from Podlogix."
            />
          ) : (
            <Card className="divide-y divide-zinc-100 overflow-hidden">
              {accounts.map((account) => {
                const Icon = platformIcons[account.platform.toLowerCase()] || Link2;
                const stats = analyticsByPlatform.get(account.platform.toLowerCase());
                return (
                  <CardRow key={account.id} className="px-4 py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${platformColors[account.platform.toLowerCase()] || "bg-zinc-500"}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize text-zinc-950">{account.platform}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {account.platformUsername && `@${account.platformUsername}`}
                        {stats && (
                          <>
                            {" · "}
                            {formatCount(stats.followers)} followers · {stats.engagementRate.toFixed(1)}% engagement
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant={account.isConnected ? "default" : "secondary"} className="shrink-0">
                      {account.isConnected ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Connected
                        </>
                      ) : (
                        "Disconnected"
                      )}
                    </Badge>
                  </CardRow>
                );
              })}
            </Card>
          )}
          {!accountsLoading && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {accounts.length === 0 ? "Connect Social Accounts" : "Connect More Accounts"}
            </Button>
          )}
          {accounts.length > 0 && !analyticsLoading && analyticsByPlatform.size === 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              Analytics aren't available for these accounts yet — check back after they've synced.
            </p>
          )}
        </section>

        <section>
          <SectionHeader title="Create post" />
          <Card padding="lg">
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-500">Connect your accounts first to start posting.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-500">Select platforms</Label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((account) => {
                      const Icon = platformIcons[account.platform.toLowerCase()] || Link2;
                      const isSelected = selectedPlatforms.includes(account.platform.toLowerCase());
                      return (
                        <Button
                          key={account.id}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePlatform(account.platform.toLowerCase())}
                          className="gap-1.5"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="capitalize">{account.platform}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post-content" className="text-xs font-medium text-zinc-500">Post content</Label>
                  <Textarea
                    id="post-content"
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                  />
                  <p className="text-right text-xs text-zinc-400">{postContent.length} characters</p>
                </div>

                <Button
                  onClick={handlePost}
                  disabled={createPostMutation.isPending || selectedPlatforms.length === 0 || !postContent.trim()}
                  className="w-full"
                >
                  {createPostMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-4 w-4" />
                  )}
                  Post to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </Card>
        </section>
      </div>

      <section className="mt-6">
        <SectionHeader title="Recent posts" />
        {postsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState icon={Calendar} title="No posts yet" description="Create your first post above." />
        ) : (
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {posts.map((post) => (
              <CardRow key={post.id} className="flex-col items-start gap-2 px-4 py-3">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {post.platforms?.map((platform) => {
                      const Icon = platformIcons[platform.toLowerCase()] || Link2;
                      return (
                        <div key={platform} className={`flex h-6 w-6 items-center justify-center rounded-full ${platformColors[platform.toLowerCase()] || "bg-zinc-500"}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                      );
                    })}
                  </div>
                  <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                </div>
                <p className="text-sm text-zinc-950">{post.content}</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock className="h-3 w-3" />
                  {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                </div>
              </CardRow>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
