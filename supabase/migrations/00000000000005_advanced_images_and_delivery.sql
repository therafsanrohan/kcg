-- Migration 5: Advanced Images & Delivery Charge Details
-- Completely additive changes, no data destruction.

-- 1. Delivery Zones (Campaign dates & labels)
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS free_delivery_label text;
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS offer_starts_at timestamp with time zone;
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS offer_ends_at timestamp with time zone;

-- 2. Painting Images (Advanced Processing metadata)
-- `crop_x`, `processed_key`, `thumbnail_key` etc. were already added in Migration 2.
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS primary_image boolean NOT NULL DEFAULT false;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS file_format text;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS responsive_urls jsonb;

-- Ensure only one primary image per painting
CREATE UNIQUE INDEX IF NOT EXISTS painting_images_one_primary_idx 
ON public.painting_images (painting_id) 
WHERE (primary_image = true);
