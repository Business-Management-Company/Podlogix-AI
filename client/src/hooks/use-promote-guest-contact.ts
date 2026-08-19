import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PromoteGuestContactResult {
  masterContactId: string;
  contact: { id: string; email?: string | null };
}

export function usePromoteGuestContact() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      const response = await apiRequest(
        "PUT",
        `/api/guest-prospects/${encodeURIComponent(prospectId)}/contact`,
        {},
      );
      return response.json() as Promise<PromoteGuestContactResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts"] });
      toast({ title: "Added to Master Contacts" });
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't add contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
