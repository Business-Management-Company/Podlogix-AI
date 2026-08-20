-- Adds a user-curated "starred" flag to guest prospects — independent of
-- pipeline stage or contact status, so a person can be starred whether
-- they're just a raw prospect, already in a show's pipeline, or already a
-- Master Contact.
--
-- This migration is intentionally repeatable so it can be applied safely to
-- environments that may already contain some or all of these schema changes.

BEGIN;

ALTER TABLE guest_prospects
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

COMMIT;
