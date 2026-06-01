-- ============================================================
-- APP SETTINGS TABLE  (idempotent – safe to re-run)
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT        PRIMARY KEY,
  value       TEXT        NOT NULL DEFAULT '',
  label       TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  is_secret   BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by  UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default rows (won't overwrite existing values)
INSERT INTO app_settings (key, value, label, description, category, is_secret) VALUES
  ('stripe_publishable_key',         '', 'Stripe Publishable Key',         'Your pk_live_ or pk_test_ key (safe to expose)',          'stripe', false),
  ('stripe_secret_key',              '', 'Stripe Secret Key',              'Your sk_live_ or sk_test_ key',                           'stripe', true),
  ('stripe_webhook_secret',          '', 'Stripe Webhook Secret',          'whsec_... from Stripe Dashboard → Webhooks',              'stripe', true),
  ('stripe_gold_monthly_price_id',   '', 'Gold Monthly Price ID',          'price_... – $29/month recurring price in Stripe',         'stripe', false),
  ('stripe_gold_yearly_price_id',    '', 'Gold Yearly Price ID',           'price_... – $243.60/year recurring price in Stripe',      'stripe', false),
  ('stripe_platinum_monthly_price_id','','Platinum Monthly Price ID',      'price_... – $49/month recurring price in Stripe',         'stripe', false),
  ('stripe_platinum_yearly_price_id','', 'Platinum Yearly Price ID',       'price_... – $411.60/year recurring price in Stripe',      'stripe', false)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: public read non-secret"   ON app_settings;
DROP POLICY IF EXISTS "settings: admin read all"           ON app_settings;
DROP POLICY IF EXISTS "settings: admin write"              ON app_settings;

-- Non-secret settings are readable by any authenticated user (e.g. publishable key)
CREATE POLICY "settings: public read non-secret" ON app_settings
  FOR SELECT USING (is_secret = false OR is_admin());

-- Only admins can write
CREATE POLICY "settings: admin write" ON app_settings
  FOR UPDATE USING (is_admin())
  WITH CHECK  (is_admin());

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION touch_app_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION touch_app_settings();

-- ============================================================
-- HELPER FUNCTION: read a single setting (used by API routes)
-- ============================================================
CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT value FROM app_settings WHERE key = p_key;
$$;
