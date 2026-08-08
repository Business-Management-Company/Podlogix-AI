/**
 * Provider-agnostic type system for the Connector Framework. Every hosting
 * or distribution platform (Buzzsprout, Spotify, Libsyn, Apple Podcasts,
 * YouTube, RSS, ...) implements the same `Connector` interface and exchanges
 * data through the shapes defined here — nothing provider-specific is
 * allowed to leak past this file into the rest of the application.
 */

// ─── Providers ──────────────────────────────────────────────────────────────

/**
 * Every supported (or planned) provider. Adding a new one starts here —
 * extend the union, write one connector class, register it with
 * ConnectorFactory. Nothing else in the app needs to change.
 */
export const CONNECTOR_PROVIDERS = [
  "buzzsprout",
  "spotify",
  "libsyn",
  "apple_podcasts",
  "youtube",
  "rss",
] as const;

export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

// ─── Connection lifecycle ───────────────────────────────────────────────────

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Opaque bag of whatever a provider's `connect()` needs (API key, OAuth
 * tokens, a bare feed URL, ...). Deliberately untyped at this layer — only
 * the connector implementation for that provider knows its own credential
 * shape. This is what keeps auth details out of everything except the
 * connector itself.
 */
export type ConnectorCredentials = Record<string, unknown>;

export interface ConnectorConfig {
  /** The Podlogix user this connector instance acts on behalf of. */
  userId: string;
  /** Some connectors (e.g. RSS) are scoped to a single existing podcast. */
  podcastId?: string;
  /** Provider-specific credentials, opaque to everything outside the connector. */
  credentials?: ConnectorCredentials;
}

// ─── Capabilities ───────────────────────────────────────────────────────────

/**
 * The capability set every connector, regardless of family, can report.
 * Capabilities let callers branch on what a connector can do without ever
 * writing `instanceof SomeProviderConnector`, which is exactly the kind of
 * provider-specific leakage this framework exists to prevent.
 *
 * Connector *families* extend this with their own additional flags — see
 * `PodcastHostCapabilities` below. A connector's `capabilities` type always
 * matches its position in the class hierarchy: BaseConnector subclasses
 * report `ConnectorCapabilities`, PodcastHostConnector subclasses report the
 * richer `PodcastHostCapabilities`.
 */
export interface ConnectorCapabilities {
  /** Whether calling sync() does anything meaningful for this connector. */
  canSync: boolean;
}

/**
 * Additional capabilities specific to podcast-hosting providers (Buzzsprout,
 * Libsyn, Transistor, RSS, ...). A non-host connector (YouTube, Patreon,
 * Beehiiv, ...) never sees this type — it isn't part of `Connector` or
 * `BaseConnector`, only `PodcastHostConnector`.
 */
export interface PodcastHostCapabilities extends ConnectorCapabilities {
  canPublish: boolean;
  canUpdateEpisodes: boolean;
  canFetchAnalytics: boolean;
}

// ─── Normalized data transfer objects ───────────────────────────────────────
//
// Deliberately distinct from the Drizzle-inferred `Podcast` / `Episode`
// schema types in @shared/schema. A provider's API response rarely maps 1:1
// onto our own DB schema, and coupling the connector layer directly to it
// would mean every schema migration risks breaking every connector. Mapping
// a ConnectorPodcast/ConnectorEpisode into an InsertPodcast/InsertEpisode is
// the job of whatever sync service calls this framework — not the connector.

export interface ConnectorPodcast {
  /** The ID in the *provider's* system — never a Podlogix UUID. */
  externalId: string;
  title: string;
  description: string | null;
  artworkUrl: string | null;
  feedUrl: string | null;
  websiteUrl: string | null;
  language: string | null;
  category: string | null;
  episodeCount: number | null;
}

export interface ConnectorEpisode {
  externalId: string;
  /** The provider-side podcast this episode belongs to. */
  podcastExternalId: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  status: "draft" | "scheduled" | "published";
  /** ISO 8601. */
  publishedAt: string | null;
}

export interface ConnectorEpisodeUpdate {
  title?: string;
  description?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  /** ISO 8601. */
  publishedAt?: string;
}

export interface PublishEpisodeInput {
  podcastExternalId: string;
  title: string;
  description?: string;
  audioUrl: string;
  episodeNumber?: number;
  seasonNumber?: number;
  /** Publish immediately if omitted; otherwise schedule. ISO 8601. */
  publishAt?: string;
}

export interface AnalyticsParams {
  podcastExternalId: string;
  episodeExternalId?: string;
  /** ISO 8601 range; providers that only expose lifetime totals may ignore this. */
  startDate?: string;
  endDate?: string;
}

export interface ConnectorAnalytics {
  podcastExternalId: string;
  episodeExternalId: string | null;
  downloads: number;
  listeners: number | null;
  /** Provider-reported breakdown by platform (Apple, Spotify, ...), when available. */
  byPlatform: Record<string, number> | null;
  periodStart: string | null;
  periodEnd: string | null;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

/**
 * sync() lives on the base `Connector` interface, so its result has to make
 * sense for any connector family — a YouTube or Patreon connector has no
 * "podcasts" or "episodes" to count. `itemsSynced` is the universal total;
 * `details` lets a family report its own breakdown (a podcast host might
 * report `{ podcasts: 2, episodes: 40 }`, YouTube might report
 * `{ videos: 12 }`) without that vocabulary leaking into the shared type.
 */
export interface SyncResult {
  provider: ConnectorProvider;
  startedAt: string;
  completedAt: string;
  itemsSynced: number;
  details?: Record<string, number>;
  errors: ConnectorErrorInfo[];
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export type ConnectorErrorCode =
  | "NOT_CONNECTED"
  | "NOT_IMPLEMENTED"
  | "AUTH_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "UNSUPPORTED_OPERATION";

export interface ConnectorErrorInfo {
  code: ConnectorErrorCode;
  message: string;
  /** Whether the caller can reasonably retry (rate limit) vs. not (bad credentials). */
  retryable: boolean;
}

export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;
  readonly provider: ConnectorProvider;
  readonly retryable: boolean;

  constructor(provider: ConnectorProvider, code: ConnectorErrorCode, message: string, retryable = false) {
    super(message);
    this.name = "ConnectorError";
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
  }

  toInfo(): ConnectorErrorInfo {
    return { code: this.code, message: this.message, retryable: this.retryable };
  }
}

// ─── The interface every provider implements ────────────────────────────────

/**
 * The single contract every connector — regardless of family — fulfills.
 * No route, service, or UI should import a concrete connector class — only
 * this interface (via BaseConnector) and the ConnectorFactory that produces
 * instances of it.
 *
 * Deliberately minimal: only connect/disconnect/sync and status/capability
 * introspection. Anything specific to a connector *family* (podcast hosts
 * manage podcasts and episodes; a future family might manage videos, or
 * memberships) belongs on that family's own abstraction — see
 * `PodcastHostConnector` — not here. That's what lets a YouTube or Patreon
 * connector extend BaseConnector directly without inheriting podcast/episode
 * methods that would never make sense for it.
 */
export interface Connector {
  readonly provider: ConnectorProvider;
  readonly capabilities: ConnectorCapabilities;

  getStatus(): ConnectionStatus;

  connect(credentials: ConnectorCredentials): Promise<ConnectionStatus>;
  disconnect(): Promise<void>;

  sync(): Promise<SyncResult>;
}
