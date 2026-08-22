import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Radio, CheckCircle2, Clock, AlertCircle, ExternalLink, Loader2, ListChecks } from "lucide-react";
import { SiSpotify, SiApplepodcasts, SiYoutubemusic, SiAmazon, SiIheartradio, SiPocketcasts } from "react-icons/si";
import { Card, SectionHeader, EmptyState } from "@/components/kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DistributionChannel, ChannelSubmission } from "@shared/schema";

const channelIcons: Record<string, any> = {
  spotify: SiSpotify,
  apple: SiApplepodcasts,
  youtube: SiYoutubemusic,
  amazon: SiAmazon,
  iheartradio: SiIheartradio,
  pocketcasts: SiPocketcasts,
};

const statusLabel: Record<string, string> = {
  approved: "Live",
  submitted: "Submitted",
  pending: "Pending",
  rejected: "Rejected",
  not_submitted: "Not Submitted",
};

/**
 * /shows/:id/directories — submit and track this show's listing status
 * across every podcast directory/platform. Reuses the existing
 * distribution-channel data model; this is the visual home that replaces
 * the old standalone Distribution tab.
 */
export default function ShowDirectories() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: channels, isLoading: channelsLoading } = useQuery<DistributionChannel[]>({
    queryKey: ["/api/distribution/channels"],
  });

  const { data: submissions, isLoading: subsLoading, refetch } = useQuery<ChannelSubmission[]>({
    queryKey: ["/api/podcasts", id, "distribution"],
    queryFn: async () => {
      const res = await fetch(`/api/podcasts/${id}/distribution`);
      return res.json();
    },
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await apiRequest("POST", `/api/podcasts/${id}/distribution/${channelId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/podcasts", id, "distribution"] });
      toast({ title: "Submission started", description: "We're submitting your podcast to this platform." });
      setTimeout(() => refetch(), 3000);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit.", variant: "destructive" });
    },
  });

  const getSubmission = (channelId: string) =>
    (Array.isArray(submissions) ? submissions : []).find((s) => s.channelId === channelId);

  const isLoading = channelsLoading || subsLoading;
  const list = Array.isArray(channels) ? channels : [];

  return (
    <div className="w-full max-w-[1600px] px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Directories</h1>
      <p className="mt-0.5 mb-6 text-sm text-zinc-500">
        Submit this show to every major podcast directory and track approval status.
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={ListChecks} title="No directories configured" description="Platform submissions will appear here once directories are set up." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((channel) => {
            const submission = getSubmission(channel.id);
            const status = submission?.status ?? "not_submitted";
            const Icon = channelIcons[channel.id] || Radio;
            const isSubmitting = submitMutation.isPending && submitMutation.variables === channel.id;

            return (
              <Card key={channel.id} padding="lg" className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">{channel.name}</p>
                    {channel.description ? (
                      <p className="truncate text-xs text-zinc-400">{channel.description}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <StatusIcon status={status} />
                  <span
                    className={
                      status === "approved"
                        ? "text-emerald-600"
                        : status === "submitted" || status === "pending"
                        ? "text-amber-600"
                        : status === "rejected"
                        ? "text-red-600"
                        : "text-zinc-400"
                    }
                  >
                    {statusLabel[status]}
                  </span>
                </div>

                {status === "not_submitted" ? (
                  <Button size="sm" onClick={() => submitMutation.mutate(channel.id)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : null}
                    Submit
                  </Button>
                ) : submission?.externalUrl ? (
                  <Button size="sm" variant="outline" onClick={() => window.open(submission.externalUrl!, "_blank")}>
                    <ExternalLink size={13} className="mr-1.5" /> Visit {channel.name}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    Awaiting review
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Submissions typically take 24–48 hours to be reviewed. We'll update the status here as each platform responds.
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case "submitted":
    case "pending":
      return <Clock size={14} className="text-amber-500" />;
    case "rejected":
      return <AlertCircle size={14} className="text-red-500" />;
    default:
      return <Radio size={14} className="text-zinc-300" />;
  }
}
