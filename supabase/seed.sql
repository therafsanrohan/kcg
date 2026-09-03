-- Grant schema and table permissions to anon and authenticated roles
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';

-- 1. Site Settings
insert into public.site_settings (
  id,
  business_name,
  whatsapp_number,
  default_currency,
  contact_info,
  gallery_address
) values (
  '00000000-0000-0000-0000-000000000001',
  'Kazi Canvas Gallery',
  '8801824951514',
  'BDT',
  'Email: gallery@kazicanvas.com | Phone: +880 1824-951514',
  'Dhanmondi, Dhaka, Bangladesh'
)
on conflict (id) do update set
  business_name = excluded.business_name,
  whatsapp_number = excluded.whatsapp_number;

-- 2. Sample Paintings
-- Painting 1: Whispers of the Bengal Delta
insert into public.paintings (
  id,
  title,
  slug,
  painting_type,
  exact_medium,
  width,
  height,
  measurement_unit,
  display_size,
  year,
  base_price_bdt,
  description,
  search_tags,
  availability_status,
  is_featured,
  is_published
) values (
  '11111111-1111-1111-1111-111111111111',
  'Whispers of the Bengal Delta',
  'whispers-of-the-bengal-delta',
  'oil',
  'Oil on Stretched Belgian Linen',
  90,
  120,
  'cm',
  '90 x 120 cm (35 x 47 in)',
  2025,
  85000,
  'An ethereal exploration of the monsoon horizons across the southern riverbanks of Bangladesh. Rich cerulean blues melt into radiant amber and raw sienna strokes, capturing the atmospheric serenity of dusk over the river.',
  'landscape, river, sunset, oil painting, impressionism, modern',
  'available',
  true,
  true
)
on conflict (slug) do nothing;

-- Image for Painting 1
insert into public.painting_images (
  painting_id,
  storage_key,
  alt_text,
  sort_order,
  is_main,
  width,
  height
) values (
  '11111111-1111-1111-1111-111111111111',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
  'Whispers of the Bengal Delta - Oil Painting',
  0,
  true,
  1200,
  1600
) on conflict do nothing;

-- Frames for Painting 1
insert into public.frame_options (
  painting_id,
  frame_name,
  outer_size,
  price_bdt,
  is_active,
  sort_order
) values
  ('11111111-1111-1111-1111-111111111111', 'Raw Teakwood Minimalist Floating Frame', '96 x 126 cm', 12000, true, 1),
  ('11111111-1111-1111-1111-111111111111', 'Matte Black Contemporary Deep Shadowbox', '98 x 128 cm', 9500, true, 2)
on conflict do nothing;


-- Painting 2: Rhythm of the Monsoon
insert into public.paintings (
  id,
  title,
  slug,
  painting_type,
  exact_medium,
  width,
  height,
  measurement_unit,
  display_size,
  year,
  base_price_bdt,
  description,
  search_tags,
  availability_status,
  is_featured,
  is_published
) values (
  '22222222-2222-2222-2222-222222222222',
  'Rhythm of the Monsoon',
  'rhythm-of-the-monsoon',
  'acrylic',
  'Heavy Body Acrylic on Gallery Canvas',
  75,
  100,
  'cm',
  '75 x 100 cm (30 x 40 in)',
  2024,
  55000,
  'Dynamic textured brushwork and impasto layers celebrate torrential rains and lush renewal. Emerald greens and deep ultramarine contrast with vibrant yellow and vermilion highlights.',
  'abstract, monsoon, nature, acrylic, vibrant, colorful',
  'available',
  true,
  true
)
on conflict (slug) do nothing;

-- Image for Painting 2
insert into public.painting_images (
  painting_id,
  storage_key,
  alt_text,
  sort_order,
  is_main,
  width,
  height
) values (
  '22222222-2222-2222-2222-222222222222',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop',
  'Rhythm of the Monsoon - Acrylic Painting',
  0,
  true,
  1200,
  1600
) on conflict do nothing;

-- Frames for Painting 2
insert into public.frame_options (
  painting_id,
  frame_name,
  outer_size,
  price_bdt,
  is_active,
  sort_order
) values
  ('22222222-2222-2222-2222-222222222222', 'Champagne Gold Floating Frame', '81 x 106 cm', 10500, true, 1),
  ('22222222-2222-2222-2222-222222222222', 'Nordic White Oak Slim Frame', '79 x 104 cm', 8000, true, 2)
on conflict do nothing;


-- Painting 3: Old Dhaka Memories in Sepia
insert into public.paintings (
  id,
  title,
  slug,
  painting_type,
  exact_medium,
  width,
  height,
  measurement_unit,
  display_size,
  year,
  base_price_bdt,
  description,
  search_tags,
  availability_status,
  is_featured,
  is_published
) values (
  '33333333-3333-3333-3333-333333333333',
  'Old Dhaka Memories in Sepia',
  'old-dhaka-memories-in-sepia',
  'mixed',
  'Charcoal, Ink & Oil Wash on Hand-stretched Canvas',
  60,
  80,
  'cm',
  '60 x 80 cm (24 x 31 in)',
  2024,
  42000,
  'A nostalgic homage to the historic alleyways and heritage architecture of Puran Dhaka. Delicate ink lines balance against moody charcoal washes, creating a vintage story of time and memory.',
  'heritage, architecture, old dhaka, charcoal, mixed media, monochrome',
  'available',
  true,
  true
)
on conflict (slug) do nothing;

-- Image for Painting 3
insert into public.painting_images (
  painting_id,
  storage_key,
  alt_text,
  sort_order,
  is_main,
  width,
  height
) values (
  '33333333-3333-3333-3333-333333333333',
  'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200&auto=format&fit=crop',
  'Old Dhaka Memories - Mixed Media',
  0,
  true,
  1200,
  1600
) on conflict do nothing;

-- Frames for Painting 3
insert into public.frame_options (
  painting_id,
  frame_name,
  outer_size,
  price_bdt,
  is_active,
  sort_order
) values
  ('33333333-3333-3333-3333-333333333333', 'Distressed Antique Charcoal Wood Frame', '66 x 86 cm', 7500, true, 1)
on conflict do nothing;


-- Painting 4: Crimson Horizon
insert into public.paintings (
  id,
  title,
  slug,
  painting_type,
  exact_medium,
  width,
  height,
  measurement_unit,
  display_size,
  year,
  base_price_bdt,
  description,
  search_tags,
  availability_status,
  is_featured,
  is_published
) values (
  '44444444-4444-4444-4444-444444444444',
  'Crimson Horizon',
  'crimson-horizon',
  'oil',
  'Pure Oil with Palette Knife on Heavy Duty Canvas',
  100,
  100,
  'cm',
  '100 x 100 cm (39 x 39 in)',
  2025,
  95000,
  'Bold, energetic strokes of crimson, cadmium red, and warm ochre collide in this statement contemporary piece. Evokes passionate emotion and fearless modern aesthetic for luxury interiors.',
  'contemporary, bold, crimson, red, oil painting, statement art',
  'reserved',
  false,
  true
)
on conflict (slug) do nothing;

-- Image for Painting 4
insert into public.painting_images (
  painting_id,
  storage_key,
  alt_text,
  sort_order,
  is_main,
  width,
  height
) values (
  '44444444-4444-4444-4444-444444444444',
  'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?q=80&w=1200&auto=format&fit=crop',
  'Crimson Horizon - Oil Painting',
  0,
  true,
  1200,
  1600
) on conflict do nothing;

-- Reload schema again to be 100% sure
notify pgrst, 'reload schema';
