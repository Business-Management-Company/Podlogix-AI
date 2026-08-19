import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AudioLines, CheckCircle2, Circle, Clapperboard, Loader2, Music, Sparkles, Wand2, XCircle,
} from "lucide-react";
import { extractAudioAsWav } from "@/lib/audio-extraction";

/**
 * /studio/refine — Refiner. Post-production as its own room, outside the
 * live studio: pick any recording, press Refine, watch a REAL pipeline run —
 * every checkmark is an actual transformation of the actual file, and the
 * results are measured, never invented. (The house rule, born from the
 * Alchify audit: no timer theater.)
 */

type StepState = "idle" | "running" | "done" | "failed";

interface LibraryItem {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  platform: string;
}

const FILLER_RE = /\b(um+|uh+|erm|hmm+|you know|i mean)\b/gi;

const mediaDuration = (url: string, kind: "audio" | "video") =>
  new Promise<number>((resolve) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(el.duration || 0);
    el.onerror = () => resolve(0);
    el.src = url;
  });

export default function Refinery() {
  const { toast } = useToast();

  const [selected, setSelected] = useState<{ url: string; title: string; type: "video" | "audio" } | null>(null);
  const [pipeline, setPipeline] = useState<{ transcribe: StepState; refine: StepState }>({
    transcribe: "idle", refine: "idle",
  });
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string } | null>(null);
  const [refinedUrl, setRefinedUrl] = useState<string | null>(null);
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null);

  const { data: libraryData, isLoading } = useQuery<{ items: LibraryItem[] }>({
    queryKey: ["/api/media-library"],
    retry: false,
  });
  const sources = (libraryData?.items ?? []).filter(
    (i) => i.mediaUrl && (i.mediaType === "video" || i.mediaType === "audio"),
  );

  // Arriving from the Editing Room ("Refine this show") preselects the VOD.
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("src");
    if (src && !selected) {
      setSelected({ url: src, title: "Your show recording", type: "video" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (item: LibraryItem) => {
    setSelected({
      url: item.mediaUrl!,
      title: item.caption || item.platform,
      type: item.mediaType === "audio" ? "audio" : "video",
    });
    setPipeline({ transcribe: "idle", refine: "idle" });
    setTranscript(null);
    setRefinedUrl(null);
    setMinutesSaved(null);
  };

  const run = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      // Step 1 — Transcription (Whisper, the real one)
      setPipeline((p) => ({ ...p, transcribe: "running" }));
      try {
        const wav = await extractAudioAsWav(selected.url);
        const tRes = await fetch("/api/social/transcribe", {
          method: "POST",
          headers: { "Content-Type": "audio/wav" },
          body: wav,
        });
        const tData = await tRes.json().catch(() => ({}));
        if (!tRes.ok) throw new Error(tData.message || "Transcription failed");
        setTranscript({ text: String(tData.text ?? "") });
        setPipeline((p) => ({ ...p, transcribe: "done" }));
      } catch (e) {
        setPipeline((p) => ({ ...p, transcribe: "failed" }));
        throw e;
      }

      // Step 2 — Remove gaps + master loudness (one real FFmpeg pass)
      setPipeline((p) => ({ ...p, refine: "running" }));
      try {
        const cmd = "ffmpeg -y -i {input} -vn -af silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB,loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}";
        const submit = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", {
          files: [selected.url],
          full_command: cmd,
          output_extension: "mp3",
        });
        const sub = await submit.json().catch(() => ({}));
        if (!submit.ok || !sub.job_id) throw new Error(sub.message ?? "Couldn't start the refine");
        for (let i = 0; i < 150; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const st = await apiRequest("GET", `/api/media-lab/ffmpeg/jobs/${sub.job_id}`);
          const js = await st.json().catch(() => ({}));
          const status = String(js.status ?? "").toUpperCase();
          if (status === "FINISHED" || status === "COMPLETED") break;
          if (status === "ERROR" || status === "FAILED") throw new Error("The refine failed in processing");
          if (i === 149) throw new Error("Timed out waiting for the refine");
        }
        const collect = await apiRequest("POST", "/api/media-lab/collect", {
          jobId: sub.job_id,
          extension: "mp3",
          title: `${selected.title} — refined audio`,
        });
        const col = await collect.json().catch(() => ({}));
        if (!collect.ok) throw new Error(col.message ?? "Couldn't store the refined audio");
        if (col.url) {
          setRefinedUrl(String(col.url));
          const [orig, refined] = await Promise.all([
            mediaDuration(selected.url, selected.type),
            mediaDuration(String(col.url), "audio"),
          ]);
          setMinutesSaved(orig > 0 && refined > 0 && orig > refined ? (orig - refined) / 60 : 0);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
        setPipeline((p) => ({ ...p, refine: "done" }));
      } catch (e) {
        setPipeline((p) => ({ ...p, refine: "failed" }));
        throw e;
      }

      toast({ title: "Refined", description: "The polished version is in your Media Library." });
    } catch (e) {
      toast({
        title: "The pipeline stopped",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const fillersFound = transcript ? (transcript.text.match(FILLER_RE) ?? []).length : null;
  const wordsTranscribed = transcript ? transcript.text.split(/\s+/).filter(Boolean).length : null;
  const done = pipeline.refine === "done";

  const StepRow = ({ state, label, sub }: { state: StepState | "soon"; label: string; sub: string }) => (
    <div className="flex items-center gap-3 py-2.5">
      {state === "running" ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-zinc-500" />
      ) : state === "done" ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      ) : state === "failed" ? (
        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
      ) : (
        <Circle className="h-5 w-5 shrink-0 text-zinc-300" />
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${state === "soon" ? "text-zinc-400" : "text-zinc-900"}`}>{label}</span>
        <span className="block text-xs text-zinc-500">{sub}</span>
      </span>
      {state === "done" && <span className="text-xs font-semibold text-emerald-600">Done</span>}
      {state === "soon" && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Coming</span>}
    </div>
  );

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <style>{`
        @keyframes refinery-sweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes refinery-reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
          <Wand2 className="h-6 w-6 text-zinc-400" />
          Refiner
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Turn raw conversations into clear, compelling content — every checkmark is a real transformation of your actual file.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        {/* ── Select a recording ── */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Select a recording</p>
          {isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : sources.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
              Nothing to refine yet — record a show in the{" "}
              <Link href="/studio/live" className="font-medium underline">studio</Link> or add media to your{" "}
              <Link href="/media-library" className="font-medium underline">library</Link>.
            </p>
          ) : (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {sources.slice(0, 25).map((item) => (
                <button
                  key={item.id}
                  onClick={() => pick(item)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                    selected?.url === item.mediaUrl
                      ? "border-zinc-950 ring-1 ring-zinc-950"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {item.mediaType === "audio" ? (
                    <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                      <AudioLines className="h-4 w-4 text-emerald-600" />
                    </span>
                  ) : (
                    <video src={item.mediaUrl!} muted className="h-11 w-16 shrink-0 rounded-lg bg-black object-cover" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-zinc-900">{item.caption || item.platform}</span>
                    <span className="block text-[10px] uppercase text-zinc-400">{item.mediaType}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── The bench: player + before/after ── */}
        <div>
          <div
            className="rounded-2xl p-[3px]"
            style={
              busy
                ? {
                    background: "linear-gradient(90deg, #d84b2d, #f5c33b, #d84b2d, #f5c33b, #d84b2d)",
                    backgroundSize: "200% 100%",
                    animation: "refinery-sweep 2.2s linear infinite",
                  }
                : { background: "transparent" }
            }
          >
            <div className="overflow-hidden rounded-xl bg-zinc-950">
              {selected ? (
                selected.type === "audio" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 px-8">
                    <Music className="h-10 w-10 text-zinc-600" />
                    <audio src={selected.url} controls className="w-full" />
                  </div>
                ) : (
                  <video src={selected.url} controls className="aspect-video w-full bg-black" />
                )
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2">
                  <Clapperboard className="h-8 w-8 text-zinc-700" />
                  <p className="text-sm text-zinc-500">Select a recording to begin</p>
                </div>
              )}
            </div>
          </div>
          {selected && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">{selected.title}</p>
              <Button onClick={() => void run()} disabled={busy} className="shrink-0 bg-red-600 text-white hover:bg-red-700">
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Refining…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Refine my show
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Before / after — appears when the work is truly done */}
          {done && refinedUrl && (
            <div
              className="mt-5 grid gap-3 sm:grid-cols-2"
              style={{ animation: "refinery-reveal .6s ease both" }}
            >
              <div className="rounded-xl border border-zinc-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Before</p>
                {selected!.type === "audio" ? (
                  <audio src={selected!.url} controls className="w-full" />
                ) : (
                  <video src={selected!.url} controls className="w-full rounded-lg bg-black" />
                )}
              </div>
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  After — gaps cut, loudness mastered
                </p>
                <audio src={refinedUrl} controls className="w-full" />
                <p className="mt-2 text-[11px] text-emerald-700">Saved to your Media Library with the Refined badge.</p>
              </div>
            </div>
          )}

          {/* Honest numbers */}
          {(transcript || minutesSaved !== null) && (
            <div className="mt-5 grid grid-cols-3 gap-3" style={{ animation: "refinery-reveal .6s ease both" }}>
              {([
                [minutesSaved !== null ? minutesSaved.toFixed(1) : "—", "Minutes saved", "text-blue-600"],
                [fillersFound !== null ? String(fillersFound) : "—", "Fillers heard", "text-red-500"],
                [wordsTranscribed !== null ? wordsTranscribed.toLocaleString() : "—", "Words transcribed", "text-zinc-900"],
              ] as const).map(([value, label, tone]) => (
                <div key={label} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center">
                  <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
                  <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Processing pipeline ── */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Processing pipeline</p>
          <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white px-4 py-1">
            <StepRow state={pipeline.transcribe} label="Transcription" sub="Whisper writes down every word" />
            <StepRow state={pipeline.refine} label="Remove gaps" sub="Dead air and long pauses, cut" />
            <StepRow state={pipeline.refine} label="Audio cleanup" sub="Loudness mastered to −16 LUFS" />
            <StepRow state="soon" label="Remove fillers" sub="Word-level um/uh excision" />
            <StepRow state="soon" label="Enhance video" sub="Re-cut picture to the refined audio" />
          </div>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-zinc-500">
            Marked clips and captions live in your studio's Editing Room — Refiner polishes the whole show.
          </p>
        </div>
      </div>
    </div>
  );
}
