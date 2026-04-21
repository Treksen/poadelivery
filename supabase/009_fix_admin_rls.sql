-- ================================================================
-- Migration 009: Fix admin RLS — no self-referencing subquery
-- ================================================================

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Use auth.jwt() to check role — reads from the JWT token directly,
-- no database query needed, zero recursion possible
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Verify policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles';

-- Verify admin user has correct role in metadata
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at DESC;
