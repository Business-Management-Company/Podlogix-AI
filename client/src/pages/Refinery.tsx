import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Circle, Clapperboard, Loader2, Music, Sparkles, Wand2, XCircle,
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
    try {
      // Step 1 — Transcription (Whisper, the real one). The server lane
      // compresses first (FFmpeg → 48 kbps mono MP3), so long shows don't hit
      // Whisper's 25 MB wall; the in-browser WAV path stays as fallback for
      // short clips when that lane is unavailable.
      setPipeline((p) => ({ ...p, transcribe: "running" }));
      try {
        let text: string | null = null;
        let serverError = "";
        try {
          const srv = await apiRequest("POST", "/api/refiner/transcribe", { mediaUrl: selected.url });
          const sData = await srv.json().catch(() => ({}));
          if (srv.ok) text = String(sData.text ?? "");
          else serverError = String(sData.message ?? "");
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
          // Both probes must land to claim a number; otherwise show "—".
          setMinutesSaved(orig > 0 && refined > 0 ? Math.max(0, orig - refined) / 60 : null);
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

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
            <Wand2 className="h-6 w-6 text-zinc-400" />
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
              <Wand2 className="h-6 w-6 text-amber-400" />
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
                    <audio src={refinedUrl} controls className="w-full" />
                    <p className="mt-2 text-[11px] text-emerald-700">Saved to Media Storage with the Refined badge.</p>
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
                <StepRow state={pipeline.refine} label="Remove gaps" sub="Dead air and long pauses, cut" />
                <StepRow state={pipeline.refine} label="Audio cleanup" sub="Loudness mastered to −16 LUFS" />
                <StepRow state="soon" label="Remove fillers" sub="Word-level um/uh excision" />
                <StepRow state="soon" label="Enhance video" sub="Re-cut picture to the refined audio" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Marked clips and captions live in your studio's Editing Room — Refiner polishes the whole show.
              </p>
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
                  [fillersFound !== null ? String(fillersFound) : "—", "Fillers heard", "text-red-500"],
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
                    <div className="flex justify-between gap-3"><dt className="text-zinc-500">Filler words heard</dt><dd className="font-medium tabular-nums text-zinc-800">{fillersFound ?? "—"}</dd></div>
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
