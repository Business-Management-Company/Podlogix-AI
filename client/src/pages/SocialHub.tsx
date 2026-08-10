import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  ExternalLink
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
    onError: (error) => {
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
    } catch (error) {
      setIsConnecting(false);
    }
  };

  const handlePost = () => {
    if (!postContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one platform",
        variant: "destructive",
      });
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
  const connectedPlatforms = accounts.map((a) => a.platform.toLowerCase());

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Social Hub</h1>
          <p className="text-muted-foreground">Connect your social accounts and post across platforms</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchAccounts()}
          data-testid="button-refresh-accounts"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Connect your social media accounts to post from Podlogix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">No accounts connected yet</p>
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  data-testid="button-connect-accounts"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Social Accounts
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const Icon = platformIcons[account.platform.toLowerCase()] || Link2;
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`account-${account.platform.toLowerCase()}-${account.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${platformColors[account.platform.toLowerCase()] || "bg-gray-500"}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{account.platform}</p>
                          {account.platformUsername && (
                            <p className="text-sm text-muted-foreground">@{account.platformUsername}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={account.isConnected ? "default" : "secondary"}>
                        {account.isConnected ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          "Disconnected"
                        )}
                      </Badge>
                    </div>
                  );
                })}
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  data-testid="button-connect-more"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect More Accounts
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Create Post
            </CardTitle>
            <CardDescription>
              Write once, post everywhere
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Connect your accounts first to start posting</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Platforms</Label>
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
                          className="gap-2"
                          data-testid={`button-select-${account.platform.toLowerCase()}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="capitalize">{account.platform}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post-content">Post Content</Label>
                  <Textarea
                    id="post-content"
                    placeholder="What's on your mind?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={4}
                    data-testid="input-post-content"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {postContent.length} characters
                  </p>
                </div>

                <Button 
                  onClick={handlePost} 
                  disabled={createPostMutation.isPending || selectedPlatforms.length === 0 || !postContent.trim()}
                  className="w-full"
                  data-testid="button-create-post"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Posts
          </CardTitle>
          <CardDescription>
            Your posting history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No posts yet. Create your first post above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="p-4 rounded-lg border space-y-2"
                  data-testid={`post-item-${post.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {post.platforms?.map((platform) => {
                        const Icon = platformIcons[platform.toLowerCase()] || Link2;
                        return (
                          <div 
                            key={platform}
                            className={`p-1.5 rounded-full ${platformColors[platform.toLowerCase()] || "bg-gray-500"}`}
                          >
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                        );
                      })}
                    </div>
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>
                      {post.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{post.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
