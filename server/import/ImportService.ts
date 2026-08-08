import {
  ImportError,
  type CanonicalRecord,
  type CanonicalEntityType,
  type ImportOptions,
  type ImportRecordResult,
  type ImportBatchResult,
  type ConflictResolution,
  type ConflictResolutionStrategy,
  type AuditLogEntry,
} from "./types";
import type { ConnectorOrigin, ID } from "@shared/models/common";

/**
 * The layer between canonical objects and the database. A connector's job
 * ends at "here is a canonical Podcast/Episode." Everything from here on —
 * is this new or already here, which Podlogix record does it correspond to,
 * what happens when two sources disagree, and recording that any of this
 * took place — belongs to ImportService, never to a connector and never to
 * whatever caller is driving the import.
 *
 * Architecture only, per this milestone — no database access, no
 * persistence. Two kinds of "not built yet" live in this file, and they're
 * deliberately different:
 *
 *  - `resolveExternalId` / `detectDuplicate` return an honest `null`. With
 *    no database to check, "no match found" isn't a placeholder answer —
 *    it's the true answer, since nothing has ever been persisted. Real
 *    lookups replace the body later without changing the contract.
 *
 *  - `reconcile`, `resolveConflict`, and `logAudit` throw `NOT_IMPLEMENTED`.
 *    These can't have an honest trivial answer (reconciling against
 *    nothing, resolving a conflict that doesn't yet have two sides, writing
 *    an audit record with nowhere to write it) — throwing says so plainly
 *    instead of pretending.
 *
 * `importRecord` is real orchestration, not a stub: it actually calls the
 * lookup methods and makes the create-vs-update decision. It only stops
 * short of the one step this milestone excludes — the write itself.
 */
export class ImportService {
  /**
   * The entry point: given one canonical object, decide what importing it
   * means, and (eventually) make it so. Every field on the returned
   * `ImportRecordResult` reflects a real decision except `canonicalId`,
   * which stays null until there's a database to assign one.
   */
  async importRecord(record: CanonicalRecord, options: ImportOptions = {}): Promise<ImportRecordResult> {
    const origin = getOrigin(record);
    const warnings: string[] = [];

    // 1. Have we imported this exact provider record before?
    const mappedId = origin ? await this.resolveExternalId(record.entityType, origin) : null;

    // 2. No mapping — does it look like a record that already exists some
    //    other way (manually entered, imported from a different provider)?
    const duplicateId = mappedId ?? (await this.detectDuplicate(record));

    if (duplicateId) {
      // A real implementation branches here: fetch the existing record,
      // diff it against `record`, and call resolveConflict() if the two
      // disagree on fields a human should arbitrate. Skipped for now —
      // there's no persisted "existing" record to diff against yet.
      const action = "updated" as const;
      if (options.dryRun) {
        return { entityType: record.entityType, origin, action, canonicalId: duplicateId, warnings: [...warnings, "dryRun: no changes were made"] };
      }
      throw new ImportError(record.entityType, "NOT_IMPLEMENTED", "ImportService does not persist updates yet — architecture only.");
    }

    const action = "created" as const;
    if (options.dryRun) {
      return { entityType: record.entityType, origin, action, canonicalId: null, warnings: [...warnings, "dryRun: no changes were made"] };
    }
    throw new ImportError(record.entityType, "NOT_IMPLEMENTED", "ImportService does not persist creates yet — architecture only.");
  }

  /**
   * External ID mapping: has `origin` (provider + externalId) been imported
   * before, and if so, what Podlogix id does it map to? Returns null — with
   * nothing persisted, every external id is by definition unmapped.
   */
  async resolveExternalId(_entityType: CanonicalEntityType, _origin: ConnectorOrigin): Promise<ID | null> {
    return null;
  }

  /**
   * Duplicate detection: even without a known external-id mapping, does
   * this record look like one that already exists (matching title, dates,
   * etc. — e.g. a podcast added manually before any connector was
   * attached)? Returns null for the same reason `resolveExternalId` does.
   */
  async detectDuplicate(_record: CanonicalRecord): Promise<ID | null> {
    return null;
  }

  /**
   * Fetch every external record for a provider, compare it against what's
   * persisted, and produce a full create/update/skip breakdown — including
   * detecting records that disappeared on the provider's side. This is
   * strictly more than repeated `importRecord()` calls (it also has to
   * reason about removals), and has no meaningful behavior without a
   * database to reconcile against.
   */
  async reconcile(entityType: CanonicalEntityType, _provider: string, _incoming: CanonicalRecord[]): Promise<ImportBatchResult> {
    throw new ImportError(entityType, "NOT_IMPLEMENTED", "Sync reconciliation is not implemented yet — architecture only.");
  }

  /**
   * Decide what happens when an existing persisted record and an incoming
   * one disagree. Only reachable once `resolveExternalId`/`detectDuplicate`
   * can actually find an existing record to disagree with.
   */
  async resolveConflict(
    entityType: CanonicalEntityType,
    _existing: CanonicalRecord,
    _incoming: CanonicalRecord,
    _strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    throw new ImportError(entityType, "NOT_IMPLEMENTED", "Conflict resolution is not implemented yet — architecture only.");
  }

  /**
   * Record that an import decision happened. A real audit trail is a
   * database write like any other — explicitly out of scope this
   * milestone, so this throws rather than logging to console as a stand-in
   * (a fake audit trail is worse than an obviously missing one).
   */
  async logAudit(entry: AuditLogEntry): Promise<void> {
    throw new ImportError(entry.entityType, "NOT_IMPLEMENTED", "Audit logging is not implemented yet — architecture only.");
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Not every canonical model tracks a connector origin — only the ones a
 * connector can actually produce today (Podcast, Episode) carry
 * `connections`. A Guest or Sponsor entered by hand has none, and that's a
 * legitimate, expected case, not a data error.
 */
function getOrigin(record: CanonicalRecord): ConnectorOrigin | null {
  const data = record.data as { connections?: ConnectorOrigin[] };
  return data.connections?.[0] ?? null;
}
