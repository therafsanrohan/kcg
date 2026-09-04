-- Run this in the Supabase SQL Editor to create the necessary storage buckets

-- 1. Create Private Bucket for Original Master Images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'paintings_master', 
  'paintings_master', 
  false, -- Private bucket
  26214400, -- 25MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
) on conflict (id) do update set 
  public = false, 
  file_size_limit = 26214400,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- 2. Create Public Bucket for Optimized Website Images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'paintings_optimized', 
  'paintings_optimized', 
  true, -- Public bucket
  10485760, -- 10MB limit for generated variants
  array['image/jpeg', 'image/webp', 'image/avif']
) on conflict (id) do update set 
  public = true, 
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/webp', 'image/avif'];

-- RLS Policies for paintings_master (Admin only)
create policy "Admin full access to paintings_master"
on storage.objects for all using (
  bucket_id = 'paintings_master' and auth.role() = 'authenticated'
);

-- RLS Policies for paintings_optimized (Public Read, Admin Write)
create policy "Public read access to paintings_optimized"
on storage.objects for select using (
  bucket_id = 'paintings_optimized'
);

create policy "Admin write access to paintings_optimized"
on storage.objects for insert with check (
  bucket_id = 'paintings_optimized' and auth.role() = 'authenticated'
);

create policy "Admin update access to paintings_optimized"
on storage.objects for update using (
  bucket_id = 'paintings_optimized' and auth.role() = 'authenticated'
);

create policy "Admin delete access to paintings_optimized"
on storage.objects for delete using (
  bucket_id = 'paintings_optimized' and auth.role() = 'authenticated'
);
