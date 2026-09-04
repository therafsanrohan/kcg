/**
 * Server-side currency module.
 * Re-exports shared constants and adds server-only rate fetching with DB caching.
 */

// Re-export everything from shared module
export {
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
  CURRENCY_SYMBOLS,
  convertCurrency,
  getCurrencySymbol,
} from './currency-shared'
export type { Currency } from './currency-shared'

import { FALLBACK_RATES, SUPPORTED_CURRENCIES } from './currency-shared'

const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000 // 6 hours
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/BDT'

/**
 * Fetch live exchange rates from ExchangeRate-API.
 */
async function fetchFromApi(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(EXCHANGE_API_URL, {
      next: { revalidate: 21600 }, // 6 hours ISR cache
    })
    if (!res.ok) return null

    const data = await res.json()
    if (data.result !== 'success' || !data.rates) return null

    const rates: Record<string, number> = { BDT: 1 }
    for (const curr of SUPPORTED_CURRENCIES) {
      if (curr !== 'BDT' && data.rates[curr]) {
        rates[curr] = data.rates[curr]
      }
    }
    return rates
  } catch (err) {
    console.error('[currency] API fetch failed:', err)
    return null
  }
}

/**
 * Read cached rates from Supabase.
 */
async function readCache(): Promise<{ rates: Record<string, number>; fetched_at: string } | null> {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) return null

    const supabase = createSupabaseClient(supabaseUrl, anonKey)

    const { data, error } = await supabase
      .from('exchange_rate_cache')
      .select('rates, fetched_at')
      .eq('base_currency', 'BDT')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return { rates: data.rates as Record<string, number>, fetched_at: data.fetched_at }
  } catch {
    return null
  }
}

/**
 * Write rates to the Supabase cache using service_role (bypasses RLS).
 */
async function writeCache(rates: Record<string, number>): Promise<void> {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[currency] Missing env vars for cache write')
      return
    }

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey)

    // Delete old cache entries, keep only latest
    await adminClient
      .from('exchange_rate_cache')
      .delete()
      .eq('base_currency', 'BDT')

    await adminClient
      .from('exchange_rate_cache')
      .insert({
        base_currency: 'BDT',
        rates,
        fetched_at: new Date().toISOString(),
        source: 'exchangerate-api',
      })
  } catch (err) {
    console.error('[currency] Cache write failed:', err)
  }
}

/**
 * Get exchange rates – server-side only.
 * Strategy: cache → API (if stale) → stale cache → fallback.
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // 1. Try reading from cache
  const cached = await readCache()

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime()
    if (age < CACHE_MAX_AGE_MS) {
      return cached.rates
    }
  }

  // 2. Cache is stale or missing – fetch from API
  const liveRates = await fetchFromApi()
  if (liveRates) {
    writeCache(liveRates).catch(() => {})
    return liveRates
  }

  // 3. API failed – return stale cache if available
  if (cached) {
    console.warn('[currency] Using stale cache (API unavailable)')
    return cached.rates
  }

  // 4. Everything failed – return hardcoded fallback
  console.warn('[currency] Using hardcoded fallback rates')
  return FALLBACK_RATES
}
