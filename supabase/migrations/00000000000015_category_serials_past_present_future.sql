-- Migration 15: Ensure all past, present, and future artwork serial numbers are category-coded
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ofqbpjgoqkfwiicvqtxe/sql/new

-- 1. Ensure sequence exists and sync to highest existing number
CREATE SEQUENCE IF NOT EXISTS public.artwork_serial_seq START WITH 1 INCREMENT BY 1;
SELECT setval('public.artwork_serial_seq', (
  SELECT coalesce(max(nullif(substring(serial_number from '[0-9]+$'), '')::integer), 63)
  FROM public.paintings
  WHERE serial_number IS NOT NULL
), true);

-- 2. Safely remove the default constraint first so Postgres allows replacing the function
ALTER TABLE public.paintings ALTER COLUMN serial_number DROP DEFAULT;

-- 3. Drop legacy 0-argument function with CASCADE to cleanly resolve any legacy dependencies
DROP FUNCTION IF EXISTS public.generate_artwork_serial_number() CASCADE;

-- 4. Category serial generator function with explicit category prefix (OIL, ACR, MIX, ART)
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

-- 5. Re-attach the new category generator as default
ALTER TABLE public.paintings ALTER COLUMN serial_number SET DEFAULT public.generate_artwork_serial_number('oil');

-- 6. Dynamic trigger function:
--    - Auto-generates category serials on INSERT if empty or non-category
--    - Dynamically updates category code on UPDATE if category changes or was legacy
CREATE OR REPLACE FUNCTION public.trg_paintings_set_serial_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cat_code text;
  num_part text;
BEGIN
  cat_code := CASE lower(coalesce(NEW.painting_type, ''))
    WHEN 'oil' THEN 'OIL'
    WHEN 'acrylic' THEN 'ACR'
    WHEN 'mixed' THEN 'MIX'
    ELSE 'ART'
  END;

  IF tg_op = 'INSERT' THEN
    IF NEW.serial_number IS NULL OR trim(NEW.serial_number) = '' THEN
      NEW.serial_number := public.generate_artwork_serial_number(NEW.painting_type);
    ELSIF NEW.serial_number ~ '^KCG-[0-9]+$' THEN
      num_part := substring(NEW.serial_number from '[0-9]+$');
      NEW.serial_number := 'KCG-' || cat_code || '-' || lpad(num_part, 4, '0');
    END IF;
  ELSIF tg_op = 'UPDATE' THEN
    -- If serial is currently missing or in old legacy format without category code, upgrade it!
    IF OLD.serial_number IS NULL OR OLD.serial_number = '' OR OLD.serial_number ~ '^KCG-[0-9]+$' THEN
      IF NEW.serial_number IS NOT NULL AND NEW.serial_number ~ '^KCG-[A-Z]+-[0-9]+$' THEN
        NEW.serial_number := NEW.serial_number;
      ELSE
        num_part := substring(coalesce(OLD.serial_number, '') from '[0-9]+$');
        IF num_part IS NOT NULL AND num_part <> '' THEN
          NEW.serial_number := 'KCG-' || cat_code || '-' || lpad(num_part, 4, '0');
        ELSE
          NEW.serial_number := public.generate_artwork_serial_number(NEW.painting_type);
        END IF;
      END IF;
    -- If painting category changed on update, dynamically update category code in serial!
    ELSIF OLD.painting_type IS DISTINCT FROM NEW.painting_type AND OLD.serial_number ~ '^KCG-[A-Z]+-[0-9]+$' THEN
      num_part := substring(OLD.serial_number from '[0-9]+$');
      NEW.serial_number := 'KCG-' || cat_code || '-' || lpad(num_part, 4, '0');
    -- Allow explicit valid category serial update
    ELSIF NEW.serial_number IS NOT NULL AND NEW.serial_number ~ '^KCG-[A-Z]+-[0-9]+$' AND NEW.serial_number IS DISTINCT FROM OLD.serial_number THEN
      NEW.serial_number := NEW.serial_number;
    ELSE
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

-- 7. Fix all past legacy serial numbers in public.paintings immediately
UPDATE public.paintings
SET serial_number = 'KCG-' || (
  CASE lower(coalesce(painting_type, ''))
    WHEN 'oil' THEN 'OIL'
    WHEN 'acrylic' THEN 'ACR'
    WHEN 'mixed' THEN 'MIX'
    ELSE 'ART'
  END
) || '-' || lpad(substring(serial_number from '[0-9]+$'), 4, '0')
WHERE serial_number ~ '^KCG-[0-9]+$';

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
