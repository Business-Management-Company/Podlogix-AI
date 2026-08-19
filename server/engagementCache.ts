import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { isAuthenticated } from "./replit_integrations/auth";

/**
 * Cached Engagement inbox. The DM/conversation payload changes slowly, so
 * hitting Upload-Post's API on every page visit is waste — the serve path
 * reads a per-user cache row and only refetches upstream when the copy is
 * older than the TTL or the user explicitly asks (?refresh=1). Same
 * self-contained table pattern as the enrichment cache.
 */

const TTL_MS = 15 * 60 * 1000;
const UPLOAD_POST_API_BASE = "https://api.upload-post.com";
const apiKey = () => (process.env.UPLOAD_POST_API_KEY || "").trim();

let tableReady: Promise<void> | undefined;
function ensureTable(): Promise<void> {
  const ready = (tableReady ??= db
    .execute(sql`
      CREATE TABLE IF NOT EXISTS engagement_cache (
        user_id varchar NOT NULL,
        kind varchar NOT NULL,
        payload jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, kind)
      )
    `)
    .then(() => undefined));
  return ready;
}

export function registerEngagementCache(app: Express) {
  app.get("/api/engagement/dms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const refresh = String(req.query?.refresh ?? "") === "1";
      await ensureTable();

      const cached = await db.execute(sql`
        SELECT payload, fetched_at FROM engagement_cache
        WHERE user_id = ${userId} AND kind = 'dms:instagram'
      `);
      const row: any = (cached as any).rows?.[0];
      const age = row ? Date.now() - new Date(row.fetched_at).getTime() : Infinity;
      if (row && !refresh && age < TTL_MS) {
        const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        return res.json({ ...payload, fetchedAt: row.fetched_at, cached: true });
      }

      // Same profile naming rule the original DM route used.
      const uploadPostUsername = `podlogix_${userId}`;
      const upstream = await fetch(
        `${UPLOAD_POST_API_BASE}/api/uploadposts/dms/conversations?platform=instagram&user=${encodeURIComponent(uploadPostUsername)}`,
        { headers: { Authorization: `ApiKey ${apiKey()}` } },
      );
      const data: any = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        // Upstream down or rate-limited: a stale copy beats an empty inbox.
        if (row) {
          const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
          return res.json({ ...payload, fetchedAt: row.fetched_at, cached: true, stale: true });
        }
        return res.status(upstream.status).json({ message: data?.message || "Couldn't load conversations" });
      }
      const payload = { conversations: data.conversations ?? data.data ?? [] };
      await db.execute(sql`
        INSERT INTO engagement_cache (user_id, kind, payload, fetched_at)
        VALUES (${userId}, 'dms:instagram', ${JSON.stringify(payload)}::jsonb, now())
        ON CONFLICT (user_id, kind)
        DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
      `);
      res.json({ ...payload, fetchedAt: new Date().toISOString(), cached: false });
    } catch (error) {
      console.error("Engagement cache error:", error);
      res.status(500).json({ message: "Couldn't load conversations" });
    }
  });
}
