import { useQuery } from "@tanstack/react-query";
import type { GuestAppearanceResult } from "@/components/guest/GuestAppearanceHistory";

async function fetchGuestAppearances(creatorId: string): Promise<GuestAppearanceResult> {
  const response = await fetch(
    `/api/guest-discovery/creators/${encodeURIComponent(creatorId)}/appearances?max=10`,
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Guest history is unavailable");
  return body as GuestAppearanceResult;
}

export function useGuestAppearances(creatorId?: string | null) {
  return useQuery<GuestAppearanceResult>({
    queryKey: ["/api/guest-discovery/creators", creatorId, "appearances"],
    queryFn: () => fetchGuestAppearances(creatorId!),
    enabled: Boolean(creatorId),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
}
