import type { Express } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replit_integrations/auth";

/**
 * Refiner — AI clip selection.
 *
 * Reads a transcript (plain text, optionally with word-level timestamps) and
 * returns the strongest short-form clip candidates, each scored on four axes
 * (Hook / Flow / Value / Trend) plus an overall 0–100. This is the selection
 * brain harvested from the old Alchify app, rewired to Podlogix's own OpenAI
 * key instead of a third-party gateway. Rendering the chosen span into a
 * captioned vertical video happens separately on the VPS FFmpeg lane.
 */

export interface WordStamp {
  word: string;
  start: number;
  end: number;
}

interface ClipCandidate {
  title: string;
  hook: string;
  startSeconds: number;
  endSeconds: number;
  platforms: string[];
  scores: { hook: number; flow: number; value: number; trend: number };
  overall: number;
}

const CLIP_SYSTEM_PROMPT = `You are the clip-selection engine for a podcast/video refiner. You read a transcript and pick the strongest moments to cut into short-form social clips (TikTok, Reels, Shorts, LinkedIn).

Pick 3–5 clips. Each clip must:
- Be 15–60 seconds long.
- Stand alone — make sense without the rest of the video.
- Start on a strong hook (a question, a bold claim, a surprising line) and end on a satisfying beat, not mid-sentence.

Prefer: emotional moments, contrarian or surprising statements, concrete tips, quotable one-liners, and story turns. Avoid: throat-clearing intros, logistics, and rambling.

Score each clip 0–100 on four axes:
- hook: how strong the opening 3 seconds are at stopping a scroll
- flow: how smoothly it plays as a standalone piece
- value: how useful/insightful/entertaining it is
- trend: how well it fits current short-form social patterns

Return ONLY valid JSON, no prose, in exactly this shape:
{"clips":[{"title":"...","hook":"...","startSeconds":0,"endSeconds":0,"platforms":["tiktok","reels"],"scores":{"hook":0,"flow":0,"value":0,"trend":0},"overall":0}]}
Timestamps are in SECONDS from the start of the video (integers or decimals).`;

