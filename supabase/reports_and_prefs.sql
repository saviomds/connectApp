-- ============================================================
-- Reports table + notification preference columns
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ── 1. User reports ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT        NOT NULL CHECK (reason IN ('spam','inappropriate','harassment','fake_profile','other')),
  details      TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_unique UNIQUE (reporter_id, reported_id),
  CONSTRAINT no_self_report CHECK (reporter_id <> reported_id)
);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON reports(reported_id);
CREATE INDEX IF NOT EXISTS reports_status_idx   ON reports(status);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports: own insert"    ON reports;
DROP POLICY IF EXISTS "reports: own read"      ON reports;
DROP POLICY IF EXISTS "reports: admin read"    ON reports;
DROP POLICY IF EXISTS "reports: admin update"  ON reports;

CREATE POLICY "reports: own insert"   ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports: own read"     ON reports FOR SELECT USING (reporter_id = auth.uid() OR is_admin());
CREATE POLICY "reports: admin update" ON reports FOR UPDATE USING (is_admin());

GRANT SELECT, INSERT ON reports TO authenticated;

-- ── 2. Notification preference columns on profiles ────────────
DO $$ BEGIN ALTER TABLE profiles ADD COLUMN notify_matches  BOOLEAN NOT NULL DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE profiles ADD COLUMN notify_messages BOOLEAN NOT NULL DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE profiles ADD COLUMN show_read_receipts BOOLEAN NOT NULL DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── 3. Realtime for reports (admin visibility) ────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reports;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
