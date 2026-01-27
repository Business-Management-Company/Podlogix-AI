import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Headphones,
  Sparkles,
  BookOpen,
  Bookmark,
  Clock,
  Target,
  Mic,
  Rss
} from "lucide-react";
import { motion } from "framer-motion";
import { SiSpotify } from "react-icons/si";

interface PodcastSubscription {
  id: string;
  title: string;
  author: string | null;
  artworkUrl: string | null;
  spotifyShowId: string | null;
}

interface SubscriptionEpisode {
  id: string;
  subscriptionId: string;
  title: string;
  publishedAt: string;
  duration: number | null;
  transcriptStatus: string;
  isRead: boolean;
}

interface EpisodeBriefing {
  id: string;
  episodeId: string;
  relevanceScore: number;
  matchedInterests: string[] | null;
  isBookmarked: boolean;
}

interface UserInterest {
  id: string;
  topic: string;
  priority: string;
}

export default function ListenerAnalytics() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<PodcastSubscription[]>({
    queryKey: ['/api/listener/subscriptions'],
    enabled: !!user,
  });

  const { data: episodes = [], isLoading: episodesLoading } = useQuery<SubscriptionEpisode[]>({
    queryKey: ['/api/listener/episodes'],
    enabled: !!user,
  });

  const { data: briefings = [], isLoading: briefingsLoading } = useQuery<EpisodeBriefing[]>({
    queryKey: ['/api/listener/briefings'],
    enabled: !!user,
  });

  const { data: interests = [] } = useQuery<UserInterest[]>({
    queryKey: ['/api/listener/interests'],
    enabled: !!user,
  });

  const isLoading = authLoading || subsLoading || episodesLoading || briefingsLoading;

  const totalEpisodes = episodes.length;
  const readEpisodes = episodes.filter(e => e.isRead).length;
  const transcribedEpisodes = episodes.filter(e => e.transcriptStatus === 'completed').length;
  const totalBriefings = briefings.length;
  const bookmarkedBriefings = briefings.filter(b => b.isBookmarked).length;
  const highRelevanceBriefings = briefings.filter(b => b.relevanceScore >= 70).length;
  const avgRelevanceScore = briefings.length > 0 
    ? Math.round(briefings.reduce((sum, b) => sum + b.relevanceScore, 0) / briefings.length)
    : 0;

  const spotifyPodcasts = subscriptions.filter(s => s.spotifyShowId).length;
  const rssPodcasts = subscriptions.filter(s => !s.spotifyShowId).length;

  const interestMatchCounts: Record<string, number> = {};
  briefings.forEach(b => {
    const matched = b.matchedInterests || [];
    matched.forEach(interest => {
      interestMatchCounts[interest] = (interestMatchCounts[interest] || 0) + 1;
    });
  });
  const topInterests = Object.entries(interestMatchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const podcastEpisodeCounts: Record<string, { title: string; count: number; briefings: number }> = {};
  episodes.forEach(ep => {
    const sub = subscriptions.find(s => s.id === ep.subscriptionId);
    if (sub) {
      if (!podcastEpisodeCounts[sub.id]) {
        podcastEpisodeCounts[sub.id] = { title: sub.title, count: 0, briefings: 0 };
      }
      podcastEpisodeCounts[sub.id].count++;
    }
  });
  briefings.forEach(b => {
    const ep = episodes.find(e => e.id === b.episodeId);
    if (ep) {
      const sub = subscriptions.find(s => s.id === ep.subscriptionId);
      if (sub && podcastEpisodeCounts[sub.id]) {
        podcastEpisodeCounts[sub.id].briefings++;
      }
    }
  });
  const topPodcasts = Object.values(podcastEpisodeCounts)
    .sort((a, b) => b.briefings - a.briefings)
    .slice(0, 5);

  const totalDuration = episodes.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalHours = Math.round(totalDuration / 3600);

  if (!user && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Sign in to view analytics</h2>
          <Button asChild>
            <Link href="/listener">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/listener">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-xl font-bold" data-testid="text-page-title">Listener Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Podcasts</CardTitle>
              <Headphones className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-podcasts">{subscriptions.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {spotifyPodcasts} from Spotify, {rssPodcasts} from RSS
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Episodes Tracked</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-episodes">{totalEpisodes}</div>
                  <p className="text-xs text-muted-foreground">
                    {transcribedEpisodes} transcribed, {readEpisodes} read
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">AI Briefings</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-briefings">{totalBriefings}</div>
                  <p className="text-xs text-muted-foreground">
                    {highRelevanceBriefings} high relevance (70%+)
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Avg. Relevance</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-relevance">{avgRelevanceScore}%</div>
                  <p className="text-xs text-muted-foreground">
                    Based on your {interests.length} interests
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Interest Matches
                </CardTitle>
                <CardDescription>Topics that appear most in your briefings</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : topInterests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No interest matches yet. Generate some briefings to see trends!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topInterests.map(([interest, count], i) => {
                      const maxCount = topInterests[0][1];
                      const percentage = Math.round((count / maxCount) * 100);
                      return (
                        <div key={interest} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{interest}</span>
                            <Badge variant="secondary">{count} matches</Badge>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rss className="h-5 w-5" />
                  Most Active Podcasts
                </CardTitle>
                <CardDescription>Podcasts with the most briefings generated</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : topPodcasts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Subscribe to podcasts and generate briefings to see stats!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topPodcasts.map((podcast, i) => {
                      const maxBriefings = topPodcasts[0].briefings || 1;
                      const percentage = Math.round((podcast.briefings / maxBriefings) * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate max-w-[200px]">{podcast.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{podcast.count} eps</Badge>
                              <Badge variant="secondary">{podcast.briefings} briefings</Badge>
                            </div>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Engagement Summary
              </CardTitle>
              <CardDescription>Your podcast listening engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center p-4 rounded-lg bg-muted/50" data-testid="stat-duration">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{totalHours}h</p>
                  <p className="text-xs text-muted-foreground">Total Content Duration</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50" data-testid="stat-bookmarks">
                  <Bookmark className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{bookmarkedBriefings}</p>
                  <p className="text-xs text-muted-foreground">Bookmarked Briefings</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50" data-testid="stat-spotify">
                  <SiSpotify className="h-8 w-8 mx-auto text-green-500 dark:text-green-400 mb-2" />
                  <p className="text-2xl font-bold">{spotifyPodcasts}</p>
                  <p className="text-xs text-muted-foreground">Spotify Imports</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50" data-testid="stat-topics">
                  <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{interests.length}</p>
                  <p className="text-xs text-muted-foreground">Topics Tracked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {briefings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Relevance Score Distribution</CardTitle>
                <CardDescription>How well episodes match your interests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4" data-testid="relevance-distribution">
                  {[
                    { label: "High (70-100%)", min: 70, max: 100, color: "bg-green-500 dark:bg-green-600" },
                    { label: "Medium (40-69%)", min: 40, max: 69, color: "bg-yellow-500 dark:bg-yellow-600" },
                    { label: "Low (0-39%)", min: 0, max: 39, color: "bg-red-500 dark:bg-red-600" },
                  ].map(range => {
                    const count = briefings.filter(b => b.relevanceScore >= range.min && b.relevanceScore <= range.max).length;
                    const percentage = Math.round((count / briefings.length) * 100);
                    return (
                      <div key={range.label} className="space-y-1" data-testid={`range-${range.label.split(' ')[0].toLowerCase()}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{range.label}</span>
                          <span className="text-sm text-muted-foreground">{count} briefings ({percentage}%)</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${range.color} transition-all`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
