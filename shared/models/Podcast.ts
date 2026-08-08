import type { BaseCanonicalModel, WorkspaceScoped, ConnectorOrigin } from "./common";

export type PodcastStatus = "draft" | "active" | "paused" | "archived";

/**
 * A show. The canonical object every episode, guest booking, sponsorship,
 * and campaign ultimately rolls up to. A connector's `ConnectorPodcast` DTO
 * (see server/connectors/types.ts) maps into this — never the other way
 * around, and a podcast may be synced from more than one provider at once
 * (e.g. hosted on Buzzsprout, also tracked via a raw RSS connector).
 */
export interface Podcast extends BaseCanonicalModel, WorkspaceScoped {
  title: string;
  description: string | null;
  artworkUrl: string | null;
  websiteUrl: string | null;
  feedUrl: string | null;
  language: string | null;
  category: string | null;
  isExplicit: boolean;
  status: PodcastStatus;
  episodeCount: number;
  /** One entry per external system this podcast is connected to. */
  connections: ConnectorOrigin[];
}
