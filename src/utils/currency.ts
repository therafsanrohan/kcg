export const SUPPORTED_CURRENCIES = [
  'BDT', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'INR', 'AED', 'SAR', 'SGD', 'MYR'
] as const

export type Currency = typeof SUPPORTED_CURRENCIES[number]

// Fallback rates if an API is unavailable (Base: BDT)
// Note: These are rough approximations and should be updated by a real API.
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

// In a real production app, you would fetch from an API like OpenExchangeRates
// and cache it using Next.js `fetch` with a `revalidate` time of 21600 (6 hours)
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Mocking the fetch for now to guarantee no breaking errors if API key is missing.
  return FALLBACK_RATES
}

export function convertCurrency(amountBdt: number, targetCurrency: Currency, rates: Record<string, number>): string {
  if (targetCurrency === 'BDT') {
    return amountBdt.toLocaleString('en-BD')
  }
  const rate = rates[targetCurrency] || FALLBACK_RATES[targetCurrency]
  const converted = amountBdt * rate
  
  // Format with appropriate decimal places (usually 2 for most currencies, 0 for things like JPY/INR depending on preference)
  return converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
