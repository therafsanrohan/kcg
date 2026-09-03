-- ==========================================================
-- COMPLETE ONE-CLICK SETUP FOR KAZI CANVAS GALLERY
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jndcunflcastmtqmqyvx/sql/new
-- ==========================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.paintings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  painting_type text NOT NULL CHECK (painting_type IN ('oil', 'acrylic', 'mixed')),
  exact_medium text NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  measurement_unit text NOT NULL DEFAULT 'cm',
  display_size text,
  year integer,
  base_price_bdt numeric NOT NULL,
  description text,
  search_tags text,
  availability_status text NOT NULL CHECK (availability_status IN ('available', 'reserved', 'sold')),
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  archived_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.painting_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  painting_id uuid REFERENCES public.paintings(id) ON DELETE CASCADE NOT NULL,
  storage_key text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_main boolean NOT NULL DEFAULT false,
  width integer,
  height integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.frame_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  painting_id uuid REFERENCES public.paintings(id) ON DELETE CASCADE NOT NULL,
  frame_name text NOT NULL,
  outer_size text,
  price_bdt numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name text NOT NULL DEFAULT 'Kazi Canvas Gallery',
  whatsapp_number text NOT NULL DEFAULT '8801824951514',
  default_currency text NOT NULL DEFAULT 'BDT',
  contact_info text,
  gallery_address text,
  social_links jsonb,
  currency_config jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security
ALTER TABLE public.paintings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.painting_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frame_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Safe policy recreation (won't error if policies already exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read-only access to published paintings" ON public.paintings;
  CREATE POLICY "Allow public read-only access to published paintings" ON public.paintings FOR SELECT USING (is_published = true AND archived_at IS NULL);

  DROP POLICY IF EXISTS "Allow public read-only access to painting images" ON public.painting_images;
  CREATE POLICY "Allow public read-only access to painting images" ON public.painting_images FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Allow public read-only access to frame options" ON public.frame_options;
  CREATE POLICY "Allow public read-only access to frame options" ON public.frame_options FOR SELECT USING (is_active = true);

  DROP POLICY IF EXISTS "Allow public read-only access to site settings" ON public.site_settings;
  CREATE POLICY "Allow public read-only access to site settings" ON public.site_settings FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Allow admins full access to paintings" ON public.paintings;
  CREATE POLICY "Allow admins full access to paintings" ON public.paintings FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Allow admins full access to painting images" ON public.painting_images;
  CREATE POLICY "Allow admins full access to painting images" ON public.painting_images FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Allow admins full access to frame options" ON public.frame_options;
  CREATE POLICY "Allow admins full access to frame options" ON public.frame_options FOR ALL USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Allow admins full access to site settings" ON public.site_settings;
  CREATE POLICY "Allow admins full access to site settings" ON public.site_settings FOR ALL USING (auth.role() = 'authenticated');
END $$;

-- 4. Permissions & Cache Reload
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Create Verified Admin User (Password: admin12345)
-- User 1: knock.rafsan@gmail.com
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'knock.rafsan@gmail.com',
  crypt('admin12345', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('admin12345', gen_salt('bf')),
  email_confirmed_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"sub":"a0000000-0000-0000-0000-000000000001","email":"knock.rafsan@gmail.com"}',
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider, id) DO NOTHING;

-- 6. Insert Default Site Settings
INSERT INTO public.site_settings (
  id, business_name, whatsapp_number, default_currency, contact_info, gallery_address
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Kazi Canvas Gallery',
  '8801824951514',
  'BDT',
  'Email: gallery@kazicanvas.com | Phone: +880 1824-951514',
  'Dhanmondi, Dhaka, Bangladesh'
)
ON CONFLICT (id) DO UPDATE SET
  business_name = excluded.business_name,
  whatsapp_number = excluded.whatsapp_number;

