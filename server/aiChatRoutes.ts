import type { Express } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";

const SYSTEM_PROMPT = `You are Podlogix AI, a helpful assistant built into the Podlogix podcast platform. You are talking directly to the podcast host who owns this workspace.

You help with:
- Writing show notes, episode titles, and descriptions
- Content ideas, episode planning, and guest suggestions
- Growth strategies, audience building, and social media
- Distribution tips (Spotify, Apple, YouTube)
- Sponsor pitch emails and monetization advice
- Refiner tips (removing fillers, enhancing recordings)
- Anything else a podcaster needs to succeed

Style: concise, actionable, encouraging. Use bullet points and **bold** for key takeaways. End with one clear next step. Never ask more than one question per response.

When user context is provided at the top of the message, use it to give specific, personalized advice rather than generic tips.`;

export function registerAiChatRoutes(app: Express) {
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const { messages, context } = req.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        context?: { podcastTitle?: string; episodeCount?: number; draftCount?: number; totalFollowers?: number };
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "messages required" });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI not configured" });
      }

      // Build a lightweight user context block so answers are specific
      const ctxLines: string[] = [];
      if (context?.podcastTitle) ctxLines.push(`Show: "${context.podcastTitle}"`);
      if (typeof context?.episodeCount === "number") ctxLines.push(`Published episodes: ${context.episodeCount}`);
      if (typeof context?.draftCount === "number" && context.draftCount > 0)
        ctxLines.push(`Episodes in draft: ${context.draftCount}`);
      if (typeof context?.totalFollowers === "number" && context.totalFollowers > 0)
        ctxLines.push(`Total social followers: ${context.totalFollowers.toLocaleString()}`);

      const systemWithCtx =
        ctxLines.length > 0
          ? `${SYSTEM_PROMPT}\n\nCURRENT USER CONTEXT:\n${ctxLines.join("\n")}`
          : SYSTEM_PROMPT;

      const openai = new OpenAI({ apiKey });
      const trimmed = messages.slice(-10);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemWithCtx },
          ...(trimmed as any),
        ],
      });

      const text =
        completion.choices[0]?.message?.content ??
        "I'm having trouble right now — please try again.";

      res.json({ text });
    } catch (err: any) {
      console.error("AI chat error:", err?.message);
      res.status(500).json({ message: "AI unavailable" });
    }
  });
}
