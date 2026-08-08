import type { ID, BaseCanonicalModel, WorkspaceScoped } from "./common";

export type SponsorStatus = "prospect" | "negotiating" | "active" | "completed" | "churned";
export type AdPlacement = "pre-roll" | "mid-roll" | "post-roll" | "host-read" | "programmatic";
export type SponsorDealStatus = "pending" | "invoiced" | "paid";

export interface SponsorDeal {
  id: ID;
  episodeId: ID | null;
  campaignId: ID | null;
  placement: AdPlacement;
  amountCents: number;
  currency: string;
  status: SponsorDealStatus;
}

/**
 * A brand or advertiser relationship — the revenue side of the business.
 * A Sponsor may have many deals across many episodes/campaigns over time,
 * tracked here rather than as separate top-level objects, since a deal has
 * no independent lifecycle outside its sponsor.
 */
export interface Sponsor extends BaseCanonicalModel, WorkspaceScoped {
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  logoUrl: string | null;
  website: string | null;
  status: SponsorStatus;
  deals: SponsorDeal[];
  notes: string | null;
}
