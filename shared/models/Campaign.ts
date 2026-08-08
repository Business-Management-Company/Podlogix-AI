import type { ID, BaseCanonicalModel, WorkspaceScoped } from "./common";

export type CampaignType = "sponsorship" | "newsletter" | "social" | "launch" | "cross-promo";
export type CampaignStatus = "planning" | "scheduled" | "active" | "completed" | "cancelled";

/**
 * A promotional effort spanning one or more podcasts/episodes — a
 * sponsorship activation, a launch push, a newsletter send, a cross-promo.
 * Distinct from `Sponsor`: a Campaign is the *activity*, a Sponsor is the
 * *relationship* that may fund or motivate it (hence the optional
 * `sponsorId` link rather than a hard dependency).
 */
export interface Campaign extends BaseCanonicalModel, WorkspaceScoped {
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  /** ISO 8601. */
  startDate: string | null;
  /** ISO 8601. */
  endDate: string | null;
  podcastIds: ID[];
  episodeIds: ID[];
  sponsorId: ID | null;
  goal: string | null;
  budgetCents: number | null;
}
