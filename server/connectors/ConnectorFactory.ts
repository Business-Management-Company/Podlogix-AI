import { BaseConnector } from "./BaseConnector";
import { BuzzsproutConnector } from "./BuzzsproutConnector";
import { ConnectorError, type ConnectorConfig, type ConnectorProvider } from "./types";

type ConnectorConstructor = new (config: ConnectorConfig) => BaseConnector;

/**
 * The only place in the application that knows which concrete class backs
 * which provider. Routes, services, and (eventually) UI-facing endpoints ask
 * the factory for a connector and get back a `BaseConnector` — they never
 * import `BuzzsproutConnector` or any other concrete class directly.
 *
 * Adding a new provider (Spotify, Libsyn, Apple Podcasts, YouTube, RSS, ...)
 * is exactly two steps: implement `<Provider>Connector extends BaseConnector`
 * in its own file, then register it in the map below. Nothing else in the
 * app changes.
 */
export class ConnectorFactory {
  private static readonly registry = new Map<ConnectorProvider, ConnectorConstructor>([
    ["buzzsprout", BuzzsproutConnector],
  ]);

  /** Register (or override — e.g. with a mock in tests) the class backing a provider. */
  static register(provider: ConnectorProvider, connectorClass: ConnectorConstructor): void {
    ConnectorFactory.registry.set(provider, connectorClass);
  }

  static isSupported(provider: ConnectorProvider): boolean {
    return ConnectorFactory.registry.has(provider);
  }

  static getSupportedProviders(): ConnectorProvider[] {
    return Array.from(ConnectorFactory.registry.keys());
  }

  /** Create a connector instance for a provider. Callers only ever see the `BaseConnector` type back. */
  static create(provider: ConnectorProvider, config: ConnectorConfig): BaseConnector {
    const ConnectorClass = ConnectorFactory.registry.get(provider);
    if (!ConnectorClass) {
      throw new ConnectorError(
        provider,
        "UNSUPPORTED_OPERATION",
        `No connector is registered for provider "${provider}".`
      );
    }
    return new ConnectorClass(config);
  }
}
