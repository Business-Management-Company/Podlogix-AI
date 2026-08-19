import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Circle, Clapperboard, Loader2, Music, Sparkles, Gem, XCircle,
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

const CLIP_PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
];

interface WordStamp {
  word: string;
  start: number;
  end: number;
}

/**
 * Vocal fillers safe to cut outright. Deliberately conservative: only pure
 * hesitation sounds — never "like" or "you know", which can carry meaning.
 */
const CUTTABLE_FILLER = /^(um+|uh+|erm+|hmm+)$/i;

/**
 * Turn word-level timestamps into keep-spans: speech separated by less than
 * `minGap` seconds merges into one span, so only real dead air falls between
 * spans. When `cutFillers` is on, hesitation words act as hard barriers — the
 * span closes before the filler and reopens after it, excising the word
 * itself. Each span gets a small pad so cuts don't clip syllables. If the
 * show produces too many spans for one FFmpeg command, the gap threshold
 * rises until it fits.
 */
function speechSpans(
  words: WordStamp[],
  minGap: number,
  cutFillers: boolean,
  pad = 0.18,
): { spans: Array<[number, number]>; fillers: Array<[number, number]> } {
  const spans: Array<[number, number]> = [];
  const fillers: Array<[number, number]> = [];
  let barrier = false;
  for (const w of words) {
    if (typeof w.start !== "number" || typeof w.end !== "number") continue;
    if (cutFillers && CUTTABLE_FILLER.test(w.word.trim().replace(/[.,!?;:]+$/g, ""))) {
      fillers.push([w.start, w.end]);
      barrier = true;
      continue;
    }
    const last = spans[spans.length - 1];
    if (last && !barrier && w.start - last[1] <= minGap) last[1] = Math.max(last[1], w.end);
    else spans.push([w.start, w.end]);
    barrier = false;
  }
  return { spans: spans.map(([s, e]) => [Math.max(0, s - pad), e + pad]), fillers };
}

/**
 * The processing lane rejects over-long commands, so the span list gets a
 * hard cap: first the silence threshold widens, then — because filler
 * barriers can outnumber any threshold in an um-heavy interview — the
 * smallest remaining gaps merge until the list fits. Fillers swallowed by
 * those merges stay in the show; the removed-count reports only real cuts.
 */
function fittedSpans(words: WordStamp[], cutFillers: boolean): { spans: Array<[number, number]>; fillersCut: number } {
  let gap = 0.75;
  let result = speechSpans(words, gap, cutFillers);
  while (result.spans.length > 100 && gap < 3) {
    gap += 0.25;
    result = speechSpans(words, gap, cutFillers);
  }
  const spans = result.spans.map(([s, e]) => [s, e] as [number, number]);
  while (spans.length > 100) {
    let bi = 1;
    let bg = Infinity;
    for (let i = 1; i < spans.length; i++) {
      const g = spans[i][0] - spans[i - 1][1];
      if (g < bg) { bg = g; bi = i; }
    }
    spans[bi - 1][1] = spans[bi][1];
    spans.splice(bi, 1);
  }
  const fillersCut = result.fillers.filter(
    ([fs, fe]) => !spans.some(([s, e]) => fs >= s - 0.01 && fe <= e + 0.01),
  ).length;
  return { spans, fillersCut };
}

/** select/aselect expression for a span list. */
function spanExpr(spans: Array<[number, number]>): string {
  return spans.map(([s, e]) => `between(t\\,${s.toFixed(1)}\\,${e.toFixed(1)})`).join("+");
}

/**
 * Stitching happens in proven-safe shapes only: each intro/outro first gets
 * its own single-input normalize job (match the main cut's size, 30fps,
 * stereo 44.1k), then ONE concat job with a single -filter_complex and no
 * intermediate labels — the processing lane rejects semicolons and fails on
 * repeated -filter_complex flags, and both of these shapes verified clean
 * against its API.
 */
function normalizeCommand(w: number, h: number): string {
  return `ffmpeg -y -i {input} -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1" -af "aresample=44100,aformat=channel_layouts=stereo" -c:v h264_nvenc -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
}

function concatCommand(count: number): string {
  const inputs = Array.from({ length: count }, (_, i) => `-i {input${i}}`).join(" ");
  const pads = Array.from({ length: count }, (_, i) => `[${i}:v][${i}:a]`).join("");
  return `ffmpeg -y ${inputs} -filter_complex "${pads}concat=n=${count}:v=1:a=1" -c:v h264_nvenc -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
}

