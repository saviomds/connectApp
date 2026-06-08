-- ══════════════════════════════════════════════════════════════════════
-- Vibro — Missing Features Migration
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to re-run (all statements are idempotent)
-- ══════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1. Profile columns: discovery filters, hiding, icebreakers
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_hidden      BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS min_age_pref   SMALLINT CHECK (min_age_pref IS NULL OR min_age_pref >= 18);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS max_age_pref   SMALLINT CHECK (max_age_pref IS NULL OR max_age_pref >= 18);

-- looking_for: relationship intent shown on profile and used for matching
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS looking_for    TEXT
    CHECK (looking_for IN ('relationship','dating','friendship','networking','casual','not_sure'));

-- prompts: icebreaker Q&A stored as [{question, answer}]
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prompts        JSONB NOT NULL DEFAULT '[]';


-- ─────────────────────────────────────────────────────────────────────
-- 2. user_warnings — graduated moderation system
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_warnings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level        SMALLINT    NOT NULL CHECK (level BETWEEN 1 AND 4),
  -- 1 = educational notice
  -- 2 = 24-hour feature restriction
  -- 3 = 7-day suspension
  -- 4 = permanent ban
  reason       TEXT        NOT NULL,
  expires_at   TIMESTAMPTZ,           -- NULL = permanent (level 4)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_warnings: user reads own"    ON user_warnings;
DROP POLICY IF EXISTS "user_warnings: admin full access" ON user_warnings;

CREATE POLICY "user_warnings: user reads own"
  ON user_warnings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_warnings: admin full access"
  ON user_warnings FOR ALL
  USING (is_admin());

-- Index for fast per-user lookup
CREATE INDEX IF NOT EXISTS idx_user_warnings_user
  ON user_warnings(user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────
-- 3. suspension_appeals — user appeals for account suspension
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suspension_appeals (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message          TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response   TEXT,
  reviewed_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suspension_appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appeals: user reads own"       ON suspension_appeals;
DROP POLICY IF EXISTS "appeals: user inserts own"     ON suspension_appeals;
DROP POLICY IF EXISTS "appeals: admin full access"    ON suspension_appeals;

CREATE POLICY "appeals: user reads own"
  ON suspension_appeals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "appeals: user inserts own"
  ON suspension_appeals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "appeals: admin full access"
  ON suspension_appeals FOR ALL
  USING (is_admin());

-- Index for admin queue (pending first)
CREATE INDEX IF NOT EXISTS idx_suspension_appeals_status
  ON suspension_appeals(status, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────
-- 4. service_role grants — fix "permission denied" on admin actions
-- ─────────────────────────────────────────────────────────────────────

GRANT ALL ON public.blocks              TO service_role;
GRANT ALL ON public.user_warnings       TO service_role;
GRANT ALL ON public.suspension_appeals  TO service_role;
GRANT ALL ON public.profile_views       TO service_role;
GRANT ALL ON public.profiles            TO service_role;
GRANT ALL ON public.matches             TO service_role;
GRANT ALL ON public.swipes              TO service_role;
GRANT ALL ON public.conversations       TO service_role;
GRANT ALL ON public.messages            TO service_role;


-- ─────────────────────────────────────────────────────────────────────
-- 5. Discovery filter indexes (speed up hidden + age pref queries)
-- ─────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_hidden
  ON profiles(is_hidden)
  WHERE is_hidden = false AND onboarding_completed = true AND is_suspended = false;

CREATE INDEX IF NOT EXISTS idx_profiles_looking_for
  ON profiles(looking_for)
  WHERE onboarding_completed = true AND is_suspended = false;
