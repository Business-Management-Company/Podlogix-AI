import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, EmptyState, SectionHeader } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Mic2, Play, Sparkles, Video } from "lucide-react";
import { extractAudioAsWav } from "@/lib/audio-extraction";
import type { VideoAnalysis as VideoAnalysisRow } from "@shared/schema";

/**
 * /dashboard/video-analysis — speaking analysis, in-house.
 *
 * Pick one of your own videos (Live Studio clips and recordings included) or
 * paste a direct video URL. The browser extracts the audio, Whisper
 * transcribes it, and gpt-4o grades presence, speaking ability, and filler
 * usage with concrete coaching notes. No YouTube caption scraping — that
 * path broke constantly and analyzed other people's videos anyway. This one
 * analyzes YOURS.
 */

interface LibraryVideo {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  platform: string;
}

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const value = score ?? 0;
  const tone = value >= 80 ? "text-emerald-600" : value >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <span className={`text-2xl font-bold tabular-nums ${score === null ? "text-zinc-300" : tone}`}>
        {score ?? "—"}
      </span>
      <span className="text-center text-[11px] font-medium text-zinc-500">{label}</span>
    </div>
  );
}

export default function VideoAnalysis() {
  const { toast } = useToast();
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "extracting" | "transcribing" | "grading">("idle");
  const [result, setResult] = useState<VideoAnalysisRow | null>(null);

  const { data: libraryData } = useQuery<{ items: LibraryVideo[] }>({
    queryKey: ["/api/media-library"],
    retry: false,
  });
  const videos = (libraryData?.items ?? []).filter((i) => i.mediaType === "video" && i.mediaUrl);

  const { data: pastData, isLoading: pastLoading } = useQuery<VideoAnalysisRow[]>({
    queryKey: ["/api/video-analysis"],
    retry: false,
  });
  const past = (pastData ?? []).filter((a) => a.status === "completed");

  const busy = phase !== "idle";

  const analyze = async () => {
    const url = selectedUrl ?? manualUrl.trim();
    if (!url) return;
    setResult(null);
    try {
      setPhase("extracting");
      const wav = await extractAudioAsWav(url);

      setPhase("transcribing");
      const tRes = await fetch("/api/social/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      const tData = await tRes.json().catch(() => ({}));
      if (!tRes.ok) throw new Error(tData.message || "Transcription failed");
      const segments: Array<{ end: number }> = tData.segments ?? [];
      const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

      setPhase("grading");
      const aRes = await apiRequest("POST", "/api/video-analysis/speech", {
        transcript: tData.text,
        durationSeconds: duration,
        title: selectedTitle || "Speaking analysis",
        mediaUrl: url,
      });
      const aData = await aRes.json().catch(() => ({}));
      if (!aRes.ok) throw new Error(aData.message || "Analysis failed");
      setResult(aData.analysis);
      queryClient.invalidateQueries({ queryKey: ["/api/video-analysis"] });
      toast({ title: "Analysis ready", description: "Your speaking scorecard is below." });
    } catch (e) {
      toast({
        title: "Couldn't analyze",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setPhase("idle");
    }
  };

  const shown = result;

  return (
    <div className="w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
          <Mic2 className="h-6 w-6 text-zinc-400" />
          Speaking Analysis
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          AI coaching on your own recordings — presence, clarity, pace, and fillers. Whisper + GPT, all in-house.
        </p>
      </div>

      {/* Source picker */}
      <section className="mb-6">
        <SectionHeader title="Pick a recording" />
        {videos.length > 0 ? (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {videos.slice(0, 12).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedUrl(v.mediaUrl);
                  setSelectedTitle(v.caption || v.platform);
                  setManualUrl("");
                }}
                className={`w-44 shrink-0 overflow-hidden rounded-xl border text-left transition-colors ${
                  selectedUrl === v.mediaUrl ? "border-zinc-950 ring-1 ring-zinc-950" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <video src={v.mediaUrl!} className="h-24 w-full bg-black object-cover" muted />
                <p className="truncate px-2.5 py-1.5 text-[11px] text-zinc-600">{v.caption || v.platform}</p>
              </button>
            ))}
          </div>
        ) : (
          <Card className="mb-3">
            <p className="text-sm text-zinc-500">
              No videos in your library yet — cut a clip in the{" "}
              <Link href="/studio/live" className="font-medium underline">Live Studio</Link> or{" "}
              <Link href="/media-library" className="font-medium underline">import from your channels</Link>, or paste a
              direct video URL below.
            </p>
          </Card>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="…or paste a direct video URL (.mp4/.webm)"
            value={manualUrl}
            onChange={(e) => {
              setManualUrl(e.target.value);
              setSelectedUrl(null);
              setSelectedTitle("");
            }}
            className="flex-1"
          />
          <Button onClick={() => void analyze()} disabled={busy || (!selectedUrl && !manualUrl.trim())}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
            {phase === "extracting"
              ? "Extracting audio…"
              : phase === "transcribing"
                ? "Transcribing…"
                : phase === "grading"
                  ? "Coaching…"
                  : "Analyze"}
          </Button>
        </div>
      </section>

      {/* Result scorecard */}
      {shown && (
        <section className="mb-6">
          <SectionHeader title={shown.videoTitle || "Your scorecard"} />
          <Card padding="lg" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreRing score={shown.overallScore} label="Overall" />
              <ScoreRing score={shown.presenceScore} label="Presence" />
              <ScoreRing score={shown.speakingAbilityScore} label="Speaking ability" />
              <ScoreRing score={shown.fillerWordsScore} label="Filler control" />
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-700">
              {shown.overallFeedback && (
                <p className="rounded-xl bg-zinc-50 p-3 font-medium text-zinc-900">{shown.overallFeedback}</p>
              )}
              {shown.presenceFeedback && (
                <p><span className="font-semibold text-zinc-950">Presence — </span>{shown.presenceFeedback}</p>
              )}
              {shown.speakingAbilityFeedback && (
                <p><span className="font-semibold text-zinc-950">Speaking — </span>{shown.speakingAbilityFeedback}</p>
              )}
              {shown.fillerWordsFeedback && (
                <p><span className="font-semibold text-zinc-950">Fillers — </span>{shown.fillerWordsFeedback}</p>
              )}
            </div>
            {!!shown.fillerWordsDetected && Object.keys(shown.fillerWordsDetected as Record<string, number>).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(shown.fillerWordsDetected as Record<string, number>).map(([word, count]) => (
                  <span key={word} className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                    “{word}” × {Number(count)}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Past analyses */}
      <section>
        <SectionHeader title="Past analyses" />
        {pastLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : past.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No analyses yet"
            description="Run your first speaking analysis — pick a clip above and hit Analyze."
          />
        ) : (
          <Card padding="none" className="divide-y divide-zinc-100">
            {past.slice(0, 10).map((a) => (
              <button
                key={a.id}
                onClick={() => setResult(a)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
              >
                <Sparkles size={14} className="shrink-0 text-zinc-400" />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                  {a.videoTitle || "Speaking analysis"}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {a.overallScore ?? "—"}
                </span>
              </button>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
