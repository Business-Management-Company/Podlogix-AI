-- Listen events: per-request tracking for hosted podcast feeds.
-- kind = 'download' (audio enclosure fetch) | 'feed' (RSS fetch).
-- listener_hash is a daily-salted SHA-256 of ip+user-agent — raw IPs are never stored.
CREATE TABLE IF NOT EXISTS listen_events (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id varchar NOT NULL,
  episode_id varchar,
  kind varchar NOT NULL,
  app varchar,
  user_agent text,
  listener_hash varchar(64),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listen_events_podcast_created_idx ON listen_events (podcast_id, created_at);
CREATE INDEX IF NOT EXISTS listen_events_episode_idx ON listen_events (episode_id);
