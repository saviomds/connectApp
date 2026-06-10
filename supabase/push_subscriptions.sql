-- Web Push Subscriptions
-- Run once in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth_key   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint)
);

-- Users can only read/write their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select" ON push_subscriptions;
DROP POLICY IF EXISTS "owner_insert" ON push_subscriptions;
DROP POLICY IF EXISTS "owner_delete" ON push_subscriptions;

CREATE POLICY "owner_select" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_insert" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Service role (webhook/server) needs unrestricted access
GRANT ALL ON push_subscriptions TO service_role;

-- Index for fast lookup per user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);
