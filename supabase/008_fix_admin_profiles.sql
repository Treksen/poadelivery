-- ================================================================
-- Migration 008: Fix admin access to all profiles + backfill missing
-- ================================================================

-- Drop existing select policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- New policy: users see own profile, admins see all
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Backfill: create profile rows for ANY auth user that doesn't have one
-- This fixes users who signed up but whose trigger failed
INSERT INTO profiles (id, name, email, role, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'customer'),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also update roles for existing profiles where role is wrong
-- (in case trigger set wrong role)
UPDATE profiles p
SET role = COALESCE(u.raw_user_meta_data->>'role', p.role)
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_user_meta_data->>'role' IS NOT NULL
  AND p.role != u.raw_user_meta_data->>'role';

-- Verify: show all profiles with their roles
SELECT p.name, p.email, p.role, p.created_at
FROM profiles p
ORDER BY p.created_at DESC;
