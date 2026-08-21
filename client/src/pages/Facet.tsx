import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  CheckCircle2, Circle, Loader2, Music, Sparkles, Gem, XCircle, Upload,
  Wind, Mic2, Volume2, Wand2, ChevronRight, FileAudio, FileVideo,
} from "lucide-react";
import { extractAudioAsWav } from "@/lib/audio-extraction";

/**
 * /studio/facet — Facet (renamed from "Refiner" for trademark reasons — the
 * gem-cutting metaphor holds: this is the room where a raw recording gets
 * cut into its finished facets). User-facing copy speaks in "Polish" now,
 * not "refine" — see the Polish-first redesign brief. Post-production as its
 * own room, outside the live studio: pick any recording, press Polish,
 * watch a REAL pipeline run — every checkmark is an actual transformation
 * of the actual file, and the results are measured, never invented. (The
 * house rule, born from the Alchify audit: no timer theater.)
 */

type StepState = "idle" | "running" | "done" | "failed";
type Pacing = "natural" | "tighter";
type FillerLevel = "light" | "standard" | "thorough";

interface LibraryItem {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  platform: string;
  createdAt?: string | null;
  thumbnailUrl?: string | null;
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

// Deliberately conservative: only pure hesitation sounds get cut, never
// "like" or "you know" — those can carry meaning. Thorough just widens the
// set of pure-hesitation sounds it catches; it never touches real words.
const CUTTABLE_FILLER_STANDARD = /^(um+|uh+|erm+|hmm+)$/i;
const CUTTABLE_FILLER_THOROUGH = /^(um+|uh+|erm+|hmm+|mm+|ah+)$/i;

function fillerRegexForLevel(level: FillerLevel): RegExp | null {
  if (level === "light") return null;
  return level === "thorough" ? CUTTABLE_FILLER_THOROUGH : CUTTABLE_FILLER_STANDARD;
}

/**
 * Turn word-level timestamps into keep-spans: speech separated by less than
 * `minGap` seconds merges into one span, so only real dead air falls between
 * spans. `fillerRegex` (when set) acts as a hard barrier — the span closes
 * before a matching word and reopens after it, excising the word itself.
 * Each span gets a small pad so cuts don't clip syllables.
 */
function speechSpans(
  words: WordStamp[],
  minGap: number,
  fillerRegex: RegExp | null,
  pad = 0.18,
): { spans: Array<[number, number]>; fillers: Array<[number, number]> } {
  const spans: Array<[number, number]> = [];
  const fillers: Array<[number, number]> = [];
  let barrier = false;
  for (const w of words) {
    if (typeof w.start !== "number" || typeof w.end !== "number") continue;
    if (fillerRegex && fillerRegex.test(w.word.trim().replace(/[.,!?;:]+$/g, ""))) {
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
 * hard cap: first the gap threshold widens, then — because filler barriers
 * can outnumber any threshold in an um-heavy interview — the smallest
 * remaining gaps merge until the list fits. Fillers swallowed by those
 * merges stay in the show; the removed-count reports only real cuts.
 * `baseGap` is where Pacing comes in — Tighter starts from a smaller
 * threshold, so more of the in-between space gets trimmed.
 */
function fittedSpans(
  words: WordStamp[],
  fillerRegex: RegExp | null,
  baseGap: number,
): { spans: Array<[number, number]>; fillersCut: number } {
  let gap = baseGap;
  let result = speechSpans(words, gap, fillerRegex);
  while (result.spans.length > 100 && gap < 3) {
    gap += 0.25;
    result = speechSpans(words, gap, fillerRegex);
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

/** Composes the audio filter chain from independent pieces — a cut expression
 *  (from Pacing/filler removal) and the Audio polish toggle (loudness
 *  mastering) — so either, both, or neither can be present. */
function audioFilterChain(cutExpr: string | null, audioPolish: boolean): string {
  const parts: string[] = [];
  if (cutExpr) parts.push(`aselect='${cutExpr}'`, "asetpts=N/SR/TB");
  if (audioPolish) parts.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  return parts.join(",");
}

/** Same idea for video — a cut expression, the Video polish toggle (gentle
 *  color lift), and an optional scale clause that always applies when
 *  cutting (the processing lane caps output resolution on that path). */
function videoFilterChain(cutExpr: string | null, videoPolish: boolean, scaleClause?: string): string {
  const parts: string[] = [];
  if (cutExpr) parts.push(`select='${cutExpr}'`, "setpts=N/FRAME_RATE/TB");
  if (videoPolish) parts.push("eq=brightness=0.02:contrast=1.05:saturation=1.1");
  if (scaleClause) parts.push(scaleClause);
  return parts.join(",");
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
  return `ffmpeg -y -i {input} -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1" -af "aresample=44100,aformat=channel_layouts=stereo" -c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
}

function concatCommand(count: number): string {
  const inputs = Array.from({ length: count }, (_, i) => `-i {input${i}}`).join(" ");
  const pads = Array.from({ length: count }, (_, i) => `[${i}:v][${i}:a]`).join("");
  return `ffmpeg -y ${inputs} -filter_complex "${pads}concat=n=${count}:v=1:a=1" -c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
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

function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Recordings land here with whatever filename or platform tag they arrived
// with — a raw upload is often just a timestamp-and-hash. This is the only
// place that matters: everywhere else should read as a real title.
// Matches anywhere in the caption, not just the whole string — an old title
// like "1765286679266-ppjbc7.mp4 — refined audio" still starts with a raw,
// auto-generated filename even though a suffix got appended after it.
const RAW_FILENAME_RE = /\b\d{6,}[\w-]*\.\w{2,4}\b/i;
function humanRecordingName(item: LibraryItem): string {
  const raw = item.caption?.trim();
  const looksRaw = !raw || RAW_FILENAME_RE.test(raw) || raw.toLowerCase() === item.platform?.toLowerCase();
  if (!looksRaw) return raw!;
  const kind = item.mediaType === "audio" ? "Audio recording" : "Video recording";
  const date = formatShortDate(item.createdAt);
  return date !== "—" ? `${kind} — ${date}` : kind;
}

type RecordingStatus = "raw" | "polishing" | "polished";
function recordingStatus(item: LibraryItem, isPolishing: boolean): RecordingStatus {
  if (isPolishing) return "polishing";
  // Legacy items were saved with "refined"/"final cut" in the title before
  // this page's copy became "Polish" — both forms count as polished.
  if (/polished|refined|final cut/i.test(item.caption ?? "")) return "polished";
  return "raw";
}

function StatusBadge({ status }: { status: RecordingStatus }) {
  const map: Record<RecordingStatus, string> = {
    raw: "bg-zinc-100 text-zinc-500",
    polishing: "bg-amber-100 text-amber-700",
    polished: "bg-emerald-100 text-emerald-700",
  };
  const label: Record<RecordingStatus, string> = { raw: "Raw", polishing: "Polishing", polished: "Polished" };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status]}`}>{label[status]}</span>;
}

const BENEFITS = [
  { icon: Wind, title: "Smooth pacing", copy: "Dead air and long pauses trimmed, naturally." },
  { icon: Mic2, title: "Clarify delivery", copy: "Hesitation sounds cleaned up without losing meaning." },
  { icon: Volume2, title: "Polish sound", copy: "Mastered to a clean, consistent loudness." },
  { icon: Wand2, title: "Finish the look", copy: "A gentle color and framing pass for video." },
] as const;

export default function Facet() {
  const { toast } = useToast();

  const [selected, setSelected] = useState<{ url: string; title: string; type: "video" | "audio" } | null>(null);
  const [pipeline, setPipeline] = useState<{ transcribe: StepState; polish: StepState; stitch: StepState }>({
    transcribe: "idle", polish: "idle", stitch: "idle",
  });
  const [contentType, setContentType] = useState<"interview" | "produced">("interview");
  const [pacing, setPacing] = useState<Pacing>("natural");
  const [fillerLevel, setFillerLevel] = useState<FillerLevel>("standard");
  const [audioPolish, setAudioPolish] = useState(true);
  const [videoPolish, setVideoPolish] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [introId, setIntroId] = useState("");
  const [outroId, setOutroId] = useState("");
  const [fillersCut, setFillersCut] = useState<number | null>(null);
  const [wordCut, setWordCut] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string } | null>(null);
  const [polishedUrl, setPolishedUrl] = useState<string | null>(null);
  const [polishedIsVideo, setPolishedIsVideo] = useState(false);
  // null = source is audio (no picture to cut); true/false = whether the
  // video cut actually ran for this polish.
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
    setPolishedUrl(null);
    setPolishedIsVideo(false);
    setVideoCut(null);
    setMinutesSaved(null);
    setPipeline({ transcribe: "idle", polish: "idle", stitch: "idle" });
    setFillersCut(null);
    setWordCut(null);
    setIntroId("");
    setOutroId("");
    setAdvancedOpen(false);
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

  const { data: libraryData } = useQuery<{ items: LibraryItem[] }>({
    queryKey: ["/api/media-library"],
    retry: false,
  });
  const sources = (libraryData?.items ?? []).filter(
    (i) => i.mediaUrl && (i.mediaType === "video" || i.mediaType === "audio"),
  );
  const railItems = sources.slice(0, 6);


  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const pickRecording = (item: LibraryItem) => {
    setSelected({
      url: item.mediaUrl!,
      title: item.caption || item.platform,
      type: item.mediaType === "audio" ? "audio" : "video",
    });
  };

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
    setPolishedUrl(null);
    setPolishedIsVideo(false);
    setVideoCut(null);
    setWordCut(null);
    setFillersCut(null);
    setMinutesSaved(null);
    setPipeline({ transcribe: "idle", polish: "idle", stitch: "idle" });
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
        let laneError = "";
        // Cost lever: shows short enough for the in-browser WAV path (~24 min
        // before Whisper's 25MB cap) transcribe free — no compress job billed.
        // Longer shows use the server lane; each is the other's fallback.
        const shortEnough = selDuration !== null && selDuration <= 24 * 60;
        const browserLane = async () => {
          const wav = await extractAudioAsWav(selected.url);
          const tRes = await fetch("/api/social/transcribe", {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: wav,
          });
          const tData = await tRes.json().catch(() => ({}));
          if (!tRes.ok) throw new Error(tData.message || "Transcription failed");
          if (Array.isArray(tData.words)) words = tData.words as WordStamp[];
          return String(tData.text ?? "");
        };
        const serverLane = async () => {
          const srv = await apiRequest("POST", "/api/facet/transcribe", { mediaUrl: selected.url });
          const sData = await srv.json().catch(() => ({}));
          if (!srv.ok) throw new Error(String(sData.message ?? "Transcription failed"));
          if (Array.isArray(sData.words)) words = sData.words as WordStamp[];
          return String(sData.text ?? "");
        };
        const lanes = shortEnough ? [browserLane, serverLane] : [serverLane, browserLane];
        for (const lane of lanes) {
          try {
            text = await lane();
            break;
          } catch (err) {
            laneError = err instanceof Error ? err.message : "Transcription failed";
          }
        }
        if (text === null) throw new Error(laneError || "Transcription failed");
        setTranscript({ text });
        setPipeline((p) => ({ ...p, transcribe: "done" }));
      } catch (e) {
        setPipeline((p) => ({ ...p, transcribe: "failed" }));
        throw e;
      }

      // Step 2 — Remove gaps + master loudness (one real FFmpeg pass).
      // For video sources with word timestamps, the SAME cuts land on the
      // picture: keep-spans from the transcript become a select filter, so
      // the polished output stays a video instead of dropping to audio.
      setPipeline((p) => ({ ...p, polish: "running" }));
      try {
        const submitAndCollect = async (files: string[], cmd: string, ext: string, title: string): Promise<string> => {
          const submit = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", {
            files,
            full_command: cmd,
            output_extension: ext,
          });
          const sub = await submit.json().catch(() => ({}));
          if (!submit.ok || !sub.job_id) throw new Error(sub.message ?? "Couldn't start the polish");
          for (let i = 0; i < 150; i++) {
            await new Promise((r) => setTimeout(r, 4000));
            const st = await apiRequest("GET", `/api/media-lab/ffmpeg/jobs/${sub.job_id}`);
            const js = await st.json().catch(() => ({}));
            const status = String(js.status ?? "").toUpperCase();
            if (status === "FINISHED" || status === "COMPLETED") break;
            if (status === "ERROR" || status === "FAILED") throw new Error("The polish failed in processing");
            if (i === 149) throw new Error("Timed out waiting for the polish");
          }
          const collect = await apiRequest("POST", "/api/media-lab/collect", {
            jobId: sub.job_id,
            extension: ext,
            title,
          });
          const col = await collect.json().catch(() => ({}));
          if (!collect.ok || !col.url) throw new Error(col.message ?? "Couldn't store the polished result");
          return String(col.url);
        };

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
        const baseGap = pacing === "tighter" ? 0.4 : 0.75;
        const fillerRegex = contentType === "interview" ? fillerRegexForLevel(fillerLevel) : null;
        const cut = isProduced ? { spans: [] as Array<[number, number]>, fillersCut: 0 } : fittedSpans(words, fillerRegex, baseGap);
        const haveSpans = cut.spans.length > 0;
        setWordCut(haveSpans);
        setVideoCut(selected.type === "video" ? haveSpans : null);
        setFillersCut(haveSpans && fillerRegex ? cut.fillersCut : null);

        let url: string;
        let isVideo = false;
        if (isProduced && selected.type === "video") {
          if (!videoPolish && !audioPolish) {
            throw new Error("Turn on Audio polish or Video polish to change this recording.");
          }
          // Always transcode into mp4-safe codecs — webm sources (VP8/VP9/Opus)
          // cannot be stream-copied into an mp4 container.
          const vf = videoPolish
            ? `-vf eq=brightness=0.02:contrast=1.05:saturation=1.1 -c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M`
            : `-c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M`;
          const af = audioPolish ? `-af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 160k` : `-c:a aac -b:a 160k`;
          url = await submitAndCollect([selected.url], `ffmpeg -y -i {input} ${vf} ${af} {output}`, "mp4", `${selected.title} — polished video`);
          isVideo = true;
          setVideoCut(true);
        } else if (isProduced) {
          const cmd = audioPolish
            ? `ffmpeg -y -i {input} -vn -af loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}`
            : `ffmpeg -y -i {input} -vn -acodec libmp3lame -q:a 2 {output}`;
          url = await submitAndCollect([selected.url], cmd, "mp3", `${selected.title} — polished audio`);
        } else if (selected.type === "video" && haveSpans) {
          // Cut the SAME spans from picture and sound — fillers included when
          // the level warrants it — plus optional video/audio polish. If the
          // processing lane rejects the filter, fall back to the proven
          // audio-only pass and say so — never a silent lie in the column.
          const cutExpr = spanExpr(cut.spans);
          const videoCmd = `ffmpeg -y -i {input} -vf "${videoFilterChain(cutExpr, videoPolish, "scale=-2:min(720\\,ih)")}" -af "${audioFilterChain(cutExpr, audioPolish)}" -c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
          try {
            url = await submitAndCollect([selected.url], videoCmd, "mp4", `${selected.title} — polished video`);
            isVideo = true;
          } catch {
            setVideoCut(false);
            setFillersCut(null);
            const audioCmd = `ffmpeg -y -i {input} -vn -af "${audioFilterChain(cutExpr, audioPolish)}" -acodec libmp3lame -q:a 2 {output}`;
            url = await submitAndCollect([selected.url], audioCmd, "mp3", `${selected.title} — polished audio`);
          }
        } else if (haveSpans) {
          // Audio sources get the same word-driven cut (gaps + fillers) via
          // aselect — sharper than the old silence detector.
          const cutExpr = spanExpr(cut.spans);
          const audioCmd = `ffmpeg -y -i {input} -vn -af "${audioFilterChain(cutExpr, audioPolish)}" -acodec libmp3lame -q:a 2 {output}`;
          url = await submitAndCollect([selected.url], audioCmd, "mp3", `${selected.title} — polished audio`);
        } else {
          // No usable word timestamps — fall back to a plain silence
          // detector so pacing still gets addressed, just without
          // word-level precision. Audio polish still gates loudnorm.
          setFillersCut(null);
          const legacyChain = `silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB${audioPolish ? ",loudnorm=I=-16:TP=-1.5:LRA=11" : ""}`;
          const legacyAudioCmd = `ffmpeg -y -i {input} -vn -af ${legacyChain} -acodec libmp3lame -q:a 2 {output}`;
          url = await submitAndCollect([selected.url], legacyAudioCmd, "mp3", `${selected.title} — polished audio`);
        }

        setPolishedUrl(url);
        setPolishedIsVideo(isVideo);
        const [orig, polished] = await Promise.all([
          mediaDuration(selected.url, selected.type),
          mediaDuration(url, isVideo ? "video" : "audio"),
        ]);
        // Both probes must land to claim a number; otherwise show "—".
        setMinutesSaved(orig > 0 && polished > 0 ? Math.max(0, orig - polished) / 60 : null);
        queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
        setPipeline((p) => ({ ...p, polish: "done" }));

        // Step 3 — intro & outro stitch (video only, when picked). The
        // polished cut is already saved, so a stitch failure never costs it.
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
            setPolishedUrl(stitched);
            queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
            setPipeline((p) => ({ ...p, stitch: "done" }));
          } catch {
            setPipeline((p) => ({ ...p, stitch: "failed" }));
            toast({
              title: "Intro/outro stitch failed",
              description: "The polished cut itself is saved in Media Storage.",
              variant: "destructive",
            });
          }
        }
      } catch (e) {
        setPipeline((p) => ({ ...p, polish: "failed" }));
        throw e;
      }

