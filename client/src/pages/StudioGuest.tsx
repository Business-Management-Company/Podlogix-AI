import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, CameraOff, Loader2, LogOut, Mic, MicOff, Radio } from "lucide-react";
import { LiveRoom, type RemoteFeed } from "@/lib/live-room";

/**
 * /studio/guest?code=… — the guest's side of a Live Studio show. Public: the
 * invite code IS the credential. Green room (name + camera check) first, then
 * the room: host on the big tile, you in the corner. The host's compositor
 * decides how you appear in the recording.
 */

export default function StudioGuest() {
  const code = new URLSearchParams(window.location.search).get("code") ?? "";
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"lobby" | "joining" | "in">("lobby");
  const [error, setError] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState("");
  const [host, setHost] = useState<RemoteFeed>({ stream: null, name: "" });
  const [micMuted, setMicMuted] = useState(false);
  const [camHidden, setCamHidden] = useState(false);

  const roomRef = useRef<LiveRoom | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const selfVideoRef = useRef<HTMLVideoElement | null>(null);
  const hostVideoRef = useRef<HTMLVideoElement | null>(null);

  // Green-room camera preview as soon as we land.
  useEffect(() => {
    let cancelled = false;
    void navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (selfVideoRef.current) selfVideoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera and microphone access is needed to join the show."));
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      void roomRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (hostVideoRef.current) hostVideoRef.current.srcObject = host.stream;
  }, [host.stream]);

  useEffect(() => {
    if (selfVideoRef.current && localStreamRef.current) {
      selfVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [phase]);

  const join = async () => {
    if (!name.trim() || !localStreamRef.current) return;
    setPhase("joining");
    setError(null);
    try {
      const res = await fetch("/api/live/guest/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't join the room");
      const room = new LiveRoom();
      roomRef.current = room;
      await room.connect(data.url, data.token, setHost);
      await room.publishCamera(localStreamRef.current);
      setRoomTitle(data.roomTitle || "Live show");
      setPhase("in");
    } catch (e) {
      setPhase("lobby");
      setError(e instanceof Error ? e.message : "Couldn't join the room");
    }
  };

  const leave = async () => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setHost({ stream: null, name: "" });
    setPhase("lobby");
  };

  const toggleMic = () => {
    const next = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMicMuted(next);
  };

  const toggleCam = () => {
    const next = !camHidden;
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCamHidden(next);
  };

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
        <p className="text-sm text-zinc-400">This guest link is missing its invite code — ask the host for a fresh link.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 p-4">
      {phase !== "in" ? (
        /* ── Green room ── */
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-zinc-100">
            <Radio className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-semibold">You're invited to a live show</h1>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900">
            <video ref={selfVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          </div>
          <div className="flex w-full gap-2">
            <Input
              placeholder="Your name (shown on the show)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void join(); }}
              className="flex-1 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
            />
            <Button
              onClick={() => void join()}
              disabled={phase === "joining" || !name.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {phase === "joining" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Radio className="mr-1.5 h-4 w-4" />}
              Join the show
            </Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-center text-xs text-zinc-600">
            Check your hair, pick your name, then join — the host controls how you appear on the stage.
          </p>
        </div>
      ) : (
        /* ── In the room ── */
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100">{roomTitle}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> ON THE SHOW
            </span>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900">
            {host.stream ? (
              <video ref={hostVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                <p className="text-sm text-zinc-500">Waiting for the host's picture…</p>
              </div>
            )}
            {host.name && (
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white">
                {host.name}
              </span>
            )}
            <div className="absolute bottom-3 right-3 aspect-video w-40 overflow-hidden rounded-lg border border-white/30 bg-black shadow-lg">
              <video ref={selfVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={toggleMic}
              className={`rounded-full p-3 transition-colors ${micMuted ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
              aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button
              onClick={toggleCam}
              className={`rounded-full p-3 transition-colors ${camHidden ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
              aria-label={camHidden ? "Show camera" : "Hide camera"}
            >
              {camHidden ? <CameraOff size={18} /> : <Camera size={18} />}
            </button>
            <Button variant="outline" onClick={() => void leave()} className="ml-2 border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800">
              <LogOut className="mr-1.5 h-4 w-4" /> Leave
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
