-- Migration 12: Automatic Permanent Serial Number System for Artworks with Category Codes
-- Format: KCG-OIL-0001, KCG-ACR-0002, KCG-MIX-0003, etc.
-- Concurrency-safe, permanent, immutable serial numbering for Kazi Canvas Gallery artworks

-- 1. Create dedicated sequence for monotonic collision-free numbering
CREATE SEQUENCE IF NOT EXISTS public.artwork_serial_seq START WITH 1 INCREMENT BY 1;

-- 2. Add serial_number column to paintings table if not present
ALTER TABLE public.paintings
  ADD COLUMN IF NOT EXISTS serial_number text;

-- 3. Database function to generate the formatted serial string with category code
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

-- 4. Trigger function to ensure automatic assignment on INSERT and immutability on UPDATE
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
    -- Enforce immutability: Admins/updates cannot modify or reassign an existing serial
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

-- 5. Safe idempotent backfill for existing artworks (ordered chronologically)
DO $$
DECLARE
  r record;
  seq_counter integer := 0;
  cat_code text;
BEGIN
  -- Determine current highest numerical serial if any exist
  SELECT coalesce(max(nullif(substring(serial_number from '[0-9]+$'), '')::integer), 0)
  INTO seq_counter
  FROM public.paintings
  WHERE serial_number ~ '^KCG-[A-Z]+-[0-9]+$';

  FOR r IN 
    SELECT id, painting_type 
    FROM public.paintings 
    WHERE serial_number IS NULL OR serial_number = ''
    ORDER BY created_at ASC, id ASC 
  LOOP
    seq_counter := seq_counter + 1;
    cat_code := CASE lower(coalesce(r.painting_type, ''))
      WHEN 'oil' THEN 'OIL'
      WHEN 'acrylic' THEN 'ACR'
      WHEN 'mixed' THEN 'MIX'
      ELSE 'ART'
    END;

    UPDATE public.paintings
      SET serial_number = 'KCG-' || cat_code || '-' || lpad(seq_counter::text, 4, '0')
      WHERE id = r.id;
  END LOOP;

  -- Advance sequence to the maximum assigned serial number
  IF seq_counter > 0 THEN
    PERFORM setval('public.artwork_serial_seq', seq_counter, true);
  ELSE
    PERFORM setval('public.artwork_serial_seq', 1, false);
  END IF;
END $$;

-- 6. Database-level uniqueness enforcement
CREATE UNIQUE INDEX IF NOT EXISTS paintings_serial_number_idx
  ON public.paintings (serial_number);

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload schema';
