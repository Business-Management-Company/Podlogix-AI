import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertSubscriber } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useCreateSubscriber() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSubscriber) => {
      // Validate locally first
      const validated = api.subscribers.create.input.parse(data);
      
      const res = await fetch(api.subscribers.create.path, {
        method: api.subscribers.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        // Try to parse structured error
        try {
          const errorData = await res.json();
          // Check for 409 Conflict (Duplicate)
          if (res.status === 409) {
            const parsed = api.subscribers.create.responses[409].parse(errorData);
            throw new Error(parsed.message);
          }
          // Check for 400 Bad Request
          if (res.status === 400) {
            const parsed = api.subscribers.create.responses[400].parse(errorData);
            throw new Error(parsed.message);
          }
        } catch (e) {
          // If parsing fails or generic error
          if (e instanceof Error) throw e;
        }
        throw new Error('Failed to subscribe');
      }

      return api.subscribers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Welcome aboard! 🚀",
        description: "You've been added to the waitlist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
