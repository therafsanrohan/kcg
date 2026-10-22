'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu, X, MessageCircle, ChevronDown } from 'lucide-react'
import { SUPPORTED_CURRENCIES, Currency } from '@/utils/currency-shared'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon'

function NavLinks() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentType = searchParams.get('type')

  const isAllActive = pathname === '/gallery' && !currentType
  const isOilActive = pathname === '/gallery' && currentType === 'oil'
  const isAcrylicActive = pathname === '/gallery' && currentType === 'acrylic'
  const isAboutActive = pathname === '/about'

  return (
    <div className="hidden lg:flex items-center gap-x-8 xl:gap-x-10">
      <Link
        href="/gallery"
        className={`text-xs uppercase tracking-[0.18em] transition-colors hover:text-black whitespace-nowrap pb-1 ${
          isAllActive ? 'text-black font-semibold border-b border-black' : 'text-gray-500 font-medium'
        }`}
      >
        All Works
      </Link>
      <Link
        href="/gallery?type=oil"
        className={`text-xs uppercase tracking-[0.18em] transition-colors hover:text-black whitespace-nowrap pb-1 ${
          isOilActive ? 'text-black font-semibold border-b border-black' : 'text-gray-500 font-medium'
        }`}
      >
        Oil on Canvas
      </Link>
      <Link
        href="/gallery?type=acrylic"
        className={`text-xs uppercase tracking-[0.18em] transition-colors hover:text-black whitespace-nowrap pb-1 ${
          isAcrylicActive ? 'text-black font-semibold border-b border-black' : 'text-gray-500 font-medium'
        }`}
      >
        Acrylic
      </Link>
      <Link
        href="/about"
        className={`text-xs uppercase tracking-[0.18em] transition-colors hover:text-black whitespace-nowrap pb-1 ${
          isAboutActive ? 'text-black font-semibold border-b border-black' : 'text-gray-500 font-medium'
        }`}
      >
        Our Story
      </Link>
      <Link
        href="/#contact"
        className="text-xs uppercase tracking-[0.18em] transition-colors hover:text-black whitespace-nowrap pb-1 text-gray-500 font-medium"
      >
        Contact
      </Link>
    </div>
  )
}

