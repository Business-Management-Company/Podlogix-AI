import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BuzzsproutConnect } from "@/components/settings/BuzzsproutConnect";
import { Card, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Link2,
  Instagram,
  Youtube,
  Linkedin,
  Facebook,
  Loader2,
  RefreshCw,
  Trash2,
  Calendar,
  Plus,
} from "lucide-react";
import { SiTiktok, SiSpotify, SiX, SiThreads, SiReddit, SiPinterest, SiBluesky, SiDiscord, SiTelegram } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ── Types ── */

interface SpotifyConnection {
  connected: boolean;
  displayName?: string;
}

interface GoogleCalendarConnection {
  connected: boolean;
  email?: string;
}

interface YouTubeSourceConnection {
  connected: boolean;
  channelTitle?: string | null;
}

interface CreatorSocialProfile {
  id: string;
  platform: string;
  profileUrl: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  instagramAccountId?: string;
  subscriberCount?: number;
  followersCount?: number;
  lastSyncedAt?: string;
}

interface UploadPostAccount {
  id: string;
  platform: string;
  platformUsername: string;
  profilePictureUrl: string | null;
  isConnected: boolean;
  reauthRequired?: boolean;
}

/* ── Platform metadata ── */

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4 text-pink-500" />,
  tiktok: <SiTiktok className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  twitter: <SiX className="h-4 w-4" />,
  x: <SiX className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4 text-blue-600" />,
  facebook: <Facebook className="h-4 w-4 text-blue-500" />,
  threads: <SiThreads className="h-4 w-4" />,
  reddit: <SiReddit className="h-4 w-4 text-orange-600" />,
  pinterest: <SiPinterest className="h-4 w-4 text-red-600" />,
  bluesky: <SiBluesky className="h-4 w-4 text-sky-500" />,
  discord: <SiDiscord className="h-4 w-4 text-indigo-500" />,
  telegram: <SiTelegram className="h-4 w-4 text-sky-600" />,
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  reddit: "Reddit",
  pinterest: "Pinterest",
  bluesky: "Bluesky",
  discord: "Discord",
  telegram: "Telegram",
};

const platformPlaceholders: Record<string, string> = {
  youtube: "https://youtube.com/@yourchannel",
  tiktok: "https://tiktok.com/@yourusername",
  twitter: "https://twitter.com/yourusername",
};

/** Every posting platform included in our Upload-Post plan. */
const POSTING_PLATFORMS = [
  "instagram", "youtube", "facebook", "linkedin", "x", "tiktok",
  "threads", "reddit", "pinterest", "bluesky", "discord", "telegram",
];

