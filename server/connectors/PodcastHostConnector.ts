import { BaseConnector } from "./BaseConnector";
import type { PodcastHostCapabilities, ConnectorEpisodeUpdate, PublishEpisodeInput, AnalyticsParams, ConnectorAnalytics } from "./types";
import type { Podcast } from "@shared/models/Podcast";
import type { Episode } from "@shared/models/Episode";

/**
 * The abstraction every podcast-hosting provider extends — Buzzsprout,
 * Libsyn, Transistor, a bare RSS feed, and any host added later. Everything
 * declared here is specific to "this provider manages podcasts and
 * episodes": listing them, updating them, publishing to them, pulling their
 * analytics.
 *
 * A connector for a platform that is NOT a podcast host — YouTube, Patreon,
 * Beehiiv, etc. — extends `BaseConnector` directly and never sees any of
 * this. That separation is the entire point of this file existing: podcast/
 * episode semantics stay confined to the connector family that actually has
 * podcasts and episodes.
 *
 * These methods return the canonical `Podcast`/`Episode` objects from
 * `shared/models/` directly, not an intermediate connector-specific DTO —
 * "the connector maps API responses into canonical objects" is the contract
 * itself, not a downstream step some other service performs later. Mapping
 * from a provider's raw API shape into these types happens entirely inside
 * that provider's own connector file and never leaks outward.
 */
export abstract class PodcastHostConnector extends BaseConnector<PodcastHostCapabilities> {
  abstract getPodcasts(): Promise<Podcast[]>;
  abstract getPodcast(externalId: string): Promise<Podcast | null>;

  abstract getEpisodes(podcastExternalId: string): Promise<Episode[]>;
  abstract getEpisode(episodeExternalId: string): Promise<Episode | null>;
  abstract updateEpisode(episodeExternalId: string, updates: ConnectorEpisodeUpdate): Promise<Episode>;
  abstract publishEpisode(input: PublishEpisodeInput): Promise<Episode>;

  abstract getAnalytics(params: AnalyticsParams): Promise<ConnectorAnalytics>;
}
