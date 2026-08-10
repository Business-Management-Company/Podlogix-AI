import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Youtube, 
  Loader2, 
  Play, 
  User, 
  Mic2, 
  MessageSquare,
  Eye,
  Star,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface VideoAnalysis {
  id: string;
  videoUrl: string;
  videoId: string;
  videoTitle: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  transcript: string | null;
  presenceScore: number | null;
  speakingAbilityScore: number | null;
  fillerWordsScore: number | null;
  appearanceScore: number | null;
  overallScore: number | null;
  presenceFeedback: string | null;
  speakingAbilityFeedback: string | null;
  fillerWordsFeedback: string | null;
  appearanceFeedback: string | null;
  overallFeedback: string | null;
  fillerWordsDetected: string[] | null;
  status: string;
  createdAt: string;
  analyzedAt: string | null;
}

function ScoreCard({ 
  title, 
  score, 
  feedback, 
  icon: Icon,
  extra 
}: { 
  title: string; 
  score: number | null; 
  feedback: string | null; 
  icon: any;
  extra?: React.ReactNode;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {score !== null && (
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {score !== null && (
          <div className="mb-3">
            <Progress 
              value={score} 
              className="h-2"
              style={{ 
                ['--progress-background' as string]: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        )}
        {feedback && (
          <p className="text-sm text-muted-foreground">{feedback}</p>
        )}
        {extra}
      </CardContent>
    </Card>
  );
}

function AnalysisCard({ analysis }: { analysis: VideoAnalysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {analysis.thumbnailUrl && (
          <div className="md:w-48 shrink-0">
            <img 
              src={analysis.thumbnailUrl} 
              alt={analysis.videoTitle || 'Video thumbnail'} 
              className="w-full h-32 md:h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold line-clamp-1">
                {analysis.videoTitle || 'Untitled Video'}
              </h3>
              {analysis.channelName && (
                <p className="text-sm text-muted-foreground">{analysis.channelName}</p>
              )}
            </div>
            <Badge 
              variant={analysis.status === 'completed' ? 'default' : analysis.status === 'failed' ? 'destructive' : 'secondary'}
            >
              {analysis.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {analysis.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {analysis.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
              {analysis.status}
            </Badge>
          </div>

          {analysis.status === 'completed' && analysis.overallScore !== null && (
            <div className="mt-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  <span className="text-2xl font-bold">{analysis.overallScore}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  data-testid="button-expand-analysis"
                >
                  {expanded ? 'Hide Details' : 'View Details'}
                </Button>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{analysis.presenceScore}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mic2 className="h-4 w-4" />
                  <span>{analysis.speakingAbilityScore}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{analysis.fillerWordsScore}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{analysis.appearanceScore}</span>
                </div>
              </div>
            </div>
          )}

          {analysis.status === 'failed' && analysis.overallFeedback && (
            <p className="mt-2 text-sm text-destructive">{analysis.overallFeedback}</p>
          )}
        </div>
      </div>

      {expanded && analysis.status === 'completed' && (
        <div className="border-t p-4 grid md:grid-cols-2 gap-4">
          <ScoreCard 
            title="Presence" 
            score={analysis.presenceScore} 
            feedback={analysis.presenceFeedback}
            icon={User}
          />
          <ScoreCard 
            title="Speaking Ability" 
            score={analysis.speakingAbilityScore} 
            feedback={analysis.speakingAbilityFeedback}
            icon={Mic2}
          />
          <ScoreCard 
            title="Filler Words" 
            score={analysis.fillerWordsScore} 
            feedback={analysis.fillerWordsFeedback}
            icon={MessageSquare}
            extra={
              analysis.fillerWordsDetected && analysis.fillerWordsDetected.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(analysis.fillerWordsDetected as string[]).map((word, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{word}</Badge>
                  ))}
                </div>
              )
            }
          />
          <ScoreCard 
            title="Appearance & Professionalism" 
            score={analysis.appearanceScore} 
            feedback={analysis.appearanceFeedback}
            icon={Eye}
          />
          {analysis.overallFeedback && (
            <Card className="md:col-span-2 bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Overall Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.overallFeedback}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Card>
  );
}

export default function VideoAnalysis() {
  const [videoUrl, setVideoUrl] = useState("");
  const { toast } = useToast();

  const { data: analyses, isLoading } = useQuery<VideoAnalysis[]>({
    queryKey: ['/api/video-analysis'],
    refetchInterval: (query) => {
      const data = query.state.data as VideoAnalysis[] | undefined;
      const hasPending = data?.some(a => a.status === 'pending');
      return hasPending ? 3000 : false;
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest('POST', '/api/video-analysis', { videoUrl: url });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Analysis started!", description: "We're analyzing the video. This may take a minute." });
      setVideoUrl("");
      queryClient.invalidateQueries({ queryKey: ['/api/video-analysis'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to start analysis", 
        variant: "destructive" 
      });
    }
  });

  const handleAnalyze = () => {
    if (!videoUrl.trim()) {
      toast({ title: "Please enter a YouTube URL", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate(videoUrl);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Analysis</h1>
        <p className="text-muted-foreground">
          Analyze YouTube videos to get AI-powered feedback on speaking skills
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Analyze a YouTube Video
          </CardTitle>
          <CardDescription>
            Enter a YouTube URL to analyze the speaker's presence, speaking ability, filler words, and appearance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="videoUrl" className="sr-only">YouTube URL</Label>
              <Input
                id="videoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                data-testid="input-video-url"
              />
            </div>
            <Button 
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              data-testid="button-analyze-video"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Analyses</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/video-analysis'] })}
            data-testid="button-refresh-analyses"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="space-y-4">
            {analyses.map(analysis => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Youtube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No analyses yet</h3>
              <p className="text-sm text-muted-foreground">
                Enter a YouTube URL above to get started with your first analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
