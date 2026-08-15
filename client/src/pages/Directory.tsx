import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, BookMarked, Loader2, Trash2, Users } from "lucide-react";
import { Card, CardRow, EmptyState, SectionHeader } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SavedCreator {
  id: string;
  listName: string;
  handle: string;
  platform: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  followers?: number | null;
  engagementRate?: number | null;
  isVerified?: boolean | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  twitch: "Twitch",
};

function formatCount(n?: number | null): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function Directory() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ creators: SavedCreator[] }>({
    queryKey: ["/api/discover/saved"],
  });
  const creators = data?.creators ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/discover/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discover/saved"] });
      toast({ title: "Removed from directory" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove creator", variant: "destructive" });
    },
  });

  const lists = new Map<string, SavedCreator[]>();
  for (const creator of creators) {
    const key = creator.listName || "Saved creators";
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key)!.push(creator);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Directory</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Creators you've saved from Discover, organized into lists.
        </p>
      </div>

      {isLoading ? null : lists.size === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No saved creators yet"
          description="When you research a guest on Discover, save them here to build out your directory."
          action={{ label: "Go to Discover", href: "/social/discover" }}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(lists.entries()).map(([listName, list]) => (
            <section key={listName}>
              <SectionHeader title={`${listName} · ${list.length}`} />
              <Card padding="none">
                <div className="divide-y divide-zinc-100">
                  {list.map((creator) => (
                    <CardRow key={creator.id}>
                      {creator.profilePictureUrl ? (
                        <img
                          src={creator.profilePictureUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                          <Users size={16} className="text-zinc-400" strokeWidth={1.75} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-sm font-medium text-zinc-950">
                          {creator.name || creator.handle}
                          {creator.isVerified && <BadgeCheck size={13} className="shrink-0 text-sky-500" />}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {PLATFORM_LABELS[creator.platform] || creator.platform} · @{creator.handle}
                        </p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-sm font-medium text-zinc-950">
                          {formatCount(creator.followers)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {(creator.engagementRate ?? 0).toFixed(1)}% eng.
                        </p>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(creator.id)}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${creator.handle}`}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </CardRow>
                  ))}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
