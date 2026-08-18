import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Camera, CameraOff, CheckCircle2, Circle, Clapperboard, Clock, Download, FileText,
  LayoutGrid, Loader2, Mic, MicOff, MonitorUp, Plus, Radio, Scissors, Sparkles, Square, Trash2,
  Type, UserPlus, XCircle,
} from "lucide-react";
import { LiveRoom, type RemoteFeed } from "@/lib/live-room";
import { extractAudioAsWav } from "@/lib/audio-extraction";
import { generateSrt, generateVtt, downloadText, type CaptionSegment } from "@/lib/captions";
import { StudioCompositor, STUDIO_LAYOUTS, type StudioLayout } from "@/lib/studio-compositor";
import type { LiveMark, LiveSession, Studio, StudioScene } from "@shared/schema";

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

/** Miniature of what each layout does — faster to read than words. */
function LayoutThumb({ id }: { id: StudioLayout }) {
  const big = "absolute inset-0 rounded-[3px] bg-zinc-600";
  const pip = "absolute h-[38%] w-[34%] rounded-[2px] bg-zinc-300";
  return (
    <span className="relative block h-8 w-14 shrink-0 overflow-hidden rounded-[4px] bg-zinc-800 ring-1 ring-zinc-700">
      {id === "fullscreen" && <span className={big} />}
      {id.startsWith("pip") && (
        <>
          <span className={big} />
          <span
            className={`${pip} ${id.endsWith("r") ? "right-[6%]" : "left-[6%]"} ${
              id.startsWith("pip-b") ? "bottom-[8%]" : "top-[8%]"
            }`}
          />
        </>
      )}
      {id === "split" && (
        <>
          <span className="absolute bottom-0 left-0 top-0 w-[49%] rounded-[2px] bg-zinc-600" />
          <span className="absolute bottom-0 right-0 top-0 w-[49%] rounded-[2px] bg-zinc-400" />
        </>
      )}
    </span>
  );
}

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
  const [railTab, setRailTab] = useState<"media" | "prompter">("media");

  // ── Scenes (Restream-style): named stage presets — layout + optional media ──
  const [sceneName, setSceneName] = useState("");
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // ── Media on the stage (play a video / show an image from the library) ──
  const mediaElRef = useRef<HTMLVideoElement | null>(null);
  const [stageMedia, setStageMedia] = useState<{ url: string; type: "video" | "image"; caption: string } | null>(null);
  const [mediaPaused, setMediaPaused] = useState(false);

  // ── Studios (named rooms) ──
  const [, navigate] = useLocation();
  const [activeStudioId, setActiveStudioId] = useState<string | null>(
    () => localStorage.getItem("podlogix.studio") || null,
  );
  const [newStudioName, setNewStudioName] = useState("");
  const [view, setView] = useState<"stage" | "edit">("stage");
  // Right panel width — drag its left edge to resize (persisted per browser).
  const [railWidth, setRailWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem("podlogix.studio.rail"));
    return saved >= 220 && saved <= 480 ? saved : 280;
  });
  const railDrag = useRef<{ startX: number; startW: number } | null>(null);

  const onRailDragStart = (e: React.PointerEvent) => {
    railDrag.current = { startX: e.clientX, startW: railWidth };
    const onMove = (ev: PointerEvent) => {
      if (!railDrag.current) return;
      const w = Math.min(480, Math.max(220, railDrag.current.startW + (railDrag.current.startX - ev.clientX)));
      setRailWidth(w);
    };
    const onUp = () => {
      railDrag.current = null;
      setRailWidth((w) => { localStorage.setItem("podlogix.studio.rail", String(w)); return w; });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── Teleprompter ──
  const [prompterOn, setPrompterOn] = useState(false);
  const [prompterScript, setPrompterScript] = useState("");
  const [prompterSpeed, setPrompterSpeed] = useState<PrompterSpeed>("normal");

  // ── AI moment detection ──
  // ── Post-production pipeline (the Refiner) ──
  type StepState = "idle" | "running" | "done" | "failed";
  const [pipeline, setPipeline] = useState<{ transcribe: StepState; detect: StepState; refine: StepState }>({
    transcribe: "idle", detect: "idle", refine: "idle",
  });
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; segments: CaptionSegment[] } | null>(null);
  const [minutesSaved, setMinutesSaved] = useState<number | null>(null);
  const [clipFormat, setClipFormat] = useState<"wide" | "vertical">("wide");

  // ── Captions ──
  const [captionBusyId, setCaptionBusyId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<{ markId: string; text: string; segments: CaptionSegment[] } | null>(null);

  // ── Guest room (LiveKit) ──
  const liveRoomRef = useRef<LiveRoom | null>(null);
  const [guestFeed, setGuestFeed] = useState<RemoteFeed>({ stream: null, name: "" });
  const [inviteBusy, setInviteBusy] = useState(false);

  const { data, isLoading } = useQuery<{ session: LiveSession | null; marks: LiveMark[] }>({
    queryKey: ["/api/live/current"],
  });
  const { data: studiosData } = useQuery<{ studios: Studio[] }>({ queryKey: ["/api/studios"] });
  const studios = studiosData?.studios ?? [];
  const activeStudio = studios.find((s) => s.id === activeStudioId) ?? null;

  const { data: scenesData } = useQuery<{ scenes: StudioScene[] }>({
    queryKey: ["/api/studios", activeStudioId, "scenes"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/studios/${activeStudioId}/scenes`);
      return res.json();
    },
    enabled: !!activeStudioId,
  });
  const scenes = scenesData?.scenes ?? [];

  const session = data?.session ?? null;
  const marks = data?.marks ?? [];
  const liveNow = !!session && !session.endedAt;
  const guestOn = !!guestFeed.stream;
  const mediaOn = !!stageMedia;
  const anySource = cameraOn || screenOn || guestOn || mediaOn;

  const { data: libraryData } = useQuery<{ items: Array<{ id: string; caption: string | null; mediaType: string | null; mediaUrl: string | null; platform: string }> }>({
    queryKey: ["/api/media-library"],
    retry: false,
  });
  const stageableMedia = (libraryData?.items ?? []).filter(
    (i) => i.mediaUrl && (i.mediaType === "video" || i.mediaType === "image"),
  );

  const { data: lkStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/live/livekit-status"],
    retry: false,
  });
  const guestRoomsReady = !!lkStatus?.configured;

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

  useEffect(() => {
    if (activeStudioId) localStorage.setItem("podlogix.studio", activeStudioId);
    else localStorage.removeItem("podlogix.studio");
  }, [activeStudioId]);

  // A show already on the air pulls you straight into its studio.
  useEffect(() => {
    if (liveNow && session?.studioId && session.studioId !== activeStudioId) {
      setActiveStudioId(session.studioId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveNow, session?.studioId]);

  const createStudioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/studios", { name: newStudioName.trim() });
      if (!res.ok) throw new Error("create failed");
      return res.json();
    },
    onSuccess: (data: { studio: Studio }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios"] });
      setNewStudioName("");
      setActiveStudioId(data.studio.id);
    },
    onError: () => toast({ title: "Couldn't create the studio", variant: "destructive" }),
  });

  const deleteStudioMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/studios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/studios"] }),
    onError: () => toast({ title: "Couldn't delete the studio", variant: "destructive" }),
  });

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

  const clearStageMedia = () => {
    mediaElRef.current?.pause();
    mediaElRef.current = null;
    compositorRef.current?.setMediaVideo(null);
    compositorRef.current?.setMediaImage(null);
    setStageMedia(null);
    setMediaPaused(false);
  };

  const playOnStage = (item: { caption: string | null; mediaType: string | null; mediaUrl: string | null; platform: string }) => {
    if (!item.mediaUrl) return;
    clearStageMedia();
    if (item.mediaType === "video") {
      const el = document.createElement("video");
      el.crossOrigin = "anonymous";
      el.src = item.mediaUrl;
      el.onended = () => setMediaPaused(true);
      void el.play().catch(() => {});
      mediaElRef.current = el;
      compositor().setMediaVideo(el);
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => compositor().setMediaImage(img);
      img.src = item.mediaUrl;
    }
    setStageMedia({ url: item.mediaUrl, type: item.mediaType === "video" ? "video" : "image", caption: item.caption || item.platform });
    setMediaPaused(false);
  };

  const toggleStageMediaPause = () => {
    const el = mediaElRef.current;
    if (!el) return;
    if (el.paused) { void el.play().catch(() => {}); setMediaPaused(false); }
    else { el.pause(); setMediaPaused(true); }
  };

  const addSceneMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/studios/${activeStudioId}/scenes`, {
        name: sceneName.trim(),
        layout,
        mediaUrl: stageMedia?.url ?? null,
        mediaType: stageMedia?.type ?? null,
      });
      if (!res.ok) throw new Error("save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/studios", activeStudioId, "scenes"] });
      setSceneName("");
      toast({ title: "Scene saved", description: "It captured the current layout and media." });
    },
    onError: () => toast({ title: "Couldn't save the scene", variant: "destructive" }),
  });

  const deleteSceneMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/studios/scenes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/studios", activeStudioId, "scenes"] }),
  });

  // One click sets the whole stage: layout + media together.
  const applyScene = (s: StudioScene) => {
    setLayout(s.layout as StudioLayout);
    compositor().setLayout(s.layout as StudioLayout);
    if (s.mediaUrl) {
      playOnStage({ caption: s.name, mediaType: s.mediaType, mediaUrl: s.mediaUrl, platform: "scene" });
    } else {
      clearStageMedia();
    }
    setActiveSceneId(s.id);
  };

  const stopAllSources = () => {
    clearStageMedia();
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    compositorRef.current?.setCamera(null);
    compositorRef.current?.setScreen(null);
    setCameraOn(false);
    setScreenOn(false);
  };

  // ── Guest room ──
  const leaveGuestRoom = () => {
    void liveRoomRef.current?.disconnect();
    liveRoomRef.current = null;
    compositorRef.current?.setGuest(null);
    setGuestFeed({ stream: null, name: "" });
  };

  const inviteGuest = async () => {
    if (!activeStudio) return;
    setInviteBusy(true);
    try {
      const linkRes = await apiRequest("POST", `/api/studios/${activeStudio.id}/guest-link`, {});
      const link = await linkRes.json().catch(() => ({}));
      if (!linkRes.ok) throw new Error(link.message || "Couldn't create the guest link");

      // Join the room ourselves (once) so the guest lands on a live stage —
      // works before the show starts: prep together, then go live.
      if (!liveRoomRef.current) {
        const tokRes = await apiRequest("POST", `/api/studios/${activeStudio.id}/host-token`, {});
        const tok = await tokRes.json().catch(() => ({}));
        if (!tokRes.ok) throw new Error(tok.message || "Couldn't join the guest room");
        const room = new LiveRoom();
        liveRoomRef.current = room;
        await room.connect(tok.url, tok.token, (feed) => {
          compositor().setGuest(feed.stream);
          setGuestFeed(feed);
        });
        await room.publish(cameraStreamRef.current);
      }

      await navigator.clipboard.writeText(link.url);
      toast({ title: "Guest link copied", description: "Send it to your guest — they appear on the stage when they join, live or not." });
    } catch (e) {
      toast({
        title: "Couldn't invite a guest",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setInviteBusy(false);
    }
  };

  // Keep our published tracks in step with the camera source.
  useEffect(() => {
    if (liveRoomRef.current?.connected) void liveRoomRef.current.publish(cameraStreamRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  useEffect(() => () => {
    stopAllSources();
    leaveGuestRoom();
    compositorRef.current?.dispose();
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
      const res = await apiRequest("POST", "/api/live/sessions", {
        title: title.trim() || activeStudio?.name || "",
        studioId: activeStudio?.id,
      });
      if (!res.ok) throw new Error("start failed");
      return res.json();
    },
    onSuccess: () => {
      refresh();
      setTitle("");
      setCaptions(null);
      // A fresh show gets a fresh pipeline.
      setTranscript(null);
      setMinutesSaved(null);
      setPipeline({ transcribe: "idle", detect: "idle", refine: "idle" });
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
      leaveGuestRoom();
      if (marks.length > 0) setView("edit");
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
        format: clipFormat,
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

  // ── The Refiner: real post-production, one button. Every checkmark below
  // corresponds to an actual transformation — never a timer. ──

  const mediaDuration = (url: string, kind: "audio" | "video") =>
    new Promise<number>((resolve) => {
      const el = document.createElement(kind);
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(el.duration || 0);
      el.onerror = () => resolve(0);
      el.src = url;
    });

  const stepTranscribe = async (): Promise<{ text: string; segments: CaptionSegment[] }> => {
    if (transcript) return transcript;
    setPipeline((p) => ({ ...p, transcribe: "running" }));
    try {
      const wav = await extractAudioAsWav(vodUrl.trim());
      const tRes = await fetch("/api/social/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      const tData = await tRes.json().catch(() => ({}));
      if (!tRes.ok) throw new Error(tData.message || "Transcription failed");
      const t = { text: String(tData.text ?? ""), segments: (tData.segments ?? []) as CaptionSegment[] };
      setTranscript(t);
      setPipeline((p) => ({ ...p, transcribe: "done" }));
      return t;
    } catch (e) {
      setPipeline((p) => ({ ...p, transcribe: "failed" }));
      throw e;
    }
  };

  const stepDetect = async (t: { segments: CaptionSegment[] }) => {
    if (!session) return;
    setPipeline((p) => ({ ...p, detect: "running" }));
    try {
      const dRes = await apiRequest("POST", `/api/live/sessions/${session.id}/detect-moments`, {
        segments: t.segments,
      });
      const dData = await dRes.json().catch(() => ({}));
      if (!dRes.ok) throw new Error(dData.message || "Detection failed");
      refresh();
      setPipeline((p) => ({ ...p, detect: "done" }));
    } catch (e) {
      setPipeline((p) => ({ ...p, detect: "failed" }));
      throw e;
    }
  };

  const stepRefine = async () => {
    if (!session) return;
    setPipeline((p) => ({ ...p, refine: "running" }));
    try {
      // Same command as the Media Lab preset; keep them in step.
      const cmd = "ffmpeg -y -i {input} -vn -af silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB,loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}";
      const submit = await apiRequest("POST", "/api/media-lab/ffmpeg/jobs", {
        files: [vodUrl.trim()],
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
        title: `${session.title} \u2014 refined audio`,
      });
      const col = await collect.json().catch(() => ({}));
      if (!collect.ok) throw new Error(col.message ?? "Couldn't store the refined audio");
      // Honest math: how much dead air actually left the file.
      if (col.url) {
        const [orig, refined] = await Promise.all([
          mediaDuration(vodUrl.trim(), "video"),
          mediaDuration(String(col.url), "audio"),
        ]);
        setMinutesSaved(orig > 0 && refined > 0 && orig > refined ? (orig - refined) / 60 : 0);
      }
      setPipeline((p) => ({ ...p, refine: "done" }));
    } catch (e) {
      setPipeline((p) => ({ ...p, refine: "failed" }));
      throw e;
    }
  };

  const runPipeline = async () => {
    if (!session || !vodUrl.trim() || pipelineBusy) return;
    setPipelineBusy(true);
    try {
      const t = await stepTranscribe();
      await stepDetect(t);
      await stepRefine();
      toast({ title: "Post-production complete", description: "Moments marked, audio refined \u2014 cut the keepers below." });
    } catch (e) {
      toast({
        title: "The pipeline stopped",
        description: e instanceof Error ? e.message.replace(/^\d{3}:\s*/, "") : undefined,
        variant: "destructive",
      });
    } finally {
      setPipelineBusy(false);
    }
  };

  const FILLER_RE = /\b(um+|uh+|erm|hmm+|you know|i mean)\b/gi;
  const fillersFound = transcript ? (transcript.text.match(FILLER_RE) ?? []).length : null;
  const wordsTranscribed = transcript ? transcript.text.split(/\s+/).filter(Boolean).length : null;
  const clipsReady = marks.filter((m) => m.clipStatus === "ready").length;

  const endedWithMarks = !!session?.endedAt && marks.length > 0;

  // Stage is home. The frame only swaps to the Editing Room at the moment a
  // show ends (see endMutation) — never on page load.
  const prompterDuration = Math.max(
    12,
    Math.round(prompterScript.split(/\s+/).filter(Boolean).length / PROMPTER_SPEEDS[prompterSpeed])
  );

  return (
    <div className="w-full p-3">
      <style>{`@keyframes prompter-scroll { from { transform: translateY(100%); } to { transform: translateY(-100%); } }`}</style>

      {/* The only chrome in the studio: the way out, where you are, and the frame toggle */}
      <div className="mb-3 flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/today")}
          className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Exit Studio
        </Button>
        {activeStudio && (
          <>
            <span className="text-zinc-700">/</span>
            <button
              onClick={() => setActiveStudioId(null)}
              disabled={liveNow}
              className="rounded px-1.5 py-0.5 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              Studios
            </button>
            <span className="text-zinc-700">/</span>
            <span className="px-1 text-sm font-semibold text-zinc-100">{activeStudio.name}</span>
          </>
        )}
        <div className="flex-1" />
        {activeStudio && (
          <div className="mr-2 flex items-center gap-1 rounded-lg bg-zinc-900 p-0.5" title="Streaming out to YouTube/Twitch is on the roadmap">
            <span className="rounded-md bg-zinc-700 px-2.5 py-1 text-[11px] font-medium text-white">Record Only</span>
            <span className="cursor-not-allowed rounded-md px-2.5 py-1 text-[11px] font-medium text-zinc-600">Stream + Record</span>
          </div>
        )}
        {activeStudio && endedWithMarks && !liveNow && (
          <div className="flex rounded-lg bg-zinc-900 p-0.5">
            {(["stage", "edit"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {v === "stage" ? "Stage" : "Editing Room"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Studio lobby — pick a room or build one ═══ */}
      {!activeStudio && (
        <div className="rounded-2xl bg-zinc-950 p-6 ring-1 ring-zinc-800/60">
          <div className="mx-auto max-w-2xl space-y-6 py-10">
            <div className="text-center">
              <Radio className="mx-auto h-8 w-8 text-red-500" />
              <h1 className="mt-2 text-xl font-semibold text-zinc-100">Your studios</h1>
              <p className="mt-1 text-sm text-zinc-500">
                A studio is a room you come back to — name it after the show it hosts.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newStudioName}
                onChange={(e) => setNewStudioName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newStudioName.trim()) createStudioMutation.mutate(); }}
                placeholder="New studio name — e.g. The Morning Desk"
                className="flex-1 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
              />
              <Button
                onClick={() => createStudioMutation.mutate()}
                disabled={!newStudioName.trim() || createStudioMutation.isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {createStudioMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Create studio
              </Button>
            </div>
            {studios.length === 0 ? (
              <p className="text-center text-sm text-zinc-600">No studios yet — create your first one above.</p>
            ) : (
              <ul className="space-y-2">
                {studios.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <Radio className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{s.name}</span>
                    <Button size="sm" className="h-8" onClick={() => setActiveStudioId(s.id)}>
                      Enter
                    </Button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete “${s.name}”? Past recordings and clips stay in your library.`)) {
                          deleteStudioMutation.mutate(s.id);
                        }
                      }}
                      className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      aria-label={`Delete ${s.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ═══ The studio room — full frame, no chrome ═══ */}
      {activeStudio && view === "stage" && (
      <div className="rounded-2xl bg-zinc-950 p-4 shadow-2xl ring-1 ring-zinc-800/60">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Scenes — one-click stage presets, Restream-style */}
          <div
            className="w-full shrink-0 space-y-2 max-lg:!w-full"
            style={{ width: Math.round(Math.min(240, Math.max(128, railWidth * 0.55))) }}
          >
            <div className="flex gap-1.5">
              <Input
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && sceneName.trim()) addSceneMutation.mutate(); }}
                placeholder="Scene name"
                className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                onClick={() => sceneName.trim() && addSceneMutation.mutate()}
                disabled={!sceneName.trim() || addSceneMutation.isPending}
                title="Save the current stage (layout + media) as a scene"
                className="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-40"
              >
                {addSceneMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
            {scenes.length === 0 ? (
              <p className="rounded-xl bg-zinc-900 p-2.5 text-[10px] leading-relaxed text-zinc-600">
                Set the stage how you like it (layout + media), name it, and hit +. Countdown, Welcome, Outro —
                one click each during the show.
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
                {scenes.map((s) => (
                  <div
                    key={s.id}
                    className={`group relative w-36 shrink-0 lg:w-full ${""}`}
                  >
                    <button
                      onClick={() => applyScene(s)}
                      className={`w-full overflow-hidden rounded-xl border text-left transition-colors ${
                        activeSceneId === s.id ? "border-primary ring-1 ring-primary" : "border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      {s.mediaUrl ? (
                        s.mediaType === "video" ? (
                          <video src={s.mediaUrl} muted className="h-16 w-full bg-black object-cover" />
                        ) : (
                          <img src={s.mediaUrl} alt="" className="h-16 w-full bg-black object-cover" />
                        )
                      ) : (
                        <div className="flex h-16 w-full items-center justify-center bg-zinc-900">
                          <LayoutThumb id={s.layout as StudioLayout} />
                        </div>
                      )}
                      <p className="truncate bg-zinc-900 px-2 py-1.5 text-[11px] font-medium text-zinc-200">{s.name}</p>
                    </button>
                    <button
                      onClick={() => deleteSceneMutation.mutate(s.id)}
                      className="absolute right-1 top-1 hidden rounded-full bg-black/70 p-1 text-zinc-400 hover:text-red-400 group-hover:block"
                      aria-label={`Delete scene ${s.name}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage column */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* The largest 16:9 picture that fits — proportionate at any panel width */}
            <div
              className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl bg-zinc-900"
              style={{ maxWidth: "calc((100vh - 320px) * 16 / 9)" }}
              ref={stageRef}
            >
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
              {guestOn && (
                <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
                  <UserPlus className="h-3 w-3" /> {guestFeed.name || "Guest"} is on the stage
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

            {/* Layouts — under the stage, Restream-style: minis, no words */}
            <div className="mx-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-900 p-2" style={{ maxWidth: "calc((100vh - 320px) * 16 / 9)" }}>
              {STUDIO_LAYOUTS.map((l) => {
                const sources = [cameraOn, screenOn, guestOn, mediaOn].filter(Boolean).length;
                const dimmed = l.id !== "fullscreen" && sources < 2;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id)}
                    title={dimmed ? `${l.label} — needs a second source (screen, media, or guest)` : l.label}
                    aria-label={l.label}
                    className={`rounded-lg p-1 ring-1 transition-all ${
                      layout === l.id ? "ring-primary" : "ring-transparent hover:ring-zinc-600"
                    } ${dimmed ? "opacity-40" : ""}`}
                  >
                    <LayoutThumb id={l.id} />
                  </button>
                );
              })}
            </div>

            {/* Control bar — icons carry it; hover for names */}
            <div className="mx-auto flex w-full flex-wrap items-center gap-2 rounded-xl bg-zinc-900 p-3" style={{ maxWidth: "calc((100vh - 320px) * 16 / 9)" }}>
              <button
                onClick={toggleCamera}
                title={cameraOn ? "Stop camera" : "Start camera"}
                aria-label={cameraOn ? "Stop camera" : "Start camera"}
                className={`rounded-full p-2.5 transition-colors ${
                  cameraOn ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <Camera size={17} />
              </button>
              <button
                onClick={toggleScreen}
                title={screenOn ? "Stop sharing" : "Share screen"}
                aria-label={screenOn ? "Stop sharing" : "Share screen"}
                className={`rounded-full p-2.5 transition-colors ${
                  screenOn ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <MonitorUp size={17} />
              </button>
              {guestRoomsReady && (
                <button
                  onClick={() => void inviteGuest()}
                  disabled={inviteBusy}
                  title={guestOn ? "Guest connected — copy the link again" : "Invite a guest (copies the link)"}
                  aria-label="Invite a guest"
                  className={`rounded-full p-2.5 transition-colors disabled:opacity-50 ${
                    guestOn ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {inviteBusy ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />}
                </button>
              )}

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
                <>
                  <Button
                    onClick={() => void clip()}
                    className={`transition-all ${flash ? "bg-emerald-500 text-white hover:bg-emerald-500" : ""}`}
                  >
                    <Scissors className="mr-1.5 h-4 w-4" />
                    {flash ? "Marked!" : "Mark moment"}
                    <span className="ml-1.5 rounded bg-white/20 px-1 text-[10px] font-semibold">space</span>
                  </Button>
                  <Button
                    onClick={() => endMutation.mutate()}
                    disabled={endMutation.isPending}
                    variant="outline"
                    className="border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-800"
                  >
                    <Square className="mr-2 h-4 w-4" /> End show ({marks.length} marked)
                  </Button>
                </>
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

          {/* Drag the edge to give the stage or the panel more room */}
          <div
            onPointerDown={onRailDragStart}
            className="hidden w-1.5 shrink-0 cursor-col-resize rounded-full bg-zinc-800/70 transition-colors hover:bg-zinc-600 lg:block"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
          />
          {/* Right rail */}
          <div className="shrink-0 space-y-3 max-lg:!w-full" style={{ width: railWidth }}>
            <div className="flex rounded-lg bg-zinc-900 p-1">
              {([
                ["media", "Media", Clapperboard],
                ["prompter", "Prompter", Type],
              ] as ["media" | "prompter", string, React.ElementType][]).map(([id, label, Icon]) => (
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

            {railTab === "media" ? (
              <div className="space-y-2">
                <a
                  href="/media-library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
                >
                  <Plus size={13} /> Add media — opens your library in a new tab
                </a>
                {stageMedia && (
                  <div className="space-y-2 rounded-xl border border-primary/40 bg-zinc-900 p-3">
                    <p className="truncate text-xs font-semibold text-zinc-100">On the stage: {stageMedia.caption}</p>
                    <div className="flex gap-2">
                      {stageMedia.type === "video" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 flex-1 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                          onClick={toggleStageMediaPause}
                        >
                          {mediaPaused ? "Play" : "Pause"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 border-zinc-700 bg-transparent text-xs text-zinc-200 hover:bg-zinc-800"
                        onClick={clearStageMedia}
                      >
                        Clear stage
                      </Button>
                    </div>
                  </div>
                )}
                {stageableMedia.length === 0 ? (
                  <p className="rounded-xl bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-500">
                    Nothing in your library yet — recordings, clips, and anything you add via Media Library land here,
                    ready to play on the stage.
                  </p>
                ) : (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {stageableMedia.slice(0, 20).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => playOnStage(item)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                          stageMedia?.url === item.mediaUrl
                            ? "border-primary bg-primary/10"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-600"
                        }`}
                      >
                        {item.mediaType === "video" ? (
                          <video src={item.mediaUrl!} muted className="h-10 w-16 shrink-0 rounded bg-black object-cover" />
                        ) : (
                          <img src={item.mediaUrl!} alt="" className="h-10 w-16 shrink-0 rounded bg-black object-cover" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-zinc-100">{item.caption || item.platform}</span>
                          <span className="block text-[10px] text-zinc-500">{item.mediaType === "video" ? "Play on stage" : "Show on stage"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="px-1 text-[10px] leading-relaxed text-zinc-600">
                  Media takes the big slot — your camera goes picture-in-picture. Audio is in the mix and the recording.
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
      )}

      {/* ═══ Editing Room — same frame, swapped in ═══ */}
      {isLoading ? null : activeStudio && view === "edit" && endedWithMarks && !liveNow ? (
        <div className="space-y-3 rounded-2xl bg-zinc-950 p-4 ring-1 ring-zinc-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Editing Room</p>
              <p className="text-xs text-zinc-500">
                Last show · {marks.length} moment{marks.length === 1 ? "" : "s"} · cut clips land in your{" "}
                <Link href="/media-library" className="text-zinc-300 underline">Media Library</Link>
              </p>
            </div>
            <Button
              onClick={() => void runPipeline()}
              disabled={pipelineBusy || !vodUrl.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {pipelineBusy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Refining your show…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Refine my show
                </>
              )}
            </Button>
          </div>

          {/* The pipeline — every checkmark is a real transformation */}
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["transcribe", "Transcription", "Whisper listens to the whole show"],
              ["detect", "Find the moments", "AI marks the clip-worthy parts"],
              ["refine", "Refine audio", "Dead air cut, loudness mastered"],
            ] as const).map(([key, label, sub]) => {
              const state = pipeline[key];
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    state === "done"
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : state === "failed"
                        ? "border-red-500/40 bg-red-500/5"
                        : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  {state === "running" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-300" />
                  ) : state === "done" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : state === "failed" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-zinc-700" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-zinc-100">{label}</span>
                    <span className="block truncate text-[10px] text-zinc-500">{sub}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Honest numbers — computed from the actual files, or not shown */}
          {(transcript || minutesSaved !== null || clipsReady > 0) && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ["Minutes saved", minutesSaved !== null ? minutesSaved.toFixed(1) : "\u2014"],
                ["Fillers heard", fillersFound !== null ? String(fillersFound) : "\u2014"],
                ["Words transcribed", wordsTranscribed !== null ? wordsTranscribed.toLocaleString() : "\u2014"],
                ["Clips ready", String(clipsReady)],
              ] as const).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-center">
                  <p className="text-lg font-bold tabular-nums text-zinc-100">{value}</p>
                  <p className="text-[10px] font-medium text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          )}
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
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg bg-zinc-900 p-0.5" title="Applies to the next clips you cut">
              {([["wide", "16:9"], ["vertical", "9:16 vertical"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setClipFormat(id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    clipFormat === id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