function clamp100(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── Clip rendering ──────────────────────────────────────────────────────────
// Reframe a chosen span of the source into a social aspect ratio. The command
// uses nvenc flags because the VPS FFmpeg lane translates them to libx264;
// scale-to-fill + center-crop reframes landscape into vertical without bars.

export type ClipAspect = "9:16" | "1:1" | "16:9" | "4:5";

const ASPECT_DIMS: Record<ClipAspect, [number, number]> = {
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
  "4:5": [1080, 1350],
};

export function buildClipCommand(opts: {
  aspect: ClipAspect;
  startSeconds: number;
  endSeconds: number;
}): { command: string; durationSeconds: number; width: number; height: number } {
  const [w, h] = ASPECT_DIMS[opts.aspect] ?? ASPECT_DIMS["9:16"];
  const start = Math.max(0, opts.startSeconds);
  const end = Math.max(start + 0.5, opts.endSeconds);
  const duration = +(end - start).toFixed(2);
  // -ss/-to before -i = fast keyframe seek. scale increase + center crop fills
  // the target frame and trims the overflow (standard landscape→vertical reframe).
  const vf = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},fps=30,setsar=1`;
  const command =
    `ffmpeg -y -ss ${start.toFixed(2)} -to ${end.toFixed(2)} -i {input} ` +
    `-vf "${vf}" -af "aresample=44100,aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-1.5:LRA=11" ` +
    `-c:v h264_nvenc -preset p1 -cq 23 -b:v 4000k -maxrate 6000k -bufsize 12M -c:a aac -b:a 160k {output}`;
  return { command, durationSeconds: duration, width: w, height: h };
}

export function registerRefinerRoutes(app: Express) {
  // Returns the FFmpeg command to render a clip; the client submits it through
  // the existing /api/media-lab/ffmpeg/jobs lane (which routes to the VPS).
  app.post("/api/refiner/clip-command", isAuthenticated, async (req: any, res) => {
    const { aspect, startSeconds, endSeconds } = req.body ?? {};
    if (!ASPECT_DIMS[aspect as ClipAspect]) {
      return res.status(400).json({ message: "aspect must be one of 9:16, 1:1, 16:9, 4:5" });
    }
    if (typeof startSeconds !== "number" || typeof endSeconds !== "number" || endSeconds <= startSeconds) {
      return res.status(400).json({ message: "valid startSeconds and endSeconds are required" });
    }
    res.json(buildClipCommand({ aspect, startSeconds, endSeconds }));
  });

  app.post("/api/refiner/clip-candidates", isAuthenticated, async (req: any, res) => {
    try {
      const { transcript, words, durationSeconds } = req.body as {
        transcript?: string;
        words?: WordStamp[];
        durationSeconds?: number;
      };

      if (!transcript || typeof transcript !== "string" || transcript.trim().length < 40) {
        return res.status(400).json({ message: "A transcript is required to find clips." });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI is not configured." });
      }

      // When word timestamps are present, hand the model a timestamped view so
      // its start/end land on real word boundaries rather than guesses.
      const transcriptLimit = 24000;
      let transcriptForModel = transcript.trim().slice(0, transcriptLimit);
      if (Array.isArray(words) && words.length > 0) {
        let stamped = "";
        for (const w of words) {
          if (typeof w.start !== "number") continue;

          const segment = `${stamped.length > 0 ? " " : ""}[${w.start.toFixed(1)}] ${w.word}`;
          const remaining = transcriptLimit - stamped.length;
          if (remaining <= 0) break;

          if (segment.length <= remaining) {
            stamped += segment;
            continue;
          }

          stamped += segment.slice(0, remaining);
          break;
        }
        transcriptForModel = stamped;
      }
      const durationLine =
        typeof durationSeconds === "number" && durationSeconds > 0
          ? `\n\nThe full video is ${Math.round(durationSeconds)} seconds long — never return a timestamp beyond that.`
          : "";

      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1500,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLIP_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Find the best clips in this transcript:${durationLine}\n\n${transcriptForModel}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: { clips?: any[] };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return res.status(502).json({ message: "The AI returned an unreadable response — try again." });
      }

      const maxEnd = typeof durationSeconds === "number" && durationSeconds > 0 ? durationSeconds : Infinity;
      const clips: ClipCandidate[] = (parsed.clips ?? [])
        .map((c: any): ClipCandidate | null => {
          const startSeconds = Math.max(0, Number(c.startSeconds));
          let endSeconds = Number(c.endSeconds);
          if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) return null;
          endSeconds = Math.min(endSeconds, maxEnd);
          if (endSeconds <= startSeconds) return null;
          const scores = {
            hook: clamp100(c.scores?.hook),
            flow: clamp100(c.scores?.flow),
            value: clamp100(c.scores?.value),
            trend: clamp100(c.scores?.trend),
          };
          const overall =
            clamp100(c.overall) ||
            Math.round((scores.hook + scores.flow + scores.value + scores.trend) / 4);
          return {
            title: String(c.title ?? "Untitled clip").slice(0, 80),
            hook: String(c.hook ?? "").slice(0, 140),
            startSeconds,
            endSeconds,
            platforms: Array.isArray(c.platforms)
              ? c.platforms.map((p: any) => String(p).toLowerCase()).slice(0, 4)
              : ["tiktok", "reels"],
            scores,
            overall,
          };
        })
        .filter((c: ClipCandidate | null): c is ClipCandidate => c !== null)
        .sort((a, b) => b.overall - a.overall);

      res.json({ clips });
    } catch (err: any) {
      console.error("Clip candidates error:", err?.message);
      res.status(500).json({ message: "Couldn't find clips right now — please try again." });
    }
  });
}
