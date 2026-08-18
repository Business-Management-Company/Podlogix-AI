import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Clock, Download, FileText, Loader2, MonitorUp, Radio, Scissors, Square } from "lucide-react";
import { extractAudioAsWav } from "@/lib/audio-extraction";
import { generateSrt, generateVtt, downloadText, type CaptionSegment } from "@/lib/captions";
import type { LiveMark, LiveSession } from "@shared/schema";

/**
 * /studio/live — the Live Studio (ported from MilCrunch's Live Companion).
 *
 * The creator streams wherever they already stream. This page runs beside the
 * stream and does one job perfectly: when something good happens, smash CLIP
 * (or the spacebar) and the moment is marked. After the show, paste the VOD
 * and marks become clips in the Media Library. Deliberately no streaming
 * infrastructure — that is the plan of record.
 */

/** Clip window around a mark: people press CLIP after the good part, so the
 *  cut reaches back further than forward. Mirrored server-side. */
const PRE_ROLL = 20;

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

  // In-browser recorder (the Alchify capture core, built in-house on
  // MediaRecorder — no external video services).
  const [recordEnabled, setRecordEnabled] = useState(true);
  const [recordSource, setRecordSource] = useState<"camera" | "screen">("camera");
  const [recording, setRecording] = useState(false);
  const [uploadingVod, setUploadingVod] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  // Captions (Whisper) for a ready clip
  const [captionBusyId, setCaptionBusyId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<{ markId: string; text: string; segments: CaptionSegment[] } | null>(null);

  // A reload mid-show must never lose the clock; a reload after the show
  // must keep the cut panel. One query serves both.
  const { data, isLoading } = useQuery<{ session: LiveSession | null; marks: LiveMark[] }>({
    queryKey: ["/api/live/current"],
  });
  const session = data?.session ?? null;
  const marks = data?.marks ?? [];
  const liveNow = !!session && !session.endedAt;

  useEffect(() => {
    if (session?.vodUrl && !vodUrl) setVodUrl(session.vodUrl);
    if (session && session.vodOffsetSeconds !== 0 && vodOffset === "0") {
      setVodOffset(String(session.vodOffsetSeconds));
    }
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

  const startRecorder = async (source: "camera" | "screen") => {
    try {
      const stream = source === "camera"
        ? await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        void previewRef.current.play().catch(() => {});
      }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast({
        title: "Couldn't start the recorder",
        description: "The show clock still runs — you can attach the VOD manually after.",
        variant: "destructive",
      });
    }
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
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    recorderRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;

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
      toast({ title: "Recording attached as your VOD", description: "Cut your marked moments below — no waiting on platform processing." });
    } catch {
      toast({
        title: "Couldn't upload the recording",
        description: "You can still paste a VOD URL manually.",
        variant: "destructive",
      });
    } finally {
      setUploadingVod(false);
    }
  };

  useEffect(() => () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

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
      if (recordEnabled) void startRecorder(recordSource);
      toast({ title: "You're live on the clock", description: "Smash CLIP when something good happens." });
    },
    onError: () => toast({ title: "Couldn't start the session", variant: "destructive" }),
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

  // Spacebar = CLIP, unless typing in a field.
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
        description: recorderRef.current
          ? "Uploading your recording — the cut panel fills itself."
          : "Attach the VOD when it's up and they become clips.",
      });
    },
    onError: () => toast({ title: "Couldn't end the show", variant: "destructive" }),
  });

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

      // Poll until the kitchen says it's plated (~4s interval, 3 min cap).
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Transcription failed");
      setCaptions({ markId: mark.id, text: data.text, segments: data.segments ?? [] });
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

  return (
    <div className="w-full max-w-2xl px-6 py-8">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-950">
          <Radio className={`h-6 w-6 ${liveNow ? "animate-pulse text-red-500" : "text-zinc-400"}`} />
          Live Studio
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Keep this open next to your stream. Smash CLIP when something good happens — after the show, your moments become clips.
        </p>
      </div>

      {isLoading ? null : !liveNow ? (
        <div className="space-y-5">
          <Card padding="lg" className="text-center">
            <p className="mb-4 text-sm text-zinc-500">
              Going live on YouTube, Instagram, Twitch — anywhere? Start the clock here when you start the show.
            </p>
            <div className="mx-auto mb-3 flex max-w-md items-center justify-center gap-2">
              <button
                onClick={() => setRecordEnabled(!recordEnabled)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  recordEnabled ? "bg-zinc-950 text-white" : "border border-zinc-200 text-zinc-500"
                }`}
              >
                {recordEnabled ? "Recording in this browser" : "Record elsewhere"}
              </button>
              {recordEnabled && (
                <>
                  <button
                    onClick={() => setRecordSource("camera")}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                      recordSource === "camera" ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    <Camera size={12} /> Camera
                  </button>
                  <button
                    onClick={() => setRecordSource("screen")}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                      recordSource === "screen" ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    <MonitorUp size={12} /> Screen
                  </button>
                </>
              )}
            </div>
            <div className="mx-auto flex max-w-md gap-2">
              <Input
                placeholder="Show title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="shrink-0 bg-red-600 text-white hover:bg-red-700"
              >
                {startMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="mr-1.5 h-4 w-4" />
                )}
                Go live
              </Button>
            </div>
          </Card>

          {endedWithMarks && (
            <Card padding="lg" className="space-y-3">
              <p className="text-sm font-semibold text-zinc-950">
                Last show: {marks.length} marked moment{marks.length === 1 ? "" : "s"}
              </p>
              {uploadingVod && (
                <p className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <Loader2 size={12} className="animate-spin" /> Uploading your recording — the VOD attaches itself when it lands.
                </p>
              )}
              <p className="text-xs text-zinc-500">
                Paste the recording's direct video URL (the VOD) and each mark becomes a real clip in your{" "}
                <Link href="/media-library" className="font-medium underline">Media Library</Link>.
                If the recording starts before you pressed Go live, put those seconds in the offset.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://…/recording.mp4"
                  value={vodUrl}
                  onChange={(e) => setVodUrl(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="offset s"
                  value={vodOffset}
                  onChange={(e) => setVodOffset(e.target.value)}
                  className="w-24"
                />
              </div>
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                {marks.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 bg-white px-3 py-2">
                    <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-500">{fmtClock(m.atSeconds)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{m.note || "(no note)"}</span>
                    {m.clipStatus === "ready" ? (
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600">In your library ✓</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
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
                        className="h-7 text-xs"
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
                <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    Captions — {fmtClock(marks.find((m) => m.id === captions.markId)?.atSeconds ?? 0)} clip
                  </p>
                  <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">
                    {captions.text || "(no speech detected)"}
                  </p>
                  {captions.segments.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => downloadText("clip.srt", generateSrt(captions.segments))}
                      >
                        <Download className="mr-1 h-3 w-3" /> .srt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => downloadText("clip.vtt", generateVtt(captions.segments))}
                      >
                        <Download className="mr-1 h-3 w-3" /> .vtt
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-zinc-400">
                Each cut is a 30-second clip ({PRE_ROLL}s back from the mark, 10s forward) and spends about a minute of the plan's monthly FFmpeg allowance. Captions run on Whisper — in-house, no extra services.
              </p>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <Card padding="lg" className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /> LIVE
              </span>
              <span className="truncate text-sm font-medium text-zinc-950">{session!.title}</span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-lg tabular-nums text-zinc-950">
              <Clock className="h-4 w-4 text-zinc-400" /> {fmtClock(elapsed)}
            </span>
          </Card>

          {recording && (
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-black">
              <video
                ref={previewRef}
                muted
                playsInline
                className={`h-44 w-full object-cover ${recordSource === "camera" ? "-scale-x-100" : ""}`}
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> REC · {recordSource === "camera" ? "camera" : "screen"}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void clip()}
            className={`w-full select-none rounded-3xl py-14 text-3xl font-black tracking-wide text-white shadow-xl transition-all ${
              flash ? "scale-[0.99] bg-emerald-500" : "bg-zinc-950 hover:bg-zinc-800 active:scale-[0.99]"
            }`}
          >
            <Scissors className="mr-3 -mt-1 inline h-8 w-8" />
            {flash ? "MARKED!" : "CLIP THAT"}
          </button>
          <p className="-mt-3 text-center text-xs text-zinc-400">or hit the spacebar</p>

          {marks.length > 0 && (
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {[...marks].reverse().map((m) => (
                <li key={m.id} className="flex items-center gap-3 bg-white px-4 py-2.5">
                  <span className="shrink-0 font-mono text-sm tabular-nums text-zinc-500">{fmtClock(m.atSeconds)}</span>
                  <Input
                    defaultValue={m.note ?? ""}
                    placeholder="what happened? (helps you find it later)"
                    className="h-8 border-0 bg-zinc-50 text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== (m.note ?? "")) void saveNote(m.id, e.target.value);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="outline"
            onClick={() => endMutation.mutate()}
            disabled={endMutation.isPending}
            className="w-full"
          >
            <Square className="mr-2 h-4 w-4" /> End show ({marks.length} marked)
          </Button>
        </div>
      )}
    </div>
  );
}
