import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertMessage } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useCreateMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMessage) => {
      const validated = api.messages.create.input.parse(data);
      
      const res = await fetch(api.messages.create.path, {
        method: api.messages.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          const parsed = api.messages.create.responses[400].parse(errorData);
          throw new Error(parsed.message);
        }
        throw new Error('Failed to send message');
      }

      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "We'll get back to you shortly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
