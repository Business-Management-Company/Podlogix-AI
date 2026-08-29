ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS egress_id varchar;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS recording_status varchar;
