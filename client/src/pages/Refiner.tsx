import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { extractAudioAsWav } from "@/lib/audio-extraction";
import { ObjectUploader } from "@/components/ObjectUploader";

/**
 * Refiner — the creator's refine-and-clip surface.
 *
 * Look harvested from the old Alchify app (warm off-white, gold→orange
 * gradient, flat cards, Inter); refine pipeline ported from Facet (transcribe
 * → word-timed cut → master → VPS render); AI clips from the Podlogix
 * clip-selection endpoint. Facet is left in place until this replaces it.
 */

// ── Types ────────────────────────────────────────────────────────────────────
type StepState = "idle" | "running" | "done" | "failed";
type Pacing = "natural" | "tighter";
type FillerLevel = "light" | "standard" | "thorough";
type Aspect = "9:16" | "1:1" | "4:5" | "16:9";
interface WordStamp { word: string; start: number; end: number }
interface LibraryItem {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  platform: string;
  createdAt?: string | null;
  thumbnailUrl?: string | null;
}
interface ClipCandidate {
  title: string; hook: string; startSeconds: number; endSeconds: number;
  platforms: string[]; scores: { hook: number; flow: number; value: number; trend: number }; overall: number;
}

// ── Pure pipeline helpers (ported from Facet) ────────────────────────────────
const CUTTABLE_FILLER_STANDARD = /^(um+|uh+|erm+|hmm+)$/i;
const CUTTABLE_FILLER_THOROUGH = /^(um+|uh+|erm+|hmm+|mm+|ah+)$/i;
function fillerRegexForLevel(level: FillerLevel): RegExp | null {
  if (level === "light") return null;
  return level === "thorough" ? CUTTABLE_FILLER_THOROUGH : CUTTABLE_FILLER_STANDARD;
}
function speechSpans(words: WordStamp[], minGap: number, fillerRegex: RegExp | null, pad = 0.18) {
  const spans: Array<[number, number]> = []; const fillers: Array<[number, number]> = []; let barrier = false;
  for (const w of words) {
    if (typeof w.start !== "number" || typeof w.end !== "number") continue;
    if (fillerRegex && fillerRegex.test(w.word.trim().replace(/[.,!?;:]+$/g, ""))) { fillers.push([w.start, w.end]); barrier = true; continue; }
    const last = spans[spans.length - 1];
    if (last && !barrier && w.start - last[1] <= minGap) last[1] = Math.max(last[1], w.end);
    else spans.push([w.start, w.end]);
    barrier = false;
  }
  return { spans: spans.map(([s, e]) => [Math.max(0, s - pad), e + pad] as [number, number]), fillers };
}
function fittedSpans(words: WordStamp[], fillerRegex: RegExp | null, baseGap: number) {
  let gap = baseGap; let result = speechSpans(words, gap, fillerRegex);
  while (result.spans.length > 100 && gap < 3) { gap += 0.25; result = speechSpans(words, gap, fillerRegex); }
  const spans = result.spans.map(([s, e]) => [s, e] as [number, number]);
  while (spans.length > 100) {
    let bi = 1, bg = Infinity;
    for (let i = 1; i < spans.length; i++) { const g = spans[i][0] - spans[i - 1][1]; if (g < bg) { bg = g; bi = i; } }
    spans[bi - 1][1] = spans[bi][1]; spans.splice(bi, 1);
  }
  const fillersCut = result.fillers.filter(([fs, fe]) => !spans.some(([s, e]) => fs >= s - 0.01 && fe <= e + 0.01)).length;
  return { spans, fillersCut };
}
function spanExpr(spans: Array<[number, number]>): string {
  return spans.map(([s, e]) => `between(t\\,${s.toFixed(1)}\\,${e.toFixed(1)})`).join("+");
}
function audioFilterChain(cutExpr: string | null, audioPolish: boolean): string {
  const parts: string[] = [];
  if (cutExpr) parts.push(`aselect='${cutExpr}'`, "asetpts=N/SR/TB");
  if (audioPolish) parts.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  return parts.join(",");
}
function videoFilterChain(cutExpr: string | null, videoPolish: boolean, scaleClause?: string): string {
  const parts: string[] = [];
  if (cutExpr) parts.push(`select='${cutExpr}'`, "setpts=N/FRAME_RATE/TB");
  if (videoPolish) parts.push("eq=brightness=0.02:contrast=1.05:saturation=1.1");
  if (scaleClause) parts.push(scaleClause);
  return parts.join(",");
}
const mediaDuration = (url: string, kind: "audio" | "video") =>
  new Promise<number>((resolve) => {
    const el = document.createElement(kind); let settled = false;
    const settle = (v: number) => { if (settled) return; settled = true; el.removeAttribute("src"); resolve(v); };
    const timer = setTimeout(() => settle(0), 15_000);
    el.preload = "metadata";
    el.onloadedmetadata = () => { clearTimeout(timer); settle(el.duration || 0); };
    el.onerror = () => { clearTimeout(timer); settle(0); };
    el.src = url;
  });
