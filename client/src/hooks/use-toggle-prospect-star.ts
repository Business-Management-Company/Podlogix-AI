import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useToggleProspectStar() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      const response = await apiRequest("PATCH", `/api/guest-prospects/${encodeURIComponent(id)}/star`, { starred });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update starred status", description: error.message, variant: "destructive" });
    },
  });
}
