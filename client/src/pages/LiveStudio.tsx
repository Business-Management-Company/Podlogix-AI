import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera, CameraOff, Clock, Download, FileText, LayoutGrid, Loader2, Mic, MicOff,
  MonitorUp, Radio, Scissors, Square, Type,
} from "lucide-react";
import { extractAudioAsWav } from "@/lib/audio-extraction";
import { generateSrt, generateVtt, downloadText, type CaptionSegment } from "@/lib/captions";
import { StudioCompositor, STUDIO_LAYOUTS, type StudioLayout } from "@/lib/studio-compositor";
import type { LiveMark, LiveSession } from "@shared/schema";

/**
 * /studio/live — the Live Studio.
 *
 * The dark room: a real stage (the compositor canvas — what you see is what
 * records), camera + screen sources with live-switchable layouts, mic/cam
 * toggles, a teleprompter, and the CLIP THAT loop. After the show the
 * recording uploads itself as the VOD and marks become captioned clips.
 * Everything in-house: canvas, MediaRecorder, Web Audio, our storage,
 * Upload-Post FFmpeg, Whisper.
 */

const PRE_ROLL = 20;

const PROMPTER_SPEEDS = { slow: 2.0, normal: 3.2, fast: 5.0 } as const; // words/sec
type PrompterSpeed = keyof typeof PROMPTER_SPEEDS;

function fmtClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function LiveStudio() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState(false);
  const [vodUrl, setVodUrl] = useState("");
  const [vodOffset, setVodOffset] = useState("0");
  const [cuttingId, setCuttingId] = useState<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Studio sources + compositor ──
  const compositorRef = useRef<StudioCompositor | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camHidden, setCamHidden] = useState(false);
  const [layout, setLayout] = useState<StudioLayout>("fullscreen");
  const [recording, setRecording] = useState(false);
  const [uploadingVod, setUploadingVod] = useState(false);
  const [railTab, setRailTab] = useState<"layout" | "prompter">("layout");

  // ── Teleprompter ──
  const [prompterOn, setPrompterOn] = useState(false);
  const [prompterScript, setPrompterScript] = useState("");
  const [prompterSpeed, setPrompterSpeed] = useState<PrompterSpeed>("normal");

  // ── Captions ──
  const [captionBusyId, setCaptionBusyId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<{ markId: string; text: string; segments: CaptionSegment[] } | null>(null);

  const { data, isLoading } = useQuery<{ session: LiveSession | null; marks: LiveMark[] }>({
    queryKey: ["/api/live/current"],
  });
  const session = data?.session ?? null;
  const marks = data?.marks ?? [];
  const liveNow = !!session && !session.endedAt;
  const anySource = cameraOn || screenOn;

  const compositor = () => {
    if (!compositorRef.current) {
      compositorRef.current = new StudioCompositor();
      compositorRef.current.canvas.className = "h-full w-full rounded-xl object-contain";
    }
    return compositorRef.current;
  };

  // Mount the compositor canvas into the stage.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !anySource) return;
    const canvas = compositor().canvas;
    stage.appendChild(canvas);
    return () => { if (canvas.parentElement === stage) stage.removeChild(canvas); };
  }, [anySource]);

  useEffect(() => { compositor().setLayout(layout); }, [layout]);

  useEffect(() => {
    if (session?.vodUrl && !vodUrl) setVodUrl(session.vodUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    if (!liveNow || !session) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    const started = new Date(session.startedAt).getTime();
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    update();
    tickRef.current = setInterval(update, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [liveNow, session]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/live/current"] });

  // ── Sources ──
  const toggleCamera = async () => {
    if (cameraOn) {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      compositor().setCamera(null);
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      cameraStreamRef.current = stream;
      compositor().setCamera(stream);
      setCameraOn(true);
      setMicMuted(false);
      setCamHidden(false);
    } catch {
      toast({ title: "Camera permission was refused", variant: "destructive" });
    }
  };

  const toggleScreen = async () => {
    if (screenOn) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      compositor().setScreen(null);
      setScreenOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        screenStreamRef.current = null;
        compositor().setScreen(null);
        setScreenOn(false);
      });
      screenStreamRef.current = stream;
      compositor().setScreen(stream);
      setScreenOn(true);
      if (cameraOn) setLayout("pip-br");
    } catch {
      /* user cancelled the picker — not an error */
    }
  };

  const toggleMic = () => {
    const next = !micMuted;
    cameraStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMicMuted(next);
  };

  const toggleCamVisibility = () => {
    const next = !camHidden;
    cameraStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCamHidden(next);
  };

  const stopAllSources = () => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    compositorRef.current?.setCamera(null);
    compositorRef.current?.setScreen(null);
    setCameraOn(false);
    setScreenOn(false);
  };

  useEffect(() => () => {
    stopAllSources();
    compositorRef.current?.stop();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recording ──
  const startRecording = () => {
    const composed = compositor().start();
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(composed, { mimeType: mime });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecorderAndAttach = async (sessionId: string) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setRecording(false);
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state !== "inactive") recorder.stop();
      else resolve();
    });
    compositorRef.current?.stop();
    recorderRef.current = null;
    stopAllSources();

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    chunksRef.current = [];
    if (blob.size === 0) return;

    setUploadingVod(true);
    try {
      const req = await apiRequest("POST", "/api/uploads/request-url", {
        name: "live-recording.webm",
        size: blob.size,
        contentType: "video/webm",
      });
      const { uploadURL, objectPath } = await req.json();
      const put = await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": "video/webm" } });
      if (!put.ok) throw new Error("upload failed");
      await apiRequest("PATCH", `/api/live/sessions/${sessionId}`, { vodUrl: objectPath, vodOffsetSeconds: 0 });
      setVodUrl(objectPath);
      setVodOffset("0");
      refresh();
      toast({ title: "Recording attached as your VOD", description: "Cut your marked moments below." });
    } catch {
      toast({ title: "Couldn't upload the recording", description: "You can still paste a VOD URL manually.", variant: "destructive" });
    } finally {
      setUploadingVod(false);
    }
  };

  // ── Session ──
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/live/sessions", { title });
      if (!res.ok) throw new Error("start failed");
      return res.json();
    },
    onSuccess: () => {
      refresh();
      setTitle("");
      setCaptions(null);
      if (anySource) startRecording();
      toast({
        title: "You're live on the clock",
        description: anySource ? "Recording the stage — smash CLIP when something good happens." : "Smash CLIP when something good happens.",
      });
    },
    onError: () => toast({ title: "Couldn't start the session", variant: "destructive" }),
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/live/sessions/${session!.id}/end`, {});
      if (!res.ok) throw new Error("end failed");
      return res.json();
    },
    onSuccess: () => {
      refresh();
      if (session && recorderRef.current) void stopRecorderAndAttach(session.id);
      toast({
        title: `Show ended — ${marks.length} moment${marks.length === 1 ? "" : "s"} marked`,
        description: recorderRef.current ? "Uploading your recording — the cut panel fills itself." : "Attach the VOD and they become clips.",
      });
    },
    onError: () => toast({ title: "Couldn't end the show", variant: "destructive" }),
  });

  const clip = useCallback(async () => {
    if (!session || session.endedAt) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    try {
      const res = await apiRequest("POST", `/api/live/sessions/${session.id}/marks`, {});
      if (!res.ok) throw new Error();
      refresh();
    } catch {
      toast({ title: "Couldn't mark that moment", variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.endedAt]);

  useEffect(() => {
    if (!liveNow) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code === "Space" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        e.preventDefault();
        void clip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [liveNow, clip]);

  const saveNote = async (id: string, note: string) => {
    await apiRequest("PATCH", `/api/live/marks/${id}`, { note });
    refresh();
  };

  // ── Cut + captions ──
  const cutMark = async (mark: LiveMark) => {
    if (!vodUrl.trim()) return;
    setCuttingId(mark.id);
    try {
      const submit = await apiRequest("POST", `/api/live/marks/${mark.id}/cut`, {
        vodUrl: vodUrl.trim(),
        offsetSeconds: Math.floor(Number(vodOffset) || 0),
      });
      const sub = await submit.json().catch(() => ({}));
      if (!submit.ok) throw new Error(sub.message ?? "Could not start the cut");
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const st = await fetch(`/api/live/marks/${mark.id}/cut-status`);
        const js = await st.json().catch(() => ({}));
        const status = String(js.status ?? "").toUpperCase();
        if (status === "FINISHED" || status === "COMPLETED") break;
        if (status === "ERROR" || status === "FAILED") throw new Error(js.hint ?? "The cut failed in processing");
        if (i === 44) throw new Error("Timed out waiting for the cut");
      }
      const collect = await apiRequest("POST", `/api/live/marks/${mark.id}/collect`, {});
      const col = await collect.json().catch(() => ({}));
      if (!collect.ok) throw new Error(col.message ?? "Could not store the clip");
      refresh();
      toast({ title: "Clip cut and saved", description: "Find it in your Media Library." });
    } catch (e) {
      refresh();
      toast({
        title: "The cut failed",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setCuttingId(null);
    }
  };

  const generateCaptions = async (mark: LiveMark) => {
    setCaptionBusyId(mark.id);
    try {
      const libRes = await fetch("/api/media-library");
      const lib = await libRes.json().catch(() => ({}));
      const item = (lib.items ?? []).find((i: { id: string }) => i.id === mark.clipMediaId);
      if (!item?.mediaUrl) throw new Error("Clip not found in your library");
      const wav = await extractAudioAsWav(item.mediaUrl);
      const res = await fetch("/api/social/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || "Transcription failed");
      setCaptions({ markId: mark.id, text: resData.text, segments: resData.segments ?? [] });
      toast({ title: "Captions ready", description: "Download them as .srt or .vtt below." });
    } catch (e) {
      toast({
        title: "Couldn't caption the clip",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCaptionBusyId(null);
    }
  };

  const endedWithMarks = session?.endedAt && marks.length > 0;
  const prompterDuration = Math.max(
    12,
    Math.round(prompterScript.split(/\s+/).filter(Boolean).length / PROMPTER_SPEEDS[prompterSpeed])
  );

  return (
    <div className="w-full p-3">
      <style>{`@keyframes prompter-scroll { from { transform: translateY(100%); } to { transform: translateY(-100%); } }`}</style>

      {/* ═══ The studio room — full frame, no chrome ═══ */}
      <div className="rounded-2xl bg-zinc-950 p-4 shadow-2xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Stage column */}
          <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900" ref={stageRef}>
              {!anySource && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,rgba(63,63,70,0.6),rgba(9,9,11,0.9))]">
                  <Radio className="h-8 w-8 text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-400">The stage is dark</p>
                  <p className="text-xs text-zinc-600">Start your camera or share your screen below</p>
                </div>
              )}
              {recording && (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> REC
                </span>
              )}
              {liveNow && (
                <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  <span className="font-mono text-xs tabular-nums">{fmtClock(elapsed)}</span>
                </span>
              )}
              {prompterOn && prompterScript.trim() && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 overflow-hidden bg-gradient-to-t from-black/85 via-black/60 to-transparent">
                  <p
                    className="px-10 text-center text-xl font-semibold leading-relaxed text-white/95"
                    style={{ animation: `prompter-scroll ${prompterDuration}s linear infinite` }}
                  >
                    {prompterScript}
                  </p>
                </div>
              )}
            </div>

            {/* CLIP THAT — the whole point */}
            {liveNow && (
              <button
                type="button"
                onClick={() => void clip()}
                className={`w-full select-none rounded-2xl py-8 text-2xl font-black tracking-wide text-white shadow-xl transition-all ${
                  flash ? "scale-[0.99] bg-emerald-500" : "bg-primary hover:opacity-90 active:scale-[0.99]"
                }`}
              >
                <Scissors className="mr-3 -mt-1 inline h-7 w-7" />
                {flash ? "MARKED!" : "CLIP THAT"}
                <span className="mt-1 block text-[11px] font-medium normal-case tracking-normal text-white/70">
                  or hit the spacebar
                </span>
              </button>
            )}

            {/* Control bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-900 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCamera}
                className={`border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white ${cameraOn ? "ring-1 ring-emerald-500" : ""}`}
              >
                <Camera className="mr-1.5 h-4 w-4" />
                {cameraOn ? "Stop Camera" : "Start Camera"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleScreen}
                className={`border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white ${screenOn ? "ring-1 ring-emerald-500" : ""}`}
              >
                <MonitorUp className="mr-1.5 h-4 w-4" />
                {screenOn ? "Stop Sharing" : "Share Screen"}
              </Button>

              <div className="mx-1 h-6 w-px bg-zinc-700" />
              <button
                onClick={toggleMic}
                disabled={!cameraOn}
                className={`rounded-lg p-2 transition-colors disabled:opacity-30 ${micMuted ? "bg-red-500/20 text-red-400" : "text-zinc-300 hover:bg-zinc-800"}`}
                aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={toggleCamVisibility}
                disabled={!cameraOn}
                className={`rounded-lg p-2 transition-colors disabled:opacity-30 ${camHidden ? "bg-red-500/20 text-red-400" : "text-zinc-300 hover:bg-zinc-800"}`}
                aria-label={camHidden ? "Show camera" : "Hide camera"}
              >
                {camHidden ? <CameraOff size={16} /> : <Camera size={16} />}
              </button>

              <div className="flex-1" />

              {!liveNow ? (
                <>
                  <Input
                    placeholder="Show title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 w-44 border-zinc-700 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500"
                  />
                  <Button
                    onClick={() => startMutation.mutate()}
                    disabled={startMutation.isPending}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Radio className="mr-1.5 h-4 w-4" />
                    )}
                    Go live
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                  variant="outline"
                  className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                >
                  <Square className="mr-2 h-4 w-4" /> End show ({marks.length} marked)
                </Button>
              )}
            </div>

            {/* Live marks */}
            {liveNow && marks.length > 0 && (
              <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl bg-zinc-900">
                {[...marks].reverse().map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-500">{fmtClock(m.atSeconds)}</span>
                    <Input
                      defaultValue={m.note ?? ""}
                      placeholder="what happened? (helps you find it later)"
                      className="h-8 border-0 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600"
                      onBlur={(e) => {
                        if (e.target.value !== (m.note ?? "")) void saveNote(m.id, e.target.value);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-3">
            <div className="flex rounded-lg bg-zinc-900 p-1">
              {([
                ["layout", "Layout", LayoutGrid],
                ["prompter", "Prompter", Type],
              ] as ["layout" | "prompter", string, React.ElementType][]).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setRailTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    railTab === id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {railTab === "layout" ? (
              <div className="space-y-2">
                {STUDIO_LAYOUTS.map((l) => {
                  const needsBoth = l.id !== "fullscreen";
                  const dimmed = needsBoth && !(cameraOn && screenOn);
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                        layout === l.id
                          ? "border-primary bg-primary/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                      } ${dimmed ? "opacity-50" : ""}`}
                    >
                      <p className="text-sm font-semibold text-zinc-100">{l.label}</p>
                      <p className="text-[11px] text-zinc-500">
                        {dimmed ? "Needs camera + screen" : l.hint}
                      </p>
                    </button>
                  );
                })}
                <p className="px-1 text-[10px] leading-relaxed text-zinc-600">
                  Layouts are baked into the recording — switch them live and the file follows.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 rounded-xl bg-zinc-900 p-3">
                <label className="flex cursor-pointer items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">Teleprompter</span>
                  <button
                    onClick={() => setPrompterOn(!prompterOn)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${prompterOn ? "bg-emerald-500" : "bg-zinc-700"}`}
                    aria-label="Toggle teleprompter"
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prompterOn ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </label>
                <Textarea
                  value={prompterScript}
                  onChange={(e) => setPrompterScript(e.target.value)}
                  placeholder="Enter your script here…"
                  rows={7}
                  className="border-zinc-700 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600"
                />
                <select
                  value={prompterSpeed}
                  onChange={(e) => setPrompterSpeed(e.target.value as PrompterSpeed)}
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-zinc-200"
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
                <p className="text-[10px] text-zinc-600">Scrolls over the stage — visible to you, not in the recording.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ After the show ═══ */}
      {isLoading ? null : endedWithMarks && !liveNow ? (
        <div className="mt-3 space-y-3 rounded-2xl bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100">
            Last show: {marks.length} marked moment{marks.length === 1 ? "" : "s"}
          </p>
          {uploadingVod && (
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Loader2 size={12} className="animate-spin" /> Uploading your recording — the VOD attaches itself when it lands.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Recorded in the studio? The VOD fills itself. Streamed elsewhere? Paste the recording's direct video URL —
            each mark becomes a real clip in your{" "}
            <Link href="/media-library" className="font-medium text-zinc-300 underline">Media Library</Link>.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://…/recording.mp4"
              value={vodUrl}
              onChange={(e) => setVodUrl(e.target.value)}
              className="flex-1 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
            <Input
              placeholder="offset s"
              value={vodOffset}
              onChange={(e) => setVodOffset(e.target.value)}
              className="w-24 border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <ul className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
            {marks.map((m) => (
              <li key={m.id} className="flex items-center gap-3 bg-zinc-900 px-3 py-2">
                <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-500">{fmtClock(m.atSeconds)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{m.note || "(no note)"}</span>
                {m.clipStatus === "ready" ? (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400">In your library ✓</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                      onClick={() => void generateCaptions(m)}
                      disabled={captionBusyId !== null}
                    >
                      {captionBusyId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <FileText className="mr-1 h-3 w-3" />
                          Captions
                        </>
                      )}
                    </Button>
                  </span>
                ) : m.clipStatus === "failed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                    onClick={() => void cutMark(m)}
                    disabled={!!cuttingId || !vodUrl.trim()}
                  >
                    Retry
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 shrink-0 text-xs"
                    onClick={() => void cutMark(m)}
                    disabled={!vodUrl.trim() || !!cuttingId}
                  >
                    {cuttingId === m.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Scissors className="mr-1 h-3 w-3" />
                        Cut clip
                      </>
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {captions && (
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Captions — {fmtClock(marks.find((m) => m.id === captions.markId)?.atSeconds ?? 0)} clip
              </p>
              <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">
                {captions.text || "(no speech detected)"}
              </p>
              {captions.segments.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                    onClick={() => downloadText("clip.srt", generateSrt(captions.segments))}
                  >
                    <Download className="mr-1 h-3 w-3" /> .srt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                    onClick={() => downloadText("clip.vtt", generateVtt(captions.segments))}
                  >
                    <Download className="mr-1 h-3 w-3" /> .vtt
                  </Button>
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-zinc-600">
            Each cut is a 30-second clip ({PRE_ROLL}s back from the mark, 10s forward) — about a minute of the plan's
            monthly FFmpeg allowance. Captions run on Whisper. All in-house.
          </p>
        </div>
      ) : null}
    </div>
  );
}
