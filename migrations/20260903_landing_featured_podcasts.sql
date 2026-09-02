-- Shows an admin features on the marketing landing page, read by
-- GET /api/public/landing. Kept apart from podcasts so the feed ships
-- without altering that table.
--
-- Repeatable: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS landing_featured_podcasts (
  podcast_id varchar PRIMARY KEY,
  created_at timestamp DEFAULT now()
);

COMMIT;
