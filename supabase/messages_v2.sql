-- ============================================================
-- Messages V2 – media, view-once, soft-delete, blocks
-- Run AFTER schema.sql and grants.sql in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── 1. New columns on messages ────────────────────────────────
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN media_urls TEXT[] NOT NULL DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN is_view_once BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN viewed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Restore content constraint: allow empty content for media messages
ALTER TABLE messages ADD CONSTRAINT messages_content_check CHECK (
  is_deleted = true
  OR type IN ('image', 'album', 'view_once')
  OR (length(content) > 0 AND length(content) <= 4000)
);

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text', 'image', 'album', 'view_once'));

-- ── 2. Blocks table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocks_unique  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block  CHECK  (blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_id);

-- ── 3. message-media storage bucket ──────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('message-media', 'message-media', true)
  ON CONFLICT (id) DO NOTHING;

-- ── 4. Matches: participants can delete (unmatch) ─────────────
DROP POLICY IF EXISTS "matches: participant delete" ON matches;
CREATE POLICY "matches: participant delete" ON matches
  FOR DELETE USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ── 5. Messages: own soft-delete (UPDATE) + hard-delete ───────
-- Existing UPDATE policy already covers participants; ensure own DELETE exists
DROP POLICY IF EXISTS "messages: own delete" ON messages;
CREATE POLICY "messages: own delete" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- ── 6. Blocks RLS ─────────────────────────────────────────────
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks: own read"   ON blocks;
DROP POLICY IF EXISTS "blocks: own insert" ON blocks;
DROP POLICY IF EXISTS "blocks: own delete" ON blocks;

CREATE POLICY "blocks: own read"   ON blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "blocks: own insert" ON blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks: own delete" ON blocks FOR DELETE USING (blocker_id = auth.uid());

-- ── 7. Storage policies for message-media ────────────────────
DROP POLICY IF EXISTS "message-media: public read"          ON storage.objects;
DROP POLICY IF EXISTS "message-media: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "message-media: own delete"           ON storage.objects;

CREATE POLICY "message-media: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'message-media');

CREATE POLICY "message-media: authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "message-media: own delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ── 8. Update notify trigger for media messages ───────────────
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE match_rec matches%ROWTYPE; recipient UUID;
BEGIN
  IF NEW.is_deleted THEN RETURN NEW; END IF;
  SELECT m.* INTO match_rec
    FROM conversations c JOIN matches m ON m.id = c.match_id
   WHERE c.id = NEW.conversation_id;
  recipient := CASE
    WHEN match_rec.user1_id = NEW.sender_id THEN match_rec.user2_id
    ELSE match_rec.user1_id
  END;
  INSERT INTO notifications (user_id, type, data) VALUES (
    recipient, 'message',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id',       NEW.sender_id,
      'preview', CASE
        WHEN NEW.type = 'image'     THEN '📷 Photo'
        WHEN NEW.type = 'album'     THEN '🖼️ Album'
        WHEN NEW.type = 'view_once' THEN '👁 View once'
        ELSE left(NEW.content, 80)
      END
    )
  );
  RETURN NEW;
END;
$$;

-- ── 9. Enable Realtime for new tables ─────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE blocks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 10. Grants ────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON blocks TO authenticated;
