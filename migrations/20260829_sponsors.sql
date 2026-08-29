CREATE TABLE IF NOT EXISTS sponsors (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  show_id varchar,
  name varchar NOT NULL,
  hashtags text DEFAULT '',
  mentions jsonb DEFAULT '{}'::jsonb,
  credit_line text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sponsors_user_idx ON sponsors (user_id, is_active);
