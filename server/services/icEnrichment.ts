import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Global, permanent cache for Influencers.club creator enrichment — keyed by
 * (platform, handle), shared across every user and feature. A creator only
 * ever gets enriched once; every subsequent lookup — a different user, a
 * different page, a search result appearing again — is served from here.
 *
 * Separate from the outbound-call kill switch (ENABLE_IC_ENRICHMENT): the
 * cache always answers a hit for free; only a miss consults the flag before
 * spending a credit.
 */

export function normalizeSocialHandle(input: string): string {
  let h = (input || "").trim();
  const urlMatch = h.match(/(?:instagram\.com|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|twitch\.tv)\/(@?[A-Za-z0-9_.\-]+)/i);
  if (urlMatch) h = urlMatch[1];
  return h.replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
}

export function icEnrichmentEnabled(): boolean {
  return process.env.ENABLE_IC_ENRICHMENT === "1";
}

let tableReady: Promise<void> | undefined;
function ensureTable(): Promise<void> {
  return (tableReady ??= db
    .execute(sql`
      CREATE TABLE IF NOT EXISTS creator_enrichment_cache (
        platform varchar NOT NULL,
        handle varchar NOT NULL,
        payload jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (platform, handle)
      )
    `)
    .then(() => undefined));
}

export async function getCachedEnrichment(platform: string, handle: string): Promise<{ payload: any; fetchedAt: string } | null> {
  await ensureTable();
  const result = await db.execute(sql`
    SELECT payload, fetched_at FROM creator_enrichment_cache
    WHERE platform = ${platform} AND handle = ${normalizeSocialHandle(handle)}
  `);
  const row: any = (result as any).rows?.[0];
  if (!row) return null;
  return {
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    fetchedAt: row.fetched_at,
  };
}

export async function saveEnrichment(platform: string, handle: string, payload: any): Promise<void> {
  await ensureTable();
  await db.execute(sql`
    INSERT INTO creator_enrichment_cache (platform, handle, payload, fetched_at)
    VALUES (${platform}, ${normalizeSocialHandle(handle)}, ${JSON.stringify(payload)}::jsonb, now())
    ON CONFLICT (platform, handle) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
  `);
}

/**
 * Cache-first enrich by handle. Returns null (never throws) when nothing
 * usable could be produced — no cache row and either the kill switch is off
 * or the upstream call failed — so callers can respond with their own
 * "not available" message.
 */
export async function enrichHandleCached(
  apiKey: string,
  platform: string,
  handle: string,
  extra: Record<string, any> = {},
  opts: { force?: boolean } = {}
): Promise<{ data: any; fromCache: boolean } | null> {
  const normalized = normalizeSocialHandle(handle);
  if (!opts.force) {
    const cached = await getCachedEnrichment(platform, normalized);
    if (cached) return { data: cached.payload, fromCache: true };
  }

  if (!icEnrichmentEnabled()) return null;

  const response = await fetch("https://api-dashboard.influencers.club/public/v1/creators/enrich/handle/full/", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ handle: normalized, platform, ...extra }),
  });
  if (!response.ok) return null;

  const data = await response.json();
  await saveEnrichment(platform, normalized, data);
  return { data, fromCache: false };
}
