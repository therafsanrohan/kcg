-- Migration 4: Structured Measurement Fields (Additive)
-- Adds canonical millimetre storage for artwork and frame dimensions.
-- Existing columns (width, height, measurement_unit, display_size, outer_size) are NOT removed.

-- Canonical mm storage for artwork dimensions
ALTER TABLE public.paintings ADD COLUMN IF NOT EXISTS width_mm numeric;
ALTER TABLE public.paintings ADD COLUMN IF NOT EXISTS height_mm numeric;

-- Canonical mm storage for frame outer dimensions
ALTER TABLE public.frame_options ADD COLUMN IF NOT EXISTS outer_width_mm numeric;
ALTER TABLE public.frame_options ADD COLUMN IF NOT EXISTS outer_height_mm numeric;