-- 7. Insert Sample Paintings with Images and Frames
-- Painting 1
INSERT INTO public.paintings (
  id, title, slug, painting_type, exact_medium, width, height, measurement_unit,
  display_size, year, base_price_bdt, description, search_tags, availability_status, is_featured, is_published
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Whispers of the Bengal Delta',
  'whispers-of-the-bengal-delta',
  'oil', 'Oil on Stretched Belgian Linen', 90, 120, 'cm',
  '90 x 120 cm (35 x 47 in)', 2025, 85000,
  'An ethereal exploration of the monsoon horizons across the southern riverbanks of Bangladesh. Rich cerulean blues melt into radiant amber and raw sienna strokes.',
  'landscape, river, sunset, oil painting, impressionism, modern',
  'available', true, true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.painting_images (painting_id, storage_key, alt_text, sort_order, is_main, width, height)
VALUES ('11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop', 'Whispers of the Bengal Delta', 0, true, 1200, 1600)
ON CONFLICT DO NOTHING;

INSERT INTO public.frame_options (painting_id, frame_name, outer_size, price_bdt, is_active, sort_order)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Raw Teakwood Minimalist Floating Frame', '96 x 126 cm', 12000, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'Matte Black Contemporary Deep Shadowbox', '98 x 128 cm', 9500, true, 2)
ON CONFLICT DO NOTHING;

-- Painting 2
INSERT INTO public.paintings (
  id, title, slug, painting_type, exact_medium, width, height, measurement_unit,
  display_size, year, base_price_bdt, description, search_tags, availability_status, is_featured, is_published
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Rhythm of the Monsoon',
  'rhythm-of-the-monsoon',
  'acrylic', 'Heavy Body Acrylic on Gallery Canvas', 75, 100, 'cm',
  '75 x 100 cm (30 x 40 in)', 2024, 55000,
  'Dynamic textured brushwork and impasto layers celebrate torrential rains and lush renewal. Emerald greens and deep ultramarine contrast with vibrant yellow highlights.',
  'abstract, monsoon, nature, acrylic, vibrant, colorful',
  'available', true, true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.painting_images (painting_id, storage_key, alt_text, sort_order, is_main, width, height)
VALUES ('22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop', 'Rhythm of the Monsoon', 0, true, 1200, 1600)
ON CONFLICT DO NOTHING;

INSERT INTO public.frame_options (painting_id, frame_name, outer_size, price_bdt, is_active, sort_order)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Champagne Gold Floating Frame', '81 x 106 cm', 10500, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Nordic White Oak Slim Frame', '79 x 104 cm', 8000, true, 2)
ON CONFLICT DO NOTHING;

-- Painting 3
INSERT INTO public.paintings (
  id, title, slug, painting_type, exact_medium, width, height, measurement_unit,
  display_size, year, base_price_bdt, description, search_tags, availability_status, is_featured, is_published
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Old Dhaka Memories in Sepia',
  'old-dhaka-memories-in-sepia',
  'mixed', 'Charcoal, Ink & Oil Wash on Hand-stretched Canvas', 60, 80, 'cm',
  '60 x 80 cm (24 x 31 in)', 2024, 42000,
  'A nostalgic homage to the historic alleyways and heritage architecture of Puran Dhaka. Delicate ink lines balance against moody charcoal washes.',
  'heritage, architecture, old dhaka, charcoal, mixed media, monochrome',
  'available', true, true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.painting_images (painting_id, storage_key, alt_text, sort_order, is_main, width, height)
VALUES ('33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200&auto=format&fit=crop', 'Old Dhaka Memories', 0, true, 1200, 1600)
ON CONFLICT DO NOTHING;

INSERT INTO public.frame_options (painting_id, frame_name, outer_size, price_bdt, is_active, sort_order)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Distressed Antique Charcoal Wood Frame', '66 x 86 cm', 7500, true, 1)
ON CONFLICT DO NOTHING;

-- Painting 4
INSERT INTO public.paintings (
  id, title, slug, painting_type, exact_medium, width, height, measurement_unit,
  display_size, year, base_price_bdt, description, search_tags, availability_status, is_featured, is_published
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Crimson Horizon',
  'crimson-horizon',
  'oil', 'Pure Oil with Palette Knife on Heavy Duty Canvas', 100, 100, 'cm',
  '100 x 100 cm (39 x 39 in)', 2025, 95000,
  'Bold, energetic strokes of crimson and cadmium red collide in this statement contemporary piece for luxury interiors.',
  'contemporary, bold, crimson, red, oil painting, statement art',
  'reserved', false, true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.painting_images (painting_id, storage_key, alt_text, sort_order, is_main, width, height)
VALUES ('44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=1200&auto=format&fit=crop', 'Crimson Horizon', 0, true, 1200, 1600)
ON CONFLICT DO NOTHING;

-- Final cache reload
NOTIFY pgrst, 'reload schema';
