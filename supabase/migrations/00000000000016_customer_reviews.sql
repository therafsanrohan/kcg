-- Migration 16: Direct On-Site Customer Reviews System
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ofqbpjgoqkfwiicvqtxe/sql/new

-- 1. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_location text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexes for fast public feed filtering and admin queries
CREATE INDEX IF NOT EXISTS idx_reviews_status_created_at
  ON public.reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_email
  ON public.reviews (customer_email);

-- 3. Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can SELECT only approved reviews
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
CREATE POLICY "Allow public read approved reviews"
  ON public.reviews
  FOR SELECT
  USING (status = 'approved');

-- Anyone can submit a review with pending status
DROP POLICY IF EXISTS "Allow public submit pending reviews" ON public.reviews;
CREATE POLICY "Allow public submit pending reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (status = 'pending');

-- Authenticated admins have full management access
DROP POLICY IF EXISTS "Allow admin full access to reviews" ON public.reviews;
CREATE POLICY "Allow admin full access to reviews"
  ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Grants
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
