/**
 * Types for the Import Service — the layer between canonical objects and
 * the database:
 *
 *   Provider API -> Connector -> Canonical Models -> Import Service -> Database
 *
 * A connector's job ends the moment it hands back a canonical `Podcast` or
 * `Episode`. Everything after that — deciding whether a given canonical
 * object is new or already exists, which Podlogix record it corresponds to,
 * what to do when two sources disagree, and recording that any of this
 * happened — is the Import Service's job, not the connector's and not the
 * caller's.
 *
 * Architecture only, per this milestone: no database access, no real
 * matching logic, no persistence. See ImportService.ts for what's a real
 * (if trivial) implementation today versus a documented NOT_IMPLEMENTED
 * stub.
 */

import type { ID, ConnectorOrigin } from "@shared/models/common";
import type { Podcast } from "@shared/models/Podcast";
import type { Episode } from "@shared/models/Episode";
import type { Guest } from "@shared/models/Guest";
import type { Sponsor } from "@shared/models/Sponsor";
import type { Campaign } from "@shared/models/Campaign";
import type { Audience } from "@shared/models/Audience";
import type { Asset } from "@shared/models/Asset";
import type { Document } from "@shared/models/Document";
import type { Task } from "@shared/models/Task";
import type { Automation } from "@shared/models/Automation";
import type { Analytics } from "@shared/models/Analytics";

// ─── The universe of importable canonical objects ───────────────────────────

export const CANONICAL_ENTITY_TYPES = [
  "podcast",
  "episode",
  "guest",
  "sponsor",
  "campaign",
  "audience",
  "asset",
  "document",
  "task",
  "automation",
  "analytics",
] as const;

export type CanonicalEntityType = (typeof CANONICAL_ENTITY_TYPES)[number];

/**
 * A discriminated union over every canonical model. Lets ImportService
 * accept "any canonical object" while staying fully type-safe — narrowing
 * on `entityType` narrows `data` to the matching model, both here and at
 * every call site. Only `podcast` and `episode` are actually produced by a
 * connector today (BuzzsproutConnector); the rest exist so the Import
 * Service's shape doesn't need to change as more producers (other
 * connectors, manual entry, CSV import, ...) come online.
 */
export type CanonicalRecord =
  | { entityType: "podcast"; data: Podcast }
  | { entityType: "episode"; data: Episode }
  | { entityType: "guest"; data: Guest }
  | { entityType: "sponsor"; data: Sponsor }
  | { entityType: "campaign"; data: Campaign }
  | { entityType: "audience"; data: Audience }
  | { entityType: "asset"; data: Asset }
  | { entityType: "document"; data: Document }
  | { entityType: "task"; data: Task }
  | { entityType: "automation"; data: Automation }
  | { entityType: "analytics"; data: Analytics };

// ─── External ID mapping ─────────────────────────────────────────────────────

/** A persisted link between "provider X's record Y" and "Podlogix's record Z." This is what makes re-imports update instead of duplicate. */
export interface ExternalIdMapping {
  entityType: CanonicalEntityType;
  provider: string;
  externalId: string;
  canonicalId: ID;
  /** ISO 8601 — when this mapping was first created. */
  mappedAt: string;
}

// ─── Import outcomes ──────────────────────────────────────────────────────────

export type ImportAction = "created" | "updated" | "skipped" | "conflict";

export interface ImportOptions {
  /** If true, run every decision (mapping lookup, duplicate check) without persisting anything. */
  dryRun?: boolean;
  conflictStrategy?: ConflictResolutionStrategy;
}

export interface ImportRecordResult {
  entityType: CanonicalEntityType;
  /** The connector this record came from, if any — a manually-entered record has none. */
  origin: ConnectorOrigin | null;
  action: ImportAction;
  /** The Podlogix id this record maps to. Null until persistence exists. */
  canonicalId: ID | null;
  warnings: string[];
}

export interface ImportBatchResult {
  entityType: CanonicalEntityType;
  startedAt: string;
  completedAt: string;
  created: number;
  updated: number;
  skipped: number;
  conflicts: number;
  failed: number;
  errors: ImportErrorInfo[];
}

// ─── Conflict resolution ──────────────────────────────────────────────────────

export type ConflictResolutionStrategy = "prefer_incoming" | "prefer_existing" | "merge" | "manual_review";

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  /** The record to persist, once persistence exists. Null when the strategy defers to a human. */
  resolvedRecord: CanonicalRecord | null;
  requiresManualReview: boolean;
  reason: string;
}

// ─── Audit logging ──────────────────────────────────────────────────────────

export type AuditAction = "import_created" | "import_updated" | "import_skipped" | "import_conflict" | "import_failed";

export interface AuditLogEntry {
  id: ID;
  /** ISO 8601. */
  timestamp: string;
  entityType: CanonicalEntityType;
  entityId: ID | null;
  action: AuditAction;
  origin: ConnectorOrigin | null;
  /** Who/what caused this — a userId, "system", "scheduled_sync", etc. */
  actor: string;
  details: Record<string, unknown> | null;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export type ImportErrorCode = "NOT_IMPLEMENTED" | "INVALID_RECORD" | "CONFLICT_UNRESOLVED" | "PERSISTENCE_ERROR";

export interface ImportErrorInfo {
  code: ImportErrorCode;
  message: string;
  entityType: CanonicalEntityType | null;
}

export class ImportError extends Error {
  readonly code: ImportErrorCode;
  readonly entityType: CanonicalEntityType | null;

  constructor(entityType: CanonicalEntityType | null, code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportError";
    this.entityType = entityType;
    this.code = code;
  }

  toInfo(): ImportErrorInfo {
    return { code: this.code, message: this.message, entityType: this.entityType };
  }
}
