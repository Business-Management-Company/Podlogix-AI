import type { ID, BaseCanonicalModel, WorkspaceScoped } from "./common";

export type AudiencePlatform = "apple_podcasts" | "spotify" | "youtube" | "amazon_music" | "other";

export interface AudienceBreakdown {
  platform: AudiencePlatform;
  listeners: number;
  downloads: number;
}

/**
 * A rolled-up snapshot of who is listening to a Podcast over a period —
 * the "Audience & Insights" side of the business. This is an aggregate,
 * not a per-listener record (Podlogix doesn't need to model individual
 * listeners as business objects the way it models Guests or Sponsors).
 * For raw, entity-agnostic metrics (episode downloads over time, campaign
 * clicks, ...), see `Analytics` instead — Audience is specifically the
 * "who is listening to this show" rollup.
 */
export interface Audience extends BaseCanonicalModel, WorkspaceScoped {
  podcastId: ID;
  /** ISO 8601. */
  periodStart: string;
  /** ISO 8601. */
  periodEnd: string;
  totalListeners: number;
  totalDownloads: number;
  newSubscribers: number;
  breakdown: AudienceBreakdown[];
  /** Country code -> listener count, when a provider reports geography. */
  topCountries: Record<string, number> | null;
}
