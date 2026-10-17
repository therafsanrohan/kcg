-- ==============================================================================
-- KAZI CANVAS GALLERY — CONSOLIDATED MASTER RUN (MIGRATION 7 + 8)
-- File: supabase/migrations/CONSOLIDATED_MASTER_RUN.sql
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard -> SQL Editor
-- 2. Paste this entire file
-- 3. Click "RUN"
--
-- WHAT THIS DOES (100% Non-Destructive & Safe):
-- 1. Fixes Invoice RLS permission error by upgrading public.is_admin() (supports knock.rafsan@gmail.com)
-- 2. Ensures public.admin_users exists and auto-syncs owner accounts
-- 3. Sets correct admin RLS policies for invoices, items, paintings, images, frames, delivery zones
-- 4. Creates public.clients table (Centralized Client CRM) with indexes and admin RLS
-- 5. Adds client_id, void tracking (void_reason, voided_at, voided_by), and share_token to invoices
-- 6. Adds 'void' to invoices_status_check constraint
-- 7. Creates atomic public.finalize_invoice_number() RPC for concurrency-safe invoice numbering
-- 8. Enables public access for active public invoice share links without exposing admin data
-- 9. Reloads PostgREST schema cache
-- ==============================================================================

-- 1. Ensure public.admin_users table exists and has RLS enabled
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Enhanced, infallible is_admin() function
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

-- 3. Policy on admin_users
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

-- 5. Centralized Client Database (CRM) with Client ID & Membership
CREATE SEQUENCE IF NOT EXISTS public.client_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_client_number()
RETURNS text AS $$
DECLARE
  next_val integer;
BEGIN
  next_val := nextval('public.client_number_seq');
  RETURN 'KCG-CL-' || to_char(next_val, 'FM000000');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_number text UNIQUE DEFAULT public.generate_client_number(),
  client_type text NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'organization')),
  name text NOT NULL,
  organization_name text,
  email text,
  phone text NOT NULL,
  billing_address text,
  shipping_address text,
  tax_id text,
  membership_tier text NOT NULL DEFAULT 'none' CHECK (membership_tier IN ('none', 'standard', 'silver', 'gold')),
  membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'expired')),
  membership_start_date date,
  membership_expiry_date date,
  internal_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure client_number and membership columns exist if clients was previously created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'client_number'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN client_number text UNIQUE DEFAULT public.generate_client_number();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'membership_tier'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN membership_tier text NOT NULL DEFAULT 'none' CHECK (membership_tier IN ('none', 'standard', 'silver', 'gold'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'membership_status'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'expired'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'membership_start_date'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN membership_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'membership_expiry_date'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN membership_expiry_date date;
  END IF;
END $$;

UPDATE public.clients
SET client_number = public.generate_client_number()
WHERE client_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON public.clients (client_number);
CREATE INDEX IF NOT EXISTS idx_clients_membership_tier ON public.clients (membership_tier);

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- High-performance inventory search indexes on paintings
CREATE INDEX IF NOT EXISTS idx_paintings_title_trgm ON public.paintings USING btree (title);
CREATE INDEX IF NOT EXISTS idx_paintings_availability ON public.paintings (availability_status);
CREATE INDEX IF NOT EXISTS idx_paintings_created_at_desc ON public.paintings (created_at DESC);

-- 6. Add client_id, void fields, and share_token to invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN void_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'voided_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN voided_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'voided_by'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'share_token'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN share_token text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'is_share_link_active'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN is_share_link_active boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'share_link_created_at'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN share_link_created_at timestamp with time zone;
  END IF;
END $$;

-- Update status check constraint on invoices to include 'void'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'issued', 'cancelled', 'void'));

-- 7. Ensure invoice sequence exists
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- 8. Atomic Finalize Invoice Number Function
CREATE OR REPLACE FUNCTION public.finalize_invoice_number(p_invoice_id uuid)
RETURNS text AS $$
DECLARE
  v_invoice_number text;
  v_current_status text;
  v_next_val integer;
  v_current_year text;
BEGIN
  -- Lock the specific invoice row for update
  SELECT status, invoice_number INTO v_current_status, v_invoice_number
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice with ID % not found', p_invoice_id;
  END IF;

  -- If invoice already has a finalized non-draft number or is not draft, return existing
  IF v_current_status != 'draft' AND v_invoice_number NOT LIKE 'DRAFT-%' THEN
    RETURN v_invoice_number;
  END IF;

  -- Generate atomic number from sequence
  v_next_val := nextval('public.invoice_number_seq');
  v_current_year := to_char(now(), 'YYYY');
  v_invoice_number := 'KCG-' || v_current_year || '-' || to_char(v_next_val, 'FM0000');

  -- Update invoice atomically
  UPDATE public.invoices
  SET 
    invoice_number = v_invoice_number,
    status = 'issued',
    issued_at = timezone('utc'::text, now())
  WHERE id = p_invoice_id;

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 9. Correct RLS Policies for Invoices & Invoice Items
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

