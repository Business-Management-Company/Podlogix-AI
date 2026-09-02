-- Credit ledger: one row per action that costs Podlogix money (Whisper,
-- GPT-4o, Influencers.club…). Users see credits; admins also see our
-- estimated cost in cents. Append-only.
CREATE TABLE IF NOT EXISTS credit_ledger (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       varchar NOT NULL,
  action        varchar NOT NULL,            -- transcript | briefing | ai_chat | enrichment | …
  credits       numeric(10,2) NOT NULL,      -- what the user is charged
  cost_cents    integer NOT NULL DEFAULT 0,  -- our estimated vendor cost (internal)
  label         varchar,                     -- human-readable: episode title, handle, etc.
  resource_type varchar,
  resource_id   varchar,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx ON credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_action_idx ON credit_ledger (action);
