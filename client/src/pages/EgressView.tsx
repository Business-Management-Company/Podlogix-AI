import { useEffect, useRef } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";
import EgressHelper from "@livekit/egress-sdk";
import { StudioCompositor, type StudioLayout } from "@/lib/studio-compositor";
import type { LayoutMessage } from "@/lib/live-room";

const LAYOUT_IDS: StudioLayout[] = ["fullscreen", "pip-br", "pip-bl", "pip-tr", "pip-tl", "split"];
const isLayout = (v: string): v is StudioLayout => (LAYOUT_IDS as string[]).includes(v);

/**
 * /studio/egress-view — the page LiveKit Egress records (headless Chrome).
 *
 * NOT a normal app page: it's loaded by LiveKit's egress renderer with
 * ?url=<ws>&token=<jwt>&layout=<name> appended. It joins the room as a
 * subscriber, routes each participant's tracks into the same StudioCompositor
 * the live stage uses (host camera/screen, guest camera), and renders the
 * composed canvas full-viewport at 1080p — so the cloud recording matches the
 * studio look. Audio tracks play through <audio> so egress captures them.
 *
 * Public + unauthenticated: the egress renderer has no Podlogix session; the
 * LiveKit token in the URL is its only credential (subscribe-only).
 */
export default function EgressView() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("url");
    const token = params.get("token");
    if (!url || !token) return;

    const comp = new StudioCompositor({ width: 1920, height: 1080 });
    // Start on the adaptive default (solo → full, host+guest → side-by-side,
    // +screen → screen-forward); the host broadcasts the real layout over the
    // data channel (below), including a replay when we join mid-session.
    comp.setLayout("fullscreen");
    if (stageRef.current) {
      comp.canvas.style.width = "100vw";
      comp.canvas.style.height = "100vh";
      comp.canvas.style.objectFit = "contain";
      stageRef.current.appendChild(comp.canvas);
    }

    const audioEls = new Map<string, HTMLAudioElement>();
    const isHost = (p: RemoteParticipant) => p.identity.startsWith("host-");
    const streamOf = (track: RemoteTrack) => {
      const s = new MediaStream();
      s.addTrack(track.mediaStreamTrack);
      return s;
    };

    const attach = (track: RemoteTrack, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        // Route audio to a real element so the page outputs it → egress captures.
        const el = track.attach();
        el.autoplay = true;
        (el as HTMLAudioElement).muted = false;
        el.style.display = "none";
        document.body.appendChild(el);
        audioEls.set(track.mediaStreamTrack.id, el as HTMLAudioElement);
        return;
      }
      if (track.kind !== Track.Kind.Video) return;
      if (isHost(participant)) {
        if (track.source === Track.Source.ScreenShare) comp.setScreen(streamOf(track));
        else comp.setCamera(streamOf(track));
      } else {
        comp.setGuest(streamOf(track));
      }
    };

    const detach = (track: RemoteTrack, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = audioEls.get(track.mediaStreamTrack.id);
        if (el) { track.detach(el); el.remove(); audioEls.delete(track.mediaStreamTrack.id); }
        return;
      }
      if (track.kind !== Track.Kind.Video) return;
      if (isHost(participant)) {
        if (track.source === Track.Source.ScreenShare) comp.setScreen(null);
        else comp.setCamera(null);
      } else {
        comp.setGuest(null);
      }
    };

    const room = new Room({ adaptiveStream: false, dynacast: false });
    // EgressHelper coordinates with LiveKit's recorder; startRecording()
    // signals the page is ready so the capture doesn't include the load frames.
    EgressHelper.setRoom(room);
    const onData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as LayoutMessage;
        if (msg?.type === "layout" && typeof msg.layout === "string" && isLayout(msg.layout)) {
          comp.setLayout(msg.layout);
        }
      } catch {
        /* not our message — ignore */
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) =>
        attach(track, participant),
      )
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) =>
        detach(track, participant),
      )
      .on(RoomEvent.DataReceived, onData);

    void room.connect(url, token).then(() => {
      // Pick up tracks published before we subscribed.
      room.remoteParticipants.forEach((p) =>
        p.trackPublications.forEach((pub) => {
          if (pub.track) attach(pub.track as RemoteTrack, p);
        }),
      );
      EgressHelper.startRecording();
    });

    return () => {
      audioEls.forEach((el) => el.remove());
      comp.dispose();
      void room.disconnect();
    };
  }, []);

  return <div ref={stageRef} style={{ width: "100vw", height: "100vh", background: "#09090b", overflow: "hidden" }} />;
}
