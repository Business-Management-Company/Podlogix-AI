import type { Express } from "express";
import { eq, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  savedCreators,
  savedInfluencers,
  adminCreatorList,
  clientSavedCreators,
} from "@shared/schema";
import { getCachedEnrichment, enrichHandleCached, extractIcAnalytics, icEnrichmentEnabled } from "./services/icEnrichment";

/**
 * Morning enrichment sweep — fills in the picture (and, where the table has
 * a column for it, email) for creators saved somewhere in the app that have
 * never been enriched, so nobody hits an empty profile just because they
 * were the first to save that creator instead of search for them live.
 *
 * "Never enriched" is read off each row (profilePicture still null), not off
 * the cache — the shared cache in server/services/icEnrichment.ts is always
 * consulted first, so a creator already enriched via any other feature is
 * backfilled here for free. Only a genuine cache miss can spend a credit,
 * and only when ENABLE_IC_ENRICHMENT=1 — same kill switch as every other
 * enrichment path in the app. Deliberately does NOT touch guest-prospect
 * emails: revealing a guest's email is a separate, explicit paid action the
 * user takes per-guest (see /api/guest-prospects/:id/reveal-email); sweeping
 * every unrevealed prospect automatically would silently multiply spend and
 * bypass that consent step.
 */

const ROWS_PER_TABLE = 15;

type SweepResult = { table: string; scanned: number; backfilledFromCache: number; enriched: number; skippedNoBudget: number };

async function sweepSavedCreators(): Promise<SweepResult> {
  const rows = await db
    .select()
    .from(savedCreators)
    .where(isNull(savedCreators.profilePictureUrl))
    .limit(ROWS_PER_TABLE);

  let backfilledFromCache = 0, enriched = 0, skippedNoBudget = 0;
  for (const row of rows) {
    const cached = await getCachedEnrichment(row.platform, row.handle);
    let analytics = cached ? extractIcAnalytics(cached.payload, row.platform, row.handle) : null;
    if (analytics) backfilledFromCache++;
    else if (icEnrichmentEnabled()) {
      const apiKey = (process.env.INFLUENCERS_CLUB_API_KEY || "").trim();
      const result = apiKey ? await enrichHandleCached(apiKey, row.platform, row.handle) : null;
      if (result) {
        analytics = extractIcAnalytics(result.data, row.platform, row.handle);
        enriched++;
      }
    } else {
      skippedNoBudget++;
    }
    if (!analytics) continue;

    await db.update(savedCreators).set({
      profilePictureUrl: row.profilePictureUrl ?? analytics.profilePicture ?? undefined,
      email: row.email ?? analytics.email ?? undefined,
      bio: row.bio ?? analytics.bio ?? undefined,
      followers: row.followers ?? analytics.followers ?? undefined,
      isVerified: row.isVerified ?? analytics.isVerified ?? undefined,
    }).where(eq(savedCreators.id, row.id));
  }
  return { table: "saved_creators", scanned: rows.length, backfilledFromCache, enriched, skippedNoBudget };
}

async function sweepAdminCreatorList(): Promise<SweepResult> {
  const rows = await db
    .select()
    .from(adminCreatorList)
    .where(isNull(adminCreatorList.profilePicUrl))
    .limit(ROWS_PER_TABLE);

  let backfilledFromCache = 0, enriched = 0, skippedNoBudget = 0;
  for (const row of rows) {
    const cached = await getCachedEnrichment(row.platform, row.username);
    let analytics = cached ? extractIcAnalytics(cached.payload, row.platform, row.username) : null;
    if (analytics) backfilledFromCache++;
    else if (icEnrichmentEnabled()) {
      const apiKey = (process.env.INFLUENCERS_CLUB_API_KEY || "").trim();
      const result = apiKey ? await enrichHandleCached(apiKey, row.platform, row.username) : null;
      if (result) {
        analytics = extractIcAnalytics(result.data, row.platform, row.username);
        enriched++;
      }
    } else {
      skippedNoBudget++;
    }
    if (!analytics) continue;

    await db.update(adminCreatorList).set({
      profilePicUrl: row.profilePicUrl ?? analytics.profilePicture ?? undefined,
      email: row.email ?? analytics.email ?? undefined,
      bio: row.bio ?? analytics.bio ?? undefined,
      followerCount: row.followerCount ?? analytics.followers ?? undefined,
    }).where(eq(adminCreatorList.id, row.id));
  }
  return { table: "admin_creator_list", scanned: rows.length, backfilledFromCache, enriched, skippedNoBudget };
}

