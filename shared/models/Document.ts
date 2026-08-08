import type { BaseCanonicalModel, WorkspaceScoped, EntityRef } from "./common";

export type DocumentType = "contract" | "media_kit" | "release_form" | "sop" | "brief" | "other";
export type DocumentStatus = "draft" | "pending_signature" | "signed" | "archived";

/**
 * A business document with its own lifecycle — a sponsor contract, a
 * guest release form, a media kit, an internal SOP. Where `Asset` is "a
 * file," `Document` is "a file that means something legally or
 * operationally," tracked through signature/expiry state that a plain
 * Asset has no reason to carry.
 */
export interface Document extends BaseCanonicalModel, WorkspaceScoped {
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  fileUrl: string | null;
  relatedTo: EntityRef | null;
  /** ISO 8601. */
  signedAt: string | null;
  /** ISO 8601. */
  expiresAt: string | null;
}
