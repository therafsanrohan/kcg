import { NextResponse } from 'next/server'
import { getExchangeRates } from '@/utils/currency'

export const revalidate = 21600 // 6 hours ISR

/**
 * GET /api/exchange-rates
 * Returns live exchange rates (BDT base) for client components.
 * Cached at the Next.js layer for 6 hours.
 */
export async function GET() {
  try {
    const rates = await getExchangeRates()
    return NextResponse.json(
      { rates, base: 'BDT', timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
        },
      }
    )
  } catch (err) {
    console.error('[api/exchange-rates] Error:', err)
    // Return fallback rates on error
    const { FALLBACK_RATES } = await import('@/utils/currency-shared')
    return NextResponse.json(
      { rates: FALLBACK_RATES, base: 'BDT', timestamp: new Date().toISOString(), fallback: true },
      { status: 200 }
    )
  }
}
