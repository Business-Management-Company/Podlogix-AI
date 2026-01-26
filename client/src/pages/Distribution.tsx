import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Radio, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { SiSpotify, SiApplepodcasts, SiYoutubemusic, SiAmazon } from "react-icons/si";
import { motion } from "framer-motion";
import type { Podcast, DistributionChannel, ChannelSubmission } from "@shared/schema";

const channelIcons: Record<string, any> = {
  spotify: SiSpotify,
  apple: SiApplepodcasts,
  youtube: SiYoutubemusic,
  amazon: SiAmazon,
};

const channelColors: Record<string, string> = {
  spotify: "text-green-500",
  apple: "text-purple-500",
  youtube: "text-red-500",
  amazon: "text-orange-500",
};

export default function Distribution() {
  const [, navigate] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: podcasts = [], isLoading: podcastsLoading } = useQuery<Podcast[]>({
    queryKey: ['/api/podcasts'],
    enabled: isAuthenticated,
  });

  const podcast = podcasts[0];

  const { data: channels = [], isLoading: channelsLoading } = useQuery<DistributionChannel[]>({
    queryKey: ['/api/distribution/channels'],
    enabled: isAuthenticated,
  });

  const { data: submissions = [], isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery<ChannelSubmission[]>({
    queryKey: ['/api/podcasts', podcast?.id, 'distribution'],
    queryFn: async () => {
      if (!podcast) return [];
      const res = await fetch(`/api/podcasts/${podcast.id}/distribution`);
      return res.json();
    },
    enabled: !!podcast,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const submitMutation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!podcast) throw new Error("No podcast");
      const res = await apiRequest('POST', `/api/podcasts/${podcast.id}/distribution/${channelId}`);
      return res.json();
    },
    onSuccess: (data, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/podcasts', podcast?.id, 'distribution'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({ 
        title: "Submission started!", 
        description: "Your podcast is being submitted to the platform." 
      });
      // Refetch after a few seconds to show updated status
      setTimeout(() => refetchSubmissions(), 3000);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit.", variant: "destructive" });
    },
  });

  const getSubmissionStatus = (channelId: string) => {
    return submissions.find(s => s.channelId === channelId);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Submitted</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'submitted':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Radio className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (authLoading || podcastsLoading || channelsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            <span className="font-display font-bold text-xl">Distribution</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {!podcast ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Create a podcast first to manage distribution.</p>
              <Button asChild>
                <Link href="/dashboard/rss">Setup Podcast</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle>Publish Everywhere</CardTitle>
                  <CardDescription>
                    Submit your podcast to all major platforms with a single click.
                    We'll handle the distribution process for you.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2">
              {channels.map((channel, index) => {
                const submission = getSubmissionStatus(channel.id);
                const IconComponent = channelIcons[channel.id] || Radio;
                const colorClass = channelColors[channel.id] || "text-primary";
                const isSubmitting = submitMutation.isPending && submitMutation.variables === channel.id;
                
                return (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full hover-elevate">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                              <IconComponent className="h-6 w-6" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{channel.name}</h3>
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            </div>
                          </div>
                          {getStatusIcon(submission?.status)}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {getStatusBadge(submission?.status)}
                          
                          {!submission?.status || submission.status === 'not_submitted' ? (
                            <Button 
                              size="sm"
                              onClick={() => submitMutation.mutate(channel.id)}
                              disabled={isSubmitting}
                              data-testid={`button-submit-${channel.id}`}
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : null}
                              Submit
                            </Button>
                          ) : submission?.externalUrl ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(submission.externalUrl!, '_blank')}
                              data-testid={`button-view-${channel.id}`}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Help Text */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-muted-foreground"
            >
              <p>
                Submissions typically take 24-48 hours to be reviewed. 
                We'll notify you once your podcast is live on each platform.
              </p>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
