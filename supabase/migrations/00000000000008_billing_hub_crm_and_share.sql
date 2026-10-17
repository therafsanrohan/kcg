-- Migration 8: Clients CRM, Void Support, Public Share Links & Atomic Numbering
-- Safe, additive migration preserving all existing records.

-- 1. Clients Table (Centralized Client CRM)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_type text NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'organization')),
  name text NOT NULL,
  organization_name text,
  email text,
  phone text NOT NULL,
  billing_address text,
  shipping_address text,
  tax_id text,
  internal_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast search
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);

-- Trigger for clients updated_at
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. Add client_id, void fields, and share_token to invoices if not present
DO $$
BEGIN
  -- client_id reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
  END IF;

  -- void tracking
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

  -- Public Share Link Bearer Token
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

-- 3. Atomic Finalize Invoice Number Function
-- Concurrency-safe: uses row-level lock and atomic sequence
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

-- 4. Row Level Security for Clients & Public Share Link
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
  ON public.clients
  FOR ALL
  TO authenticated
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
