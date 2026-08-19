# Refiner: Audio Cleanup and Conversion

*Technical paper · Podlogix-AI · August 2026*

## Product claim, and why it must be literal

"Refine Audio — cuts dead air, masters loudness." The predecessor app (Alchify)
showed a six-step post-production checklist where five steps were `setTimeout`
animations that never touched the file. The house rule that came out of that
audit: **a processing claim in the UI must correspond to a real transformation of
the real file.** This paper documents what the Refinery actually does.

## The refine command

One FFmpeg pass, two filters, run by the Upload-Post FFmpeg worker:

```
ffmpeg -y -i {input} -vn -af silenceremove=stop_periods=-1:stop_duration=0.75:stop_threshold=-38dB,loudnorm=I=-16:TP=-1.5:LRA=11 -acodec libmp3lame -q:a 2 {output}
```

- `silenceremove stop_periods=-1 : stop_duration=0.75 : stop_threshold=-38dB` —
  removes every silence longer than 0.75 s that sits below −38 dB. The threshold
  is conservative on purpose: breath and room tone survive; dead air and long
  "let me pull that up" pauses don't. This is a *cut*, not a gate — total runtime
  shrinks.
- `loudnorm I=-16 : TP=-1.5 : LRA=11` — EBU R128 loudness normalization to
  −16 LUFS integrated (the podcast delivery standard, matching Apple/Spotify
  guidance), −1.5 dBTP true-peak ceiling, loudness range 11. Quiet talkers come
  up, hot mics come down.
- `-vn -acodec libmp3lame -q:a 2` — audio-only out, VBR MP3 ≈190 kbps.

Two invocation paths share this command verbatim: the Media Lab preset and
the **Refiner** room (`/studio/refine`), which runs it against any recording
with a live pipeline UI. If you change the filter chain, change both
(`client/src/pages/MediaLab.tsx`, `client/src/pages/Refinery.tsx`) — they are
intentionally kept in step.

## Job lifecycle

All jobs run on `${UPLOAD_POST_API_BASE}/api/uploadposts/ffmpeg/jobs`:

1. `POST /upload` with `{files: [url], full_command, output_extension}`. The
   worker requires literal `{input}` and `{output}` placeholders — a hardcoded
   output name is rejected (`"full_command debe contener {output}"`).
2. Poll `GET /jobs/{id}` — statuses arrive lowercase; clients normalize to
   uppercase before comparing.
3. `GET /jobs/{id}/download` — a short-lived result URL.
4. **Collect** — `POST /api/media-lab/collect` downloads the result (80 MB cap)
   and re-stores it via `storeAudioBuffer`/`storeVideoBuffer` into our Supabase
   bucket, then writes a `media_library_items` row with `platform: 'media-lab'`
   (which renders as the "Refined" badge). Never store the worker's URL: it expires.

`429` from any job endpoint means the plan's 1,000 monthly FFmpeg minutes are
spent; the UI says so instead of retrying.

## Background MP4 conversion

Studio recordings are WebM (browser constraint). On VOD attach, the server
launches a fire-and-forget conversion:

```
ffmpeg -i {input} -c:v libx264 -preset veryfast -c:a aac -movflags +faststart {output}
```

250 MB result cap, 15-minute poll budget, and a compare-and-set on the session's
`vodUrl` so a manually replaced VOD is never clobbered. Failures log and leave
the WebM in place — conversion is an enhancement, not a dependency.

## Cost model

FFmpeg minutes bill roughly 1:1 with media duration. A one-hour show costs about
one hour of the monthly 1,000 minutes when refined, and another when converted to
MP4. The remaining-minutes meter in the Media Lab rail reads the live consumption
endpoint, so the budget is always visible where jobs are launched.

## Roadmap notes

- Word-level filler excision ("um"/"uh" removal using Whisper word timestamps) is
  the v2 of refine — cuts computed from the transcript, applied as an FFmpeg
  filter chain of keep-segments. Harder than it sounds: crossfades at cut points
  matter for naturalness.
- Refining the *video* show (not just audio) means re-cutting picture at the same
  timestamps; same mechanism, bigger minutes bill.
