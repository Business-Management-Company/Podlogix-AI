/**
 * BuzzsproutConnect — settings panel for connecting a Buzzsprout account.
 *
 * Shows:
 *  • A form to enter API token + podcast ID (when disconnected)
 *  • Connection status, podcast metadata, episode count (when connected)
 *  • A "Sync now" button and a list of the 10 most recent episodes
 *  • A "Disconnect" option
 *
 * Usage: drop this into any settings or dashboard page.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mic2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Unlink,
  ChevronRight,
  Clock,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuzzsproutStatus {
  connected: boolean;
  connection?: {
    id: string;
    podcastId: string;
    podcastTitle: string | null;
    podcastArtworkUrl: string | null;
    podcastAuthor: string | null;
    status: string;
    episodeCount: number | null;
    lastSyncedAt: string | null;
  };
}

interface BuzzsproutEpisode {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  totalPlays: number | null;
  status: string;
  publishedAt: string | null;
  artworkUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [apiToken, setApiToken] = useState("");
  const [podcastId, setPodcastId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/buzzsprout/connect", {
        apiToken,
        podcastId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.error) {
        setError(data.error);
      } else {
        onSuccess();
      }
    },
    onError: (err: any) => {
      setError(err?.message ?? "Connection failed. Check your token and podcast ID.");
    },
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bz-token" className="text-sm text-foreground">
          API Token
        </Label>
        <Input
          id="bz-token"
          type="password"
          placeholder="••••••••••••••••••••••••"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Found in your Buzzsprout account under{" "}
          <a
            href="https://www.buzzsprout.com/account/api_token"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Settings → API Key
            <ExternalLink className="ml-0.5 inline h-2.5 w-2.5" />
          </a>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bz-podcast-id" className="text-sm text-foreground">
          Podcast ID
        </Label>
        <Input
          id="bz-podcast-id"
          type="text"
          placeholder="12345"
          value={podcastId}
          onChange={(e) => setPodcastId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          The number in your Buzzsprout dashboard URL — e.g.{" "}
          <span className="font-mono">buzzsprout.com/</span>
          <span className="font-mono font-bold text-foreground/60">12345</span>
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        className="w-full"
        onClick={() => {
          setError(null);
          connectMutation.mutate();
        }}
        disabled={!apiToken.trim() || !podcastId.trim() || connectMutation.isPending}
      >
        {connectMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting…
          </>
        ) : (
          "Connect Buzzsprout"
        )}
      </Button>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "connected")
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
    );
  if (status === "syncing")
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
  return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
}

function EpisodeRow({ ep }: { ep: BuzzsproutEpisode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3.5 py-3 transition-colors hover:bg-white/[0.04]">
      {ep.artworkUrl ? (
        <img
          src={ep.artworkUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
          <Mic2 className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {ep.episodeNumber && (
            <span className="mr-1.5 text-muted-foreground/60">
              #{ep.episodeNumber}
            </span>
          )}
          {ep.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/50">
          {ep.publishedAt && <span>{formatDate(ep.publishedAt)}</span>}
          {ep.durationSeconds && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatDuration(ep.durationSeconds)}
              </span>
            </>
          )}
          {ep.totalPlays != null && ep.totalPlays > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Play className="h-2.5 w-2.5" />
                {ep.totalPlays.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 border-white/10 text-[10px]",
          ep.status === "published" && "text-emerald-400",
          ep.status === "draft" && "text-muted-foreground",
          ep.status === "scheduled" && "text-primary",
          ep.status === "archived" && "text-muted-foreground/40"
        )}
      >
        {ep.status}
      </Badge>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuzzsproutConnect() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<BuzzsproutStatus>({
    queryKey: ["/api/connectors/buzzsprout/status"],
    refetchInterval: (data) =>
      data?.connection?.status === "syncing" ? 3000 : false,
  });

  const episodesQuery = useQuery<{ episodes: BuzzsproutEpisode[] }>({
    queryKey: ["/api/connectors/buzzsprout/episodes"],
    enabled: statusQuery.data?.connected === true,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connectors/buzzsprout/sync", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors/buzzsprout/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connectors/buzzsprout/episodes"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/connectors/buzzsprout/disconnect", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connectors/buzzsprout/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connectors/buzzsprout/episodes"] });
    },
  });

  const invalidateStatus = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/connectors/buzzsprout/status"] });

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const { connected, connection } = statusQuery.data ?? { connected: false };

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
            <Mic2 className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="font-semibold">Buzzsprout</p>
            <p className="text-xs text-muted-foreground">Podcast Hosting</p>
          </div>
          <Badge variant="outline" className="ml-auto border-white/10 text-xs text-muted-foreground">
            Not connected
          </Badge>
        </div>

        <ConnectForm onSuccess={invalidateStatus} />
      </div>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  const episodes = episodesQuery.data?.episodes ?? [];
  const isSyncing =
    connection?.status === "syncing" || syncMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Connection card */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
        <div className="flex items-start gap-3">
          {connection?.podcastArtworkUrl ? (
            <img
              src={connection.podcastArtworkUrl}
              alt={connection.podcastTitle ?? "Podcast"}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <Mic2 className="h-6 w-6 text-orange-400" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold">
                {connection?.podcastTitle ?? "Buzzsprout Podcast"}
              </p>
              <StatusDot status={connection?.status ?? "connected"} />
            </div>
            {connection?.podcastAuthor && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {connection.podcastAuthor}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/60">
              <span>Podcast ID: {connection?.podcastId}</span>
              {connection?.episodeCount != null && (
                <span>{connection.episodeCount} episodes synced</span>
              )}
              {connection?.lastSyncedAt && (
                <span>
                  Last synced {formatDate(connection.lastSyncedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => syncMutation.mutate()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Sync now
              </>
            )}
          </Button>
          <a
            href={`https://www.buzzsprout.com/${connection?.podcastId}/episodes`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open in Buzzsprout
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-xs text-muted-foreground hover:text-destructive"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unlink className="mr-1 h-3.5 w-3.5" />
            )}
            Disconnect
          </Button>
        </div>
      </div>

      {/* Episode list */}
      {episodes.length > 0 && (
        <div className="space-y-2">
          <p className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
            Synced episodes
          </p>
          <div className="space-y-1.5">
            {episodes.slice(0, 10).map((ep) => (
              <EpisodeRow key={ep.id} ep={ep} />
            ))}
          </div>
          {episodes.length > 10 && (
            <p className="text-center text-xs text-muted-foreground/40">
              +{episodes.length - 10} more episodes synced
            </p>
          )}
        </div>
      )}

      {episodes.length === 0 && !episodesQuery.isLoading && (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] py-8 text-center text-sm text-muted-foreground/40">
          No episodes yet — click "Sync now" to import from Buzzsprout.
        </div>
      )}
    </div>
  );
}
