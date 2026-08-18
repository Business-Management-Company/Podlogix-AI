/* Client-side video→WAV extraction for transcription — ported from Andrew's
   Alchify AI Studio (its single best artifact). Decodes the clip in the
   browser via OfflineAudioContext and re-encodes mono PCM16 WAV, picking the
   highest sample rate that keeps the payload under Whisper's size cap. Zero
   dependencies, no server round-trip until the WAV is ready. */

const MAX_WAV_BYTES = 22 * 1024 * 1024; // stay comfortably under Whisper's 25MB
const SAMPLE_RATES = [44100, 32000, 22050, 16000, 11025, 8000];

/** Highest sample rate whose mono PCM16 output fits the size budget. */
function getOptimalSampleRate(durationSeconds: number): number {
  for (const rate of SAMPLE_RATES) {
    const bytes = durationSeconds * rate * 2; // mono, 2 bytes/sample
    if (bytes <= MAX_WAV_BYTES) return rate;
  }
  return SAMPLE_RATES[SAMPLE_RATES.length - 1];
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const dataSize = numFrames * bytesPerSample;
  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channel = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const clamped = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return out;
}

/** Downloads a video/audio URL and returns its audio as a mono WAV blob. */
export async function extractAudioAsWav(mediaUrl: string): Promise<Blob> {
  const response = await fetch(mediaUrl);
  if (!response.ok) throw new Error("Couldn't download the clip");
  const encoded = await response.arrayBuffer();

  // Probe pass: decode at native rate to learn the duration.
  const probeCtx = new AudioContext();
  const probeBuffer = await probeCtx.decodeAudioData(encoded.slice(0));
  const duration = probeBuffer.duration;
  await probeCtx.close();

  const targetRate = getOptimalSampleRate(duration);
  const offline = new OfflineAudioContext(1, Math.ceil(duration * targetRate), targetRate);
  const source = offline.createBufferSource();
  // Re-decode inside the offline context's rate domain via a fresh decode.
  const renderCtx = new AudioContext({ sampleRate: targetRate });
  const decoded = await renderCtx.decodeAudioData(encoded.slice(0));
  await renderCtx.close();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return new Blob([audioBufferToWav(rendered)], { type: "audio/wav" });
}
