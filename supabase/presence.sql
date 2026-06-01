-- ============================================================
-- PRESENCE  (no pg_cron required)
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── upsert_presence ───────────────────────────────────────────
-- Called from PATCH /api/presence every 45 s (heartbeat) and on page unload.
--
-- What it does:
--   1. Updates is_online + last_seen_at for the calling user
--   2. Lazy-expires stale users (last_seen_at > 2 min ago) in the same query
--      so crashed browsers eventually go offline without needing pg_cron
--   3. Only emits a Realtime profile change when the online boolean actually
--      flips — avoids chatty UPDATE events every 45 s for users already online
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_user_id UUID,
  p_online  BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  was_online BOOLEAN;
BEGIN
  -- 1. Read current state
  SELECT is_online INTO was_online
    FROM profiles
   WHERE id = p_user_id;

  -- 2. Update the calling user
  UPDATE profiles
     SET is_online    = p_online,
         last_seen_at = NOW()
   WHERE id = p_user_id;

  -- 3. Lazy cleanup: expire stale users whose last_seen_at is > 2 min old.
  --    Limited to 20 rows per call so it stays fast regardless of user count.
  --    Any "online" user who hasn't pinged in 2 min gets flipped offline here.
  UPDATE profiles
     SET is_online = false
   WHERE id IN (
     SELECT id FROM profiles
      WHERE is_online  = true
        AND id        != p_user_id
        AND last_seen_at < NOW() - INTERVAL '2 minutes'
      LIMIT 20
   );

  -- 4. Only fire a Realtime event when the boolean actually changed
  --    (prevents the subscribe handler in ChatPage running on every heartbeat)
  IF was_online IS DISTINCT FROM p_online THEN
    PERFORM pg_notify('presence_changed', p_user_id::TEXT);
  END IF;
END;
$$;

-- ── Optional: pg_cron for bulk cleanup ────────────────────────
-- If you have pg_cron enabled (Dashboard → Database → Extensions → pg_cron)
-- uncomment the block below for a guaranteed 1-minute sweep.
-- The lazy cleanup above already handles normal cases; this is belt-and-braces.
/*
SELECT cron.schedule(
  'expire-online-presence',
  '* * * * *',
  $$
    UPDATE public.profiles
       SET is_online = false
     WHERE is_online     = true
       AND last_seen_at  < NOW() - INTERVAL '2 minutes'
  $$
);
*/
