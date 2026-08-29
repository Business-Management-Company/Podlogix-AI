/* The studio compositor — what Alchify's layouts pretended to be.
 *
 * Draws camera and/or screen onto a 1280x720 canvas per the selected layout
 * (switchable live, mid-recording), mixes mic + screen audio through an
 * AudioContext, and hands back a single MediaStream whose recording contains
 * exactly what the stage shows. All in-house: canvas, rAF, Web Audio.
 */

export type StudioLayout =
  | "fullscreen"
  | "pip-br"
  | "pip-bl"
  | "pip-tr"
  | "pip-tl"
  | "split";

export const STUDIO_LAYOUTS: Array<{ id: StudioLayout; label: string; hint: string }> = [
  { id: "fullscreen", label: "Fullscreen", hint: "Single source fills the frame" },
  { id: "pip-br", label: "PiP Bottom Right", hint: "Camera overlay bottom right" },
  { id: "pip-bl", label: "PiP Bottom Left", hint: "Camera overlay bottom left" },
  { id: "pip-tr", label: "PiP Top Right", hint: "Camera overlay top right" },
  { id: "pip-tl", label: "PiP Top Left", hint: "Camera overlay top left" },
  { id: "split", label: "Split Screen", hint: "Screen and camera side by side" },
];

const DEFAULT_W = 1280;
const DEFAULT_H = 720;

/** pip-br <-> pip-bl, pip-tr <-> pip-tl — the opposite horizontal corner. */
function mirrorPip(layout: StudioLayout): StudioLayout {
  return (layout.endsWith("r") ? layout.slice(0, -1) + "l" : layout.slice(0, -1) + "r") as StudioLayout;
}

interface CompositorState {
  layout: StudioLayout;
  camera: MediaStream | null;
  screen: MediaStream | null;
  guest: MediaStream | null;
}

