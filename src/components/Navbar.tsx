import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Kazi Canvas Gallery</span>
            <span className="text-xl font-bold tracking-tight text-gray-900 font-serif">Kazi Canvas Gallery</span>
          </Link>
        </div>
        <div className="flex gap-x-8">
          <Link href="/gallery" className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors">
            Collection
          </Link>
          <Link href="/gallery?type=oil" className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors">
            Oil Paintings
          </Link>
          <Link href="/gallery?type=acrylic" className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors">
            Acrylics
          </Link>
        </div>
        <div className="flex flex-1 justify-end items-center gap-4">
          {/* Currency Selector Placeholder */}
          <div className="text-sm font-medium text-gray-500">BDT</div>
          <a
            href="https://wa.me/8801824951514"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-colors"
          >
            WhatsApp Us
          </a>
        </div>
      </nav>
    </header>
  )
}
