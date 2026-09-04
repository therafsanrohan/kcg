/**
 * Shared currency constants – safe to import from both client and server components.
 * Server-side rate fetching lives in currency.ts (server-only).
 */

export const SUPPORTED_CURRENCIES = [
  'BDT', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR', 'AED', 'SAR', 'SGD', 'MYR'
] as const

export type Currency = typeof SUPPORTED_CURRENCIES[number]

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  BDT: '৳',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  AED: 'د.إ',
  SAR: '﷼',
  SGD: 'S$',
  MYR: 'RM',
}

// Fallback rates if both API and cache are unavailable (Base: BDT)
export const FALLBACK_RATES: Record<string, number> = {
  BDT: 1,
  USD: 0.0091,
  GBP: 0.0072,
  EUR: 0.0084,
  CAD: 0.012,
  AUD: 0.014,
  INR: 0.76,
  AED: 0.033,
  SAR: 0.034,
  SGD: 0.012,
  MYR: 0.043,
}

/**
 * Convert a BDT amount to the target currency.
 */
export function convertCurrency(
  amountBdt: number,
  targetCurrency: Currency,
  rates: Record<string, number>
): string {
  if (targetCurrency === 'BDT') {
    return amountBdt.toLocaleString('en-BD')
  }
  const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency]
  if (!rate) return amountBdt.toLocaleString('en-BD')

  const converted = amountBdt * rate
  return converted.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Get the symbol for a currency code.
 */
export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] || currency
}