export class StudioCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly w: number;
  private readonly h: number;
  private ctx: CanvasRenderingContext2D;
  private camVideo: HTMLVideoElement;
  private screenVideo: HTMLVideoElement;
  private guestVideo: HTMLVideoElement;
  private mediaVideoEl: HTMLVideoElement | null = null;
  private mediaImageEl: HTMLImageElement | null = null;
  private mediaAudio: MediaStream | null = null;
  private state: CompositorState = { layout: "fullscreen", camera: null, screen: null, guest: null };
  private raf = 0;
  private audioCtx: AudioContext | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private audioSources: MediaStreamAudioSourceNode[] = [];
  private running = false;

  constructor(dims?: { width: number; height: number }) {
    this.w = dims?.width ?? DEFAULT_W;
    this.h = dims?.height ?? DEFAULT_H;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx = this.canvas.getContext("2d")!;
    this.camVideo = this.makeVideo();
    this.screenVideo = this.makeVideo();
    this.guestVideo = this.makeVideo();
  }

  private makeVideo(): HTMLVideoElement {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    return v;
  }

  setLayout(layout: StudioLayout) {
    this.state.layout = layout;
  }

  /** The stage draws the moment any source exists — long before recording. */
  private ensureLoop() {
    if (!this.running) {
      this.running = true;
      this.raf = requestAnimationFrame(this.draw);
    }
  }

  setCamera(stream: MediaStream | null) {
    this.state.camera = stream;
    this.camVideo.srcObject = stream;
    if (stream) void this.camVideo.play().catch(() => {});
    this.rewireAudio();
    this.ensureLoop();
  }

  setScreen(stream: MediaStream | null) {
    this.state.screen = stream;
    this.screenVideo.srcObject = stream;
    if (stream) void this.screenVideo.play().catch(() => {});
    this.rewireAudio();
    this.ensureLoop();
  }

  /** A remote guest (LiveKit) — fills the second slot on the stage. */
  setGuest(stream: MediaStream | null) {
    this.state.guest = stream;
    this.guestVideo.srcObject = stream;
    if (stream) void this.guestVideo.play().catch(() => {});
    this.rewireAudio();
    this.ensureLoop();
  }

  /** Play a media file on the stage — takes the big slot, audio in the mix. */
  setMediaVideo(el: HTMLVideoElement | null) {
    this.mediaVideoEl = el;
    this.mediaImageEl = null;
    this.mediaAudio = null;
    if (el) {
      try {
        // Needs CORS-clean media (our bucket serves it) or the canvas taints.
        this.mediaAudio = (el as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.() ?? null;
      } catch { this.mediaAudio = null; }
    }
    this.rewireAudio();
    this.ensureLoop();
  }

  /** Show an image on the stage (artwork, a slide, a lower third). */
  setMediaImage(el: HTMLImageElement | null) {
    this.mediaImageEl = el;
    this.mediaVideoEl = null;
    this.mediaAudio = null;
    this.rewireAudio();
    this.ensureLoop();
  }

  /** Rebuild the audio graph from whatever sources currently have audio tracks. */
  private rewireAudio() {
    if (!this.audioCtx || !this.audioDest) return;
    for (const src of this.audioSources) src.disconnect();
    this.audioSources = [];
    for (const stream of [this.state.camera, this.state.screen, this.state.guest, this.mediaAudio]) {
      if (stream && stream.getAudioTracks().length > 0) {
        const node = this.audioCtx.createMediaStreamSource(stream);
        node.connect(this.audioDest);
        this.audioSources.push(node);
      }
    }
  }

  /** cover-fit draw preserving aspect ratio */
  private drawCover(video: HTMLVideoElement | HTMLImageElement, x: number, y: number, w: number, h: number) {
    const vw = video instanceof HTMLVideoElement ? video.videoWidth : video.naturalWidth;
    const vh = video instanceof HTMLVideoElement ? video.videoHeight : video.naturalHeight;
    if (!vw || !vh) return;
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
    this.ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    this.ctx.restore();
  }

  /** Small framed overlay in the corner the layout names. */
  private drawPip(video: HTMLVideoElement, layout: StudioLayout) {
    const ctx = this.ctx;
    const pw = Math.round(this.w * 0.26);
    const ph = Math.round(pw * 9 / 16);
    const pad = 24;
    const x = layout.endsWith("r") ? this.w - pw - pad : pad;
    const y = layout.startsWith("pip-b") ? this.h - ph - pad : pad;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 1.5, y - 1.5, pw + 3, ph + 3);
    ctx.restore();
    this.drawCover(video, x, y, pw, ph);
  }

  private divider(x: number, y: number, w: number, h: number) {
    this.ctx.fillStyle = "rgba(255,255,255,0.15)";
    this.ctx.fillRect(x, y, w, h);
  }

  private draw = () => {
    const { layout } = this.state;
    const ctx = this.ctx;
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, this.w, this.h);

    const hasCam = !!this.state.camera && this.camVideo.videoWidth > 0;
    const hasGuest = !!this.state.guest && this.guestVideo.videoWidth > 0;
    // Playing media takes the big slot; otherwise the shared screen has it.
    const mediaEl: HTMLVideoElement | HTMLImageElement | null =
      this.mediaVideoEl && this.mediaVideoEl.videoWidth > 0
        ? this.mediaVideoEl
        : this.mediaImageEl && this.mediaImageEl.naturalWidth > 0
          ? this.mediaImageEl
          : null;
    const screenLive = !!this.state.screen && this.screenVideo.videoWidth > 0;
    const bigEl = mediaEl ?? (screenLive ? this.screenVideo : null);
    const hasScreen = !!bigEl;

    if (hasScreen && hasCam && hasGuest) {
      if (layout.startsWith("pip")) {
        // Screen big; host pip in the chosen corner, guest mirrored across.
        this.drawCover(bigEl!, 0, 0, this.w, this.h);
        this.drawPip(this.camVideo, layout);
        this.drawPip(this.guestVideo, mirrorPip(layout));
      } else {
        // Screen left, the two people stacked on the right.
        this.drawCover(bigEl!, 0, 0, this.w / 2, this.h);
        this.drawCover(this.camVideo, this.w / 2, 0, this.w / 2, this.h / 2);
        this.drawCover(this.guestVideo, this.w / 2, this.h / 2, this.w / 2, this.h / 2);
        this.divider(this.w / 2 - 1, 0, 2, this.h);
        this.divider(this.w / 2, this.h / 2 - 1, this.w / 2, 2);
      }
    } else if (hasScreen && (hasCam || hasGuest)) {
      const person = hasCam ? this.camVideo : this.guestVideo;
      if (layout.startsWith("pip")) {
        this.drawCover(bigEl!, 0, 0, this.w, this.h);
        this.drawPip(person, layout);
      } else if (layout === "split") {
        this.drawCover(bigEl!, 0, 0, this.w / 2, this.h);
        this.drawCover(person, this.w / 2, 0, this.w / 2, this.h);
        this.divider(this.w / 2 - 1, 0, 2, this.h);
      } else {
        this.drawCover(bigEl!, 0, 0, this.w, this.h);
      }
    } else if (hasScreen) {
      this.drawCover(bigEl!, 0, 0, this.w, this.h);
    } else if (hasCam && hasGuest) {
      if (layout.startsWith("pip")) {
        this.drawCover(this.guestVideo, 0, 0, this.w, this.h);
        this.drawPip(this.camVideo, layout);
      } else {
        // Side-by-side interview — the guest is never hidden, fullscreen included.
        this.drawCover(this.camVideo, 0, 0, this.w / 2, this.h);
        this.drawCover(this.guestVideo, this.w / 2, 0, this.w / 2, this.h);
        this.divider(this.w / 2 - 1, 0, 2, this.h);
      }
    } else if (hasCam) {
      this.drawCover(this.camVideo, 0, 0, this.w, this.h);
    } else if (hasGuest) {
      this.drawCover(this.guestVideo, 0, 0, this.w, this.h);
    }

    if (this.running) this.raf = requestAnimationFrame(this.draw);
  };

  /** Builds the audio graph and returns the composed stream to record. */
  start(): MediaStream {
    this.ensureLoop();
    this.audioCtx = new AudioContext();
    this.audioDest = this.audioCtx.createMediaStreamDestination();
    this.rewireAudio();

    const composed = this.canvas.captureStream(30);
    for (const track of this.audioDest.stream.getAudioTracks()) composed.addTrack(track);
    return composed;
  }

  /** Ends a recording's audio graph; the preview keeps drawing. */
  stop() {
    for (const src of this.audioSources) src.disconnect();
    this.audioSources = [];
    void this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.audioDest = null;
  }

  /** Full teardown on unmount. */
  dispose() {
    this.stop();
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
