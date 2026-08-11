import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowUpRight, Plug, Rss, Settings2 } from "lucide-react";
import { Card, SectionHeader } from "@/components/kit";

interface BuzzsproutStatus {
  connected: boolean;
  connection?: {
    podcastTitle?: string | null;
    lastSyncedAt?: string | null;
    episodeCount?: number | null;
    status?: string | null;
  };
}

function formatLastSync(iso?: string | null) {
  if (!iso) return "Not synced yet";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Not synced yet";
  return `Last synced ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} at ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function ShowSettings() {
  const { data: buzzsprout, isLoading } = useQuery<BuzzsproutStatus>({
    queryKey: ["/api/connectors/buzzsprout/status"],
  });

  const conn =
    buzzsprout?.connected && buzzsprout.connection ? buzzsprout.connection : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Show Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Hosting, feeds, and details for this show.
      </p>

      <div className="mt-8 flex flex-col gap-8 max-w-2xl">
        {/* Your podcast host */}
        <section>
          <SectionHeader title="Your podcast host" />
          <Link href="/connectors">
            <Card interactive padding="md" className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200">
                <Plug size={18} className="text-zinc-500" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <p className="text-sm text-zinc-400">Checking connection…</p>
                ) : conn ? (
                  <>
                    <p className="text-sm font-medium text-zinc-950">
                      Buzzsprout
                      {conn.podcastTitle ? (
                        <span className="font-normal text-zinc-500">
                          {" "}
                          — {conn.podcastTitle}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {formatLastSync(conn.lastSyncedAt)}
                      {conn.episodeCount != null
                        ? ` · ${conn.episodeCount} episodes`
                        : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-950">
                      No podcast host connected
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Connect Buzzsprout to sync episodes and analytics automatically.
                    </p>
                  </>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">
                {conn ? "Manage connection" : "Connect"}
                <ArrowUpRight size={13} strokeWidth={1.75} />
              </span>
            </Card>
          </Link>
        </section>

        {/* RSS & feeds (advanced) */}
        <section>
          <SectionHeader title="RSS & feeds (advanced)" />
          <Link href="/dashboard/rss">
            <Card interactive padding="md" className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200">
                <Rss size={18} className="text-zinc-500" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-950">Manage RSS feeds</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Import, validate, and inspect the feeds behind this show.
                </p>
              </div>
              <ArrowUpRight size={13} strokeWidth={1.75} className="text-zinc-400" />
            </Card>
          </Link>
        </section>

        {/* Show details */}
        <section>
          <SectionHeader title="Show details" />
          <Card padding="md" className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200">
              <Settings2 size={18} className="text-zinc-500" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-950">
                Metadata editing is coming to this page
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                For now, manage title, description, and artwork where the show is
                hosted.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
