import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { enrichHandleCached } from "./services/icEnrichment";

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
