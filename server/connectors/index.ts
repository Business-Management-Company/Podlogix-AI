/**
 * Public surface of the Connector Framework. Concrete provider connectors
 * (BuzzsproutConnector, and whatever comes after it) are deliberately NOT
 * re-exported here — the rest of the application should only ever obtain an
 * instance through ConnectorFactory.create(), never import a concrete class
 * directly. That's what keeps provider-specific logic from leaking outward.
 */
export * from "./types";
export { BaseConnector } from "./BaseConnector";
export { PodcastHostConnector } from "./PodcastHostConnector";
export { ConnectorFactory } from "./ConnectorFactory";
