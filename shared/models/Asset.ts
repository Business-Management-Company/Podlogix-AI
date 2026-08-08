import type { BaseCanonicalModel, WorkspaceScoped, EntityRef } from "./common";

export type AssetType = "audio" | "image" | "video" | "document" | "other";

/**
 * A file — artwork, a raw audio file, a video cut, a brand asset. Generic
 * on purpose: this is the one place any binary/media reference lives,
 * regardless of what it's attached to. `Document` is a deliberately
 * separate object even though both wrap a file, because documents carry
 * business meaning (contracts, releases) that assets don't.
 */
export interface Asset extends BaseCanonicalModel, WorkspaceScoped {
  name: string;
  type: AssetType;
  mimeType: string;
  url: string;
  fileSizeBytes: number | null;
  /** What this asset belongs to, if anything — a podcast's artwork, an episode's audio, ... */
  relatedTo: EntityRef | null;
  tags: string[];
}