async function sweepClientSavedCreators(): Promise<SweepResult> {
  const rows = await db
    .select()
    .from(clientSavedCreators)
    .where(isNull(clientSavedCreators.profilePicUrl))
    .limit(ROWS_PER_TABLE);

  let backfilledFromCache = 0, enriched = 0, skippedNoBudget = 0;
  for (const row of rows) {
    const cached = await getCachedEnrichment(row.platform, row.username);
    let analytics = cached ? extractIcAnalytics(cached.payload, row.platform, row.username) : null;
    if (analytics) backfilledFromCache++;
    else if (icEnrichmentEnabled()) {
      const apiKey = (process.env.INFLUENCERS_CLUB_API_KEY || "").trim();
      const result = apiKey ? await enrichHandleCached(apiKey, row.platform, row.username) : null;
      if (result) {
        analytics = extractIcAnalytics(result.data, row.platform, row.username);
        enriched++;
      }
    } else {
      skippedNoBudget++;
    }
    if (!analytics) continue;

    await db.update(clientSavedCreators).set({
      profilePicUrl: row.profilePicUrl ?? analytics.profilePicture ?? undefined,
      email: row.email ?? analytics.email ?? undefined,
      bio: row.bio ?? analytics.bio ?? undefined,
      followerCount: row.followerCount ?? analytics.followers ?? undefined,
    }).where(eq(clientSavedCreators.id, row.id));
  }
  return { table: "client_saved_creators", scanned: rows.length, backfilledFromCache, enriched, skippedNoBudget };
}

async function sweepSavedInfluencers(): Promise<SweepResult> {
  // No email column on this table — picture/bio/stats only.
  const rows = await db
    .select()
    .from(savedInfluencers)
    .where(isNull(savedInfluencers.profilePicUrl))
    .limit(ROWS_PER_TABLE);

  let backfilledFromCache = 0, enriched = 0, skippedNoBudget = 0;
  for (const row of rows) {
    const cached = await getCachedEnrichment(row.platform, row.username);
    let analytics = cached ? extractIcAnalytics(cached.payload, row.platform, row.username) : null;
    if (analytics) backfilledFromCache++;
    else if (icEnrichmentEnabled()) {
      const apiKey = (process.env.INFLUENCERS_CLUB_API_KEY || "").trim();
      const result = apiKey ? await enrichHandleCached(apiKey, row.platform, row.username) : null;
      if (result) {
        analytics = extractIcAnalytics(result.data, row.platform, row.username);
        enriched++;
      }
    } else {
      skippedNoBudget++;
    }
    if (!analytics) continue;

    await db.update(savedInfluencers).set({
      profilePicUrl: row.profilePicUrl ?? analytics.profilePicture ?? undefined,
      bio: row.bio ?? analytics.bio ?? undefined,
      followerCount: row.followerCount ?? analytics.followers ?? undefined,
    }).where(eq(savedInfluencers.id, row.id));
  }
  return { table: "saved_influencers", scanned: rows.length, backfilledFromCache, enriched, skippedNoBudget };
}

export function registerCronRoutes(app: Express) {
  app.get("/api/cron/enrich-creators", async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error("[Cron] CRON_SECRET is not set — refusing to run enrichment sweep.");
      return res.status(500).json({ message: "Cron not configured" });
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const results = await Promise.all([
        sweepSavedCreators(),
        sweepAdminCreatorList(),
        sweepClientSavedCreators(),
        sweepSavedInfluencers(),
      ]);

      const totalEnriched = results.reduce((n, r) => n + r.enriched, 0);
      const totalSkipped = results.reduce((n, r) => n + r.skippedNoBudget, 0);
      console.log(
        `[Cron] Enrichment sweep: ${totalEnriched} newly enriched, ` +
        `${totalSkipped} skipped (ENABLE_IC_ENRICHMENT off)`,
        results
      );

      res.json({ success: true, enrichmentEnabled: icEnrichmentEnabled(), results });
    } catch (error) {
      console.error("[Cron] Enrichment sweep failed:", error);
      res.status(500).json({ message: "Enrichment sweep failed" });
    }
  });
}
