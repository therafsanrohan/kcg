-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Paintings Table
create table public.paintings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  painting_type text not null check (painting_type in ('oil', 'acrylic', 'mixed')),
  exact_medium text not null,
  width numeric not null,
  height numeric not null,
  measurement_unit text not null default 'cm',
  display_size text,
  year integer,
  base_price_bdt numeric not null,
  description text,
  search_tags text,
  availability_status text not null check (availability_status in ('available', 'reserved', 'sold')),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- Painting Images Table
create table public.painting_images (
  id uuid primary key default uuid_generate_v4(),
  painting_id uuid references public.paintings(id) on delete cascade not null,
  storage_key text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_main boolean not null default false,
  width integer,
  height integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Frame Options Table
create table public.frame_options (
  id uuid primary key default uuid_generate_v4(),
  painting_id uuid references public.paintings(id) on delete cascade not null,
  frame_name text not null,
  outer_size text,
  price_bdt numeric not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Site Settings Table
create table public.site_settings (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null default 'Kazi Canvas Gallery',
  whatsapp_number text not null,
  default_currency text not null default 'BDT',
  contact_info text,
  gallery_address text,
  social_links jsonb,
  currency_config jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Search Index for Paintings
create index idx_paintings_search on public.paintings using gin(to_tsvector('english', title || ' ' || coalesce(exact_medium, '') || ' ' || coalesce(description, '') || ' ' || coalesce(search_tags, '')));

-- RLS setup (Enable Row Level Security)
alter table public.paintings enable row level security;
alter table public.painting_images enable row level security;
alter table public.frame_options enable row level security;
alter table public.site_settings enable row level security;

-- Public READ policies (for published/active items)
create policy "Allow public read-only access to published paintings" on public.paintings for select using (is_published = true and archived_at is null);
create policy "Allow public read-only access to painting images" on public.painting_images for select using (true);
create policy "Allow public read-only access to frame options" on public.frame_options for select using (is_active = true);
create policy "Allow public read-only access to site settings" on public.site_settings for select using (true);

-- Admin WRITE policies (requires authenticated user)
create policy "Allow admins full access to paintings" on public.paintings for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to painting images" on public.painting_images for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to frame options" on public.frame_options for all using (auth.role() = 'authenticated');
create policy "Allow admins full access to site settings" on public.site_settings for all using (auth.role() = 'authenticated');
