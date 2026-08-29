import { Room, RoomEvent } from "livekit-client";

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

export class LiveRoom {
  private room: Room | null = null;
  private published: MediaStreamTrack[] = [];
  private lastLayout: string | null = null;

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
        // A late joiner (e.g. the egress renderer) missed earlier layout
        // changes — replay the current one so its composition matches ours.
        if (this.lastLayout) void this.broadcastLayout(this.lastLayout);
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

  /** Publish our local tracks, replacing anything published before. */
  async publish(stream: MediaStream | null): Promise<void> {
    const room = this.room;
    if (!room) return;
    for (const track of this.published) {
      await room.localParticipant.unpublishTrack(track).catch(() => {});
    }
    this.published = [];
    if (stream) {
      for (const track of stream.getTracks()) {
        await room.localParticipant.publishTrack(track).catch(() => {});
        this.published.push(track);
      }
    }
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.published = [];
    await room?.disconnect().catch(() => {});
  }
}
