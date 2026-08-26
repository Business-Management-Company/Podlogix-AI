-- One-time login codes for passwordless email sign-in.
-- Only sha256(code) is stored; rows are single-use and expire after 10 minutes.
CREATE TABLE IF NOT EXISTS login_codes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar NOT NULL,
  code_hash varchar(64) NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp NOT NULL,
  consumed_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes (email, created_at);
