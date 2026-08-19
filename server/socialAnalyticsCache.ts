import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";

/**
 * Cached account analytics — because every Influencers.club enrich call
 * costs a real credit.
 *
 * The original /api/social-analytics/my-accounts enriched every connected
 * account on every page view; three pages queried it, so a normal morning
 * burned a dozen credits repeating yesterday's answer. This route enriches a
 * handle ONCE, keeps the whole payload (picture included) in
 * ic_enrichment_cache, and serves the saved copy forever after. Fresh data
 * is an explicit choice: ?refresh=1 (a "Refresh stats" button), never a side
 * effect of opening a page.
 *
 * Table is created here (idempotent) rather than in shared/schema.ts to keep
 * this change self-contained; fold it into the schema on the next pass.
 */

const platformMapping: Record<string, string> = {
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  twitter: "twitter",
  x: "twitter",
  twitch: "twitch",
};

function normalizeSocialHandle(input: string): string {
  let h = (input || "").trim();
  const urlMatch = h.match(/(?:instagram\.com|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|twitch\.tv)\/(@?[A-Za-z0-9_.\-]+)/i);
  if (urlMatch) h = urlMatch[1];
  return h.replace(/^@/, "").replace(/\/+$/, "");
}

function extractIcAnalytics(data: any, platform: string, fallbackHandle: string) {
  const result = data?.result ?? data ?? {};
  const p = result?.[platform] ?? {};
  const followers = platform === "youtube" ? (p.subscriber_count ?? 0) : (p.follower_count ?? 0);
  return {
    handle: p.username || (p.custom_url ? String(p.custom_url).replace(/^@/, "") : null) || fallbackHandle,
    platform,
    name: p.full_name || [result?.first_name, result?.last_name].filter(Boolean).join(" ") || fallbackHandle,
    bio: p.biography || null,
    profilePicture: p.profile_picture_hd || p.profile_picture || null,
    followers,
    following: p.following_count ?? 0,
    postsCount: p.media_count ?? 0,
    engagementRate: p.engagement_percent ?? 0,
    avgLikes: p.avg_likes ?? 0,
    avgComments: p.avg_comments ?? 0,
    avgViews: p.reels?.avg_view_count ?? 0,
    avgReelLikes: p.reels?.avg_like_count ?? 0,
    postsPerMonth: p.posting_frequency_recent_months ?? 0,
    email: result?.email ?? null,
    emailVerified: false,
    location: result?.location || p.location || p.country || null,
    language: result?.speaking_language || null,
    businessCategory: p.category || null,
    isVerified: p.is_verified ?? false,
    socialLinks: result?.links_in_bio ?? [],
  };
}

let tableReady: Promise<void> | undefined;
function ensureTable(): Promise<void> {
  tableReady ??= db
    .execute(sql`
        CREATE TABLE IF NOT EXISTS ic_enrichment_cache (
          user_id varchar NOT NULL,
          platform varchar NOT NULL,
          handle varchar NOT NULL,
          payload jsonb NOT NULL,
          fetched_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, platform, handle)
        )
      `)
      .then(() => undefined);
  }
  return tableReady;
}

export function registerSocialAnalyticsCache(app: Express) {
  app.get("/api/social-analytics/my-accounts-cached", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const refresh = String(req.query?.refresh ?? "") === "1";
      await ensureTable();

      // Same account assembly as the uncached route: Upload-Post OAuth
      // accounts first, then Link Page handles for uncovered platforms.
      const uploadPostAccounts = await storage.getUploadPostAccountsByUser(userId);
      const accounts: Array<{ id: string; platform: string; platformUsername: string | null; profilePictureUrl?: string | null }> =
        (uploadPostAccounts || []).map((a: any) => ({
          id: a.id,
          platform: a.platform,
          platformUsername: a.platformUsername,
          profilePictureUrl: a.profilePictureUrl,
        }));
      const coveredPlatforms = new Set(accounts.map((a) => a.platform?.toLowerCase()));

      const profile = await storage.getProfileByUserId(userId);
      for (const icon of (profile?.socialIcons as { platform: string; url: string }[] | undefined) || []) {
        const platformKey = icon.platform?.toLowerCase();
        if (!platformKey || !platformMapping[platformKey] || coveredPlatforms.has(platformKey)) continue;
        const handle = normalizeSocialHandle(icon.url);
        if (!handle) continue;
        accounts.push({ id: `profile-${platformKey}`, platform: platformKey, platformUsername: handle });
        coveredPlatforms.add(platformKey);
      }

      if (accounts.length === 0) {
        return res.json({ accounts: [], message: "No connected accounts found" });
      }

      const apiKey = (process.env.INFLUENCERS_CLUB_API_KEY || "").trim();
      const analyticsResults: any[] = [];

      for (const account of accounts) {
        const platform = platformMapping[account.platform?.toLowerCase() || ""];
        if (!platform || !account.platformUsername) continue;
        const handle = normalizeSocialHandle(account.platformUsername);

        // Saved copy first — a credit already paid for it.
        if (!refresh) {
          const cached = await db.execute(sql`
            SELECT payload, fetched_at FROM ic_enrichment_cache
            WHERE user_id = ${userId} AND platform = ${platform} AND handle = ${handle}
          `);
          const row: any = (cached as any).rows?.[0];
          if (row) {
            analyticsResults.push({
              accountId: account.id,
              ...(typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload),
              cachedAt: row.fetched_at,
            });
            continue;
          }
        }

        // Kill switch (Influencers.club support guidance, Aug 19 2026): every
        // successful enrich costs a credit, so outbound calls are OFF unless
        // ENABLE_IC_ENRICHMENT=1 is deliberately set — a cache miss just means
        // that account shows nothing until someone chooses to spend.
        if (!apiKey || process.env.ENABLE_IC_ENRICHMENT !== "1") continue;

        try {
          const response = await fetch("https://api-dashboard.influencers.club/public/v1/creators/enrich/handle/full/", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ handle, platform }),
          });
          if (!response.ok) continue;
          const data = await response.json();
          const analytics = {
            ...extractIcAnalytics(data, platform, account.platformUsername),
            profilePicture: extractIcAnalytics(data, platform, account.platformUsername).profilePicture || account.profilePictureUrl || null,
          };
          await db.execute(sql`
            INSERT INTO ic_enrichment_cache (user_id, platform, handle, payload, fetched_at)
            VALUES (${userId}, ${platform}, ${handle}, ${JSON.stringify(analytics)}::jsonb, now())
            ON CONFLICT (user_id, platform, handle)
            DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
          `);
          analyticsResults.push({ accountId: account.id, ...analytics, cachedAt: new Date().toISOString() });
        } catch (err) {
          console.error(`Enrich failed for ${handle}:`, err);
        }
      }

      res.json({ success: true, accounts: analyticsResults });
    } catch (error) {
      console.error("Error serving cached analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
}
