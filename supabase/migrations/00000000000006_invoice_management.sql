-- Migration 6: Invoice Management System
-- Additive structure for Invoices, safe and immutable.

-- 1. Invoice Number Sequence & Generator
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_val integer;
  current_year text;
BEGIN
  next_val := nextval('public.invoice_number_seq');
  current_year := to_char(now(), 'YYYY');
  -- Formats to e.g., KCG-2026-0001
  RETURN 'KCG-' || current_year || '-' || to_char(next_val, 'FM0000');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number text NOT NULL UNIQUE DEFAULT public.generate_invoice_number(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  
  -- Customer Details
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_address text,
  
  -- Delivery Details Snapshot
  delivery_zone_code text,
  delivery_mode_snapshot text,
  delivery_note_snapshot text,
  
  -- Currency & Financials
  currency_code text NOT NULL DEFAULT 'BDT',
  exchange_rate_snapshot numeric NOT NULL DEFAULT 1,
  
  subtotal_bdt numeric NOT NULL DEFAULT 0 CHECK (subtotal_bdt >= 0),
  discount_bdt numeric NOT NULL DEFAULT 0 CHECK (discount_bdt >= 0),
  delivery_charge_bdt numeric NOT NULL DEFAULT 0 CHECK (delivery_charge_bdt >= 0),
  additional_charge_bdt numeric NOT NULL DEFAULT 0 CHECK (additional_charge_bdt >= 0),
  grand_total_bdt numeric NOT NULL DEFAULT 0 CHECK (grand_total_bdt >= 0),
  
  -- Notes
  notes text,
  terms text,
  
  -- Tracking
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at timestamp with time zone,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('painting', 'frame', 'delivery', 'discount', 'custom')),
  
  -- Reference to original painting, if available. ON DELETE SET NULL preserves the invoice.
  painting_id uuid REFERENCES public.paintings(id) ON DELETE SET NULL,
  
  item_name text NOT NULL,
  item_description text,
  artwork_sku text,
  size_snapshot text,
  
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price_bdt numeric NOT NULL DEFAULT 0 CHECK (unit_price_bdt >= 0),
  line_total_bdt numeric NOT NULL DEFAULT 0,
  
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Triggers for `updated_at`
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admin full access to invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin full access to invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
