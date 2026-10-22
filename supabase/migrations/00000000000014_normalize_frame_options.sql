-- Migration: 00000000000014_normalize_frame_options.sql
-- Description: Standardize frame names to canonical forms and eliminate duplicates.
-- Canonical frame names:
--   'Double-Bit frame (White)'
--   'Double-Bit frame (Black)'
--   'Single-Bit frame (White)'
--   'Single-Bit frame (Black)'

-- 1. Normalize existing frame names
UPDATE public.frame_options
SET frame_name = 'Double-Bit frame (White)'
WHERE frame_name ILIKE '%Double%Bit%White%';

UPDATE public.frame_options
SET frame_name = 'Double-Bit frame (Black)'
WHERE frame_name ILIKE '%Double%Bit%Black%';

UPDATE public.frame_options
SET frame_name = 'Single-Bit frame (White)'
WHERE frame_name ILIKE '%Single%Bit%White%';

UPDATE public.frame_options
SET frame_name = 'Single-Bit frame (Black)'
WHERE frame_name ILIKE '%Single%Bit%Black%';

-- 2. Delete any duplicate frame options per painting, keeping the earliest created row
DELETE FROM public.frame_options
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY painting_id, LOWER(REGEXP_REPLACE(frame_name, '[^a-zA-Z0-9]', '', 'g'))
             ORDER BY created_at ASC, id ASC
           ) as rn
    FROM public.frame_options
  ) sub
  WHERE rn > 1
);

-- 3. Add a partial unique index to permanently prevent duplicates on active frame options
CREATE UNIQUE INDEX IF NOT EXISTS idx_frame_options_unique_painting_frame
ON public.frame_options (painting_id, LOWER(frame_name))
WHERE is_active = true;