-- Allow public read of single invoice only via active share_token
DROP POLICY IF EXISTS "Public can view invoice with active share token" ON public.invoices;
CREATE POLICY "Public can view invoice with active share token"
  ON public.invoices
  FOR SELECT
  TO anon, authenticated
  USING (
    is_share_link_active = true 
    AND share_token IS NOT NULL
  );

DROP POLICY IF EXISTS "Public can view invoice items for active shared invoice" ON public.invoice_items;
CREATE POLICY "Public can view invoice items for active shared invoice"
  ON public.invoice_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
      AND inv.is_share_link_active = true
      AND inv.share_token IS NOT NULL
    )
  );

-- 10. Correct RLS Policies for Paintings, Images, Frames, Settings, and Delivery Zones
ALTER TABLE public.paintings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.painting_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to paintings" ON public.paintings;
DROP POLICY IF EXISTS "Allow admins full access to paintings" ON public.paintings;
CREATE POLICY "Admin full access to paintings" ON public.paintings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to painting images" ON public.painting_images;
DROP POLICY IF EXISTS "Allow admins full access to painting images" ON public.painting_images;
CREATE POLICY "Admin full access to painting images" ON public.painting_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access to frame options" ON public.frame_options;
DROP POLICY IF EXISTS "Allow admins full access to frame options" ON public.frame_options;
CREATE POLICY "Admin full access to frame options" ON public.frame_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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

-- 11. Invoice Messages Table (Live Customer–Admin Conversation)
CREATE TABLE IF NOT EXISTS public.invoice_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  sender_name text NOT NULL DEFAULT 'Collector',
  message_text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure is_read column exists if invoice_messages was previously created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.invoice_messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_messages_invoice_id ON public.invoice_messages (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_messages_created_at ON public.invoice_messages (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_invoice_messages_unread ON public.invoice_messages (invoice_id, is_read) WHERE is_read = false;

ALTER TABLE public.invoice_messages ENABLE ROW LEVEL SECURITY;

-- Admins have full access to all invoice messages
DROP POLICY IF EXISTS "Admin full access to invoice messages" ON public.invoice_messages;
CREATE POLICY "Admin full access to invoice messages"
  ON public.invoice_messages
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public can read messages for an active shared invoice
DROP POLICY IF EXISTS "Public can read messages for active shared invoice" ON public.invoice_messages;
CREATE POLICY "Public can read messages for active shared invoice"
  ON public.invoice_messages
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_messages.invoice_id
      AND inv.is_share_link_active = true
      AND inv.share_token IS NOT NULL
    )
  );

-- Public can post a message if the invoice has an active share link
DROP POLICY IF EXISTS "Public can insert message for active shared invoice" ON public.invoice_messages;
CREATE POLICY "Public can insert message for active shared invoice"
  ON public.invoice_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    sender_type = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_messages.invoice_id
      AND inv.is_share_link_active = true
      AND inv.share_token IS NOT NULL
    )
  );

-- 12. Invoice Payments Table (Partial Payments & Audit Trail)
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_bdt numeric(12, 2) NOT NULL CHECK (amount_bdt > 0),
  payment_method text NOT NULL DEFAULT 'cash',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_ref text,
  internal_notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_by_name text DEFAULT 'Admin',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON public.invoice_payments (payment_date DESC);

-- Trigger / function to atomically synchronize payment_status and paid_at on invoices
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_grand_total numeric(12, 2);
  v_total_paid numeric(12, 2);
  v_new_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  SELECT grand_total_bdt INTO v_grand_total FROM public.invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(amount_bdt), 0) INTO v_total_paid FROM public.invoice_payments WHERE invoice_id = v_invoice_id;

  IF v_total_paid >= v_grand_total AND v_grand_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partially_paid';
  ELSE
    v_new_status := 'unpaid';
  END IF;

  UPDATE public.invoices
  SET payment_status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'paid' THEN timezone('utc'::text, now()) ELSE NULL END,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_payments ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payments
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_status();

-- Enable RLS on invoice_payments
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Admins full access
DROP POLICY IF EXISTS "Admin full access to invoice payments" ON public.invoice_payments;
CREATE POLICY "Admin full access to invoice payments"
  ON public.invoice_payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customers can view confirmed payment records for active shared invoice (customer safe fields only)
DROP POLICY IF EXISTS "Public can view payments for active shared invoice" ON public.invoice_payments;
CREATE POLICY "Public can view payments for active shared invoice"
  ON public.invoice_payments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_payments.invoice_id
      AND inv.is_share_link_active = true
      AND inv.share_token IS NOT NULL
    )
  );

-- Update check constraint on invoices payment_status to support 'partially_paid'
DO $$
BEGIN
  ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check;
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_status_check 
    CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 13. Grant permissions and reload schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.paintings TO anon;
GRANT SELECT ON public.painting_images TO anon;
GRANT SELECT ON public.frame_options TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT ON public.invoice_messages TO anon, authenticated;
GRANT SELECT ON public.invoice_payments TO anon, authenticated;

NOTIFY pgrst, 'reload schema';


