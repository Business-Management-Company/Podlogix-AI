/**
 * Shared shapes reused across the canonical business object model
 * (Podcast, Episode, Guest, Sponsor, Campaign, Audience, Asset, Document,
 * Task, Automation, Analytics). Pure TypeScript — no Drizzle, no runtime
 * logic. Unlike `auth.ts`/`chat.ts` in this same directory, nothing here is
 * a database table: it is not imported by `schema.ts`, and the database
 * does not define these shapes — they define what the database will
 * eventually map into.
 */

export type ID = string;

/** Fields every canonical object has. */
export interface BaseCanonicalModel {
  id: ID;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

/** For objects that belong to a single Podlogix workspace/user. */
export interface WorkspaceScoped {
  userId: ID;
}

/**
 * Marks a canonical object as having been synced in from an external
 * connector-managed system, and which one. `provider` is a plain string
 * (not the Connector Framework's `ConnectorProvider` union) so this model
 * layer has no build dependency on `server/connectors` — the two systems
 * communicate through connector DTOs, not shared types, keeping each free
 * to evolve independently.
 */
export interface ConnectorOrigin {
  provider: string;
  externalId: string;
  /** ISO 8601 — when this record was last reconciled with the provider. */
  lastSyncedAt: string;
}

/** A lightweight, polymorphic reference to another canonical object — used instead of embedding to keep these interfaces normalized. */
export interface EntityRef {
  entity: "podcast" | "episode" | "guest" | "sponsor" | "campaign" | "task";
  id: ID;
}
