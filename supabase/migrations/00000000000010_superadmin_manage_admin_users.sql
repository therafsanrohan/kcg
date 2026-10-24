-- ==============================================================================
-- Kazi Canvas Gallery: Super Admin Manage Other Admins RLS Update
-- ==============================================================================

-- 1. Ensure public.admin_users has all profile columns
ALTER TABLE public.admin_users 
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Ensure Row Level Security (RLS) is enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Policies: Super Admins can SELECT, UPDATE, INSERT, DELETE
DROP POLICY IF EXISTS "Admins can view own or all profiles" ON public.admin_users;
CREATE POLICY "Admins can view own or all profiles"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can update own profile" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update own or superadmin manage" ON public.admin_users;
CREATE POLICY "Admins can update own or superadmin manage"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert admin records" ON public.admin_users;
CREATE POLICY "Admins can insert admin records"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete admin records" ON public.admin_users;
CREATE POLICY "Admins can delete admin records"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