/** Width/height probe with the same hard timeout as the duration probe. */
const mediaDims = (url: string) =>
  new Promise<{ w: number; h: number } | null>((resolve) => {
    const el = document.createElement("video");
    let settled = false;
    const settle = (v: { w: number; h: number } | null) => {
      if (settled) return;
      settled = true;
      el.removeAttribute("src");
      resolve(v);
    };
    const timer = setTimeout(() => settle(null), 15_000);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      clearTimeout(timer);
      settle(el.videoWidth > 0 ? { w: el.videoWidth - (el.videoWidth % 2), h: el.videoHeight - (el.videoHeight % 2) } : null);
    };
    el.onerror = () => { clearTimeout(timer); settle(null); };
    el.src = url;
  });

// Duration probe with a hard timeout: a stalled metadata load must never
// wedge the pipeline — minutes-saved just reads "—" instead.
const mediaDuration = (url: string, kind: "audio" | "video") =>
  new Promise<number>((resolve) => {
    const el = document.createElement(kind);
    let settled = false;
    const settle = (v: number) => {
      if (settled) return;
      settled = true;
      el.removeAttribute("src");
      resolve(v);
    };
    const timer = setTimeout(() => settle(0), 15_000);
    el.preload = "metadata";
    el.onloadedmetadata = () => { clearTimeout(timer); settle(el.duration || 0); };
    el.onerror = () => { clearTimeout(timer); settle(0); };
    el.src = url;
  });

