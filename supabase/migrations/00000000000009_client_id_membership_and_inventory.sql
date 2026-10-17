-- Migration 9: Client ID Sequence, Membership System, and High-Performance Inventory Search Indexes
-- Safe, non-destructive, additive migration.

-- 1. Client Number Sequence & Generator (KCG-CL-000001)
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

-- 2. Add client_number & membership columns to public.clients if not present
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

-- Backfill any existing client records without client_number
UPDATE public.clients
SET client_number = public.generate_client_number()
WHERE client_number IS NULL;

-- 3. Dedicated indexes for high-speed client lookup
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON public.clients (client_number);
CREATE INDEX IF NOT EXISTS idx_clients_membership_tier ON public.clients (membership_tier);

-- 4. High-Performance Inventory Query Indexes on Paintings table
CREATE INDEX IF NOT EXISTS idx_paintings_title_trgm ON public.paintings USING btree (title);
CREATE INDEX IF NOT EXISTS idx_paintings_availability ON public.paintings (availability_status);
CREATE INDEX IF NOT EXISTS idx_paintings_created_at_desc ON public.paintings (created_at DESC);

NOTIFY pgrst, 'reload schema';
