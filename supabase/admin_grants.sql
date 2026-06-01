-- ============================================================
-- Admin grants – run AFTER schema.sql in the Supabase SQL Editor.
-- Fixes: admin panel showing all zeros.
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Allow authenticated users (incl. admin) to query the stats view
GRANT SELECT ON admin_stats TO authenticated;

-- 2. Blocks: admin can read all rows (needed for Reports → Blocked tab)
DROP POLICY IF EXISTS "blocks: admin read" ON blocks;
CREATE POLICY "blocks: admin read" ON blocks
  FOR SELECT USING (blocker_id = auth.uid() OR is_admin());

-- 3. Ensure admin can count matches/messages (should already pass via is_admin()
--    in existing policies, but make the DELETE policies explicit)
DROP POLICY IF EXISTS "matches: admin delete" ON matches;
CREATE POLICY "matches: admin delete" ON matches
  FOR DELETE USING (user1_id = auth.uid() OR user2_id = auth.uid() OR is_admin());