export default function Refinery() {
  const { toast } = useToast();

  const [selected, setSelected] = useState<{ url: string; title: string; type: "video" | "audio" } | null>(null);
  const [pipeline, setPipeline] = useState<{ transcribe: StepState; refine: StepState; stitch: StepState }>({
    transcribe: "idle", refine: "idle", stitch: "idle",
  });
  const [contentType, setContentType] = useState<"interview" | "produced">("interview");
  const [cutFillers, setCutFillers] = useState(true);
  const [colorCorrect, setColorCorrect] = useState(true);
  const [introId, setIntroId] = useState("");
  const [outroId, setOutroId] = useState("");
  const [fillersCut, setFillersCut] = useState<number | null>(null);
  const [wordCut, setWordCut] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string } | null>(null);
  const [refinedUrl, setRefinedUrl] = useState<string | null>(null);
  const [refinedIsVideo, setRefinedIsVideo] = useState(false);
  // null = source is audio (no picture to cut); true/false = whether the
  // video cut actually ran for this refine.
  const [videoCut, setVideoCut] = useState<boolean | null>(null);
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null);
  const [clipPlatforms, setClipPlatforms] = useState<string[]>(["youtube", "instagram", "tiktok"]);
  const [selDuration, setSelDuration] = useState<number | null>(null);
  const [selBytes, setSelBytes] = useState<number | null>(null);

  // Clip copy (graduated from the Media Lab beta): platform-tuned title,
  // caption, and hashtags for a short video. The analyzer takes clips up to
  // 100MB / 5 minutes, so the panel gates itself on the probed duration.
  const clipCopy = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/media-lab/analyze-shorts", {
        videoUrl: selected!.url,
        platforms: clipPlatforms,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).message || "Analysis failed");
      return data as Record<string, unknown> & { remaining_analyses?: number };
    },
    onSuccess: (data) =>
      toast({
        title: "Copy ready",
        description:
          typeof data.remaining_analyses === "number"
            ? `${data.remaining_analyses} of 300 analyses left this month`
            : undefined,
      }),
    onError: (error: Error) =>
      toast({
        title: "Couldn't write the copy",
        description: error.message.includes("429") ? "Monthly analysis quota is used up." : error.message,
        variant: "destructive",
      }),
  });

  useEffect(() => {
    setSelDuration(null);
    setSelBytes(null);
    setTranscript(null);
    setRefinedUrl(null);
    setRefinedIsVideo(false);
    setVideoCut(null);
    setMinutesSaved(null);
    setPipeline({ transcribe: "idle", refine: "idle", stitch: "idle" });
    setFillersCut(null);
    setWordCut(null);
    setIntroId("");
    setOutroId("");
    clipCopy.reset();
    if (!selected) return;
    void mediaDuration(selected.url, selected.type).then((d) => setSelDuration(d || null));
    // Big files can stall the metadata probe entirely — a HEAD request for
    // Content-Length still catches them, so the size gate never goes silent.
    void fetch(selected.url, { method: "HEAD" })
      .then((r) => {
        const len = Number(r.headers.get("content-length") || 0);
        if (len > 0) setSelBytes(len);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.url]);

  const { data: libraryData, isLoading } = useQuery<{ items: LibraryItem[] }>({
    queryKey: ["/api/media-library"],
    retry: false,
  });
  const sources = (libraryData?.items ?? []).filter(
    (i) => i.mediaUrl && (i.mediaType === "video" || i.mediaType === "audio"),
  );

  // Media is picked in Media Storage (or the Editing Room) and arrives here
  // via ?src= — once the library loads, enrich the selection with its real
  // title and type.
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("src");
    if (!src || selected) return;
    const match = sources.find((i) => i.mediaUrl === src);
    const looksAudio = /\.(mp3|wav|m4a|aac|ogg)(\?|$)/i.test(src);
    setSelected({
      url: src,
      title: match?.caption || "Your recording",
      type: match ? (match.mediaType === "audio" ? "audio" : "video") : looksAudio ? "audio" : "video",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryData]);

  const run = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setTranscript(null);
    setRefinedUrl(null);
    setRefinedIsVideo(false);
    setVideoCut(null);
    setWordCut(null);
    setFillersCut(null);
    setMinutesSaved(null);
    setPipeline({ transcribe: "idle", refine: "idle", stitch: "idle" });
    try {
      // Step 1 — Transcription (Whisper, the real one). The server lane
      // compresses first (FFmpeg → 48 kbps mono MP3), so long shows don't hit
      // Whisper's 25 MB wall; the in-browser WAV path stays as fallback for
      // short clips when that lane is unavailable. Word-level timestamps come
      // back too — they drive the video cut below.
      setPipeline((p) => ({ ...p, transcribe: "running" }));
      let words: WordStamp[] = [];
      try {
        let text: string | null = null;
        let serverError = "";
        try {
          const srv = await apiRequest("POST", "/api/refiner/transcribe", { mediaUrl: selected.url });
          const sData = await srv.json().catch(() => ({}));
          if (srv.ok) {
            text = String(sData.text ?? "");
            if (Array.isArray(sData.words)) words = sData.words as WordStamp[];
          } else serverError = String(sData.message ?? "");
        } catch {
          /* fall through to the browser path */
        }
        if (text === null) {
          try {
            const wav = await extractAudioAsWav(selected.url);
            const tRes = await fetch("/api/social/transcribe", {
              method: "POST",
              headers: { "Content-Type": "audio/wav" },
              body: wav,
            });
            const tData = await tRes.json().catch(() => ({}));
            if (!tRes.ok) throw new Error(tData.message || "Transcription failed");
            text = String(tData.text ?? "");
          } catch (browserErr) {
            throw new Error(serverError || (browserErr instanceof Error ? browserErr.message : "Transcription failed"));
          }
        }
        setTranscript({ text });
        setPipeline((p) => ({ ...p, transcribe: "done" }));
      } catch (e) {
        setPipeline((p) => ({ ...p, transcribe: "failed" }));
        throw e;
      }

      // Step 2 — Remove gaps + master loudness (one real FFmpeg pass).
      // For video sources with word timestamps, the SAME cuts land on the
      // picture: keep-spans from the transcript become a select filter, so
      // the refined output stays a video instead of dropping to audio.
      setPipeline((p) => ({ ...p, refine: "running" }));
      try {
        const submitAndCollect = async (files: string[], cmd: string, ext: string, title: string): Promise<string> => {
          const submit = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", {
            files,
            full_command: cmd,
            output_extension: ext,
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
            extension: ext,
            title,
          });
          const col = await collect.json().catch(() => ({}));
          if (!collect.ok || !col.url) throw new Error(col.message ?? "Couldn't store the refined result");
          return String(col.url);
        };

        const legacyAudioCmd =
          "ffmpeg -y -i {input} -vn -af silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB,loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}";
        // Produced content (ads, music-driven pieces): pauses are pacing, not
        // dead air — no cuts at all, only mastering and optional color.
        const isProduced = contentType === "produced";
        if (!isProduced && words.length > 0 && selDuration) {
          const speech = words.reduce((s, w) => s + Math.max(0, (w.end ?? 0) - (w.start ?? 0)), 0);
          if (speech / selDuration < 0.45) {
            toast({
              title: "This looks like produced content",
              description: "Less than half the runtime is speech. If it's a commercial or music-driven piece, set Content type to Produced so its pacing gaps are kept.",
            });
          }
        }
        const cut = isProduced ? { spans: [] as Array<[number, number]>, fillersCut: 0 } : fittedSpans(words, contentType === "interview" && cutFillers);
        const haveSpans = cut.spans.length > 0;
        setWordCut(haveSpans);
        setVideoCut(selected.type === "video" ? haveSpans : null);
        setFillersCut(haveSpans && cutFillers ? cut.fillersCut : null);

        let url: string;
        let isVideo = false;
        if (selected.type === "video" && haveSpans) {
          // Cut the SAME spans from picture and sound — fillers included when
          // the toggle is on — plus an optional gentle color lift. If the
          // processing lane rejects the filter, fall back to the proven
          // audio-only pass and say so — never a silent lie in the column.
          const expr = spanExpr(cut.spans);
          const eq = colorCorrect ? ",eq=brightness=0.02:contrast=1.05:saturation=1.1" : "";
          const videoCmd = `ffmpeg -y -i {input} -vf "select='${expr}',setpts=N/FRAME_RATE/TB${eq},scale=-2:min(720\\,ih)" -af "aselect='${expr}',asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11" -c:v h264_nvenc -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
          try {
            url = await submitAndCollect([selected.url], videoCmd, "mp4", `${selected.title} — refined video`);
            isVideo = true;
          } catch {
            setVideoCut(false);
            setFillersCut(null);
            url = await submitAndCollect([selected.url], legacyAudioCmd, "mp3", `${selected.title} — refined audio`);
          }
        } else if (haveSpans) {
          // Audio sources get the same word-driven cut (gaps + fillers) via
          // aselect — sharper than the old silence detector.
          const expr = spanExpr(cut.spans);
          const audioCmd = `ffmpeg -y -i {input} -vn -af "aselect='${expr}',asetpts=N/SR/TB,loudnorm=I=-16:TP=-1.5:LRA=11" -acodec libmp3lame -q:a 2 {output}`;
          try {
            url = await submitAndCollect([selected.url], audioCmd, "mp3", `${selected.title} — refined audio`);
          } catch {
            setWordCut(false);
            setFillersCut(null);
            url = await submitAndCollect([selected.url], legacyAudioCmd, "mp3", `${selected.title} — refined audio`);
          }
        } else if (isProduced && selected.type === "video") {
          // Keep every cut where the editor put it. Color on: gentle eq
          // re-encode; color off: stream-copy the picture untouched.
          const cmd = colorCorrect
            ? `ffmpeg -y -i {input} -vf eq=brightness=0.02:contrast=1.05:saturation=1.1 -c:v h264_nvenc -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 160k {output}`
            : `ffmpeg -y -i {input} -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 160k {output}`;
          url = await submitAndCollect([selected.url], cmd, "mp4", `${selected.title} — refined video`);
          isVideo = true;
          setVideoCut(true);
        } else if (isProduced) {
          const cmd = "ffmpeg -y -i {input} -vn -af loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}";
          url = await submitAndCollect([selected.url], cmd, "mp3", `${selected.title} — refined audio`);
        } else {
          setFillersCut(null);
          url = await submitAndCollect([selected.url], legacyAudioCmd, "mp3", `${selected.title} — refined audio`);
        }

        setRefinedUrl(url);
        setRefinedIsVideo(isVideo);
        const [orig, refined] = await Promise.all([
          mediaDuration(selected.url, selected.type),
          mediaDuration(url, isVideo ? "video" : "audio"),
        ]);
        // Both probes must land to claim a number; otherwise show "—".
        setMinutesSaved(orig > 0 && refined > 0 ? Math.max(0, orig - refined) / 60 : null);
        queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
        setPipeline((p) => ({ ...p, refine: "done" }));

        // Step 3 — intro & outro stitch (video only, when picked). The
        // refined cut is already saved, so a stitch failure never costs it.
        const intro = sources.find((i) => i.id === introId && i.mediaType === "video")?.mediaUrl;
        const outro = sources.find((i) => i.id === outroId && i.mediaType === "video")?.mediaUrl;
        if (isVideo && (intro || outro)) {
          setPipeline((p) => ({ ...p, stitch: "running" }));
          try {
            const dims = (await mediaDims(url)) ?? { w: 1280, h: 720 };
            const parts: string[] = [];
            if (intro) parts.push(await submitAndCollect([intro], normalizeCommand(dims.w, dims.h), "mp4", `${selected.title} — intro (normalized)`));
            parts.push(url);
            if (outro) parts.push(await submitAndCollect([outro], normalizeCommand(dims.w, dims.h), "mp4", `${selected.title} — outro (normalized)`));
            const stitched = await submitAndCollect(parts, concatCommand(parts.length), "mp4", `${selected.title} — final cut`);
            setRefinedUrl(stitched);
            queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
            setPipeline((p) => ({ ...p, stitch: "done" }));
          } catch {
            setPipeline((p) => ({ ...p, stitch: "failed" }));
            toast({
              title: "Intro/outro stitch failed",
              description: "The refined cut itself is saved in Media Storage.",
              variant: "destructive",
            });
          }
        }
      } catch (e) {
        setPipeline((p) => ({ ...p, refine: "failed" }));
        throw e;
      }

      toast({ title: "Refined", description: "The polished version is in Media Storage." });
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

  const StepRow = ({ state, label, sub }: { state: StepState | "soon" | "off"; label: string; sub: string }) => (
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
      {state === "off" && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">Off</span>}
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

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
            <Gem className="h-6 w-6 text-zinc-400" />
            Refiner
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Turn raw conversations into clear, compelling content — every checkmark is a real transformation of your actual file.
          </p>
        </div>
        <Link href="/studio/live">
          <Button variant="outline" className="shrink-0">
            <Clapperboard className="mr-1.5 h-4 w-4" /> Back to Studios
          </Button>
        </Link>
      </div>

      {!selected ? (
        /* The full library lives in Media Storage; the rail here is just the
           freshest recordings so a straight-to-Refiner visit starts in one click. */
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-8 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950">
              <Gem className="h-6 w-6 text-amber-400" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900">Pick something to refine</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
              Grab a recent recording on the right, or choose anything in Media Storage — play it and press{" "}
              <span className="font-medium text-zinc-700">Open in Refiner</span>.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/media-library">
                <Button>Open Media Storage</Button>
              </Link>
              <Link href="/studio/live">
                <Button variant="outline">Record in the Studio</Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-900">Recent recordings</p>
            {sources.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500">
                Record a show or add media, and your latest recordings land here.
              </p>
            ) : (
              <div className="space-y-2">
                {sources.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelected({
                        url: item.mediaUrl!,
                        title: item.caption || item.platform,
                        type: item.mediaType === "audio" ? "audio" : "video",
                      })
                    }
                    className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-200 p-2 text-left transition-colors hover:border-zinc-400"
                  >
                    {item.mediaType === "audio" ? (
                      <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                        <Music className="h-4 w-4 text-emerald-600" />
                      </span>
                    ) : (
                      <video src={item.mediaUrl!} muted preload="metadata" className="h-11 w-16 shrink-0 rounded-lg bg-black object-cover" />
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
        </div>
      ) : (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* ── The bench: player, name, one big button ── */}
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
                  {selected.type === "audio" ? (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 px-8">
                      <Music className="h-10 w-10 text-zinc-600" />
                      <audio src={selected.url} controls className="w-full" />
                    </div>
                  ) : (
                    <video src={selected.url} controls className="aspect-video w-full bg-black" />
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{selected.title}</p>
                  <Link href="/media-library" className="text-xs text-zinc-500 underline-offset-2 hover:underline">
                    Choose a different recording →
                  </Link>
                </div>
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

              {/* Options — every toggle is a real transformation, on or off */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  Content
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as "interview" | "produced")}
                    disabled={busy}
                    className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700"
                    title="Interviews get their dead air and fillers cut. Produced pieces (ads, music-driven video) keep every pause — that pacing is intentional."
                  >
                    <option value="interview">Interview / podcast</option>
                    <option value="produced">Produced (ad, music)</option>
                  </select>
                </span>
                <label className={`flex items-center gap-1.5 text-xs font-medium ${contentType === "produced" ? "cursor-not-allowed text-zinc-400" : "cursor-pointer text-zinc-700"}`}>
                  <input type="checkbox" checked={contentType === "interview" && cutFillers} onChange={(e) => setCutFillers(e.target.checked)} className="h-3.5 w-3.5 accent-red-600" disabled={busy || contentType === "produced"} />
                  Remove fillers (um, uh)
                </label>
                {selected.type === "video" && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-700">
                    <input type="checkbox" checked={colorCorrect} onChange={(e) => setColorCorrect(e.target.checked)} className="h-3.5 w-3.5 accent-red-600" disabled={busy} />
                    Color correction
                  </label>
                )}
                {selected.type === "video" && (
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    Intro
                    <select value={introId} onChange={(e) => setIntroId(e.target.value)} disabled={busy} className="max-w-[130px] rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700">
                      <option value="">None</option>
                      {sources.filter((i) => i.mediaType === "video" && i.mediaUrl !== selected.url).map((i) => (
                        <option key={i.id} value={i.id}>{(i.caption || i.platform).slice(0, 30)}</option>
                      ))}
                    </select>
                    Outro
                    <select value={outroId} onChange={(e) => setOutroId(e.target.value)} disabled={busy} className="max-w-[130px] rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700">
                      <option value="">None</option>
                      {sources.filter((i) => i.mediaType === "video" && i.mediaUrl !== selected.url).map((i) => (
                        <option key={i.id} value={i.id}>{(i.caption || i.platform).slice(0, 30)}</option>
                      ))}
                    </select>
                  </span>
                )}
              </div>

              {/* Before / after — appears when the work is truly done */}
              {done && refinedUrl && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2" style={{ animation: "refinery-reveal .6s ease both" }}>
                  <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Before</p>
                    {selected.type === "audio" ? (
                      <audio src={selected.url} controls className="w-full" />
                    ) : (
                      <video src={selected.url} controls className="w-full rounded-lg bg-black" />
                    )}
                  </div>
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                      After — gaps cut, loudness mastered
                    </p>
                    {refinedIsVideo ? (
                      <video src={refinedUrl} controls className="w-full rounded-lg bg-black" />
                    ) : (
                      <audio src={refinedUrl} controls className="w-full" />
                    )}
                    <p className="mt-2 text-[11px] text-emerald-700">
                      {refinedIsVideo ? "Still a video — the picture got the same cuts." : "Saved to Media Storage with the Refined badge."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Processing pipeline ── */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-1 text-sm font-semibold text-zinc-900">Processing pipeline</p>
              <p className="mb-2 text-[11px] leading-relaxed text-zinc-500">
                Every checkmark is a real transformation of this file.
              </p>
              <div className="divide-y divide-zinc-100">
                <StepRow state={pipeline.transcribe} label="Transcription" sub="Whisper writes down every word" />
                <StepRow
                  state={contentType === "produced" ? "off" : pipeline.refine}
                  label="Remove gaps"
                  sub={contentType === "produced" ? "Kept — pacing is intentional in produced pieces" : "Dead air and long pauses, cut"}
                />
                <StepRow state={pipeline.refine} label="Audio cleanup" sub="Loudness mastered to −16 LUFS" />
                <StepRow
                  state={contentType === "produced" || !cutFillers ? "off" : wordCut === false ? "soon" : pipeline.refine}
                  label="Remove fillers"
                  sub="Word-level um/uh excision"
                />
                {selected.type === "video" && (
                  <StepRow
                    state={videoCut === false ? "soon" : pipeline.refine}
                    label="Enhance video"
                    sub={contentType === "produced" ? "Picture preserved, audio mastered" : "The same cuts, applied to the picture"}
                  />
                )}
                {selected.type === "video" && (
                  <StepRow
                    state={!colorCorrect ? "off" : videoCut === false ? "soon" : pipeline.refine}
                    label="Color correction"
                    sub="Gentle contrast and color lift"
                  />
                )}
                {selected.type === "video" && (introId || outroId) && (
                  <StepRow state={pipeline.stitch} label="Intro & outro" sub="Stitched onto the refined cut" />
                )}
                {selected.type === "video" && (
                  <StepRow state="soon" label="Speaker focus" sub="Auto-crop to the active speaker" />
                )}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Marked clips and captions live in your studio's Editing Room — Refiner polishes the whole show.
              </p>

              {/* Clip copy — graduated from the Media Lab beta */}
              {selected.type === "video" && (() => {
                const tooLong =
                  (selDuration !== null && selDuration > 300) ||
                  (selBytes !== null && selBytes > 100 * 1024 * 1024);
                const result = clipCopy.data;
                return (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <p className="text-sm font-semibold text-zinc-900">Clip copy</p>
                    <p className="mb-2 text-[11px] leading-relaxed text-zinc-500">
                      Platform-tuned title, caption, and hashtags — for clips under 5 minutes.
                    </p>
                    {tooLong ? (
                      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
                        This recording is too big for clip copy
                        {selDuration !== null && selDuration > 300 ? ` (${Math.round(selDuration / 60)} minutes)` : " (over 100MB)"} — refine it and cut a clip first, then bring the clip back here.
                      </p>
                    ) : (
                      <>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {CLIP_PLATFORMS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() =>
                                setClipPlatforms((prev) =>
                                  prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                                )
                              }
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                clipPlatforms.includes(p.id)
                                  ? "border-zinc-950 bg-zinc-950 text-white"
                                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={clipPlatforms.length === 0 || clipCopy.isPending}
                          onClick={() => clipCopy.mutate()}
                        >
                          {clipCopy.isPending ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {clipCopy.isPending ? "Writing…" : "Write clip copy"}
                        </Button>
                      </>
                    )}
                    {result && (
                      <div className="mt-3 space-y-2">
                        {CLIP_PLATFORMS.filter((p) => result[p.id]).map((p) => {
                          const r = result[p.id] as Record<string, unknown>;
                          return (
                            <div key={p.id} className="rounded-lg border border-zinc-200 p-2.5">
                              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{p.label}</p>
                              {Object.entries(r)
                                .filter(([, v]) => typeof v === "string" && v)
                                .map(([k, v]) => (
                                  <div key={k} className="mb-1.5 last:mb-0">
                                    <p className="text-[10px] font-medium capitalize text-zinc-500">{k.replace(/_/g, " ")}</p>
                                    <p className="whitespace-pre-wrap text-xs text-zinc-900">{v as string}</p>
                                  </div>
                                ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Processing results — measured, never invented ── */}
          {(transcript || minutesSaved !== null) && (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5" style={{ animation: "refinery-reveal .6s ease both" }}>
              <p className="text-sm font-semibold text-zinc-900">Processing results</p>
              <p className="mb-4 text-xs text-zinc-500">What actually happened to your file — measured, never invented.</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  [minutesSaved !== null ? minutesSaved.toFixed(1) : "—", "Minutes saved", "text-blue-600"],
                  fillersCut !== null
                    ? ([String(fillersCut), "Fillers removed", "text-red-500"] as const)
                    : ([fillersFound !== null ? String(fillersFound) : "—", "Fillers heard", "text-red-500"] as const),
                  [wordsTranscribed !== null ? wordsTranscribed.toLocaleString() : "—", "Words transcribed", "text-zinc-900"],
                ] as const).map(([value, label, tone]) => (
                  <div key={label} className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
                    <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                    <Music className="h-3.5 w-3.5 text-zinc-400" /> Audio enhancement
                  </p>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Silence removed below</dt><dd className="font-medium tabular-nums text-zinc-800">−38 dB</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Pauses cut longer than</dt><dd className="font-medium tabular-nums text-zinc-800">0.75 s</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Loudness normalized to</dt><dd className="font-medium tabular-nums text-zinc-800">−16 LUFS · −1.5 dBTP</dd></div>
                  </dl>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                    <Sparkles className="h-3.5 w-3.5 text-zinc-400" /> Content cleanup
                  </p>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">{fillersCut !== null ? "Filler words removed" : "Filler words heard"}</dt><dd className="font-medium tabular-nums text-zinc-800">{fillersCut ?? fillersFound ?? "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Transcript length</dt><dd className="font-medium tabular-nums text-zinc-800">{wordsTranscribed !== null ? `${wordsTranscribed.toLocaleString()} words` : "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Refined file</dt><dd className="font-medium text-zinc-800">{refinedUrl ? "In Media Storage" : "Not yet"}</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
