import {
  ConnectorError,
  type Connector,
  type ConnectorProvider,
  type ConnectorCapabilities,
  type ConnectorConfig,
  type ConnectorCredentials,
  type ConnectionStatus,
  type SyncResult,
} from "./types";

/**
 * Shared skeleton every connector extends, regardless of family. Owns
 * everything that is genuinely identical across every provider — connection
 * state, the "are we connected" guard, capability enforcement — so a
 * connector's own file contains *only* what's actually different about it.
 *
 * Nothing in this file may reference a specific provider, or a specific
 * connector *family* (podcast host, video platform, membership platform,
 * ...), by name. Family-specific methods (getPodcasts, publishEpisode, ...)
 * live one level down, on abstractions like `PodcastHostConnector` — never
 * here, so that a connector for a platform that ISN'T a podcast host
 * (YouTube, Patreon, Beehiiv, ...) can extend this class directly without
 * dragging in podcast/episode behavior that would never make sense for it.
 *
 * Generic over its capability set so each family can extend
 * `ConnectorCapabilities` with its own flags (see `PodcastHostCapabilities`)
 * while still sharing this same base and its `ensureSupported()` guard.
 */
export abstract class BaseConnector<TCapabilities extends ConnectorCapabilities = ConnectorCapabilities>
  implements Connector
{
  abstract readonly provider: ConnectorProvider;
  abstract readonly capabilities: TCapabilities;

  protected readonly userId: string;
  protected readonly podcastId?: string;
  protected credentials: ConnectorCredentials | null;
  protected status: ConnectionStatus = "disconnected";

  constructor(config: ConnectorConfig) {
    this.userId = config.userId;
    this.podcastId = config.podcastId;
    this.credentials = config.credentials ?? null;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Template method: subclasses implement the provider-specific handshake in
   * `authenticate()`; this wrapper handles the state transitions and error
   * normalization every provider needs identically, so connect() can never
   * be forgotten or done inconsistently by a subclass.
   */
  async connect(credentials: ConnectorCredentials): Promise<ConnectionStatus> {
    this.status = "connecting";
    this.credentials = credentials;
    try {
      await this.authenticate(credentials);
      this.status = "connected";
    } catch (error) {
      this.status = "error";
      throw error instanceof ConnectorError
        ? error
        : new ConnectorError(this.provider, "AUTH_FAILED", this.describeError(error));
    }
    return this.status;
  }

  async disconnect(): Promise<void> {
    await this.teardown();
    this.credentials = null;
    this.status = "disconnected";
  }

  /** Guard for operations that require an active connection. Every concrete method that talks to a provider's API should call this first. */
  protected ensureConnected(): void {
    if (this.status !== "connected") {
      throw new ConnectorError(this.provider, "NOT_CONNECTED", `${this.provider} connector is not connected.`);
    }
  }

  /** Guard for operations a provider may not support. */
  protected ensureSupported(capability: keyof TCapabilities): void {
    if (!this.capabilities[capability]) {
      throw new ConnectorError(
        this.provider,
        "UNSUPPORTED_OPERATION",
        `${this.provider} does not support "${String(capability)}".`
      );
    }
  }

  protected describeError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  // ─── Provider-specific hooks ───────────────────────────────────────────────
  // BaseConnector deliberately has no opinion on *how* a provider
  // authenticates or syncs — only on the shape those operations must take.

  /** Perform the actual credential handshake (API key check, OAuth exchange, feed fetch, ...). */
  protected abstract authenticate(credentials: ConnectorCredentials): Promise<void>;

  /** Release any provider-side resources on disconnect (revoke tokens, etc.). Most providers have nothing to do here. */
  protected async teardown(): Promise<void> {
    // Default no-op; override where a provider needs explicit cleanup.
  }

  abstract sync(): Promise<SyncResult>;
}
