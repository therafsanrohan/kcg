'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, MessageCircle, ChevronDown } from 'lucide-react'
import { SUPPORTED_CURRENCIES, Currency } from '@/utils/currency'

export default function Navbar({ whatsappNumber = '8801824951514' }: { whatsappNumber?: string }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currency, setCurrency] = useState<Currency>('BDT')
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')

  useEffect(() => {
    const saved = localStorage.getItem('preferredCurrency') as Currency
    if (saved && SUPPORTED_CURRENCIES.includes(saved)) {
      setCurrency(saved)
    }
  }, [])

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as Currency
    setCurrency(newCurrency)
    localStorage.setItem('preferredCurrency', newCurrency)
    window.dispatchEvent(new Event('preferredCurrencyChanged'))
  }

  // Do not render customer Navbar on admin pages to avoid double navbars
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-20" aria-label="Global">
        
        {/* Left: Brand Title (Helvetica Neue) */}
        <div className="flex items-center">
          <Link href="/" className="group flex items-center">
            <span
              className="text-xl sm:text-2xl font-bold tracking-tight text-gray-950 group-hover:text-gray-600 transition-colors"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              Kazi Canvas Gallery
            </span>
          </Link>
        </div>

        {/* Right: Functional Currency Dropdown, WhatsApp CTA, Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Functional Currency Dropdown */}
          <div className="relative inline-block">
            <select
              value={currency}
              onChange={handleCurrencyChange}
              aria-label="Select currency"
              className="h-10 pl-3.5 pr-8 rounded-lg border border-gray-200 bg-white text-xs sm:text-sm font-semibold text-gray-800 hover:border-gray-400 focus:border-black outline-none appearance-none cursor-pointer shadow-2xs transition-all"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* WhatsApp Button */}
          <a
            href={`https://wa.me/${cleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 sm:px-5 rounded-lg bg-black text-white text-xs sm:text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4 fill-white stroke-none" />
            <span>WhatsApp</span>
          </a>

          {/* Mobile menu icon button */}
          <button
            type="button"
            className="h-10 w-10 md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-xl transition-all duration-300 ease-in-out">
          <div className="space-y-1.5 px-4 pb-6 pt-4">
            <Link 
              href="/gallery" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3.5 py-2.5 text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              All Artworks
            </Link>
            <Link 
              href="/gallery?type=oil" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3.5 py-2.5 text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Oil Paintings
            </Link>
            <Link 
              href="/gallery?type=acrylic" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3.5 py-2.5 text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Acrylic Paintings
            </Link>
            <Link 
              href="/gallery?type=mixed" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3.5 py-2.5 text-base font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Mixed Media
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-3">
              <span className="text-xs text-gray-500 font-light">Direct Contact: +{cleanNumber}</span>
              <a
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:underline"
              >
                Order via WhatsApp &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
