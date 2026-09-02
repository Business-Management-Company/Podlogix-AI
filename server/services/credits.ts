import { pool } from "../db";

/**
 * Credits — the user-facing meter for anything that costs Podlogix money.
 *
 * Every paid action (Whisper transcription, a GPT-4o call, an Influencers.club
 * lookup) records one ledger row: the credits the user is charged, plus our
 * own estimated vendor cost in cents so admins can reconcile spend against
 * usage. The ledger is append-only; balances are derived from it.
 *
 * Pricing is deliberately simple to explain: one action = its listed credits,
 * regardless of tokens. Adjust CREDIT_COSTS to reprice — nothing else changes.
 * Nothing is *blocked* at zero yet; enforcement is a follow-up once the
 * allowance per plan is decided.
 */

export type CreditAction =
  | "transcript"
  | "briefing"
  | "ai_chat"
  | "clip_candidates"
  | "ai_caption"
  | "detect_moments"
  | "speech_analysis"
  | "video_analysis"
  | "social_post_ai"
  | "social_batch_ai"
  | "ai_profile"
  | "ai_email"
  | "enrichment";

export const CREDIT_COSTS: Record<CreditAction, { credits: number; label: string; costCents: number }> = {
  transcript:      { credits: 1, label: "Episode transcript",        costCents: 0 },  // cost computed per minute below
  briefing:        { credits: 1, label: "AI briefing",               costCents: 2 },
  ai_chat:         { credits: 1, label: "Podlogix AI chat",          costCents: 1 },
  clip_candidates: { credits: 1, label: "AI clip selection",         costCents: 3 },
  ai_caption:      { credits: 1, label: "AI clip caption",           costCents: 1 },
  detect_moments:  { credits: 1, label: "Live moment detection",     costCents: 2 },
  speech_analysis: { credits: 1, label: "Speaking analysis",         costCents: 2 },
  video_analysis:  { credits: 1, label: "Video analysis",            costCents: 3 },
  social_post_ai:  { credits: 1, label: "AI social post",            costCents: 1 },
  social_batch_ai: { credits: 3, label: "AI social series",          costCents: 5 },
  ai_profile:      { credits: 1, label: "AI profile writing",        costCents: 1 },
  ai_email:        { credits: 1, label: "AI email writing",          costCents: 1 },
  enrichment:      { credits: 2, label: "Guest enrichment lookup",   costCents: 60 }, // influencers.club ≈ $0.60/full enrich
};

/** Whisper is billed per audio minute — $0.006/min. */
const WHISPER_CENTS_PER_MINUTE = 0.6;

/** Monthly allowance until per-plan allowances exist. */
export function monthlyAllowance(): number {
  const n = Number(process.env.CREDIT_MONTHLY_ALLOWANCE);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

let ensured: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!pool) return Promise.resolve();
  if (!ensured) {
    ensured = pool.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       varchar NOT NULL,
        action        varchar NOT NULL,
        credits       numeric(10,2) NOT NULL,
        cost_cents    integer NOT NULL DEFAULT 0,
        label         varchar,
        resource_type varchar,
        resource_id   varchar,
        meta          jsonb,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx ON credit_ledger (user_id, created_at DESC);
    `).then(() => undefined).catch((e) => { console.error("credit_ledger ensure failed:", e?.message); ensured = null; });
  }
  return ensured;
}

export interface ChargeOptions {
  /** Human label for the row — episode title, handle, etc. */
  label?: string;
  resourceType?: string;
  resourceId?: string;
  /** Audio minutes — used to price transcripts. */
  minutes?: number;
  /** Override the table's credits (e.g. long transcripts). */
  credits?: number;
  meta?: Record<string, unknown>;
}

/**
 * Record a charge. Never throws — a ledger hiccup must not fail the action the
 * user just paid for; it logs and moves on.
 */
export async function chargeCredits(userId: string, action: CreditAction, opts: ChargeOptions = {}): Promise<void> {
  if (!pool || !userId) return;
  const price = CREDIT_COSTS[action];
  const credits = opts.credits ?? price.credits;
  const costCents = action === "transcript"
    ? Math.round((opts.minutes ?? 0) * WHISPER_CENTS_PER_MINUTE)
    : price.costCents;
  try {
    await ensureTable();
    await pool.query(
      `INSERT INTO credit_ledger (user_id, action, credits, cost_cents, label, resource_type, resource_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, credits, costCents, opts.label ?? price.label, opts.resourceType ?? null, opts.resourceId ?? null, opts.meta ? JSON.stringify(opts.meta) : null],
    );
  } catch (e: any) {
    console.error(`chargeCredits(${action}) failed:`, e?.message);
  }
}

export interface CreditSummary {
  allowance: number;
  usedThisMonth: number;
  remaining: number;
  costCentsThisMonth: number;
  byAction: Array<{ action: CreditAction; label: string; count: number; credits: number }>;
  recent: Array<{ id: string; action: CreditAction; label: string | null; credits: number; createdAt: string; resourceType: string | null; resourceId: string | null }>;
  pricing: Array<{ action: CreditAction; label: string; credits: number }>;
}

/** What a user sees under Billing: this month's usage, breakdown, and receipts. */
export async function getCreditSummary(userId: string, opts: { includeCost?: boolean } = {}): Promise<CreditSummary> {
  const allowance = monthlyAllowance();
  const pricing = (Object.keys(CREDIT_COSTS) as CreditAction[]).map((a) => ({ action: a, label: CREDIT_COSTS[a].label, credits: CREDIT_COSTS[a].credits }));
  const empty: CreditSummary = { allowance, usedThisMonth: 0, remaining: allowance, costCentsThisMonth: 0, byAction: [], recent: [], pricing };
  if (!pool) return empty;
  await ensureTable();

  const [{ rows: totals }, { rows: byAction }, { rows: recent }] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(credits),0)::float AS used, COALESCE(SUM(cost_cents),0)::int AS cost
         FROM credit_ledger WHERE user_id = $1 AND created_at >= date_trunc('month', now())`,
      [userId],
    ),
    pool.query(
      `SELECT action, COUNT(*)::int AS count, SUM(credits)::float AS credits
         FROM credit_ledger WHERE user_id = $1 AND created_at >= date_trunc('month', now())
         GROUP BY action ORDER BY credits DESC`,
      [userId],
    ),
    pool.query(
      `SELECT id, action, label, credits::float AS credits, created_at, resource_type, resource_id
         FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId],
    ),
  ]);

  const used = Number(totals[0]?.used ?? 0);
  return {
    allowance,
    usedThisMonth: used,
    remaining: Math.max(0, allowance - used),
    costCentsThisMonth: opts.includeCost ? Number(totals[0]?.cost ?? 0) : 0,
    byAction: byAction.map((r: any) => ({ action: r.action, label: CREDIT_COSTS[r.action as CreditAction]?.label ?? r.action, count: r.count, credits: Number(r.credits) })),
    recent: recent.map((r: any) => ({ id: r.id, action: r.action, label: r.label, credits: Number(r.credits), createdAt: new Date(r.created_at).toISOString(), resourceType: r.resource_type, resourceId: r.resource_id })),
    pricing,
  };
}