const RAW_FILENAME_RE = /\b\d{6,}[\w-]*\.\w{2,4}\b/i;
function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function humanRecordingName(item: LibraryItem): string {
  const raw = item.caption?.trim();
  const looksRaw = !raw || RAW_FILENAME_RE.test(raw) || raw.toLowerCase() === item.platform?.toLowerCase();
  if (!looksRaw) return raw!;
  const kind = item.mediaType === "audio" ? "Audio recording" : "Video recording";
  const date = formatShortDate(item.createdAt);
  return date !== "—" ? `${kind} — ${date}` : kind;
}
function fmtClock(s: number): string {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function grade(n: number): string {
  if (n >= 93) return "A+"; if (n >= 88) return "A"; if (n >= 83) return "A−";
  if (n >= 78) return "B+"; if (n >= 72) return "B"; if (n >= 65) return "B−";
  if (n >= 55) return "C"; return "D";
}

const CLIP_TINTS = [
  "radial-gradient(120% 120% at 60% 25%,#5a4030,#141010)",
  "radial-gradient(120% 120% at 40% 30%,#33465a,#101318)",
  "radial-gradient(120% 120% at 55% 20%,#4a3a24,#14110c)",
  "radial-gradient(120% 120% at 50% 30%,#553040,#141014)",
];

export default function Refiner() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<{ id: string; url: string; title: string; type: "video" | "audio" } | null>(null);
  const [pacing] = useState<Pacing>("natural");
  const [fillerLevel] = useState<FillerLevel>("standard");
  const [audioPolish] = useState(true);
  const [videoPolish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pipeline, setPipeline] = useState<{ transcribe: StepState; polish: StepState; clips: StepState }>({
    transcribe: "idle", polish: "idle", clips: "idle",
  });
  const [transcript, setTranscript] = useState<string | null>(null);
  const [polishedUrl, setPolishedUrl] = useState<string | null>(null);
  const [polishedIsVideo, setPolishedIsVideo] = useState(false);
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null);
  const [fillersCut, setFillersCut] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [selDuration, setSelDuration] = useState<number | null>(null);
  const [clips, setClips] = useState<ClipCandidate[]>([]);
  const [aspect, setAspect] = useState<Aspect>("9:16");

  const { data: libraryData } = useQuery<{ items: LibraryItem[] }>({ queryKey: ["/api/media-library"], retry: false });
  const sources = useMemo(
    () => (libraryData?.items ?? []).filter((i) => i.mediaUrl && (i.mediaType === "video" || i.mediaType === "audio")),
    [libraryData],
  );

  // Auto-select the first recording once the library lands.
  useEffect(() => {
    if (selected || sources.length === 0) return;
    const it = sources[0];
    setSelected({ id: it.id, url: it.mediaUrl!, title: humanRecordingName(it), type: it.mediaType === "audio" ? "audio" : "video" });
  }, [sources, selected]);

  // Reset derived state when the selection changes; probe duration. The probe
  // is async, so a cancel flag keeps a stale result (from a fast re-select or
  // an unmount) from landing on the wrong selection.
  useEffect(() => {
    setPipeline({ transcribe: "idle", polish: "idle", clips: "idle" });
    setTranscript(null); setPolishedUrl(null); setMinutesSaved(null); setFillersCut(null);
    setWordCount(null); setClips([]); setSelDuration(null);
    if (!selected) return;
    let cancelled = false;
    void mediaDuration(selected.url, selected.type).then((d) => { if (!cancelled) setSelDuration(d || null); });
    return () => { cancelled = true; };
  }, [selected?.id, selected?.url, selected?.type]);

  const pick = (it: LibraryItem) =>
    setSelected({ id: it.id, url: it.mediaUrl!, title: humanRecordingName(it), type: it.mediaType === "audio" ? "audio" : "video" });

  const getUploadParams = async (file: File) => {
    const res = await apiRequest("POST", "/api/uploads/request-url", { name: file.name, size: file.size, contentType: file.type });
    const data = await res.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const submitAndCollect = async (files: string[], cmd: string, ext: string, title: string): Promise<string> => {
    const submit = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", { files, full_command: cmd, output_extension: ext });
    const sub = await submit.json().catch(() => ({}));
    if (!submit.ok || !sub.job_id) throw new Error(sub.message ?? "Couldn't start the job");
    for (let i = 0; i < 300; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const st = await apiRequest("GET", `/api/media-lab/ffmpeg/jobs/${sub.job_id}`);
      const js = await st.json().catch(() => ({}));
      const status = String(js.status ?? "").toUpperCase();
      if (status === "FINISHED" || status === "COMPLETED") break;
      if (status === "ERROR" || status === "FAILED") throw new Error(String(js.error ?? "Processing failed"));
      if (i === 299) throw new Error("Timed out");
    }
    const collect = await apiRequest("POST", "/api/media-lab/collect", { jobId: sub.job_id, extension: ext, title });
    const col = await collect.json().catch(() => ({}));
    if (!collect.ok || !col.url) throw new Error(col.message ?? "Couldn't store the result");
    return String(col.url);
  };

  const findClips = async (text: string, words: WordStamp[]) => {
    setPipeline((p) => ({ ...p, clips: "running" }));
    try {
      const res = await apiRequest("POST", "/api/refiner/clip-candidates", {
        transcript: text, words, durationSeconds: selDuration ?? undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Clip finding failed");
      setClips(Array.isArray(data.clips) ? data.clips : []);
      setPipeline((p) => ({ ...p, clips: "done" }));
    } catch (e) {
      setPipeline((p) => ({ ...p, clips: "failed" }));
      toast({ title: "Couldn't find clips", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const run = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setTranscript(null); setPolishedUrl(null); setMinutesSaved(null); setFillersCut(null); setWordCount(null); setClips([]);
    setPipeline({ transcribe: "running", polish: "idle", clips: "idle" });
    try {
      // 1 — transcription (server compresses long shows; browser WAV fallback)
      let words: WordStamp[] = [];
      let text = "";
      const shortEnough = selDuration !== null && selDuration <= 24 * 60;
      const browserLane = async () => {
        const wav = await extractAudioAsWav(selected.url);
        const r = await fetch("/api/social/transcribe", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.message || "Transcription failed");
        if (Array.isArray(d.words)) words = d.words;
        return String(d.text ?? "");
      };
      const serverLane = async () => {
        const r = await apiRequest("POST", "/api/facet/transcribe", { mediaUrl: selected.url });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(String(d.message ?? "Transcription failed"));
        if (Array.isArray(d.words)) words = d.words;
        return String(d.text ?? "");
      };
      const lanes = shortEnough ? [browserLane, serverLane] : [serverLane, browserLane];
      let ok = false; let lastErr = "";
      for (const lane of lanes) { try { text = await lane(); ok = true; break; } catch (e) { lastErr = e instanceof Error ? e.message : "Transcription failed"; } }
      if (!ok) throw new Error(lastErr || "Transcription failed");
      setTranscript(text);
      setWordCount(words.length || (text ? text.split(/\s+/).length : 0));
      setPipeline((p) => ({ ...p, transcribe: "done", polish: "running" }));

      // 2 — word-timed cut + master, rendered on the VPS lane
      const baseGap = pacing === "tighter" ? 0.4 : 0.75;
      const fillerRegex = fillerRegexForLevel(fillerLevel);
      const cut = words.length > 0 ? fittedSpans(words, fillerRegex, baseGap) : { spans: [] as Array<[number, number]>, fillersCut: 0 };
      const haveSpans = cut.spans.length > 0;
      setFillersCut(haveSpans ? cut.fillersCut : null);
      const cutExpr = haveSpans ? spanExpr(cut.spans) : null;

      let url: string; let isVideo = false;
      if (selected.type === "video" && haveSpans) {
        const videoCmd = `ffmpeg -y -i {input} -vf "${videoFilterChain(cutExpr, videoPolish, "scale=-2:min(720\\,ih)")}" -af "${audioFilterChain(cutExpr, audioPolish)}" -c:v h264_nvenc -preset p1 -cq 23 -b:v 2500k -maxrate 3500k -bufsize 7M -c:a aac -b:a 160k {output}`;
        try { url = await submitAndCollect([selected.url], videoCmd, "mp4", `${selected.title} — refined video`); isVideo = true; }
        catch {
          const audioCmd = `ffmpeg -y -i {input} -vn -af "${audioFilterChain(cutExpr, audioPolish)}" -acodec libmp3lame -q:a 2 {output}`;
          url = await submitAndCollect([selected.url], audioCmd, "mp3", `${selected.title} — refined audio`);
        }
      } else if (haveSpans) {
        const audioCmd = `ffmpeg -y -i {input} -vn -af "${audioFilterChain(cutExpr, audioPolish)}" -acodec libmp3lame -q:a 2 {output}`;
        url = await submitAndCollect([selected.url], audioCmd, "mp3", `${selected.title} — refined audio`);
      } else {
        const legacy = `silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB${audioPolish ? ",loudnorm=I=-16:TP=-1.5:LRA=11" : ""}`;
        url = await submitAndCollect([selected.url], `ffmpeg -y -i {input} -vn -af ${legacy} -acodec libmp3lame -q:a 2 {output}`, "mp3", `${selected.title} — refined audio`);
      }
      setPolishedUrl(url); setPolishedIsVideo(isVideo);
      const [orig, refined] = await Promise.all([mediaDuration(selected.url, selected.type), mediaDuration(url, isVideo ? "video" : "audio")]);
      setMinutesSaved(orig > 0 && refined > 0 ? Math.max(0, orig - refined) / 60 : null);
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      setPipeline((p) => ({ ...p, polish: "done" }));

      // 3 — AI clips from the transcript
      if (text && text.trim().length > 40) await findClips(text, words);
    } catch (e) {
      setPipeline((p) => ({ transcribe: p.transcribe === "done" ? "done" : "failed", polish: p.polish === "done" ? "done" : "failed", clips: p.clips }));
      toast({ title: "Refine failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const renderClip = async (c: ClipCandidate, idx: number) => {
    if (!selected) return;
    try {
      const cmdRes = await apiRequest("POST", "/api/refiner/clip-command", { aspect, startSeconds: c.startSeconds, endSeconds: c.endSeconds });
      const cmd = await cmdRes.json().catch(() => ({}));
      if (!cmdRes.ok || !cmd.command) throw new Error(cmd.message ?? "Couldn't build the clip");
      toast({ title: `Rendering “${c.title}”`, description: `${aspect} · ${fmtClock(c.startSeconds)}–${fmtClock(c.endSeconds)} — this runs on the render server.` });
      const url = await submitAndCollect([selected.url], cmd.command, "mp4", `${c.title} — clip (${aspect})`);
      queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
      toast({ title: "Clip ready", description: "Saved to Media Storage." });
      window.open(url, "_blank");
    } catch (e) {
      toast({ title: "Clip render failed", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const publishedCount = sources.length;
  const step = (s: StepState) => (s === "done" ? "done" : s === "running" ? "run" : "idle");

  return (
    <div className="rf">
      <style>{RF_CSS}</style>

      <div className="rf-head">
        <div className="rf-brand">
          <div className="rf-mark"><SparkIcon /></div>
          <div>
            <h1>Refiner</h1>
            <p>Raw recording, in. Polished cut and clips, out.</p>
          </div>
        </div>
      </div>

      <div className="rf-cols">
        {/* Select project */}
        <section className="rf-card rf-pad">
          <div className="rf-ttl"><FolderIcon /> Select recording</div>
          <p className="rf-sub">Choose content to refine</p>
          <div className="rf-list">
            {sources.length === 0 && <div className="rf-empty">No recordings yet — upload one to begin.</div>}
            {sources.map((it) => (
              <button key={it.id} className={`rf-proj ${selected?.id === it.id ? "on" : ""}`} onClick={() => pick(it)}>
                <span className={`rf-th ${it.mediaType === "audio" ? "audio" : ""}`}>{it.mediaType === "audio" ? <WaveIcon /> : <PlayIcon />}</span>
                <span className="rf-proj-txt">
                  <span className="rf-nm">{humanRecordingName(it)}</span>
                  <span className="rf-mt">{formatShortDate(it.createdAt)}</span>
                </span>
                <span className="rf-badge">{it.mediaType === "audio" ? "audio" : "video"}</span>
              </button>
            ))}
          </div>
          <div className="rf-upload">
            <ObjectUploader
              maxFileSize={500 * 1024 * 1024}
              onGetUploadParameters={getUploadParams}
              buttonClassName="!p-0 !border-0 !bg-transparent !w-full"
              onComplete={(r) => {
                const file = r.successful[0];
                queryClient.invalidateQueries({ queryKey: ["/api/media-library"] });
                if (file) setSelected({ id: file.uploadURL, url: file.uploadURL, title: file.name, type: file.type.startsWith("audio/") ? "audio" : "video" });
              }}
            >
              <span className="rf-upload-inner"><PlusIcon /> Upload or drop a file</span>
            </ObjectUploader>
          </div>
        </section>

        {/* Preview */}
        <section className="rf-card" style={{ overflow: "hidden" }}>
          <div className="rf-prev">
            {polishedUrl ? (
              // A finished refine always previews the refined output — as video
              // when the picture survived, or as audio when it fell back.
              polishedIsVideo ? (
                <video src={polishedUrl} controls className="rf-media" />
              ) : (
                <div className="rf-audioframe"><WaveIcon /><audio src={polishedUrl} controls /></div>
              )
            ) : selected?.type === "video" ? (
              <video src={selected.url} controls className="rf-media" />
            ) : selected?.type === "audio" ? (
              <div className="rf-audioframe"><WaveIcon /><audio src={selected.url} controls /></div>
            ) : (
              <div className="rf-prev-empty">Select a recording to preview</div>
            )}
            {polishedUrl && <div className="rf-pill"><span className="rf-pd" />Refined</div>}
          </div>
          <div className="rf-prev-foot">
            <div>
              <div className="rf-nm">{selected?.title ?? "—"}</div>
              <div className="rf-mt">{selected ? `${selected.type}${selDuration ? ` · ${fmtClock(selDuration)}` : ""}` : ""}</div>
            </div>
            {polishedUrl && (
              <a className="rf-dbtn" href={polishedUrl} target="_blank" rel="noreferrer"><DownIcon /> Download refined cut</a>
            )}
          </div>
        </section>

        {/* Pipeline */}
        <section className="rf-card rf-pad">
          <div className="rf-ttl"><SparkIcon /> What Refiner does</div>
          <p className="rf-sub">Every step is a real change to the file</p>
          <div className="rf-steps">
            <PipeRow state={step(pipeline.transcribe)} label="Understand the conversation" stat={wordCount != null ? `${wordCount.toLocaleString()}` : undefined} />
            <PipeRow state={step(pipeline.polish)} label="Cut fillers &amp; dead air" stat={fillersCut != null ? `${fillersCut} cut` : undefined} />
            <PipeRow state={step(pipeline.polish)} label="Master the sound" />
            <PipeRow state={step(pipeline.clips)} label="Find the best clips" stat={clips.length ? `${clips.length}` : undefined} />
          </div>
          <button className="rf-start" onClick={run} disabled={!selected || busy}>
            {busy ? <><Spinner /> Refining…</> : <><SparkIcon /> Refine this recording</>}
          </button>
          <p className="rf-note">Your voice, story, and intent stay intact.</p>
        </section>
      </div>

      {/* Results tiles */}
      {(minutesSaved != null || fillersCut != null || wordCount != null || clips.length > 0) && (
        <>
          <div className="rf-results-h"><div className="rf-ttl" style={{ fontSize: 15 }}><ChartIcon /> What Refiner did</div></div>
          <div className="rf-tiles">
            <Tile n={minutesSaved != null ? `${Math.round(minutesSaved)}m ${Math.round((minutesSaved % 1) * 60)}s` : "—"} k="Time saved" c="var(--rf-info)" />
            <Tile n={fillersCut != null ? String(fillersCut) : "—"} k="Fillers cut" c="var(--rf-danger)" />
            <Tile n={wordCount != null ? wordCount.toLocaleString() : "—"} k="Words" c="var(--rf-amber)" />
            <Tile n={polishedUrl ? (polishedIsVideo ? "Video" : "Audio") : "—"} k="Refined cut" c="var(--rf-good)" />
            <Tile n={clips.length ? String(clips.length) : "—"} k="Clips found" c="var(--rf-purple)" />
            <Tile n={selDuration ? fmtClock(selDuration) : "—"} k="Runtime" c="var(--rf-info)" />
          </div>
        </>
      )}

      {/* Clips */}
      {clips.length > 0 && (
        <>
          <div className="rf-clips-h">
            <h2>AI Clips<span className="rf-c">{clips.length} moments worth posting</span></h2>
            <div className="rf-fmts">
              {(["9:16", "1:1", "4:5", "16:9"] as Aspect[]).map((a) => (
                <button key={a} className={`rf-fmt ${aspect === a ? "on" : ""}`} onClick={() => setAspect(a)}>{a}</button>
              ))}
            </div>
          </div>
          <div className="rf-cgrid">
            {clips.map((c, i) => (
              <article key={i} className="rf-clip">
                <div className="rf-fr" style={{ background: CLIP_TINTS[i % 4] }}>
                  <div className="rf-fr-fig" />
                  <div className="rf-sc">{c.overall}</div>
                  <div className="rf-cap">{c.title}</div>
                  <div className="rf-du">{fmtClock(c.startSeconds)}–{fmtClock(c.endSeconds)}</div>
                </div>
                <div className="rf-cb">
                  <div className="rf-ct">{c.title}</div>
                  <div className="rf-axes">
                    <Axis g={grade(c.scores.hook)} n={c.scores.hook} l="Hook" />
                    <Axis g={grade(c.scores.flow)} n={c.scores.flow} l="Flow" />
                    <Axis g={grade(c.scores.value)} n={c.scores.value} l="Value" />
                    <Axis g={grade(c.scores.trend)} n={c.scores.trend} l="Trend" />
                  </div>
                  <button className="rf-render" onClick={() => renderClip(c, i)}><ScissorsIcon /> Render {aspect}</button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Small presentational pieces ──────────────────────────────────────────────
function PipeRow({ state, label, stat }: { state: "done" | "run" | "idle"; label: string; stat?: string }) {
  return (
    <div className={`rf-step ${state}`}>
      <span className="rf-rg">{state === "done" ? <CheckIcon /> : state === "run" ? <Spinner /> : null}</span>
      <span className="rf-lb" dangerouslySetInnerHTML={{ __html: label }} />
      {stat && <span className="rf-st">{stat}</span>}
    </div>
  );
}
function Tile({ n, k, c }: { n: string; k: string; c: string }) {
  return <div className="rf-tile"><div className="rf-tile-n" style={{ color: c }}>{n}</div><div className="rf-tile-k">{k}</div></div>;
}
function Axis({ g, n, l }: { g: string; n: number; l: string }) {
  return <div className="rf-ax"><div className={`rf-g ${n >= 80 ? "hi" : "md"}`}>{g}</div><div className="rf-l">{l}</div></div>;
}

// ── Icons (inline, stroke = currentColor) ────────────────────────────────────
const SparkIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.3 5.6L20 11l-5.7 2.4L12 19l-2.3-5.6L4 11l5.7-2.4z" /></svg>;
const FolderIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
const PlayIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>;
const WaveIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M6 7v10M18 7v10M3 10v4M21 10v4" /></svg>;
const PlusIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
const DownIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 21h16" /></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
const ChartIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5m0 14h16M8 15l3-3 2 2 5-5" /></svg>;
const ScissorsIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" /></svg>;
const Spinner = () => <svg className="rf-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3a9 9 0 1 0 9 9" /></svg>;

const RF_CSS = `
.rf { --rf-bg: hsl(40 20% 98%); --rf-card:#fff; --rf-fg: hsl(30 15% 12%); --rf-muted: hsl(30 10% 45%);
  --rf-secondary: hsl(30 12% 92%); --rf-border: hsl(35 15% 88%); --rf-accent: hsl(28 85% 55%);
  --rf-grad: linear-gradient(135deg, hsl(42 92% 50%), hsl(28 85% 55%)); --rf-grad-soft: linear-gradient(135deg, hsl(42 92% 50% / .12), hsl(28 85% 55% / .04));
  --rf-ring: hsl(42 92% 50% / .35); --rf-good:#1f9d57; --rf-info:#3b6fe0; --rf-danger:#d64545; --rf-purple:#7b52e0; --rf-amber: hsl(28 85% 45%);
  --rf-shadow: 0 1px 2px hsl(30 15% 12% / .05), 0 1px 3px hsl(30 15% 12% / .06);
  font-family:"Inter",system-ui,sans-serif; color:var(--rf-fg); background:var(--rf-bg); border-radius:14px; padding:22px; }
@media (prefers-color-scheme: dark) { .rf { --rf-bg: hsl(25 20% 8%); --rf-card: hsl(25 25% 11%); --rf-fg: hsl(40 15% 95%); --rf-muted: hsl(35 10% 62%);
  --rf-secondary: hsl(25 18% 18%); --rf-border: hsl(25 20% 20%); --rf-accent: hsl(28 85% 58%);
  --rf-grad: linear-gradient(135deg, hsl(42 92% 55%), hsl(28 85% 58%)); --rf-grad-soft: linear-gradient(135deg, hsl(42 92% 55% / .16), hsl(28 85% 58% / .05));
  --rf-good:#35c07a; --rf-info:#6699ff; --rf-danger:#ef6b6b; --rf-purple:#a583f5; --rf-amber: hsl(28 85% 62%); --rf-shadow: 0 1px 3px rgba(0,0,0,.4); } }
.rf svg { width:16px; height:16px; }
.rf-head { margin-bottom:20px; }
.rf-brand { display:flex; align-items:center; gap:12px; }
.rf-mark { width:36px; height:36px; border-radius:9px; background:var(--rf-grad); display:grid; place-items:center; color:#fff; box-shadow:0 4px 12px -4px hsl(28 85% 55% / .5); }
.rf-mark svg { width:19px; height:19px; }
.rf-brand h1 { margin:0; font-size:22px; font-weight:700; letter-spacing:-.02em; }
.rf-brand p { margin:2px 0 0; font-size:13px; color:var(--rf-muted); }
.rf-card { background:var(--rf-card); border:1px solid var(--rf-border); border-radius:10px; box-shadow:var(--rf-shadow); }
.rf-pad { padding:16px; }
.rf-ttl { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; }
.rf-ttl svg { color:var(--rf-accent); }
.rf-sub { font-size:12px; color:var(--rf-muted); margin:3px 0 10px; }
.rf-cols { display:grid; grid-template-columns: 290px 1fr 300px; gap:16px; align-items:start; }
@media (max-width:1100px){ .rf-cols { grid-template-columns:1fr; } }
.rf-list { display:flex; flex-direction:column; gap:3px; }
.rf-empty { font-size:12.5px; color:var(--rf-muted); padding:10px 4px; }
.rf-proj { display:flex; align-items:center; gap:11px; padding:9px; border-radius:8px; cursor:pointer; border:1px solid transparent; background:none; width:100%; text-align:left; font:inherit; color:inherit; }
.rf-proj:hover { background:var(--rf-secondary); }
.rf-proj.on { border-color:var(--rf-ring); background:var(--rf-grad-soft); }
.rf-th { width:40px; height:40px; border-radius:7px; flex:none; display:grid; place-items:center; color:#fff; background:linear-gradient(135deg,#3a2f27,#5a463a); }
.rf-th.audio { background:linear-gradient(135deg,#33261f,#5a3a28); }
.rf-th svg { width:15px; height:15px; }
.rf-proj-txt { flex:1; min-width:0; }
.rf-nm { font-size:13px; font-weight:500; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rf-mt { font-size:11px; color:var(--rf-muted); font-family:ui-monospace,monospace; margin-top:2px; display:block; }
.rf-badge { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--rf-muted); background:var(--rf-secondary); padding:2px 7px; border-radius:20px; flex:none; }
.rf-upload { margin-top:8px; }
.rf-upload-inner { display:flex; align-items:center; justify-content:center; gap:7px; border:1px dashed var(--rf-border); border-radius:8px; padding:13px; font-size:12.5px; color:var(--rf-muted); cursor:pointer; }
.rf-upload-inner:hover { border-color:var(--rf-accent); color:var(--rf-accent); }
.rf-prev { position:relative; aspect-ratio:16/9; background:#0d0b0a; display:grid; place-items:center; overflow:hidden; }
.rf-media, .rf-prev video { width:100%; height:100%; object-fit:contain; background:#0d0b0a; }
.rf-audioframe { display:flex; flex-direction:column; align-items:center; gap:12px; color:#c9a27e; }
.rf-audioframe svg { width:34px; height:34px; }
.rf-audioframe audio { width:80%; }
.rf-prev-empty { color:#8a7f74; font-size:13px; }
.rf-pill { position:absolute; top:10px; left:10px; display:flex; align-items:center; gap:6px; background:rgba(15,10,6,.6); color:#fff; font-size:11px; font-weight:600; padding:4px 9px; border-radius:6px; }
.rf-pd { width:6px; height:6px; border-radius:50%; background:#38d27f; box-shadow:0 0 0 3px rgba(56,210,127,.3); }
.rf-prev-foot { display:flex; align-items:center; gap:12px; padding:14px 16px; }
.rf-dbtn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:500; color:var(--rf-fg); border:1px solid var(--rf-border); border-radius:8px; padding:7px 13px; text-decoration:none; }
.rf-dbtn svg { color:var(--rf-muted); }
.rf-steps { display:flex; flex-direction:column; }
.rf-step { display:flex; align-items:center; gap:11px; padding:9px 0; }
.rf-step + .rf-step { border-top:1px solid var(--rf-border); }
.rf-rg { width:20px; height:20px; border-radius:50%; flex:none; display:grid; place-items:center; }
.rf-step.done .rf-rg { background:color-mix(in srgb, var(--rf-good) 16%, transparent); color:var(--rf-good); }
.rf-step.run .rf-rg { background:var(--rf-grad-soft); color:var(--rf-accent); }
.rf-step.idle .rf-rg { border:2px solid var(--rf-border); }
.rf-rg svg { width:12px; height:12px; }
.rf-lb { font-size:13px; font-weight:500; }
.rf-step.idle .rf-lb { color:var(--rf-muted); }
.rf-st { margin-left:auto; font-family:ui-monospace,monospace; font-size:11px; color:var(--rf-good); font-weight:700; }
.rf-start { margin-top:14px; width:100%; display:flex; align-items:center; justify-content:center; gap:8px; background:var(--rf-grad); color:#fff; border:none; border-radius:9px; padding:11px; font:inherit; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 6px 16px -6px hsl(28 85% 55% / .5); }
.rf-start:disabled { opacity:.55; cursor:default; }
.rf-note { text-align:center; font-size:11.5px; color:var(--rf-muted); margin:8px 0 0; }
.rf-results-h { margin:26px 0 12px; }
.rf-tiles { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
@media (max-width:1100px){ .rf-tiles { grid-template-columns:repeat(3,1fr);} }
@media (max-width:560px){ .rf-tiles { grid-template-columns:repeat(2,1fr);} }
.rf-tile { background:var(--rf-card); border:1px solid var(--rf-border); border-radius:10px; padding:15px; box-shadow:var(--rf-shadow); }
.rf-tile-n { font-size:24px; font-weight:700; letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.rf-tile-k { font-size:11.5px; color:var(--rf-muted); margin-top:3px; }
.rf-clips-h { display:flex; align-items:baseline; justify-content:space-between; margin:28px 0 14px; gap:12px; flex-wrap:wrap; }
.rf-clips-h h2 { margin:0; font-size:18px; font-weight:700; letter-spacing:-.01em; }
.rf-c { font-size:12px; color:var(--rf-muted); font-weight:400; margin-left:8px; }
.rf-fmts { display:flex; gap:3px; background:var(--rf-secondary); padding:3px; border-radius:9px; }
.rf-fmt { font-family:ui-monospace,monospace; font-size:12px; font-weight:700; color:var(--rf-muted); padding:5px 11px; border-radius:6px; cursor:pointer; border:none; background:none; }
.rf-fmt.on { background:var(--rf-card); color:var(--rf-fg); box-shadow:var(--rf-shadow); }
.rf-cgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:15px; }
.rf-clip { background:var(--rf-card); border:1px solid var(--rf-border); border-radius:10px; overflow:hidden; box-shadow:var(--rf-shadow); transition:transform .16s, box-shadow .16s; }
.rf-clip:hover { transform:translateY(-2px); box-shadow:0 10px 26px -12px hsl(30 15% 12% / .28); }
.rf-fr { position:relative; aspect-ratio:9/16; overflow:hidden; }
.rf-fr-fig { position:absolute; left:50%; top:30%; transform:translateX(-50%); width:44%; height:54%; background:linear-gradient(180deg,rgba(210,175,145,.8),rgba(90,60,45,.5)); border-radius:44% 44% 12px 12px; }
.rf-cap { position:absolute; left:9px; right:9px; bottom:40px; text-align:center; font-weight:700; font-size:14px; line-height:1.12; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,.65); }
.rf-sc { position:absolute; top:8px; right:8px; min-width:30px; height:30px; padding:0 7px; border-radius:8px; background:rgba(15,10,6,.62); display:grid; place-items:center; color:#fff; font-family:ui-monospace,monospace; font-weight:700; font-size:13px; }
.rf-du { position:absolute; bottom:8px; left:8px; font-family:ui-monospace,monospace; font-size:10px; font-weight:700; color:#fff; background:rgba(15,10,6,.62); padding:3px 6px; border-radius:5px; }
.rf-cb { padding:11px 12px 12px; }
.rf-ct { font-size:13px; font-weight:600; line-height:1.25; }
.rf-axes { display:flex; gap:4px; margin:9px 0 10px; }
.rf-ax { flex:1; text-align:center; }
.rf-g { font-family:ui-monospace,monospace; font-weight:700; font-size:12px; }
.rf-g.hi { color:var(--rf-good); } .rf-g.md { color:var(--rf-amber); }
.rf-l { font-size:8.5px; letter-spacing:.05em; text-transform:uppercase; color:var(--rf-muted); margin-top:2px; }
.rf-render { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-size:12px; font-weight:600; color:var(--rf-fg); border:1px solid var(--rf-border); background:var(--rf-card); border-radius:8px; padding:8px; cursor:pointer; }
.rf-render:hover { border-color:var(--rf-accent); color:var(--rf-accent); }
.rf-render svg { width:13px; height:13px; }
.rf-spin { animation:rf-sp 1s linear infinite; }
@keyframes rf-sp { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .rf-spin { animation:none; } }
`;
