import { Room, RoomEvent, Track, type LocalTrackPublication } from "livekit-client";

/**
 * Thin wrapper around a LiveKit room for the Live Studio.
 *
 * Both ends use the same class: the host connects and receives the guest's
 * tracks as one MediaStream (fed straight into the StudioCompositor's guest
 * slot); the guest connects, publishes cam+mic, and receives the host the
 * same way. Tokens come from our server — no LiveKit secrets in the browser.
 */

export interface RemoteFeed {
  stream: MediaStream | null;
  name: string;
}

/** Data-channel messages between host and the egress renderer. */
export interface LayoutMessage {
  v: 1;
  type: "layout";
  layout: string;
}

export interface StageMedia {
  url: string;
  type: "video" | "image";
}

export interface MediaMessage {
  v: 1;
  type: "media";
  media: StageMedia | null;
}

export class LiveRoom {
  private room: Room | null = null;
  // Published tracks, kept per-source so camera and screen swap independently.
  private cameraPubs: LocalTrackPublication[] = [];
  private screenPubs: LocalTrackPublication[] = [];
  private programPubs: LocalTrackPublication[] = [];
  private lastLayout: string | null = null;
  private lastMedia: StageMedia | null = null;

  get connected(): boolean {
    return this.room?.state === "connected";
  }

  async connect(url: string, token: string, onRemote: (feed: RemoteFeed) => void): Promise<void> {
    const room = new Room();
    this.room = room;

    const rebuild = () => {
      // One remote feed for now: the first participant with live tracks.
      const participant = Array.from(room.remoteParticipants.values()).find((p) =>
        Array.from(p.trackPublications.values()).some((pub) => pub.track),
      );
      if (!participant) {
        onRemote({ stream: null, name: "" });
        return;
      }
      const stream = new MediaStream();
      for (const pub of participant.trackPublications.values()) {
        if (pub.track) stream.addTrack(pub.track.mediaStreamTrack);
      }
      onRemote({
        stream: stream.getTracks().length > 0 ? stream : null,
        name: participant.name || participant.identity,
      });
    };

    room
      .on(RoomEvent.TrackSubscribed, rebuild)
      .on(RoomEvent.TrackUnsubscribed, rebuild)
      .on(RoomEvent.ParticipantConnected, () => {
        rebuild();
        // A late joiner (e.g. the egress renderer) missed earlier changes —
        // replay the current stage state so its composition matches ours.
        if (this.lastLayout) void this.broadcastLayout(this.lastLayout);
        void this.broadcastMedia(this.lastMedia);
      })
      .on(RoomEvent.ParticipantDisconnected, rebuild)
      .on(RoomEvent.Disconnected, () => onRemote({ stream: null, name: "" }));

    await room.connect(url, token);
    rebuild();
  }

  /**
   * Tell every subscriber (the egress renderer especially) which layout the
   * stage is showing, so the cloud recording tracks live layout switches.
   * Reliable delivery — a dropped layout packet would desync the recording.
   */
  async broadcastLayout(layout: string): Promise<void> {
    this.lastLayout = layout;
    const room = this.room;
    if (!room || room.state !== "connected") return;
    const msg: LayoutMessage = { v: 1, type: "layout", layout };
    const payload = new TextEncoder().encode(JSON.stringify(msg));
    await room.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
  }

  /**
   * Tell subscribers which media (a library video/image) is on the stage, or
   * null when it's cleared, so the cloud recording shows the same overlay. The
   * egress renderer loads the URL from our bucket itself — the bytes never go
   * over the data channel.
   */
  async broadcastMedia(media: StageMedia | null): Promise<void> {
    this.lastMedia = media;
    const room = this.room;
    if (!room || room.state !== "connected") return;
    const msg: MediaMessage = { v: 1, type: "media", media };
    const payload = new TextEncoder().encode(JSON.stringify(msg));
    await room.localParticipant.publishData(payload, { reliable: true }).catch(() => {});
  }

  /**
   * Publish a source's tracks, replacing whatever was published for it before.
   * Video and audio carry explicit LiveKit sources so the far end (the egress
   * renderer especially) can tell camera from screen. Unpublishing never stops
   * the underlying track — the local studio canvas is still drawing it.
   */
  private async republishSource(
    stream: MediaStream | null,
    videoSource: Track.Source,
    audioSource: Track.Source,
    held: LocalTrackPublication[],
  ): Promise<void> {
    const room = this.room;
    if (!room) return;
    for (const pub of held) {
      if (pub.track) await room.localParticipant.unpublishTrack(pub.track, false).catch(() => {});
    }
    held.length = 0;
    if (!stream) return;
    for (const track of stream.getVideoTracks()) {
      const pub = await room.localParticipant.publishTrack(track, { source: videoSource }).catch(() => null);
      if (pub) held.push(pub);
    }
    for (const track of stream.getAudioTracks()) {
      const pub = await room.localParticipant.publishTrack(track, { source: audioSource }).catch(() => null);
      if (pub) held.push(pub);
    }
  }

  /** The host's camera + mic — the guest and the recording both need it. */
  async publishCamera(stream: MediaStream | null): Promise<void> {
    await this.republishSource(stream, Track.Source.Camera, Track.Source.Microphone, this.cameraPubs);
  }

  /** The host's screen share + its system audio, published as a distinct source. */
  async publishScreen(stream: MediaStream | null): Promise<void> {
    await this.republishSource(stream, Track.Source.ScreenShare, Track.Source.ScreenShareAudio, this.screenPubs);
  }

  /**
   * Publish the fully-composited stage (the studio canvas + mixed audio) as one
   * "program" track pair, and return their SIDs so Egress can TrackComposite
   * exactly this — the recording is then pixel-identical to the stage, with no
   * cloud re-compositing. Simulcast off + a high bitrate so the 1080p canvas
   * isn't quietly downscaled on the way up.
   */
  async publishProgram(stream: MediaStream): Promise<{ videoSid?: string; audioSid?: string }> {
    const room = this.room;
    if (!room) return {};
    for (const pub of this.programPubs) {
      if (pub.track) await room.localParticipant.unpublishTrack(pub.track, false).catch(() => {});
    }
    this.programPubs = [];
    const sids: { videoSid?: string; audioSid?: string } = {};
    for (const track of stream.getVideoTracks()) {
      const pub = await room.localParticipant
        .publishTrack(track, {
          source: Track.Source.Camera,
          simulcast: false,
          videoEncoding: { maxBitrate: 6_000_000, maxFramerate: 30 },
          degradationPreference: "maintain-resolution",
        })
        .catch(() => null);
      if (pub) { this.programPubs.push(pub); sids.videoSid = pub.trackSid; }
    }
    for (const track of stream.getAudioTracks()) {
      const pub = await room.localParticipant
        .publishTrack(track, { source: Track.Source.Microphone })
        .catch(() => null);
      if (pub) { this.programPubs.push(pub); sids.audioSid = pub.trackSid; }
    }
    return sids;
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.cameraPubs = [];
    this.screenPubs = [];
    this.programPubs = [];
    await room?.disconnect().catch(() => {});
  }
}
