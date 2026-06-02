-- ============================================================
-- Vibro – Verification System Migration
-- Run in Supabase SQL Editor: Project → SQL Editor → New query
-- ============================================================

-- ── New columns on profiles ──────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_professional     BOOLEAN NOT NULL DEFAULT FALSE;

-- verification_status: 'none' | 'pending' | 'approved' | 'rejected'
-- is_professional: paid for Professional Access plan

-- ── verification_requests table ──────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category          TEXT        NOT NULL,
  photo_selfie_url  TEXT        NOT NULL,
  photo_id_url      TEXT        NOT NULL,
  photo_portrait_url TEXT       NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending',
  admin_note        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ
);

-- Only one active request per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_user_active
  ON verification_requests(user_id)
  WHERE status = 'pending';

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_verification"   ON verification_requests;
DROP POLICY IF EXISTS "users_insert_own_verification" ON verification_requests;
DROP POLICY IF EXISTS "service_role_all_verification" ON verification_requests;

CREATE POLICY "users_read_own_verification"
  ON verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_verification"
  ON verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_all_verification"
  ON verification_requests FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can read all verification requests
DROP POLICY IF EXISTS "admins_read_all_verification" ON verification_requests;
CREATE POLICY "admins_read_all_verification"
  ON verification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.is_admin = true OR profiles.id::text = current_setting('app.admin_user_id', true))
    )
  );

-- Admins can update (approve/reject) verification requests
DROP POLICY IF EXISTS "admins_update_verification" ON verification_requests;
CREATE POLICY "admins_update_verification"
  ON verification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- ── Storage bucket for verification docs ─────────────────────
-- Run in Storage → New bucket if it doesn't exist yet:
--   Name: verification-docs   Public: false
-- Or insert directly:
-- verification-docs: public so admins can view submitted photos in the browser
INSERT INTO storage.buckets (id, name, public)
  VALUES ('verification-docs', 'verification-docs', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read verification docs (URLs are hard-to-guess UUIDs+timestamps)
DROP POLICY IF EXISTS "verif_docs_public_read" ON storage.objects;
CREATE POLICY "verif_docs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-docs');

-- Bucket: profile-photos (public, for extra profile pics)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('profile-photos', 'profile-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own verification docs
DROP POLICY IF EXISTS "verif_upload_own" ON storage.objects;
CREATE POLICY "verif_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "verif_read_own" ON storage.objects;
CREATE POLICY "verif_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Allow authenticated users to upload profile photos
DROP POLICY IF EXISTS "profile_photos_upload" ON storage.objects;
CREATE POLICY "profile_photos_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;
CREATE POLICY "profile_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "profile_photos_delete_own" ON storage.objects;
CREATE POLICY "profile_photos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-photos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
