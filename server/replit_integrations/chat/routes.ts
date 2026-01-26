import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const PODLOGIX_SYSTEM_PROMPT = `You are Podlogix AI, an expert podcast assistant. You help podcasters with:

1. **Content Creation**: Generate show notes, episode descriptions, titles, and timestamps
2. **Transcription Help**: Summarize transcripts, extract key quotes, identify topics
3. **Viral Clips**: Suggest engaging moments and viral-worthy clips from episode content
4. **SEO Optimization**: Create keyword-rich descriptions and metadata
5. **Audience Growth**: Provide tips on growing a podcast audience
6. **Platform Distribution**: Advise on publishing to Spotify, Apple, YouTube, etc.

Be concise, actionable, and friendly. When users share episode content or transcripts, provide specific suggestions. Format responses with clear headers and bullet points when appropriate.`;

export function registerChatRoutes(app: Express): void {
  // Get all conversations for authenticated user
  app.get("/api/ai/conversations", async (req: any, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/ai/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/ai/conversations", async (req: any, res: Response) => {
    try {
      const { title } = req.body;
      const userId = req.user?.claims?.sub;
      const conversation = await chatStorage.createConversation(title || "New Chat", userId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/ai/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/ai/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: PODLOGIX_SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Quick AI actions (no conversation context)
  app.post("/api/ai/generate", async (req: Request, res: Response) => {
    try {
      const { action, content } = req.body;
      
      let prompt = "";
      switch (action) {
        case "show_notes":
          prompt = `Generate professional podcast show notes for the following episode content. Include key topics, timestamps if possible, and a brief summary:\n\n${content}`;
          break;
        case "title":
          prompt = `Generate 5 catchy, SEO-friendly podcast episode titles for this content:\n\n${content}`;
          break;
        case "description":
          prompt = `Write a compelling podcast episode description (150-200 words) optimized for Spotify and Apple Podcasts:\n\n${content}`;
          break;
        case "clips":
          prompt = `Identify 3-5 potential viral clip moments from this podcast content. For each, provide the topic, why it's engaging, and a suggested clip title:\n\n${content}`;
          break;
        case "summary":
          prompt = `Summarize this podcast content in 3-4 sentences:\n\n${content}`;
          break;
        default:
          prompt = content;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: PODLOGIX_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 2048,
      });

      res.json({ result: response.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error("Error generating content:", error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });
}

