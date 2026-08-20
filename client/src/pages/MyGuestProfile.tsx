import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, Loader2, MapPin, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGuestAppearances } from "@/hooks/use-guest-appearances";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GuestSocialProfiles } from "@/components/guest/GuestSocialProfiles";
import { GuestAppearanceHistory } from "@/components/guest/GuestAppearanceHistory";

// Same shape the guest-discovery search/creator-detail routes already return
// for researching OTHER people — reused here to look up yourself.
interface CreatorCandidate {
  id: string;
  name: string;
  subtitle: string | null;
  location: string | null;
  bio: string | null;
  imageUrl: string | null;
  episodeAppearanceCount: number | null;
  socialLinks: Record<string, string | null | undefined> | null;
}

interface CreatorSearchResult {
  creatorCandidates: CreatorCandidate[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body as T;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Search-and-claim flow shown until the user has confirmed which
 * Podchaser creator record is themself. */
function ClaimIdentity({ onClaimed, onCancel }: { onClaimed: () => void; onCancel?: () => void }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);

  const searchQuery = useQuery<CreatorSearchResult>({
    queryKey: ["/api/guest-discovery/search", "self", debouncedQuery],
    queryFn: () => fetchJson(`/api/guest-discovery/search?q=${encodeURIComponent(debouncedQuery)}&max=8&page=1&sort=relevance`),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const claimMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      const res = await apiRequest("PATCH", "/api/user/podchaser-identity", { creatorId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "You're all set", description: "Your appearance history is loading below." });
      onClaimed();
    },
    onError: (error: Error) => toast({ title: "Couldn't link that profile", description: error.message, variant: "destructive" }),
  });

  const results = searchQuery.data?.creatorCandidates ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your name to find your guest history…"
            className="pl-9"
            data-testid="input-claim-self-search"
          />
        </div>
        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-claim-self">
            Cancel
          </Button>
        ) : null}
      </div>

      {debouncedQuery.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">Search Podchaser for yourself — the same source used to research your guests.</p>
      ) : searchQuery.isFetching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching…
        </p>
      ) : searchQuery.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {(searchQuery.error as Error).message}
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches yet — try a fuller name.</p>
      ) : (
        <div className="grid gap-2 max-w-lg">
          {results.map((candidate) => (
            <div key={candidate.id} className="flex items-center gap-3 rounded-xl border p-3">
              {candidate.imageUrl ? (
                <img src={candidate.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {candidate.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{candidate.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[candidate.subtitle, candidate.location].filter(Boolean).join(" · ") || "No bio available"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => claimMutation.mutate(candidate.id)}
                disabled={claimMutation.isPending}
                data-testid={`button-claim-self-${candidate.id}`}
              >
                {claimMutation.isPending && claimMutation.variables === candidate.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                This is me
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyGuestProfile() {
  const { user, isAuthenticated } = useAuth();
  const [editing, setEditing] = useState(false);

  const creatorId = user?.podchaserPersonId ?? null;

  const creatorQuery = useQuery<{ creator: CreatorCandidate }>({
    queryKey: ["/api/guest-discovery/creators", creatorId],
    enabled: Boolean(creatorId) && !editing,
  });
  const appearancesQuery = useGuestAppearances(editing ? null : creatorId);

  if (!isAuthenticated) return null;

  const creator = creatorQuery.data?.creator;
  const showClaimFlow = !creatorId || editing;

  return (
    <div className="w-full max-w-4xl px-6 py-8 space-y-6">
      <p className="text-sm text-muted-foreground">
        Every show you've appeared on as a guest, sourced from Podchaser — your own track record for pitching new shows.
      </p>

      {showClaimFlow ? (
        <ClaimIdentity
          onClaimed={() => setEditing(false)}
          onCancel={creatorId ? () => setEditing(false) : undefined}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {creator?.imageUrl ? (
                <img src={creator.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border object-cover" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-2xl font-semibold text-primary">
                  {(creator?.name ?? user?.firstName ?? "?").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <h2 className="text-xl font-semibold">{creator?.name ?? "Loading…"}</h2>
                {creator?.subtitle ? <p className="text-sm text-muted-foreground">{creator.subtitle}</p> : null}
                {creator?.location ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {creator.location}
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              data-testid="button-change-self-identity"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Not you?
            </Button>
          </div>

          {creator?.bio ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{creator.bio}</p> : null}

          {creator ? (
            <GuestSocialProfiles socialLinks={creator.socialLinks} hostedPodcasts={appearancesQuery.data?.hostedPodcasts} />
          ) : null}

          <GuestAppearanceHistory
            guestName={creator?.name ?? "you"}
            appearances={appearancesQuery.data}
            isLoading={appearancesQuery.isFetching}
            error={appearancesQuery.error}
          />
        </div>
      )}
    </div>
  );
}
