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

const W = 1280;
const H = 720;

interface CompositorState {
  layout: StudioLayout;
  camera: MediaStream | null;
  screen: MediaStream | null;
}

export class StudioCompositor {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camVideo: HTMLVideoElement;
  private screenVideo: HTMLVideoElement;
  private state: CompositorState = { layout: "fullscreen", camera: null, screen: null };
  private raf = 0;
  private audioCtx: AudioContext | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private audioSources: MediaStreamAudioSourceNode[] = [];
  private running = false;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d")!;
    this.camVideo = this.makeVideo();
    this.screenVideo = this.makeVideo();
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

  setCamera(stream: MediaStream | null) {
    this.state.camera = stream;
    this.camVideo.srcObject = stream;
    if (stream) void this.camVideo.play().catch(() => {});
    this.rewireAudio();
  }

  setScreen(stream: MediaStream | null) {
    this.state.screen = stream;
    this.screenVideo.srcObject = stream;
    if (stream) void this.screenVideo.play().catch(() => {});
    this.rewireAudio();
  }

  /** Rebuild the audio graph from whatever sources currently have audio tracks. */
  private rewireAudio() {
    if (!this.audioCtx || !this.audioDest) return;
    for (const src of this.audioSources) src.disconnect();
    this.audioSources = [];
    for (const stream of [this.state.camera, this.state.screen]) {
      if (stream && stream.getAudioTracks().length > 0) {
        const node = this.audioCtx.createMediaStreamSource(stream);
        node.connect(this.audioDest);
        this.audioSources.push(node);
      }
    }
  }

  /** cover-fit draw preserving aspect ratio */
  private drawCover(video: HTMLVideoElement, x: number, y: number, w: number, h: number) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
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

  private draw = () => {
    const { layout, camera, screen } = this.state;
    const ctx = this.ctx;
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, W, H);

    const hasCam = !!camera && this.camVideo.videoWidth > 0;
    const hasScreen = !!screen && this.screenVideo.videoWidth > 0;

    if (hasScreen && hasCam && layout.startsWith("pip")) {
      this.drawCover(this.screenVideo, 0, 0, W, H);
      const pw = Math.round(W * 0.26);
      const ph = Math.round(pw * 9 / 16);
      const pad = 24;
      const x = layout.endsWith("r") ? W - pw - pad : pad;
      const y = layout.startsWith("pip-b") ? H - ph - pad : pad;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 1.5, y - 1.5, pw + 3, ph + 3);
      ctx.restore();
      this.drawCover(this.camVideo, x, y, pw, ph);
    } else if (hasScreen && hasCam && layout === "split") {
      this.drawCover(this.screenVideo, 0, 0, W / 2, H);
      this.drawCover(this.camVideo, W / 2, 0, W / 2, H);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(W / 2 - 1, 0, 2, H);
    } else if (hasScreen) {
      this.drawCover(this.screenVideo, 0, 0, W, H);
    } else if (hasCam) {
      this.drawCover(this.camVideo, 0, 0, W, H);
    }

    if (this.running) this.raf = requestAnimationFrame(this.draw);
  };

  /** Starts the draw loop + audio graph; returns the composed stream to record. */
  start(): MediaStream {
    this.running = true;
    this.audioCtx = new AudioContext();
    this.audioDest = this.audioCtx.createMediaStreamDestination();
    this.rewireAudio();
    this.raf = requestAnimationFrame(this.draw);

    const composed = this.canvas.captureStream(30);
    for (const track of this.audioDest.stream.getAudioTracks()) composed.addTrack(track);
    return composed;
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const src of this.audioSources) src.disconnect();
    this.audioSources = [];
    void this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.audioDest = null;
  }
}
