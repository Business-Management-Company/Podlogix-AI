-- Promote researched guest prospects into the master contact list even when
-- an email address has not been revealed yet.
--
-- This migration is intentionally repeatable so it can be applied safely to
-- environments that may already contain some or all of these schema changes.

BEGIN;

ALTER TABLE email_contacts
  ADD COLUMN IF NOT EXISTS guest_prospect_id varchar;

ALTER TABLE email_contacts
  ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS email_contacts_user_guest_prospect
  ON email_contacts (user_id, guest_prospect_id);

COMMIT;
