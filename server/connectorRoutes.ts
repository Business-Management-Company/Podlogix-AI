/**
 * Connector API routes
 *
 * Mounted by the main server/routes.ts. All routes are protected by
 * `isAuthenticated`. Add new connectors by exporting their routes from here.
 */

import type { Express } from "express";
import { z } from "zod";
import {
  connectBuzzsprout,
  disconnectBuzzsprout,
  getConnection,
  syncBuzzsprout,
  getBuzzsproutEpisodes,
  getBuzzsproutEpisode,
} from "./services/buzzsproutSyncService";

// Re-import isAuthenticated from wherever your auth lives
// (same pattern as the main routes.ts)
import { isAuthenticated } from "./replit_integrations/auth";

// ─── Validation schemas ───────────────────────────────────────────────────────

const connectSchema = z.object({
  apiToken: z.string().min(1, "API token is required"),
  podcastId: z.string().min(1, "Podcast ID is required"),
});

// ─── Route registration ───────────────────────────────────────────────────────

export function registerConnectorRoutes(app: Express) {

  // ── Buzzsprout ──────────────────────────────────────────────────────────────

  /**
   * POST /api/connectors/buzzsprout/connect
   * Body: { apiToken: string, podcastId: string }
   *
   * Verifies the token against the live Buzzsprout API, then saves the
   * connection + triggers an initial sync.
   */
  app.post("/api/connectors/buzzsprout/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const parsed = connectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { apiToken, podcastId } = parsed.data;

      const connection = await connectBuzzsprout(userId, apiToken, podcastId);

      // Kick off background sync — don't await so the connect call returns fast.
      syncBuzzsprout(userId).catch((err) =>
        console.error("[Buzzsprout] Initial sync failed:", err)
      );

      // Never send the raw token back to the client.
      const { apiToken: _token, ...safeConnection } = connection;
      res.json({ success: true, connection: safeConnection });
    } catch (error: any) {
      console.error("[Buzzsprout] connect error:", error);
      const isAuthError =
        error?.message?.toLowerCase().includes("token") ||
        error?.code === "AUTH_FAILED";
      res
        .status(isAuthError ? 401 : 500)
        .json({ error: error?.message ?? "Failed to connect Buzzsprout" });
    }
  });

  /**
   * DELETE /api/connectors/buzzsprout/disconnect
   *
   * Removes the connection record and all synced episode data.
   */
  app.delete("/api/connectors/buzzsprout/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      await disconnectBuzzsprout(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Buzzsprout] disconnect error:", error);
      res.status(500).json({ error: error?.message ?? "Failed to disconnect" });
    }
  });

  /**
   * GET /api/connectors/buzzsprout/status
   *
   * Returns the current connection status and podcast metadata (no token).
   */
  app.get("/api/connectors/buzzsprout/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const conn = await getConnection(userId);
      if (!conn) return res.json({ connected: false });

      const { apiToken: _token, ...safeConnection } = conn;
      res.json({ connected: true, connection: safeConnection });
    } catch (error: any) {
      console.error("[Buzzsprout] status error:", error);
      res.status(500).json({ error: error?.message ?? "Failed to get status" });
    }
  });

  /**
   * POST /api/connectors/buzzsprout/sync
   *
   * Triggers a manual sync and returns the episode counts.
   */
  app.post("/api/connectors/buzzsprout/sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const summary = await syncBuzzsprout(userId);
      res.json({ success: true, ...summary });
    } catch (error: any) {
      console.error("[Buzzsprout] sync error:", error);
      res.status(500).json({ error: error?.message ?? "Sync failed" });
    }
  });

  /**
   * GET /api/connectors/buzzsprout/episodes
   * Query: ?limit=50&offset=0
   *
   * Returns the list of episodes synced from Buzzsprout for this user.
   */
  app.get("/api/connectors/buzzsprout/episodes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 200);
      const offset = parseInt(String(req.query.offset ?? "0"), 10);

      const episodes = await getBuzzsproutEpisodes(userId, limit, offset);
      res.json({ episodes });
    } catch (error: any) {
      console.error("[Buzzsprout] episodes error:", error);
      res.status(500).json({ error: error?.message ?? "Failed to fetch episodes" });
    }
  });

  /**
   * GET /api/connectors/buzzsprout/episodes/:id
   */
  app.get("/api/connectors/buzzsprout/episodes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId ?? req.dbUser?.id ?? req.user?.id ?? req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const episode = await getBuzzsproutEpisode(userId, req.params.id);
      if (!episode) return res.status(404).json({ error: "Episode not found" });

      res.json({ episode });
    } catch (error: any) {
      console.error("[Buzzsprout] episode fetch error:", error);
      res.status(500).json({ error: error?.message ?? "Failed to fetch episode" });
    }
  });
}
