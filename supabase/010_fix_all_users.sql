-- ================================================================
-- Migration 010: Fix all 4 users + admin RLS (no recursion)
-- Run in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── Step 1: Fix profiles RLS — use JWT, no self-reference ─────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
  );

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── Step 2: Sync ALL auth users → profiles ────────────────────
-- This creates or updates profile rows for every auth user
-- using their signup metadata for name/role
INSERT INTO profiles (id, name, email, role, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', 'customer'),
  u.raw_user_meta_data->>'phone'
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  name  = COALESCE(EXCLUDED.name, profiles.name),
  email = EXCLUDED.email,
  role  = COALESCE(EXCLUDED.role, profiles.role);

-- ── Step 3: Ensure correct roles for known users ──────────────
UPDATE profiles SET role = 'customer'
  WHERE email = 'customerone@gmail.com';

UPDATE profiles SET role = 'rider'
  WHERE email = 'riderone@gmail.com';

UPDATE profiles SET role = 'admin'
  WHERE email = 'adminpoa@gmail.com';

UPDATE profiles SET role = 'vendor'
  WHERE email = 'mama@gmail.com';

-- ── Step 4: Fix auth metadata to match roles ──────────────────
-- This ensures JWT has correct role so admin RLS works after login
UPDATE auth.users SET raw_user_meta_data =
  raw_user_meta_data || '{"role":"customer"}'::jsonb
  WHERE email = 'customerone@gmail.com';

UPDATE auth.users SET raw_user_meta_data =
  raw_user_meta_data || '{"role":"rider"}'::jsonb
  WHERE email = 'riderone@gmail.com';

UPDATE auth.users SET raw_user_meta_data =
  raw_user_meta_data || '{"role":"admin"}'::jsonb
  WHERE email = 'adminpoa@gmail.com';

UPDATE auth.users SET raw_user_meta_data =
  raw_user_meta_data || '{"role":"vendor"}'::jsonb
  WHERE email = 'mama@gmail.com';

-- ── Step 5: Ensure rider_profile row exists for rider ─────────
INSERT INTO rider_profiles (id, vehicle_type, is_online)
SELECT p.id, 'motorcycle', false
FROM profiles p
WHERE p.email = 'riderone@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- ── Step 6: Ensure vendor row exists for mama@gmail.com ───────
INSERT INTO vendors (owner_id, name, description, category, address,
  lat, lng, email, is_active, is_open, delivery_time, min_order)
SELECT
  p.id,
  COALESCE((SELECT name FROM vendors WHERE email = 'mama@gmail.com'), 'Mama''s Kitchen'),
  'Authentic Kenyan home cooking',
  'restaurant',
  'Nairobi, Kenya',
  -1.2921, 36.8219,
  'mama@gmail.com',
  true, true, 30, 200
FROM profiles p
WHERE p.email = 'mama@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM vendors WHERE email = 'mama@gmail.com')
ON CONFLICT DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────
SELECT p.name, p.email, p.role,
       u.raw_user_meta_data->>'role' AS jwt_role
FROM profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role;
