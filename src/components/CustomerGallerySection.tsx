'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search, ArrowUpRight, ChevronDown } from 'lucide-react'
import { getPaintingImageUrl } from '@/utils/image'
import { Currency, convertCurrency, FALLBACK_RATES } from '@/utils/currency-shared'
import { getDisplayDimensions, getArtworkAspectRatio } from '@/utils/measurements'

interface CustomerGallerySectionProps {
  paintings: any[]
}

export default function CustomerGallerySection({ paintings }: CustomerGallerySectionProps) {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') || 'all'
  const [activeCategory, setActiveCategory] = useState<string>(typeParam)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  useEffect(() => {
    if (typeParam && (typeParam === 'oil' || typeParam === 'acrylic' || typeParam === 'all')) {
      setActiveCategory(typeParam)
    }
  }, [typeParam])

  // Fetch live rates on mount
  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) setRates(data.rates)
      })
      .catch(() => {
        // Keep fallback rates on error
      })
  }, [])

  useEffect(() => {
    const updateCurr = () => {
      const saved = (localStorage.getItem('preferredCurrency') as Currency) || 'BDT'
      setCurrency(saved)
    }
    updateCurr()
    window.addEventListener('preferredCurrencyChanged', updateCurr)
    return () => window.removeEventListener('preferredCurrencyChanged', updateCurr)
  }, [])

  // Filter & Sort Logic
  const filteredPaintings = useMemo(() => {
    let result = [...paintings]

    // Category Filter
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.painting_type === activeCategory)
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.exact_medium?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.search_tags?.toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortBy === 'price_asc') {
      result.sort((a, b) => Number(a.base_price_bdt) - Number(b.base_price_bdt))
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => Number(b.base_price_bdt) - Number(a.base_price_bdt))
    } else {
      // newest
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    return result
  }, [paintings, activeCategory, searchQuery, sortBy])

  return (
    <section id="available-works" className="py-10 sm:py-16 bg-[#FBFBFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-gray-200/80 pb-8">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400 block mb-2">
              CATALOGUE
            </span>
            <h2 className="font-editorial text-4xl sm:text-6xl font-normal text-gray-950 tracking-[-0.01em]">
              Available works
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 font-light max-w-sm">
            Carefully archived oil & acrylic works on canvas. All pieces include optional gallery framing.
          </p>
        </div>

        {/* Search Bar & Sort Dropdown Row */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-8">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, medium, palette..."
              className="w-full h-11 pl-10 pr-4 rounded-md bg-white border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-block w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto h-11 pl-3.5 pr-8 rounded-md bg-white border border-gray-200 text-xs font-medium text-gray-800 focus:border-black outline-none appearance-none cursor-pointer transition-colors shadow-2xs"
            >
              <option value="newest">Recent Additions</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>

        </div>

        {/* Filter Pills Bar & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-12 border-b border-gray-200/60">
          
          {/* Minimal Editorial Category Tabs */}
          <div className="flex items-center gap-x-6 sm:gap-x-8">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`text-xs uppercase tracking-[0.18em] transition-colors pb-1 cursor-pointer ${
                activeCategory === 'all'
                  ? 'text-black font-semibold border-b border-black'
                  : 'text-gray-400 hover:text-black font-medium'
              }`}
            >
              All Pieces
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('oil')}
              className={`text-xs uppercase tracking-[0.18em] transition-colors pb-1 cursor-pointer ${
                activeCategory === 'oil'
                  ? 'text-black font-semibold border-b border-black'
                  : 'text-gray-400 hover:text-black font-medium'
              }`}
            >
              Oil
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('acrylic')}
              className={`text-xs uppercase tracking-[0.18em] transition-colors pb-1 cursor-pointer ${
                activeCategory === 'acrylic'
                  ? 'text-black font-semibold border-b border-black'
                  : 'text-gray-400 hover:text-black font-medium'
              }`}
            >
              Acrylic
            </button>
          </div>

          {/* Count Badge */}
          <span className="text-xs text-gray-400 font-mono">
            {filteredPaintings.length} {filteredPaintings.length === 1 ? 'artwork' : 'artworks'}
          </span>

        </div>

        {/* Artwork Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {filteredPaintings.map((painting, idx) => {
            const mainImage =
              painting.painting_images?.find((img: any) => img.is_main) ||
              painting.painting_images?.[0]
            const imageUrl = getPaintingImageUrl(mainImage?.storage_key)

            const hasDiscount = Boolean(painting.discount_price_bdt && Number(painting.discount_price_bdt) > 0)
            const effectivePrice = hasDiscount ? Number(painting.discount_price_bdt) : Number(painting.base_price_bdt)

            const originalPriceDisplay =
              currency === 'BDT'
                ? `৳${Number(painting.base_price_bdt).toLocaleString('en-BD')}`
                : `${convertCurrency(Number(painting.base_price_bdt), currency, rates)} ${currency}`

            const effectivePriceDisplay =
              currency === 'BDT'
                ? `৳${effectivePrice.toLocaleString('en-BD')}`
                : `${convertCurrency(effectivePrice, currency, rates)} ${currency}`

            const artAspect = getArtworkAspectRatio(painting)

            return (
              <div
                key={painting.id}
                className="group relative flex flex-col cursor-pointer"
              >
                {/* Artwork Image Box */}
                <div
                  className="relative w-full overflow-hidden rounded-xl border border-gray-200/60 shadow-2xs transition-all duration-700 ease-out group-hover:shadow-md"
                  style={{
                    aspectRatio: `${artAspect > 0 ? artAspect : 0.8}`,
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={painting.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />

                  {/* Curated Offer Badge (Top-Left) */}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-[#1A1A1A] text-white font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-sm shadow-xs">
                        {painting.offer_badge || 'OFFER'}
                      </span>
                    </div>
                  )}

                  {/* Circular Arrow Button (Top-Right) */}
                  <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="h-9 w-9 rounded-full bg-white/95 text-black flex items-center justify-center shadow-md">
                      <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                    </div>
                  </div>

                  {/* Availability Badge */}
                  {painting.availability_status && painting.availability_status !== 'available' && (
                    <div className="absolute bottom-3 left-3 bg-black/85 text-white px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm z-20">
                      {painting.availability_status}
                    </div>
                  )}
                </div>

                {/* Artwork Details Below: Editorial Typography */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-editorial text-2xl font-normal text-gray-950 group-hover:text-gray-700 transition-colors line-clamp-1">
                      {painting.title}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 font-light">
                    {painting.exact_medium} &bull; {getDisplayDimensions(painting)}
                  </p>

                  <div className="pt-1 flex items-baseline gap-2 font-mono text-sm">
                    {hasDiscount ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">
                          {originalPriceDisplay}
                        </span>
                        <span className="font-medium text-gray-950">
                          {effectivePriceDisplay}
                        </span>
                      </>
                    ) : (
                      <span className="font-medium text-gray-950">
                        {effectivePriceDisplay}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clickable Overlay Link */}
                <Link href={`/gallery/${painting.slug}`} className="absolute inset-0 z-30">
                  <span className="sr-only">View {painting.title}</span>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredPaintings.length === 0 && (
          <div className="py-24 text-center bg-[#F9F9F8] rounded-3xl border border-dashed border-gray-300">
            <h3 className="font-sans text-2xl font-bold text-gray-900 mb-2">No paintings found</h3>
            <p className="text-sm text-gray-500 font-light max-w-md mx-auto mb-6">
              Try adjusting your search terms or filter selection.
            </p>
            <button
              onClick={() => {
                setActiveCategory('all')
                setSearchQuery('')
              }}
              className="px-5 py-2.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </section>
  )
}
