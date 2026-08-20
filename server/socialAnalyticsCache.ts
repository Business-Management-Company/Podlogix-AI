import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { enrichHandleCached, extractIcAnalytics, normalizeSocialHandle } from "./services/icEnrichment";

/**
 * Cached account analytics — because every Influencers.club enrich call
 * costs a real credit.
 *
 * The original /api/social-analytics/my-accounts enriched every connected
 * account on every page view; three pages queried it, so a normal morning
 * burned a dozen credits repeating yesterday's answer. This route enriches a
 * handle ONCE — through the shared, app-wide creator_enrichment_cache in
 * server/services/icEnrichment.ts, so the credit is shared across every user
 * and feature, not just this account — and serves the saved copy forever
 * after. Fresh data is an explicit choice: ?refresh=1 (a "Refresh stats"
 * button), never a side effect of opening a page. On a genuine cache miss,
 * the outbound call still only fires when ENABLE_IC_ENRICHMENT=1.
 */

const platformMapping: Record<string, string> = {
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  twitter: "twitter",
  x: "twitter",
  twitch: "twitch",
};

export function registerSocialAnalyticsCache(app: Express) {
  app.get("/api/social-analytics/my-accounts-cached", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId!;
      const refresh = String(req.query?.refresh ?? "") === "1";

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

        // Shared, app-wide cache: a credit already paid for this handle by
        // anyone, anywhere, is never paid again. Explicit refresh still
        // requires ENABLE_IC_ENRICHMENT=1, same as any other fresh spend.
        const enriched = !apiKey
          ? null
          : await enrichHandleCached(apiKey, platform, account.platformUsername, {}, { force: refresh });
        if (!enriched) continue;

        const analytics = extractIcAnalytics(enriched.data, platform, account.platformUsername);
        analyticsResults.push({
          accountId: account.id,
          ...analytics,
          profilePicture: analytics.profilePicture || account.profilePictureUrl || null,
          cached: enriched.fromCache,
        });
      }

      res.json({ success: true, accounts: analyticsResults });
    } catch (error) {
      console.error("Error serving cached analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });
}