function formatNumber(num: number | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

/* ── Row primitives — the whole page is built from these ── */

function StatusIndicator({ state, label }: { state: "connected" | "off" | "warn"; label: string }) {
  const dot = { connected: "bg-emerald-500", off: "bg-zinc-300", warn: "bg-amber-500" }[state];
  const text = { connected: "text-emerald-700", off: "text-zinc-400", warn: "text-amber-600" }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ConnectorRow({
  icon,
  name,
  detail,
  status,
  statusLabel,
  action,
}: {
  icon: React.ReactNode;
  name: string;
  detail?: string;
  status: "connected" | "off" | "warn";
  statusLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-950">{name}</p>
        {detail && <p className="truncate text-xs text-zinc-500">{detail}</p>}
      </div>
      <StatusIndicator state={status} label={statusLabel} />
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Page ── */

export default function Connectors() {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [profileUrl, setProfileUrl] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  /* ── Data ── */

  const { data: spotifyStatus } = useQuery<SpotifyConnection>({
    queryKey: ["/api/listener/spotify/status"],
  });

  const { data: googleCalendarStatus } = useQuery<GoogleCalendarConnection>({
    queryKey: ["/api/calendar/google/status"],
  });

  const { data: youtubeSourceStatus } = useQuery<YouTubeSourceConnection>({
    queryKey: ["/api/content-sources/youtube/status"],
  });

  const { data: creatorProfiles = [] } = useQuery<CreatorSocialProfile[]>({
    queryKey: ["/api/creator/social-profiles"],
  });

  const { data: uploadPostData } = useQuery<{ accounts: UploadPostAccount[] }>({
    queryKey: ["/api/upload-post/accounts"],
    retry: false,
  });
  const postingAccounts = new Map(
    (uploadPostData?.accounts ?? []).map((a) => [a.platform.toLowerCase(), a])
  );

  /* ── Post-OAuth redirect toasts (unchanged behavior) ── */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("instagram_connected") === "true") {
      toast({ title: "Instagram connected!", description: "Your Instagram profile has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, "", "/connectors");
    } else if (params.get("instagram_error")) {
      toast({ title: "Instagram connection failed", description: "Could not connect your Instagram account", variant: "destructive" });
      window.history.replaceState({}, "", "/connectors");
    }

    if (params.get("linkedin_connected") === "true") {
      toast({ title: "LinkedIn connected!", description: "Your LinkedIn profile has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, "", "/connectors");
    } else if (params.get("linkedin_error")) {
      toast({ title: "LinkedIn connection failed", description: "Could not connect your LinkedIn account", variant: "destructive" });
      window.history.replaceState({}, "", "/connectors");
    }

    if (params.get("facebook_connected") === "true") {
      toast({ title: "Facebook connected!", description: "Your Facebook Page has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      window.history.replaceState({}, "", "/connectors");
    } else if (params.get("facebook_error")) {
      const error = params.get("facebook_error");
      const errorMessages: Record<string, string> = {
        no_pages: "No Facebook Pages found. You need a Facebook Page to connect.",
        auth_denied: "Access was denied.",
        token_exchange_failed: "Could not exchange authorization code.",
      };
      toast({ title: "Facebook connection failed", description: (error && errorMessages[error]) || "Could not connect your Facebook Page", variant: "destructive" });
      window.history.replaceState({}, "", "/connectors");
    }

    if (params.get("google_calendar_connected") === "true") {
      toast({ title: "Google Calendar connected!", description: "Your calendar has been linked successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/google/status"] });
      window.history.replaceState({}, "", "/connectors");
    } else if (params.get("google_calendar_error")) {
      toast({ title: "Google Calendar connection failed", description: "Could not connect your Google Calendar", variant: "destructive" });
      window.history.replaceState({}, "", "/connectors");
    }
  }, [toast]);

  /* ── Mutations (same endpoints as before) ── */

  const connectPostingMutation = useMutation({
    mutationFn: async (platform: string) => {
      const res = await apiRequest("POST", "/api/upload-post/connect-url", { platforms: [platform], returnTo: "/connectors" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.access_url) {
        window.location.href = data.access_url;
      } else {
        toast({ title: "Error", description: "Failed to get connection URL", variant: "destructive" });
        setConnectingPlatform(null);
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start the connection flow", variant: "destructive" });
      setConnectingPlatform(null);
    },
  });

  const connectSpotifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/listener/spotify/auth");
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url) => { window.location.href = url; },
    onError: () => toast({ title: "Error", description: "Failed to connect to Spotify", variant: "destructive" }),
  });

  const disconnectSpotifyMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", "/api/listener/spotify/disconnect"); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listener/spotify/status"] });
      toast({ title: "Disconnected", description: "Spotify has been disconnected" });
    },
  });

  const connectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/calendar/google/auth");
      const data = await res.json();
      return data.authUrl;
    },
    onSuccess: (authUrl) => { window.location.href = authUrl; },
    onError: () => toast({ title: "Error", description: "Failed to connect to Google Calendar", variant: "destructive" }),
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", "/api/calendar/google/disconnect"); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/google/status"] });
      toast({ title: "Disconnected", description: "Google Calendar has been disconnected" });
    },
  });

  const connectYouTubeSourceMutation = useMutation({
    mutationFn: async () => (await apiRequest("GET", "/api/content-sources/youtube/auth")).json(),
    onSuccess: (data) => { window.location.href = data.authUrl; },
    onError: () => toast({ title: "Error", description: "Failed to connect YouTube", variant: "destructive" }),
  });

  const addProfileMutation = useMutation({
    mutationFn: async ({ platform, profileUrl }: { platform: string; profileUrl: string }) => {
      const res = await apiRequest("POST", "/api/creator/social-profiles", { platform, profileUrl });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      setDialogOpen(false);
      setSelectedPlatform("");
      setProfileUrl("");
      toast({ title: "Profile Added", description: "Your social profile has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/creator/social-profiles/${id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      toast({ title: "Synced", description: "Profile analytics updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to sync profile", variant: "destructive" }),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/creator/social-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/creator/social-profiles"] });
      toast({ title: "Removed", description: "Social profile has been removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove profile", variant: "destructive" }),
  });

  /* ── Derived ── */

  const urlBasedPlatforms = ["youtube", "tiktok", "twitter"];
  const availableUrlPlatforms = urlBasedPlatforms.filter(
    (p) => !creatorProfiles.some((profile) => profile.platform === p)
  );

  return (
    <div className="w-full max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Connected apps</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Everything Podlogix can connect to, and whether it's live right now.
        </p>
      </div>

      {/* ── Podcast hosting ── */}
      <section className="mb-8">
        <SectionHeader title="Podcast hosting" />
        <BuzzsproutConnect />
      </section>

      <section className="mb-8">
        <SectionHeader title="Content sources" />
        <p className="mb-3 text-xs text-zinc-500">Import creator-owned recordings into your Podlogix production workflow.</p>
        <Card padding="none">
          <ConnectorRow
            icon={<Youtube className="h-4 w-4 text-red-500" />}
            name="YouTube"
            detail={youtubeSourceStatus?.connected ? youtubeSourceStatus.channelTitle ?? "Verified channel" : "Verify ownership and browse your channel videos"}
            status={youtubeSourceStatus?.connected ? "connected" : "off"}
            statusLabel={youtubeSourceStatus?.connected ? "Connected" : "Not connected"}
            action={youtubeSourceStatus?.connected ? (
              <Button size="sm" variant="outline" onClick={() => { window.location.href = "/youtube-import"; }}>Import videos</Button>
            ) : (
              <Button size="sm" variant="outline" disabled={connectYouTubeSourceMutation.isPending} onClick={() => connectYouTubeSourceMutation.mutate()}>
                {connectYouTubeSourceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
              </Button>
            )}
          />
        </Card>
      </section>

      {/* ── Posting accounts ── */}
      <section className="mb-8">
        <SectionHeader title="Social posting" />
        <p className="mb-3 text-xs text-zinc-500">
          Accounts Podlogix can publish to. Connecting opens a secure linking page.
        </p>
        {POSTING_PLATFORMS.some((platform) => postingAccounts.get(platform)) && (
          <Card padding="none" className="mb-3 divide-y divide-zinc-100">
            {POSTING_PLATFORMS.filter((platform) => postingAccounts.get(platform)).map((platform) => {
              const account = postingAccounts.get(platform)!;
              const isConnecting = connectingPlatform === platform && connectPostingMutation.isPending;
              return (
                <ConnectorRow
                  key={platform}
                  icon={platformIcons[platform] ?? <Link2 className="h-4 w-4" />}
                  name={platformNames[platform] ?? platform}
                  detail={account.platformUsername ? `@${account.platformUsername}` : undefined}
                  status={account.reauthRequired ? "warn" : "connected"}
                  statusLabel={account.reauthRequired ? "Reconnect needed" : "Connected"}
                  action={
                    <Button
                      size="sm"
                      variant={account.reauthRequired ? "outline" : "ghost"}
                      onClick={() => {
                        setConnectingPlatform(platform);
                        connectPostingMutation.mutate(platform);
                      }}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : account.reauthRequired ? (
                        "Reconnect"
                      ) : (
                        "Manage"
                      )}
                    </Button>
                  }
                />
              );
            })}
          </Card>
        )}
        {POSTING_PLATFORMS.some((platform) => !postingAccounts.get(platform)) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {POSTING_PLATFORMS.filter((platform) => !postingAccounts.get(platform)).map((platform) => {
              const isConnecting = connectingPlatform === platform && connectPostingMutation.isPending;
              return (
                <div
                  key={platform}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
                    {platformIcons[platform] ?? <Link2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">
                    {platformNames[platform] ?? platform}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => {
                      setConnectingPlatform(platform);
                      connectPostingMutation.mutate(platform);
                    }}
                    disabled={isConnecting}
                  >
                    {isConnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Analytics profiles ── */}
      <section className="mb-8">
        <SectionHeader
          title="Analytics profiles"
          right={
            availableUrlPlatforms.length > 0 ? (
              <button
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <Plus size={12} /> Add by URL
              </button>
            ) : undefined
          }
        />
        <p className="mb-3 text-xs text-zinc-500">
          Public profiles Podlogix tracks for stats on your Link Page and dashboard.
        </p>
        <Card padding="none" className="divide-y divide-zinc-100">
          {creatorProfiles.map((profile) => (
            <ConnectorRow
              key={profile.id}
              icon={platformIcons[profile.platform] ?? <Link2 className="h-4 w-4" />}
              name={platformNames[profile.platform] ?? profile.platform}
              detail={[
                profile.username && `@${profile.username.replace(/^@/, "")}`,
                (profile.followersCount || profile.subscriberCount) &&
                  `${formatNumber(profile.followersCount || profile.subscriberCount)} followers`,
              ]
                .filter(Boolean)
                .join(" · ")}
              status="connected"
              statusLabel="Tracking"
              action={
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => syncProfileMutation.mutate(profile.id)}
                    disabled={syncProfileMutation.isPending}
                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100"
                    aria-label={`Sync ${profile.platform}`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncProfileMutation.isPending ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => deleteProfileMutation.mutate(profile.id)}
                    disabled={deleteProfileMutation.isPending}
                    className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
                    aria-label={`Remove ${profile.platform}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            />
          ))}
        </Card>
      </section>

      {/* ── Calendar & listening ── */}
      <section className="mb-8">
        <SectionHeader title="Calendar & listening" />
        <Card padding="none" className="divide-y divide-zinc-100">
          <ConnectorRow
            icon={<Calendar className="h-4 w-4 text-blue-600" />}
            name="Google Calendar"
            detail={
              googleCalendarStatus?.connected
                ? googleCalendarStatus.email ?? "Connected"
                : "Sync interview scheduling with your calendar"
            }
            status={googleCalendarStatus?.connected ? "connected" : "off"}
            statusLabel={googleCalendarStatus?.connected ? "Connected" : "Not connected"}
            action={
              googleCalendarStatus?.connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => disconnectGoogleCalendarMutation.mutate()}
                  disabled={disconnectGoogleCalendarMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => connectGoogleCalendarMutation.mutate()}
                  disabled={connectGoogleCalendarMutation.isPending}
                >
                  {connectGoogleCalendarMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
                </Button>
              )
            }
          />
          <ConnectorRow
            icon={<SiSpotify className="h-4 w-4 text-green-500" />}
            name="Spotify"
            detail={
              spotifyStatus?.connected
                ? spotifyStatus.displayName ?? "Connected"
                : "Link your listener account for playback features"
            }
            status={spotifyStatus?.connected ? "connected" : "off"}
            statusLabel={spotifyStatus?.connected ? "Connected" : "Not connected"}
            action={
              spotifyStatus?.connected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => disconnectSpotifyMutation.mutate()}
                  disabled={disconnectSpotifyMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => connectSpotifyMutation.mutate()}
                  disabled={connectSpotifyMutation.isPending}
                >
                  {connectSpotifyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Connect"}
                </Button>
              )
            }
          />
        </Card>
      </section>

      {/* ── Add analytics profile by URL ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an analytics profile</DialogTitle>
            <DialogDescription>
              Paste a public profile URL — Podlogix will track its stats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a platform" />
                </SelectTrigger>
                <SelectContent>
                  {availableUrlPlatforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        {platformIcons[p]} {platformNames[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profile URL</Label>
              <Input
                placeholder={selectedPlatform ? platformPlaceholders[selectedPlatform] : "https://..."}
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!selectedPlatform || !profileUrl.trim() || addProfileMutation.isPending}
              onClick={() => addProfileMutation.mutate({ platform: selectedPlatform, profileUrl: profileUrl.trim() })}
            >
              {addProfileMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Add Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
