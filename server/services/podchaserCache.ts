import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Permanent, app-wide cache for Podchaser data — same philosophy as
 * creator_enrichment_cache in icEnrichment.ts: a request already paid for
 * (out of the Starter plan's 1,000/month budget) is never paid again.
 *
 * Two layers:
 *  - podchaser_podcasts / podchaser_creators: every podcast or creator
 *    object we've ever seen, upserted whenever one flows through search,
 *    credits, or a detail lookup. This is the "our own database" — it only
 *    grows, and rss_url gets its own column since it's the thing that lets
 *    us pull episode data ourselves later without going back to Podchaser.
 *  - podchaser_search_cache: the search RESULT (an ordered list of ids +
 *    pagination), keyed by the exact query. A repeat search — including the
 *    ~14 topic-tile lookups Discover fires on every page load — is served
 *    from here instead of spending real quota.
 *
 * Search results are cached 24h (metadata like this barely changes minute
 * to minute); podcast/creator records themselves never expire — a stale
 * follower count is a fine trade for not re-buying data we already have.
 *
 * podchaser_usage_log records every REAL request that actually left our
 * server and hit Podchaser (i.e. every cache miss) — one row per request
 * against the 1,000/month budget, tagged with which action triggered it.
 * This is what lets us answer "what used up our requests this month"
 * instead of only ever seeing the remaining balance.
 */

const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let tableReady: Promise<void> | undefined;
function ensureTables(): Promise<void> {
  return (tableReady ??= (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS podchaser_podcasts (
        podchaser_id varchar PRIMARY KEY,
        title varchar NOT NULL,
        image_url text,
        rss_url text,
        payload jsonb NOT NULL,
        first_seen_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS podchaser_creators (
        podchaser_id varchar PRIMARY KEY,
        name varchar NOT NULL,
        image_url text,
        payload jsonb NOT NULL,
        first_seen_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS podchaser_search_cache (
        cache_key varchar PRIMARY KEY,
        search_type varchar NOT NULL,
        payload jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS podchaser_usage_log (
        id bigserial PRIMARY KEY,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        action varchar NOT NULL,
        path varchar NOT NULL,
        query jsonb,
        status_code integer
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS podchaser_usage_log_occurred_at_idx ON podchaser_usage_log (occurred_at)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS podchaser_usage_log_action_idx ON podchaser_usage_log (action)
    `);
  })());
}

export async function getCachedSearch<T>(cacheKey: string): Promise<T | null> {
  await ensureTables();
  const result = await db.execute(sql`
    SELECT payload FROM podchaser_search_cache
    WHERE cache_key = ${cacheKey} AND fetched_at > now() - interval '24 hours'
  `);
  const row: any = (result as any).rows?.[0];
  if (!row) return null;
  return (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as T;
}

export async function saveCachedSearch(cacheKey: string, searchType: "creator" | "podcast", payload: unknown): Promise<void> {
  await ensureTables();
  await db.execute(sql`
    INSERT INTO podchaser_search_cache (cache_key, search_type, payload, fetched_at)
    VALUES (${cacheKey}, ${searchType}, ${JSON.stringify(payload)}::jsonb, now())
    ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
  `);
}

export async function saveCachedPodcasts(podcasts: Array<{ id: string; title: string; imageUrl: string | null; rssUrl: string | null }>): Promise<void> {
  if (podcasts.length === 0) return;
  await ensureTables();
  for (const podcast of podcasts) {
    if (!podcast.id) continue;
    await db.execute(sql`
      INSERT INTO podchaser_podcasts (podchaser_id, title, image_url, rss_url, payload, updated_at)
      VALUES (${podcast.id}, ${podcast.title}, ${podcast.imageUrl}, ${podcast.rssUrl}, ${JSON.stringify(podcast)}::jsonb, now())
      ON CONFLICT (podchaser_id) DO UPDATE SET
        title = EXCLUDED.title,
        image_url = EXCLUDED.image_url,
        rss_url = COALESCE(EXCLUDED.rss_url, podchaser_podcasts.rss_url),
        payload = EXCLUDED.payload,
        updated_at = now()
    `);
  }
}

export async function saveCachedCreators(creators: Array<{ id: string; name: string; imageUrl: string | null }>): Promise<void> {
  if (creators.length === 0) return;
  await ensureTables();
  for (const creator of creators) {
    if (!creator.id) continue;
    await db.execute(sql`
      INSERT INTO podchaser_creators (podchaser_id, name, image_url, payload, updated_at)
      VALUES (${creator.id}, ${creator.name}, ${creator.imageUrl}, ${JSON.stringify(creator)}::jsonb, now())
      ON CONFLICT (podchaser_id) DO UPDATE SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        payload = EXCLUDED.payload,
        updated_at = now()
    `);
  }
}

/**
 * Fire-and-forget usage log for a single real Podchaser request. Called from
 * requestPodchaser() in podchaserGuestService.ts right after every fetch
 * that actually reaches Podchaser (cache hits never get here, by design).
 * Never throws — a logging failure should never take down a real request.
 */
export async function logPodchaserUsage(
  action: string,
  path: string,
  query: Record<string, string> = {},
  statusCode: number | null = null,
): Promise<void> {
  try {
    await ensureTables();
    await db.execute(sql`
      INSERT INTO podchaser_usage_log (action, path, query, status_code)
      VALUES (${action}, ${path}, ${JSON.stringify(query)}::jsonb, ${statusCode})
    `);
  } catch (error) {
    console.error("Failed to write podchaser_usage_log row:", error);
  }
}

/**
 * Grouped counts for the Financials tab — "what used up our Podchaser
 * requests", broken down by action, over the last N days. This is the
 * direct answer to "I wonder what triggered those other ones."
 */
export async function getPodchaserUsageBreakdown(sinceDays = 30): Promise<Array<{ action: string; count: number; lastOccurredAt: string }>> {
  await ensureTables();
  const result = await db.execute(sql`
    SELECT action, count(*)::int AS count, max(occurred_at) AS last_occurred_at
    FROM podchaser_usage_log
    WHERE occurred_at > now() - interval '1 day' * ${sinceDays}
    GROUP BY action
    ORDER BY count DESC
  `);
  const rows: any[] = (result as any).rows ?? [];
  return rows.map((row) => ({
    action: row.action,
    count: Number(row.count),
    lastOccurredAt: row.last_occurred_at,
  }));
}
