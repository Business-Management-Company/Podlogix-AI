# The Live Studio and the Clip Pipeline

*Technical paper · Podlogix-AI · August 2026*

## Thesis

The studio's product promise is "what you see is what records." Everything in the
implementation flows from taking that literally: there is exactly one visual truth
(a canvas), and every consumer — the on-screen stage, the recording, and eventually
the clip cutter — reads from it.

## The compositor (`client/src/lib/studio-compositor.ts`)

`StudioCompositor` owns a 1280×720 `<canvas>` and a `requestAnimationFrame` loop.
Sources are plain `MediaStream`s attached to hidden `<video>` elements:

- **camera** — `getUserMedia`
- **screen** — `getDisplayMedia`
- **guest** — a remote LiveKit participant's tracks, aggregated into one stream

Each frame, the draw routine cover-fits whichever sources are live into the active
layout (fullscreen, four PiP corners, split). With three sources it degrades
gracefully: screen big + two mirrored PiPs, or screen left + people stacked right.
Layout switches are just state changes — the next frame draws differently, which is
why switching mid-show is "baked into the recording" for free.

Audio uses the same single-truth pattern: a Web Audio `AudioContext` mixes every
source's audio tracks into one `MediaStreamAudioDestinationNode`. `rewireAudio()`
rebuilds the graph whenever a source changes.

Recording is `canvas.captureStream(30)` + the mixed audio track, fed to a
`MediaRecorder` (`video/webm;codecs=vp9`). Browsers cannot record MP4 — see
"Format doctrine" below.

## Session mechanics (server-authoritative)

Tables: `studios` (named rooms), `live_sessions`, `live_marks`.

- One open session per user; starting a new one closes stragglers.
- **Marks are server-clock timestamps.** The client never supplies a time; the
  server computes seconds-since-`startedAt` at insert. Client clocks are not trusted.
- The VOD (the recording) attaches via `PATCH /api/live/sessions/:id` after the
  in-browser recorder uploads it with a signed URL.

## The cut pipeline

A mark becomes a clip through four steps, each with a specific guardrail:

1. **Cut** (`POST /api/live/marks/:id/cut`) — the server derives the window
   (`start = atSeconds + offset − 20`, duration 30s), validates the numbers, and
   builds the FFmpeg command *itself* from those validated numbers:

   ```
   ffmpeg -ss {start} -i {input} -t 30 -c:v libx264 -preset veryfast -c:a aac -movflags +faststart {output}
   ```

   The client never supplies command text. The Upload-Post worker requires the
   literal `{input}` and `{output}` placeholders (a hardcoded output filename is
   rejected with "full_command debe contener {output}").

2. **Poll** (`GET .../cut-status`) — proxies the job status; on failure it stamps
   the mark `failed` and maps worker exceptions to human hints (e.g. a 403 on VOD
   download → "the VOD host refused the download").

3. **Collect** (`POST .../collect`) — downloads the result (80 MB cap), stores it
   in **our** Supabase bucket via `storeVideoBuffer`, creates a
   `media_library_items` row (`platform: 'live'`), and stamps the mark `ready`.

4. **Captions** — client-side audio extraction (`extractAudioAsWav`, an
   OfflineAudioContext resample that keeps payloads under Whisper's 25 MB limit)
   → `POST /api/social/transcribe` → segment timestamps → `.srt`/`.vtt` generated
   locally.

**Why 20 back / 10 forward:** the human presses the button *after* the moment.
AI-detected marks are placed at `startSeconds + 20` so the same window math makes
the clip begin exactly at the detected moment.

## Format doctrine

Browsers record WebM; the world wants MP4 (H.264+AAC). On VOD attach, if the URL
ends `.webm` and lives in our bucket, the server fires a background conversion job
(same FFmpeg worker), stores the MP4, and swaps the session VOD + library item —
only if nobody replaced the VOD meanwhile (compare-and-set on the URL). Failure
leaves the WebM untouched; the feature is fire-and-forget by design.

## Storage doctrine (load-bearing)

**Never persist an expiring URL.** Social CDNs and the FFmpeg worker hand out
signed URLs that die in hours. Anything worth keeping is downloaded and re-stored
in our bucket; we save our public URL or nothing (`storeVideoBuffer` /
`storeAudioBuffer` / `storeImageBuffer` return `null` on any failure, and callers
must treat `null` as "don't save").

## Failure modes worth knowing

- FFmpeg 429 → the plan's monthly minutes are exhausted; surfaced verbatim to the UI.
- The worker fetches VODs with plain python-requests — hosts that demand browser
  headers (some Google buckets) will 403. Recordings in our own bucket never hit this.
- `tsx server/index.ts` runs without watch: backend changes need a dev-server restart.