export default function Navbar({ whatsappNumber = '8801824951514' }: { whatsappNumber?: string }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [mounted, setMounted] = useState(false)
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')

  useEffect(() => {
    setMounted(true)
  }, [])

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

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  // Do not render customer Navbar on admin pages or dedicated invoice document pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-gray-200/60 transition-all duration-300">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16 sm:h-20" aria-label="Global">
        
        {/* Left: Brand Title */}
        <div className="flex items-center flex-shrink-0 z-20">
          <Link
            href="/"
            onClick={() => {
              setMobileMenuOpen(false)
              if (pathname === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            }}
            className="group flex items-center cursor-pointer py-1"
          >
            <span
              className="font-editorial text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight text-gray-950 group-hover:text-gray-600 transition-colors whitespace-nowrap"
            >
              Kazi Canvas Gallery
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Category Links */}
        <Suspense fallback={null}>
          <NavLinks />
        </Suspense>

        {/* Right: Functional Currency Dropdown, WhatsApp CTA, Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
          
          {/* Functional Currency Dropdown */}
          <div className="relative inline-block">
            <select
              value={currency}
              onChange={handleCurrencyChange}
              aria-label="Select currency"
              className="h-9 sm:h-10 pl-3 pr-8 rounded-md border border-gray-200 bg-transparent text-xs font-mono font-medium text-gray-800 hover:border-gray-400 focus:border-black outline-none appearance-none cursor-pointer transition-colors"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr} className="font-mono text-gray-900 bg-white">
                  {curr}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* WhatsApp Button (Hidden on small mobile, visible on tablet and desktop) */}
          <a
            href={`https://wa.me/${cleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex h-9 sm:h-10 px-3.5 sm:px-4 rounded-md bg-[#1A1A1A] text-white text-xs font-medium tracking-wide items-center gap-2 hover:bg-black transition-colors whitespace-nowrap"
          >
            <WhatsAppIcon className="h-3.5 w-3.5 fill-white flex-shrink-0" />
            <span>Inquire via WhatsApp</span>
          </a>

          {/* Mobile & Tablet menu hamburger button */}
          <button
            type="button"
            className="h-9 w-9 sm:h-10 sm:w-10 lg:hidden inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Toggle navigation menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

        </div>
      </nav>

      {/* Fullscreen Mobile & Tablet Navigation Overlay Portaled to document.body */}
      {mounted && mobileMenuOpen && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex flex-col justify-between overflow-y-auto"
          style={{ backgroundColor: '#FAF9F5' }}
        >
          {/* Overlay Top Bar with Close button */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 border-b border-gray-200/80 bg-white/95 sticky top-0 z-10">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="font-editorial text-xl sm:text-2xl font-medium tracking-tight text-gray-950"
            >
              Kazi Canvas Gallery
            </Link>
            
            <div className="flex items-center gap-2">
              {/* Currency Selector inside Overlay */}
              <div className="relative inline-block">
                <select
                  value={currency}
                  onChange={handleCurrencyChange}
                  aria-label="Select currency"
                  className="h-9 pl-2.5 pr-7 rounded-md border border-gray-200 bg-white text-xs font-mono font-medium text-gray-800 outline-none appearance-none"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr} value={curr} className="font-mono text-gray-900 bg-white">
                      {curr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>

              {/* Close Button */}
              <button
                type="button"
                className="h-9 w-9 sm:h-10 sm:w-10 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Links and Content */}
          <div className="max-w-xl w-full mx-auto px-6 sm:px-12 py-10 space-y-10 flex-1">
            
            {/* Curated Navigation Links */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400 block mb-6">
                Navigation
              </span>
              <div className="space-y-5">
                <Link 
                  href="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-2xl sm:text-3xl tracking-tight transition-colors ${
                    pathname === '/' ? 'text-black font-semibold' : 'text-gray-600 hover:text-black font-light'
                  }`}
                >
                  Gallery Home
                </Link>
                <Link 
                  href="/gallery" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-2xl sm:text-3xl tracking-tight transition-colors ${
                    pathname === '/gallery' ? 'text-black font-semibold' : 'text-gray-600 hover:text-black font-light'
                  }`}
                >
                  All Available Works
                </Link>
                
                <div className="pt-2 pl-4 border-l-2 border-gray-300 space-y-4">
                  <Link 
                    href="/gallery?type=oil" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-lg sm:text-xl text-gray-600 hover:text-black font-light transition-colors"
                  >
                    Oil on Canvas
                  </Link>
                  <Link 
                    href="/gallery?type=acrylic" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-lg sm:text-xl text-gray-600 hover:text-black font-light transition-colors"
                  >
                    Acrylic on Canvas
                  </Link>
                </div>

                <Link 
                  href="/about" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-2xl sm:text-3xl tracking-tight transition-colors ${
                    pathname === '/about' ? 'text-black font-semibold' : 'text-gray-600 hover:text-black font-light'
                  }`}
                >
                  Our Story
                </Link>

                <Link 
                  href="/#contact" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-2xl sm:text-3xl tracking-tight text-gray-600 hover:text-black font-light transition-colors"
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Direct Artist Consultation CTA */}
            <div className="pt-8 border-t border-gray-200 space-y-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400 block">
                Direct Inquiry
              </span>
              <a
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2.5 w-full py-4 px-6 rounded-md bg-[#1A1A1A] text-white text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold hover:bg-black transition-colors shadow-sm"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white flex-shrink-0" />
                <span>Chat with Artist via WhatsApp</span>
              </a>

              <p className="text-xs text-gray-500 font-light text-center leading-relaxed">
                Dhaka Studio &bull; Original Handmade Paintings &bull; Worldwide Delivery Available
              </p>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="px-6 py-6 border-t border-gray-200/80 text-center">
            <p className="text-xs text-gray-400 font-light">
              &copy; 2018–{new Date().getFullYear()} Kazi Canvas Gallery. All rights reserved.
            </p>
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
