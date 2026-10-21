-- Migration 11: Fix Primary Image Unique Index
-- Ensure archived images do not count towards the single primary image constraint

UPDATE public.painting_images
SET primary_image = false, is_main = false
WHERE archived_at IS NOT NULL;

DROP INDEX IF EXISTS public.painting_images_one_primary_idx;

CREATE UNIQUE INDEX IF NOT EXISTS painting_images_one_primary_idx 
ON public.painting_images (painting_id) 
WHERE (primary_image = true AND archived_at IS NULL);
