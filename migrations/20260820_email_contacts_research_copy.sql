-- Copies guest-research fields onto email_contacts at promotion time (see
-- ensureOfficialGuestContact in server/routes.ts), so a Contact stays
-- self-sufficient even if the source guest_prospects row is later deleted,
-- instead of relying only on the live guestProspectId join.
--
-- Repeatable: safe to re-run.

BEGIN;

ALTER TABLE email_contacts
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS location varchar,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb,
  ADD COLUMN IF NOT EXISTS episode_appearance_count integer;

COMMIT;
