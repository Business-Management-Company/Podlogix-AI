import type { Express } from "express";
import { isAuthenticated } from "./replit_integrations/auth";

/**
 * Long-form transcription for the Refiner.
 *
 * The in-browser path (decode → mono WAV → POST) hits a hard cliff near 24
 * minutes: even at the 8 kHz floor the WAV crosses Whisper's 25 MB cap — the
 * same wall Alchify's refiner had. This route has no cliff for normal shows:
 * one server-side FFmpeg pass (Upload-Post) strips the video track and
 * re-encodes mono 16 kHz 48 kbps MP3 (~21 MB per hour), then Whisper
 * transcribes with word-level timestamps. Word timing is the foundation the
 * real remove-fillers step will cut against.
 */
export function registerRefinerTranscribe(app: Express) {
  const UPLOAD_POST_API_BASE = "https://api.upload-post.com";
  const apiKey = () => (process.env.UPLOAD_POST_API_KEY || "").trim();

  app.post("/api/refiner/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "Transcription needs the OpenAI key configured" });
      }
      if (!apiKey()) {
        return res.status(503).json({ message: "Audio compression needs the Upload-Post key configured" });
      }
      const mediaUrl = String(req.body?.mediaUrl ?? "");
      if (!/^https?:\/\//i.test(mediaUrl)) {
        return res.status(400).json({ message: "mediaUrl is required" });
      }

      // 1 — compress: drop video, mono, 16 kHz, 48 kbps MP3.
      const submit = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/ffmpeg/jobs/upload`, {
        method: "POST",
        headers: { Authorization: `ApiKey ${apiKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [mediaUrl],
          full_command: "ffmpeg -y -i {input} -vn -ac 1 -ar 16000 -b:a 48k -acodec libmp3lame {output}",
          output_extension: "mp3",
          publish: false,
        }),
      });
      const sub = await submit.json().catch(() => ({} as any));
      if (!submit.ok || !sub.job_id) {
        const msg = submit.status === 429
          ? "Processing minutes are used up on the Upload-Post plan"
          : (sub as any)?.message || "Couldn't start audio extraction";
        return res.status(submit.status === 429 ? 429 : 502).json({ message: msg });
      }

      // 2 — poll. Serverless budget caps the wait; a 30-minute show extracts
      // in well under this.
      let ready = false;
      for (let i = 0; i < 55; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const st = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/ffmpeg/jobs/${encodeURIComponent(sub.job_id)}`, {
          headers: { Authorization: `ApiKey ${apiKey()}` },
        });
        const js = await st.json().catch(() => ({} as any));
        const status = String((js as any).status ?? "").toUpperCase();
        if (status === "FINISHED" || status === "COMPLETED") { ready = true; break; }
        if (status === "ERROR" || status === "FAILED") {
          return res.status(502).json({ message: "Audio extraction failed in processing" });
        }
      }
      if (!ready) return res.status(504).json({ message: "Audio extraction timed out — try again in a minute" });

      // 3 — download the compressed audio.
      const dl = await fetch(`${UPLOAD_POST_API_BASE}/api/uploadposts/ffmpeg/jobs/${encodeURIComponent(sub.job_id)}/download`, {
        headers: { Authorization: `ApiKey ${apiKey()}` },
      });
      if (!dl.ok) return res.status(502).json({ message: `Couldn't fetch the extracted audio (HTTP ${dl.status})` });
      const buffer = Buffer.from(await dl.arrayBuffer());
      if (buffer.length === 0) return res.status(502).json({ message: "Audio extraction returned an empty file" });
      if (buffer.length > 24 * 1024 * 1024) {
        return res.status(413).json({ message: "Even compressed, this recording is over the transcription size cap — keep shows under roughly two hours for now" });
      }

      // 4 — Whisper, with word-level timestamps.
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: "audio/mpeg" }), "show.mp3");
      form.append("model", "whisper-1");
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      form.append("timestamp_granularities[]", "segment");
      const whisper = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
      });
      const data: any = await whisper.json().catch(() => ({}));
      if (!whisper.ok) {
        console.error("Whisper error (refiner):", whisper.status, data);
        return res.status(whisper.status >= 500 ? 502 : whisper.status).json({ message: data?.error?.message || "Transcription failed" });
      }

      res.json({
        text: data.text ?? "",
        duration: typeof data.duration === "number" ? data.duration : null,
        segments: Array.isArray(data.segments)
          ? data.segments.map((s: any) => ({ start: s.start, end: s.end, text: String(s.text ?? "").trim() }))
          : [],
        words: Array.isArray(data.words)
          ? data.words.map((w: any) => ({ word: w.word, start: w.start, end: w.end }))
          : [],
      });
    } catch (error) {
      console.error("Refiner transcription error:", error);
      res.status(500).json({ message: "Transcription failed" });
    }
  });
}
