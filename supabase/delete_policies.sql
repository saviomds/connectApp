-- ============================================================
-- Missing DELETE RLS policies
-- Run in Supabase SQL Editor after schema.sql + grants.sql
-- ============================================================

-- swipes: users can delete their own swipes (needed for unmatch swipe cleanup)
DROP POLICY IF EXISTS "swipes: own delete" ON swipes;
CREATE POLICY "swipes: own delete" ON swipes
  FOR DELETE USING (swiper_id = auth.uid() OR is_admin());

-- matches: participants can delete matches they are part of
DROP POLICY IF EXISTS "matches: participant delete" ON matches;
CREATE POLICY "matches: participant delete" ON matches
  FOR DELETE USING (user1_id = auth.uid() OR user2_id = auth.uid() OR is_admin());

-- conversations: participants can delete conversations
DROP POLICY IF EXISTS "conversations: participant delete" ON conversations;
CREATE POLICY "conversations: participant delete" ON conversations
  FOR DELETE USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = conversations.match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );
