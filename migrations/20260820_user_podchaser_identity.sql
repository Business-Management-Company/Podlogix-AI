-- Lets a Podlogix user link their own Podchaser creator id, so "What shows
-- have I been on" can reuse the existing guest-appearance-history lookup
-- (originally built to research other people) pointed at themselves.
--
-- Repeatable: safe to re-run.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS podchaser_person_id varchar;

COMMIT;
