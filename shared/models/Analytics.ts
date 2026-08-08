import type { ID, BaseCanonicalModel } from "./common";

export type AnalyticsMetric =
  | "downloads"
  | "listeners"
  | "watch_time_seconds"
  | "clicks"
  | "impressions"
  | "revenue_cents"
  | "engagement_rate";

export type AnalyticsEntityType = "podcast" | "episode" | "campaign" | "sponsor" | "guest";

export interface AnalyticsDataPoint {
  /** ISO 8601. */
  timestamp: string;
  value: number;
}

/**
 * A single metric, for a single entity, over a single period — the generic
 * measurement envelope every other object's numbers ultimately reduce to.
 * Where `Audience` is specifically "who listens to this podcast,"
 * Analytics is deliberately entity-agnostic: the same shape reports
 * episode downloads, campaign clicks, or sponsor revenue, which is what
 * makes it the natural fit for a future API/MCP surface that shouldn't
 * need a different response shape per business object.
 */
export interface Analytics extends BaseCanonicalModel {
  entity: AnalyticsEntityType;
  entityId: ID;
  metric: AnalyticsMetric;
  /** Where this figure came from — a connector's provider id, "manual", "calculated", ... */
  source: string;
  /** ISO 8601. */
  periodStart: string;
  /** ISO 8601. */
  periodEnd: string;
  /** The rolled-up total for the period. */
  total: number;
  /** Optional finer-grained breakdown within the period. */
  series: AnalyticsDataPoint[] | null;
}
