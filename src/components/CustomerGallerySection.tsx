'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, ArrowUpRight, ChevronDown } from 'lucide-react'
import { getPaintingImageUrl } from '@/utils/image'
import { Currency, convertCurrency, FALLBACK_RATES } from '@/utils/currency'

interface CustomerGallerySectionProps {
  paintings: any[]
}

export default function CustomerGallerySection({ paintings }: CustomerGallerySectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [currency, setCurrency] = useState<Currency>('BDT')

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
    <section id="available-works" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            AVAILABLE WORKS
          </span>
          <h2 className="font-serif text-5xl sm:text-7xl font-normal text-gray-950 tracking-tight mt-1">
            Find your piece.
          </h2>
        </div>

        {/* Search Bar & Sort Dropdown Row */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-8">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, medium or colour..."
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-[#F9F9F8] border border-gray-200/80 text-base text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-block w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto h-14 pl-4 pr-10 rounded-xl bg-[#F9F9F8] border border-gray-200/80 text-sm font-medium text-gray-900 focus:bg-white focus:border-black outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>

        </div>

        {/* Filter Pills Bar & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8 mb-12 border-b border-gray-200/70">
          
          {/* Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`h-11 px-6 rounded-lg text-sm font-semibold transition-all ${
                activeCategory === 'all'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              All paintings
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('oil')}
              className={`h-11 px-6 rounded-lg text-sm font-semibold transition-all ${
                activeCategory === 'oil'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              Oil
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('acrylic')}
              className={`h-11 px-6 rounded-lg text-sm font-semibold transition-all ${
                activeCategory === 'acrylic'
                  ? 'bg-black text-white shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              Acrylic
            </button>
          </div>

          {/* Count Badge */}
          <span className="text-sm text-gray-500 font-light">
            {filteredPaintings.length} {filteredPaintings.length === 1 ? 'painting' : 'paintings'}
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
                : `${convertCurrency(Number(painting.base_price_bdt), currency, FALLBACK_RATES)} ${currency}`

            const effectivePriceDisplay =
              currency === 'BDT'
                ? `৳${effectivePrice.toLocaleString('en-BD')}`
                : `${convertCurrency(effectivePrice, currency, FALLBACK_RATES)} ${currency}`

            return (
              <div
                key={painting.id}
                className="group relative flex flex-col cursor-pointer animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Artwork Image Box */}
                <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-[#F5F4F0] border border-gray-200/60 shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1">
                  <Image
                    src={imageUrl}
                    alt={painting.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Offer Badge (Top-Left) */}
                  {hasDiscount && (
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-red-600 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                        {painting.offer_badge || 'OFFER'}
                      </span>
                    </div>
                  )}

                  {/* Circular Arrow Button (Top-Right) */}
                  <div className="absolute top-4 right-4 z-20">
                    <div className="h-12 w-12 rounded-full bg-white/95 backdrop-blur-xs text-black flex items-center justify-center shadow-md group-hover:bg-black group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <ArrowUpRight className="h-5 w-5 stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Availability Badge */}
                  {painting.availability_status && painting.availability_status !== 'available' && (
                    <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-xs text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg z-20">
                      {painting.availability_status}
                    </div>
                  )}
                </div>

                {/* Artwork Details Below */}
                <div className="mt-4 px-1">
                  <h3 className="font-serif text-2xl font-normal text-gray-950 group-hover:text-gray-700 transition-colors line-clamp-1">
                    {painting.title}
                  </h3>
                  <p className="text-xs text-gray-500 font-light mt-1">
                    {painting.exact_medium} &bull; {painting.display_size || `${painting.width} × ${painting.height} in`}
                  </p>

                  <div className="mt-2 flex items-center gap-2 font-mono">
                    {hasDiscount ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">
                          {originalPriceDisplay}
                        </span>
                        <span className="text-base font-bold text-red-600">
                          {effectivePriceDisplay}
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-gray-950">
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
            <h3 className="font-serif text-2xl text-gray-900 mb-2">No paintings found</h3>
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