      toast({ title: "Polished", description: "The polished version is in Media Storage." });
    } catch (e) {
      toast({
        title: "The polish stopped",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const fillersFound = transcript ? (transcript.text.match(FILLER_RE) ?? []).length : null;
  const wordsTranscribed = transcript ? transcript.text.split(/\s+/).filter(Boolean).length : null;
  const done = pipeline.polish === "done";

  const StepRow = ({ state, label, sub }: { state: StepState | "soon" | "off" | "skipped"; label: string; sub: string }) => (
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
        <span className={`block text-sm font-medium ${state === "soon" || state === "skipped" ? "text-zinc-400" : "text-zinc-900"}`}>{label}</span>
        <span className="block text-xs text-zinc-500">{sub}</span>
      </span>
      {state === "done" && <span className="text-xs font-semibold text-emerald-600">Done</span>}
      {state === "soon" && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Coming</span>}
      {state === "skipped" && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Not applied</span>}
      {state === "off" && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">Off</span>}
    </div>
  );

  // Shared between the empty and selected states — right rail, capped at
  // six, compact rows rather than a thumbnail grid.
  const RecentRecordingsRail = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Recent recordings</p>
        <Link href="/media-library" className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline">
          View all
        </Link>
      </div>
      {railItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500">
          Record a show or add media, and your latest recordings land here.
        </p>
      ) : (
        <div className="space-y-1">
          {railItems.map((item) => {
            const isActive = selected?.url === item.mediaUrl;
            return (
              <button
                key={item.id}
                onClick={() => pickRecording(item)}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                  isActive ? "border-zinc-950 bg-zinc-50" : "border-transparent hover:border-zinc-200 hover:bg-zinc-50/60"
                }`}
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-black object-cover" />
                ) : item.mediaType === "audio" ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <FileAudio className="h-4 w-4 text-emerald-600" />
                  </span>
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <FileVideo className="h-4 w-4 text-zinc-500" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-zinc-900">{humanRecordingName(item)}</span>
                  <span className="block text-[10px] text-zinc-400">
                    {formatShortDate(item.createdAt)}
                  </span>
                </span>
                <StatusBadge status={recordingStatus(item, isActive && busy)} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-6xl px-6 py-8">
      <style>{`
        @keyframes facet-sweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes facet-reveal {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="mb-6 flex items-center gap-2">
        <Gem className="h-6 w-6 text-zinc-400" />
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Facet</h1>
      </div>

      {/* Main workspace (~65%) + Recent recordings rail (~30%) — DOM order
          keeps the workspace first so it stacks above the rail on
          tablet/mobile instead of the rail taking the top slot. */}
      <div className="grid items-start gap-5 lg:grid-cols-[2fr_1fr]">
        {!selected ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8">
            <h2 className="text-xl font-semibold text-zinc-950">Polish a recording</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Turn a raw conversation into a clear, focused, listener-ready episode.
            </p>

            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950">
                <Gem className="h-6 w-6 text-amber-400" />
              </span>
              <div className="mt-5">
                <ObjectUploader
                  maxFileSize={500 * 1024 * 1024}
                  onGetUploadParameters={getUploadParams}
                  onComplete={(r) => {
                    const file = r.successful[0];
                    if (!file) return;
                    setSelected({
                      url: file.uploadURL,
                      title: file.name,
                      type: file.type.startsWith("audio/") ? "audio" : "video",
                    });
                  }}
                  buttonClassName="!h-auto !w-full !justify-center !gap-2 !border-0 !bg-red-600 !py-3 !text-white hover:!bg-red-700"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-semibold">Upload recording</span>
                </ObjectUploader>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Video or audio · Up to 500 MB</p>
              <p className="mt-4 text-xs text-zinc-500">
                <Link href="/media-library" className="font-medium text-zinc-700 underline underline-offset-2">Browse Media Storage</Link>
                {" · "}
                <Link href="/studio/live" className="font-medium text-zinc-700 underline underline-offset-2">Record in Studio</Link>
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                  <Icon className="h-4 w-4 text-zinc-400" />
                  <p className="mt-2 text-xs font-semibold text-zinc-900">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* ── Selected recording: preview, metadata, Choose your Polish ── */}
            <div
              className="rounded-2xl p-[3px]"
              style={
                busy
                  ? {
                      background: "linear-gradient(90deg, #d84b2d, #f5c33b, #d84b2d, #f5c33b, #d84b2d)",
                      backgroundSize: "200% 100%",
                      animation: "facet-sweep 2.2s linear infinite",
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
                <button onClick={() => setSelected(null)} className="text-xs text-zinc-500 underline-offset-2 hover:underline">
                  Change recording
                </button>
              </div>
            </div>

            {/* Choose your Polish */}
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-semibold text-zinc-900">Choose your Polish</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">Every setting below is a real change to the file — nothing here is decorative.</p>

              <div className="mt-4 space-y-4">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700">Content type</span>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value as "interview" | "produced")}
                    disabled={busy}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700"
                    title="Interviews get their dead air and fillers cut. Produced pieces (ads, music-driven video) keep every pause — that pacing is intentional."
                  >
                    <option value="interview">Interview / podcast</option>
                    <option value="produced">Produced (ad, music)</option>
                  </select>
                </label>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700">Pacing</span>
                  <div className="flex overflow-hidden rounded-lg border border-zinc-200">
                    {(["natural", "tighter"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPacing(p)}
                        disabled={busy || contentType === "produced"}
                        className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                          pacing === p ? "bg-zinc-950 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700">Filler removal</span>
                  <div className="flex overflow-hidden rounded-lg border border-zinc-200">
                    {(["light", "standard", "thorough"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => setFillerLevel(level)}
                        disabled={busy || contentType === "produced"}
                        className={`px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                          fillerLevel === level ? "bg-zinc-950 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700">Audio polish</span>
                  <input type="checkbox" checked={audioPolish} onChange={(e) => setAudioPolish(e.target.checked)} className="h-4 w-4 accent-red-600" disabled={busy} />
                </label>

                {selected.type === "video" && (
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-700">Video polish</span>
                    <input type="checkbox" checked={videoPolish} onChange={(e) => setVideoPolish(e.target.checked)} className="h-4 w-4 accent-red-600" disabled={busy} />
                  </label>
                )}

                {selected.type === "video" && (
                  <details open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-600">Advanced options</summary>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                        Intro
                        <select value={introId} onChange={(e) => setIntroId(e.target.value)} disabled={busy} className="max-w-[180px] rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700">
                          <option value="">None</option>
                          {sources.filter((i) => i.mediaType === "video" && i.mediaUrl !== selected.url).map((i) => (
                            <option key={i.id} value={i.id}>{humanRecordingName(i).slice(0, 30)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                        Outro
                        <select value={outroId} onChange={(e) => setOutroId(e.target.value)} disabled={busy} className="max-w-[180px] rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700">
                          <option value="">None</option>
                          {sources.filter((i) => i.mediaType === "video" && i.mediaUrl !== selected.url).map((i) => (
                            <option key={i.id} value={i.id}>{humanRecordingName(i).slice(0, 30)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </details>
                )}
              </div>

              <Button onClick={() => void run()} disabled={busy} className="mt-5 w-full bg-red-600 text-white hover:bg-red-700">
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Polishing…
                  </>
                ) : (
                  "✨ Polish this recording"
                )}
              </Button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-zinc-500">
                Your voice, story, and intent stay intact. You can review every edit in Studio.
              </p>
            </div>

            {/* Before / after — appears when the work is truly done */}
            {done && polishedUrl && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2" style={{ animation: "facet-reveal .6s ease both" }}>
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
                    After — polished
                  </p>
                  {polishedIsVideo ? (
                    <video src={polishedUrl} controls className="w-full rounded-lg bg-black" />
                  ) : (
                    <audio src={polishedUrl} controls className="w-full" />
                  )}
                  <p className="mt-2 text-[11px] text-emerald-700">
                    {polishedIsVideo ? "Still a video — the picture got the same cuts." : "Saved to Media Storage with the Polished badge."}
                  </p>
                </div>
              </div>
            )}

            {/* ── Your Polish ── */}
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-1 text-sm font-semibold text-zinc-900">Your Polish</p>
              <p className="mb-2 text-[11px] leading-relaxed text-zinc-500">
                Every checkmark below is a real transformation of this file.
              </p>
              <div className="divide-y divide-zinc-100">
                <StepRow state={pipeline.transcribe} label="Understand the conversation" sub="Every word, written down and timed" />
                <StepRow
                  state={contentType === "produced" ? "off" : pipeline.polish}
                  label="Smooth the pacing"
                  sub={contentType === "produced" ? "Kept — pacing is intentional in produced pieces" : "Dead air and long pauses, cut"}
                />
                <StepRow state={!audioPolish ? "off" : pipeline.polish} label="Polish the sound" sub="Loudness mastered to a clean, consistent level" />
                <StepRow
                  state={contentType === "produced" || fillerLevel === "light" ? "off" : wordCut === false ? "skipped" : pipeline.polish}
                  label="Clarify the delivery"
                  sub="Hesitation sounds cleaned up, word by word"
                />
                {selected.type === "video" && (
                  <StepRow
                    state={videoCut === false ? "skipped" : pipeline.polish}
                    label="Align the video"
                    sub={contentType === "produced" ? "Picture preserved, audio mastered" : "The same cuts, applied to the picture"}
                  />
                )}
                {selected.type === "video" && (
                  <StepRow
                    state={!videoPolish ? "off" : videoCut === false ? "skipped" : pipeline.polish}
                    label="Finish the look"
                    sub="Gentle contrast and color lift"
                  />
                )}
                {selected.type === "video" && (introId || outroId) && (
                  <StepRow state={pipeline.stitch} label="Intro & outro" sub="Stitched onto the polished cut" />
                )}
              </div>

              {done && (
                <div className="mt-4 border-t border-zinc-100 pt-4" style={{ animation: "facet-reveal .6s ease both" }}>
                  <p className="text-sm font-semibold text-zinc-900">Polish complete</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {([
                      [minutesSaved !== null ? minutesSaved.toFixed(1) : "—", "Minutes saved", "text-blue-600"],
                      fillersCut !== null
                        ? ([String(fillersCut), "Fillers cleaned up", "text-red-500"] as const)
                        : ([fillersFound !== null ? String(fillersFound) : "—", "Fillers heard", "text-red-500"] as const),
                      [wordsTranscribed !== null ? wordsTranscribed.toLocaleString() : "—", "Words transcribed", "text-zinc-900"],
                    ] as const).map(([value, label, tone]) => (
                      <div key={label} className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3 text-center">
                        <p className={`text-xl font-bold tabular-nums ${tone}`}>{value}</p>
                        <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/studio/live">
                    <Button className="mt-4 w-full">
                      Review in Studio <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}

              <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-500">
                Marked clips and captions live in your studio's Editing Room — Facet polishes the whole show.
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
                        {selDuration !== null && selDuration > 300 ? ` (${Math.round(selDuration / 60)} minutes)` : " (over 100MB)"} — polish it and cut a clip first, then bring the clip back here.
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
        )}

        {RecentRecordingsRail}
      </div>
    </div>
  );
}
