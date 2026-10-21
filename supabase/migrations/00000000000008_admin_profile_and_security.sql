-- ==============================================================================
-- Kazi Canvas Gallery: Admin Profiles & Super Admin Security Architecture
-- ==============================================================================
-- 1. Ensure public.admin_users has profile columns (non-destructive alter table)
ALTER TABLE public.admin_users 
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Enable Row Level Security (RLS) on public.admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Authenticated Admins can read their own profile (or superadmins can view all)
DROP POLICY IF EXISTS "Admins can view own or all profiles" ON public.admin_users;
CREATE POLICY "Admins can view own or all profiles"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- 4. Policy: Admins can update ONLY their own profile record
DROP POLICY IF EXISTS "Admins can update own profile" ON public.admin_users;
CREATE POLICY "Admins can update own profile"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Trigger to prevent non-superadmins from modifying their own role or id
CREATE OR REPLACE FUNCTION public.prevent_admin_self_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed:
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Only allow if current caller is an existing superadmin
    IF NOT EXISTS (
      SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'superadmin'
    ) AND auth.jwt()->>'email' NOT IN ('knock.rafsan@gmail.com', 'knock.rafsan+admin@gmail.com') THEN
      RAISE EXCEPTION 'Forbidden: You cannot change your own administrative role.';
    END IF;
  END IF;

  -- Disallow modifying the ID
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Forbidden: You cannot change your account user ID.';
  END IF;

  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_admin_self_promotion ON public.admin_users;
CREATE TRIGGER trg_prevent_admin_self_promotion
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_promotion();
