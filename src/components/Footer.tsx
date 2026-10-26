'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon'

export default function Footer({ whatsappNumber }: { whatsappNumber?: string }) {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  // Do not render customer footer on admin pages or dedicated invoice document pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')) {
    return null
  }

  return (
    <footer className="bg-[#FAF9F5] border-t border-gray-200/80 mt-20 sm:mt-24 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200/60 pb-6 text-xs">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 sm:gap-x-6 gap-y-2.5 text-gray-600 font-medium tracking-wide text-center sm:text-left">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <Link href="/gallery" className="hover:text-black transition-colors">
              Gallery
            </Link>
            <Link href="/about" className="hover:text-black transition-colors">
              About Us
            </Link>
            <Link href="/#google-reviews" className="hover:text-black transition-colors">
              Reviews
            </Link>
            <Link href="/#contact" className="hover:text-black transition-colors">
              Contact
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-black transition-colors whitespace-nowrap">
              Terms
            </Link>
            <Link href="/privacy-policy" className="hover:text-black transition-colors whitespace-nowrap">
              Privacy
            </Link>
          </div>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#25D366] transition-colors"
            >
              <WhatsAppIcon className="h-3.5 w-3.5 fill-[#25D366]" />
              <span>Contact via WhatsApp</span>
            </a>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-normal">
          <p>
            &copy; 2018–{currentYear} Kazi Canvas Gallery. All rights reserved.
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
      </div>
    </footer>
  )
}
