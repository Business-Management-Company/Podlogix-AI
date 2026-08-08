import type { ID, BaseCanonicalModel, ConnectorOrigin } from "./common";

export type EpisodeStatus = "draft" | "scheduled" | "published" | "archived";
export type EpisodeType = "full" | "trailer" | "bonus";

/**
 * A single episode of a Podcast. Scoped through `podcastId` rather than
 * carrying its own `userId` — workspace ownership is derived from the
 * parent Podcast, not duplicated here. A connector's `ConnectorEpisode` DTO
 * maps into this.
 */
export interface Episode extends BaseCanonicalModel {
  podcastId: ID;
  title: string;
  description: string | null;
  showNotes: string | null;
  audioUrl: string | null;
  artworkUrl: string | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  episodeType: EpisodeType;
  isExplicit: boolean;
  status: EpisodeStatus;
  /** ISO 8601. */
  publishedAt: string | null;
  /** Guests featured on this episode. */
  guestIds: ID[];
  /** Sponsors with a read/placement in this episode. */
  sponsorIds: ID[];
  /** One entry per external system this episode is connected to. */
  connections: ConnectorOrigin[];
}
