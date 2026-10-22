-- Migration 13: Category-Coded Serials, Nullable exact_medium, and Public Gallery Indexes
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ofqbpjgoqkfwiicvqtxe/sql/new

-- 1. Make exact_medium optional in the database schema
ALTER TABLE public.paintings ALTER COLUMN exact_medium DROP NOT NULL;

-- 2. Update the serial number generator function with category code prefix
CREATE OR REPLACE FUNCTION public.generate_artwork_serial_number(p_type text DEFAULT 'oil')
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val bigint;
  cat_code text;
BEGIN
  next_val := nextval('public.artwork_serial_seq');

  cat_code := CASE lower(coalesce(p_type, ''))
    WHEN 'oil' THEN 'OIL'
    WHEN 'acrylic' THEN 'ACR'
    WHEN 'mixed' THEN 'MIX'
    ELSE 'ART'
  END;

  RETURN 'KCG-' || cat_code || '-' || lpad(next_val::text, 4, '0');
END;
$$;

-- 3. Update the trigger function
CREATE OR REPLACE FUNCTION public.trg_paintings_set_serial_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    IF NEW.serial_number IS NULL OR trim(NEW.serial_number) = '' THEN
      NEW.serial_number := public.generate_artwork_serial_number(NEW.painting_type);
    END IF;
  ELSIF tg_op = 'UPDATE' THEN
    IF OLD.serial_number IS NOT NULL AND NEW.serial_number IS DISTINCT FROM OLD.serial_number THEN
      NEW.serial_number := OLD.serial_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_artwork_serial_number ON public.paintings;
CREATE TRIGGER set_artwork_serial_number
  BEFORE INSERT OR UPDATE ON public.paintings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_paintings_set_serial_number();

-- 4. Safely resolve the single duplicate serial (KCG-0006 -> KCG-OIL-0055)
ALTER TABLE public.paintings DISABLE TRIGGER set_artwork_serial_number;

UPDATE public.paintings 
SET serial_number = 'KCG-OIL-0055' 
WHERE serial_number = 'KCG-0006' OR title ILIKE 'City abstract';

ALTER TABLE public.paintings ENABLE TRIGGER set_artwork_serial_number;

-- 5. Advance the serial sequence to 55 so future artworks start from 56
CREATE SEQUENCE IF NOT EXISTS public.artwork_serial_seq START WITH 1 INCREMENT BY 1;
SELECT setval('public.artwork_serial_seq', 55, true);

-- 6. Add partial composite indexes for fast gallery filtering and sorting
CREATE INDEX IF NOT EXISTS idx_paintings_public_feed
  ON public.paintings (created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_paintings_public_type
  ON public.paintings (painting_type, created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_paintings_public_price
  ON public.paintings (base_price_bdt, created_at DESC)
  WHERE is_published = true AND archived_at IS NULL;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
