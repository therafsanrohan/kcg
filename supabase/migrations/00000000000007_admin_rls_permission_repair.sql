-- ==============================================================================
-- KAZI CANVAS GALLERY — ADMIN RLS & PERMISSION REPAIR MIGRATION
-- Migration: 00000000000007_admin_rls_permission_repair.sql
--
-- PURPOSE:
-- Fixes the critical RLS error: "new row violates row-level security policy for table invoices"
-- and ensures authorized administrators (such as knock.rafsan@gmail.com and anyone in public.admin_users)
-- have uninterrupted, secure, and policy-compliant access to:
--   - invoices & invoice_items
--   - paintings & painting_images
--   - frame_options
--   - site_settings & delivery_zones
--
-- SAFETY:
-- - Additive and non-destructive.
-- - Does NOT drop tables or modify existing financial/artwork records.
-- - Strictly preserves Row Level Security (RLS) while correcting policy evaluation.
-- ==============================================================================

-- 1. Ensure public.admin_users table has proper structure and RLS enabled
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Enhanced, infallible is_admin() function
-- Recognizes authorized admins either via the public.admin_users registry OR via primary owner verification
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Authenticated session required
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check if user is in public.admin_users
  IF EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  ) THEN
    RETURN true;
  END IF;

  -- 2. Primary owner email fallback based on JWT claims
  IF (
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'knock.rafsan@gmail.com' OR
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'knock.rafsan+admin@gmail.com' OR
    LOWER(COALESCE(auth.jwt() ->> 'email', '')) LIKE 'knock.rafsan%'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Policy on admin_users so admins can read and manage admin records
DROP POLICY IF EXISTS "Admins can view admin_users list" ON public.admin_users;
CREATE POLICY "Admins can view admin_users list"
  ON public.admin_users FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage admin_users" ON public.admin_users;
CREATE POLICY "Admins can manage admin_users"
  ON public.admin_users FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Automatically sync owner users from auth.users into public.admin_users if present
INSERT INTO public.admin_users (id, email, role)
SELECT id, email, 'superadmin'
FROM auth.users
WHERE (
  LOWER(email) = 'knock.rafsan@gmail.com' OR
  LOWER(email) = 'knock.rafsan+admin@gmail.com' OR
  LOWER(email) LIKE 'knock.rafsan%'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  email = EXCLUDED.email;

-- 5. Correct RLS Policies for Invoices & Invoice Items
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to invoices" ON public.invoices;
CREATE POLICY "Admin full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to invoice items" ON public.invoice_items;
CREATE POLICY "Admin full access to invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. Correct RLS Policies for Paintings, Images, Frames, Settings, and Delivery Zones
ALTER TABLE public.paintings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.painting_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Paintings
DROP POLICY IF EXISTS "Admin full access to paintings" ON public.paintings;
DROP POLICY IF EXISTS "Allow admins full access to paintings" ON public.paintings;
CREATE POLICY "Admin full access to paintings" ON public.paintings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Painting Images
DROP POLICY IF EXISTS "Admin full access to painting images" ON public.painting_images;
DROP POLICY IF EXISTS "Allow admins full access to painting images" ON public.painting_images;
CREATE POLICY "Admin full access to painting images" ON public.painting_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Frame Options
DROP POLICY IF EXISTS "Admin full access to frame options" ON public.frame_options;
DROP POLICY IF EXISTS "Allow admins full access to frame options" ON public.frame_options;
CREATE POLICY "Admin full access to frame options" ON public.frame_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Site Settings
DROP POLICY IF EXISTS "Admin full access to site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admins full access to site settings" ON public.site_settings;
CREATE POLICY "Admin full access to site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Delivery Zones (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_zones') THEN
    ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow public read-only access to delivery zones" ON public.delivery_zones;
    CREATE POLICY "Allow public read-only access to delivery zones" ON public.delivery_zones
      FOR SELECT USING (is_active = true);
      
    DROP POLICY IF EXISTS "Admin full access to delivery zones" ON public.delivery_zones;
    CREATE POLICY "Admin full access to delivery zones" ON public.delivery_zones
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- 7. Grant permissions and reload schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.paintings TO anon;
GRANT SELECT ON public.painting_images TO anon;
GRANT SELECT ON public.frame_options TO anon;
GRANT SELECT ON public.site_settings TO anon;

NOTIFY pgrst, 'reload schema';
