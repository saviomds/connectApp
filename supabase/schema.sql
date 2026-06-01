-- ============================================================
-- ConnectApp – Production Schema  (idempotent – safe to re-run)
-- Run this in the Supabase SQL editor: Project → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE user_category AS ENUM ('professional','entrepreneur','creator','young_youth','divorced','company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE premium_tier AS ENUM ('gold','platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE swipe_direction AS ENUM ('like','pass','super_like');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('match','message','super_like','profile_boost','premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID          REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name             TEXT          NOT NULL DEFAULT '',
  bio                   TEXT,
  profession            TEXT,
  company               TEXT,
  city                  TEXT,
  country               TEXT,
  age                   INTEGER       CHECK (age IS NULL OR (age >= 18 AND age <= 100)),
  category              user_category,
  interests             TEXT[]        NOT NULL DEFAULT '{}',
  avatar_url            TEXT,
  photos                TEXT[]        NOT NULL DEFAULT '{}',
  linkedin_url          TEXT,
  website               TEXT,
  is_open_to_work       BOOLEAN       NOT NULL DEFAULT FALSE,
  is_verified           BOOLEAN       NOT NULL DEFAULT FALSE,
  is_premium            BOOLEAN       NOT NULL DEFAULT FALSE,
  premium_tier          premium_tier,
  is_online             BOOLEAN       NOT NULL DEFAULT FALSE,
  last_seen_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  onboarding_completed  BOOLEAN       NOT NULL DEFAULT FALSE,
  profile_completion    INTEGER       NOT NULL DEFAULT 0 CHECK (profile_completion >= 0 AND profile_completion <= 100),
  is_admin              BOOLEAN       NOT NULL DEFAULT FALSE,
  is_suspended          BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Add new columns to existing tables if they don't exist yet
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_admin     BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── Triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION compute_profile_completion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE score INTEGER := 0;
BEGIN
  IF NEW.full_name  <> '' AND NEW.full_name IS NOT NULL THEN score := score + 15; END IF;
  IF NEW.bio        IS NOT NULL AND NEW.bio <> ''        THEN score := score + 15; END IF;
  IF NEW.profession IS NOT NULL                          THEN score := score + 15; END IF;
  IF NEW.avatar_url IS NOT NULL                          THEN score := score + 20; END IF;
  IF NEW.city       IS NOT NULL                          THEN score := score + 10; END IF;
  IF array_length(NEW.interests, 1) >= 3                 THEN score := score + 15; END IF;
  IF NEW.category   IS NOT NULL                          THEN score := score + 10; END IF;
  NEW.profile_completion := score;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS profiles_compute_completion ON profiles;
CREATE TRIGGER profiles_compute_completion
  BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION compute_profile_completion();

-- ============================================================
-- SWIPES
-- ============================================================
CREATE TABLE IF NOT EXISTS swipes (
  id         UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id  UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id  UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction  swipe_direction NOT NULL,
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT swipes_unique UNIQUE (swiper_id, target_id),
  CONSTRAINT no_self_swipe  CHECK (swiper_id <> target_id)
);
CREATE INDEX IF NOT EXISTS swipes_swiper_idx ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS swipes_target_idx ON swipes(target_id);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_unique UNIQUE (user1_id, user2_id),
  CONSTRAINT match_order    CHECK (user1_id < user2_id)
);
CREATE INDEX IF NOT EXISTS matches_user1_idx ON matches(user1_id);
CREATE INDEX IF NOT EXISTS matches_user2_idx ON matches(user2_id);

CREATE OR REPLACE FUNCTION create_match_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_like swipes%ROWTYPE;
  uid1 UUID; uid2 UUID; match_id UUID;
BEGIN
  IF NEW.direction NOT IN ('like','super_like') THEN RETURN NEW; END IF;
  SELECT * INTO existing_like FROM swipes
  WHERE swiper_id = NEW.target_id AND target_id = NEW.swiper_id
    AND direction IN ('like','super_like');
  IF FOUND THEN
    uid1 := LEAST(NEW.swiper_id, NEW.target_id);
    uid2 := GREATEST(NEW.swiper_id, NEW.target_id);
    INSERT INTO matches (user1_id, user2_id) VALUES (uid1, uid2)
    ON CONFLICT DO NOTHING RETURNING id INTO match_id;
    IF match_id IS NOT NULL THEN
      INSERT INTO conversations (match_id) VALUES (match_id);
      INSERT INTO notifications (user_id, type, data) VALUES
        (NEW.swiper_id,'match',jsonb_build_object('match_id',match_id,'other_user_id',NEW.target_id)),
        (NEW.target_id,'match',jsonb_build_object('match_id',match_id,'other_user_id',NEW.swiper_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_like_create_match ON swipes;
CREATE TRIGGER on_like_create_match
  AFTER INSERT ON swipes FOR EACH ROW EXECUTE FUNCTION create_match_on_like();

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id   UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS conversations_match_idx ON conversations(match_id);
DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
  is_seen         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx       ON messages(sender_id);

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id; RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS on_message_update_conversation ON messages;
CREATE TRIGGER on_message_update_conversation
  AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE match_rec matches%ROWTYPE; recipient UUID;
BEGIN
  SELECT m.* INTO match_rec FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = NEW.conversation_id;
  recipient := CASE WHEN match_rec.user1_id = NEW.sender_id THEN match_rec.user2_id ELSE match_rec.user1_id END;
  INSERT INTO notifications (user_id, type, data) VALUES
    (recipient,'message',jsonb_build_object('conversation_id',NEW.conversation_id,'sender_id',NEW.sender_id,'preview',left(NEW.content,80)));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_on_message();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID              DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  data       JSONB             NOT NULL DEFAULT '{}',
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

-- ── profiles policies ────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: public read"  ON profiles;
DROP POLICY IF EXISTS "profiles: own insert"   ON profiles;
DROP POLICY IF EXISTS "profiles: own update"   ON profiles;
DROP POLICY IF EXISTS "profiles: admin update" ON profiles;

CREATE POLICY "profiles: public read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles: own insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: own update" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin())
  WITH CHECK  (id = auth.uid() OR is_admin());

-- ── swipes policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "swipes: own read"   ON swipes;
DROP POLICY IF EXISTS "swipes: own insert" ON swipes;
DROP POLICY IF EXISTS "swipes: admin read" ON swipes;

CREATE POLICY "swipes: own read"   ON swipes FOR SELECT USING (swiper_id = auth.uid() OR is_admin());
CREATE POLICY "swipes: own insert" ON swipes FOR INSERT WITH CHECK (swiper_id = auth.uid());

-- ── matches policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "matches: participant read" ON matches;

CREATE POLICY "matches: participant read" ON matches
  FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid() OR is_admin());

-- ── conversations policies ───────────────────────────────────
DROP POLICY IF EXISTS "conversations: participant read" ON conversations;

CREATE POLICY "conversations: participant read" ON conversations
  FOR SELECT USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM matches m WHERE m.id = conversations.match_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- ── messages policies ────────────────────────────────────────
DROP POLICY IF EXISTS "messages: participant read"        ON messages;
DROP POLICY IF EXISTS "messages: participant insert"      ON messages;
DROP POLICY IF EXISTS "messages: own update (mark seen)"  ON messages;

CREATE POLICY "messages: participant read" ON messages
  FOR SELECT USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM conversations c JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages: participant insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages: own update (mark seen)" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c JOIN matches m ON m.id = c.match_id
      WHERE c.id = messages.conversation_id
        AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- ── notifications policies ───────────────────────────────────
DROP POLICY IF EXISTS "notifications: own read"   ON notifications;
DROP POLICY IF EXISTS "notifications: own update" ON notifications;

CREATE POLICY "notifications: own read"   ON notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notifications: own update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ── storage policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "avatars: public read"          ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars: own update"           ON storage.objects;
DROP POLICY IF EXISTS "avatars: own delete"           ON storage.objects;

CREATE POLICY "avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars: authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars: own update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE POLICY "avatars: own delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

-- ============================================================
-- REALTIME
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ADMIN STATS VIEW  (only admins can select)
-- ============================================================
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  (SELECT count(*) FROM profiles)                                       AS total_users,
  (SELECT count(*) FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours') AS new_users_24h,
  (SELECT count(*) FROM profiles WHERE is_premium = true)              AS premium_users,
  (SELECT count(*) FROM profiles WHERE is_suspended = true)            AS suspended_users,
  (SELECT count(*) FROM matches)                                        AS total_matches,
  (SELECT count(*) FROM messages)                                       AS total_messages,
  (SELECT count(*) FROM profiles WHERE is_online = true)               AS online_now,
  (SELECT count(*) FROM profiles WHERE last_seen_at > NOW() - INTERVAL '2 minutes') AS active_now;
