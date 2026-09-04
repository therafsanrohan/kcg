-- Migration 1: Admin Users Table, RPC function, and strict RLS policies

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if caller is an approved admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS for admin_users table
CREATE POLICY "Admins can view admin_users list"
  ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4. Strict RLS Policies for Admin Write Access
-- Paintings
DROP POLICY IF EXISTS "Allow admins full access to paintings" ON public.paintings;
CREATE POLICY "Admin full access to paintings" ON public.paintings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Painting Images
DROP POLICY IF EXISTS "Allow admins full access to painting images" ON public.painting_images;
CREATE POLICY "Admin full access to painting images" ON public.painting_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Frame Options
DROP POLICY IF EXISTS "Allow admins full access to frame options" ON public.frame_options;
CREATE POLICY "Admin full access to frame options" ON public.frame_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Site Settings
DROP POLICY IF EXISTS "Allow admins full access to site settings" ON public.site_settings;
CREATE POLICY "Admin full access to site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
