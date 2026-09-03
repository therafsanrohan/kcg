'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar({ whatsappNumber = '8801824951514' }: { whatsappNumber?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between p-4 sm:px-6 lg:px-8" aria-label="Global">
        <div className="flex flex-shrink-0">
          <Link href="/" className="-m-1.5 p-1.5 group flex items-center">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 group-hover:text-gray-600 transition-colors whitespace-nowrap">
              Kazi Canvas <span className="hidden sm:inline">Gallery</span>
            </span>
          </Link>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex md:flex-1 md:justify-center md:gap-x-8">
          <Link href="/gallery" className="text-sm font-semibold leading-6 text-gray-900 hover:text-black hover:scale-105 transition-transform duration-200">
            Collection
          </Link>
          <Link href="/gallery?type=oil" className="text-sm font-semibold leading-6 text-gray-900 hover:text-black hover:scale-105 transition-transform duration-200">
            Oil Paintings
          </Link>
          <Link href="/gallery?type=acrylic" className="text-sm font-semibold leading-6 text-gray-900 hover:text-black hover:scale-105 transition-transform duration-200">
            Acrylics
          </Link>
        </div>
        
        <div className="hidden md:flex flex-shrink-0 justify-end items-center gap-4">
          <div className="text-sm font-medium text-gray-500">BDT</div>
          <a
            href={`https://wa.me/${cleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
          >
            WhatsApp Us
          </a>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg transition-all duration-300 ease-in-out">
          <div className="space-y-1 px-4 pb-6 pt-4">
            <Link 
              href="/gallery" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Collection
            </Link>
            <Link 
              href="/gallery?type=oil" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Oil Paintings
            </Link>
            <Link 
              href="/gallery?type=acrylic" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Acrylics
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 gap-4">
              <span className="text-sm font-medium text-gray-500">Currency: BDT</span>
              <a
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-center rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
