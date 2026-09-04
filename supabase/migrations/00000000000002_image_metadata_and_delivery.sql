-- Migration 2: Additive fields for paintings, painting_images, and delivery_zones table

-- 1. Additive fields on paintings
ALTER TABLE public.paintings ADD COLUMN IF NOT EXISTS discount_price_bdt numeric;
ALTER TABLE public.paintings ADD COLUMN IF NOT EXISTS offer_badge text;

-- 2. Additive fields on painting_images
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS processed_key text;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS thumbnail_key text;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS file_size integer;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS mime_type text;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS crop_x numeric DEFAULT 0;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS crop_y numeric DEFAULT 0;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS crop_zoom numeric DEFAULT 1;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS crop_rotation numeric DEFAULT 0;
ALTER TABLE public.painting_images ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'completed';

-- 3. Delivery Zones Table
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE CHECK (code IN ('inside_dhaka', 'outside_dhaka', 'international')),
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('free', 'fixed', 'courier_quotation', 'destination_quotation')),
  charge_bdt numeric NOT NULL DEFAULT 0,
  free_delivery boolean NOT NULL DEFAULT false,
  offer_text text,
  customer_message text,
  courier_note text,
  estimated_delivery_time text,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to active delivery zones"
  ON public.delivery_zones FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access to delivery zones"
  ON public.delivery_zones FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default delivery zones if empty
INSERT INTO public.delivery_zones (code, label, pricing_mode, charge_bdt, estimated_delivery_time, sort_order)
VALUES 
  ('inside_dhaka', 'Inside Dhaka City Corporation', 'free', 0, '24–48 Hours', 1),
  ('outside_dhaka', 'Outside Dhaka City Corporation', 'fixed', 150, '2–4 Business Days', 2),
  ('international', 'Outside Bangladesh (Worldwide)', 'destination_quotation', 0, '5–10 Business Days', 3)
ON CONFLICT (code) DO NOTHING;
