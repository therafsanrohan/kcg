'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer({ whatsappNumber }: { whatsappNumber?: string }) {
  const pathname = usePathname()

  // Do not render customer footer on admin pages or dedicated invoice document pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')) {
    return null
  }

  return (
    <footer className="bg-[#FAF9F5] border-t border-gray-200/80 mt-24 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-normal">
        <p>
          &copy; {new Date().getFullYear()} Kazi Canvas Gallery. All rights reserved.
        </p>

        <p>
          Developed by{' '}
          <a
            href="https://www.creatiancy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-800 hover:text-black transition-colors underline underline-offset-4"
          >
            Creatiancy
          </a>
        </p>
      </div>
    </footer>
  )
}
