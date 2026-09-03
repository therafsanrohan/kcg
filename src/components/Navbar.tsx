'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 group">
            <span className="sr-only">Kazi Canvas Gallery</span>
            <span className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-gray-600 transition-colors">Kazi Canvas Gallery</span>
          </Link>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex md:gap-x-8">
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
        
        <div className="hidden md:flex flex-1 justify-end items-center gap-4">
          <div className="text-sm font-medium text-gray-500">BDT</div>
          <a
            href="https://wa.me/8801824951514"
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
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
            >
              Collection
            </Link>
            <Link 
              href="/gallery?type=oil" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
            >
              Oil Paintings
            </Link>
            <Link 
              href="/gallery?type=acrylic" 
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
            >
              Acrylics
            </Link>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-3">
              <span className="text-sm font-medium text-gray-500">Currency: BDT</span>
              <a
                href="https://wa.me/8801824951514"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
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
