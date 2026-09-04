-- Migration 3: Exchange Rate Cache Table
-- Stores server-side fetched exchange rates with timestamps for cache invalidation.

CREATE TABLE IF NOT EXISTS public.exchange_rate_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency text NOT NULL DEFAULT 'BDT',
  rates jsonb NOT NULL DEFAULT '{}',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'exchangerate-api'
);

ALTER TABLE public.exchange_rate_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached rates (needed for customer-facing pages)
CREATE POLICY "Public read exchange rates"
  ON public.exchange_rate_cache FOR SELECT USING (true);

-- Only admins can manually update/insert rates
CREATE POLICY "Admin write exchange rates"
  ON public.exchange_rate_cache FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Service role can also write (for server-side API route)
-- The service_role key bypasses RLS by default, so no extra policy needed.
