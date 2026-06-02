-- ============================================================
-- GRANTS  (idempotent – safe to re-run)
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- Fixes: "permission denied for table profiles" and similar errors.
-- ============================================================

-- Schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Sequence access (for gen_random_uuid / serial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Table-level privileges
GRANT SELECT                    ON profiles      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON swipes   TO authenticated;
GRANT SELECT                         ON swipes   TO anon;

GRANT SELECT, DELETE            ON matches       TO authenticated;
GRANT SELECT                    ON matches       TO anon;

GRANT SELECT, DELETE            ON conversations TO authenticated;

GRANT SELECT, INSERT, UPDATE    ON messages      TO authenticated;

GRANT SELECT, UPDATE            ON notifications TO authenticated;

-- app_settings: authenticated can read non-secret rows (RLS enforces the rest)
GRANT SELECT, UPDATE            ON app_settings  TO authenticated;
GRANT SELECT                    ON app_settings  TO anon;

-- service_role: needs explicit grants so the API can do cross-user operations
GRANT SELECT, INSERT, UPDATE, DELETE ON matches       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON swipes        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles      TO service_role;

-- Safety: Only grant specific permissions. DO NOT automatically grant DELETE on future tables.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
