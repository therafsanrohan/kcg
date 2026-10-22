'use client'

import { useState, useMemo, useEffect, useCallback, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, ArrowUpRight, ChevronDown, X, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Currency, convertCurrency, FALLBACK_RATES } from '@/utils/currency-shared'
import { getDisplayDimensions, getArtworkAspectRatio, formatMedium } from '@/utils/measurements'
import ArtworkImageSlider from '@/components/ArtworkImageSlider'
import GalleryFilterDrawer, { FilterState } from '@/components/gallery/GalleryFilterDrawer'

interface CustomerGallerySectionProps {
  paintings: any[]
}

const ITEMS_PER_PAGE = 16

export default function CustomerGallerySection({ paintings }: CustomerGallerySectionProps) {
  const searchParams = useSearchParams()

  // Parse initial state from URL query parameters
  const initialCategory = searchParams.get('category') || searchParams.get('type') || 'all'
  const initialOrientation = searchParams.get('orientation') || 'all'
  const initialMinPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null
  const initialMaxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null
  const initialAvailability = searchParams.get('availability') || 'available'
  const initialSort = searchParams.get('sort') || 'newest'
  const initialQuery = searchParams.get('q') || ''

  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    orientation: initialOrientation,
    minPrice: initialMinPrice,
    maxPrice: initialMaxPrice,
    availability: initialAvailability,
    sortBy: initialSort,
  })

  const [searchQuery, setSearchQuery] = useState<string>(initialQuery)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState<number>(ITEMS_PER_PAGE)
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)
  const [isPending, startTransition] = useTransition()

  // Live Exchange Rates
  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) setRates(data.rates)
      })
      .catch(() => {})
  }, [])

  // User Currency Preference
  useEffect(() => {
    const updateCurr = () => {
      const saved = (localStorage.getItem('preferredCurrency') as Currency) || 'BDT'
      setCurrency(saved)
    }
    updateCurr()
    window.addEventListener('preferredCurrencyChanged', updateCurr)
    return () => window.removeEventListener('preferredCurrencyChanged', updateCurr)
  }, [])

  // Sync state to URL Query Parameters without full page reloads
  const syncUrlParams = useCallback((newFilters: FilterState, query: string) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()

    if (newFilters.category && newFilters.category !== 'all') {
      params.set('category', newFilters.category)
    }
    if (newFilters.orientation && newFilters.orientation !== 'all') {
      params.set('orientation', newFilters.orientation)
    }
    if (newFilters.minPrice !== null && !isNaN(newFilters.minPrice)) {
      params.set('min_price', String(newFilters.minPrice))
    }
    if (newFilters.maxPrice !== null && !isNaN(newFilters.maxPrice)) {
      params.set('max_price', String(newFilters.maxPrice))
    }
    if (newFilters.availability && newFilters.availability !== 'available') {
      params.set('availability', newFilters.availability)
    }
    if (newFilters.sortBy && newFilters.sortBy !== 'newest') {
      params.set('sort', newFilters.sortBy)
    }
    if (query.trim()) {
      params.set('q', query.trim())
    }

    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    window.history.replaceState({ ...window.history.state }, '', newUrl)
  }, [])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setVisibleCount(ITEMS_PER_PAGE)
    syncUrlParams(newFilters, searchQuery)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setVisibleCount(ITEMS_PER_PAGE)
    syncUrlParams(filters, query)
  }

  const handleResetFilters = () => {
    const reset: FilterState = {
      category: 'all',
      orientation: 'all',
      minPrice: null,
      maxPrice: null,
      availability: 'available',
      sortBy: 'newest',
    }
    setFilters(reset)
    setSearchQuery('')
    setVisibleCount(ITEMS_PER_PAGE)
    syncUrlParams(reset, '')
  }

  // Count active non-default filters for the badge
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.category !== 'all') count++
    if (filters.orientation !== 'all') count++
    if (filters.minPrice !== null || filters.maxPrice !== null) count++
    if (filters.availability !== 'available') count++
    if (searchQuery.trim()) count++
    return count
  }, [filters, searchQuery])

  // Filter & Sort Pipeline
  const filteredPaintings = useMemo(() => {
    let result = [...paintings]

    // 1. Mandatory Public Visibility
    result = result.filter((p) => p.is_published !== false && !p.archived_at)

    // 2. Medium / Category
    if (filters.category !== 'all') {
      result = result.filter((p) => (p.painting_type || '').toLowerCase() === filters.category.toLowerCase())
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          formatMedium(p.painting_type).toLowerCase().includes(q) ||
          p.painting_type?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.search_tags?.toLowerCase().includes(q)
      )
    }

    // 4. Orientation (Portrait, Landscape, Square)
    if (filters.orientation !== 'all') {
      result = result.filter((p) => {
        const w = Number(p.width_mm || p.width)
        const h = Number(p.height_mm || p.height)
        if (!w || !h || isNaN(w) || isNaN(h)) return false // ignore unknown dimensions safely

        if (filters.orientation === 'portrait') return h > w
        if (filters.orientation === 'landscape') return w > h
        if (filters.orientation === 'square') return Math.abs(w - h) < 1 // tolerance for rounding
        return true
      })
    }

    // 5. Price Range
    if (filters.minPrice !== null || filters.maxPrice !== null) {
      result = result.filter((p) => {
        const price = Number(p.discount_price_bdt || p.base_price_bdt) || 0
        if (filters.minPrice !== null && price < filters.minPrice) return false
        if (filters.maxPrice !== null && price > filters.maxPrice) return false
        return true
      })
    }

    // 6. Availability Status
    if (filters.availability === 'available') {
      result = result.filter((p) => p.availability_status === 'available')
    }

    // 7. Deterministic Sorting
    if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => {
        const pA = Number(a.discount_price_bdt || a.base_price_bdt) || 0
        const pB = Number(b.discount_price_bdt || b.base_price_bdt) || 0
        if (pA !== pB) return pA - pB
        return (a.id || '').localeCompare(b.id || '')
      })
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => {
        const pA = Number(a.discount_price_bdt || a.base_price_bdt) || 0
        const pB = Number(b.discount_price_bdt || b.base_price_bdt) || 0
        if (pA !== pB) return pB - pA
        return (a.id || '').localeCompare(b.id || '')
      })
    } else {
      // Newest first (created_at DESC, id DESC)
      result.sort((a, b) => {
        const tA = new Date(a.created_at || 0).getTime()
        const tB = new Date(b.created_at || 0).getTime()
        if (tB !== tA) return tB - tA
        return (b.id || '').localeCompare(a.id || '')
      })
    }

    return result
  }, [paintings, filters, searchQuery])

  // Paginated Slice
  const visiblePaintings = useMemo(() => {
    return filteredPaintings.slice(0, visibleCount)
  }, [filteredPaintings, visibleCount])

  const hasMore = visibleCount < filteredPaintings.length

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
  }

  return (
    <section id="available-works" className="pt-4 pb-12 sm:pt-6 sm:pb-14 lg:py-16 bg-[#FBFBFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header (Hidden on mobile & tablet so artworks show directly) */}
        <div className="hidden lg:flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-gray-200/80 pb-8">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400 block mb-2 font-mono">
              CATALOGUE
            </span>
            <h2 className="font-editorial text-4xl sm:text-6xl font-normal text-gray-950 tracking-[-0.01em]">
              Available works
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 font-light max-w-sm">
            Carefully archived oil & acrylic works on canvas. Every piece includes custom gallery framing options.
          </p>
        </div>

        {/* Search Bar, Filter Drawer Trigger, Sort Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, medium, keyword..."
              className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Row: Filters Toggle & Sort Dropdown */}
          <div className="flex items-center gap-2.5">
            {/* Filters Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={`h-11 px-4 rounded-xl border text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-gray-800 border-gray-200 hover:border-black'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="relative inline-block">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
                className="h-11 pl-3.5 pr-8 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-800 focus:border-black outline-none appearance-none cursor-pointer transition-colors shadow-2xs"
              >
                <option value="newest">Recent Additions</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Category Pills Bar & Counter */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-gray-200/60">
          
          {/* Quick Medium Filter Tabs */}
          <div className="flex items-center gap-x-5 sm:gap-x-7 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'all', label: 'All Pieces' },
              { id: 'oil', label: 'Oil' },
              { id: 'acrylic', label: 'Acrylic' },
              { id: 'mixed', label: 'Mixed Media' },
            ].map((tab) => {
              const active = filters.category === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, category: tab.id })}
                  className={`text-xs uppercase tracking-[0.18em] transition-colors pb-1 cursor-pointer whitespace-nowrap ${
                    active
                      ? 'text-black font-semibold border-b-2 border-black'
                      : 'text-gray-400 hover:text-black font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Results Count Badge */}
          <span className="text-xs text-gray-400 font-mono">
            {filteredPaintings.length} {filteredPaintings.length === 1 ? 'artwork' : 'artworks'}
          </span>

        </div>

        {/* Active Filter Chips Bar (Visible when any non-default filter is set) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 animate-in fade-in duration-200">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mr-1">
              Active:
            </span>

            {/* Category Chip */}
            {filters.category !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-900 font-medium shadow-2xs">
                <span>Medium: {formatMedium(filters.category)}</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, category: 'all' })}
                  className="hover:text-black text-gray-400"
                  aria-label="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Orientation Chip */}
            {filters.orientation !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-900 font-medium shadow-2xs capitalize">
                <span>Orientation: {filters.orientation}</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, orientation: 'all' })}
                  className="hover:text-black text-gray-400"
                  aria-label="Remove orientation filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Price Range Chip */}
            {(filters.minPrice !== null || filters.maxPrice !== null) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-900 font-medium shadow-2xs font-mono">
                <span>
                  Price: {filters.minPrice ? `৳${filters.minPrice.toLocaleString()}` : '৳0'} &ndash;{' '}
                  {filters.maxPrice ? `৳${filters.maxPrice.toLocaleString()}` : 'Any'}
                </span>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, minPrice: null, maxPrice: null })}
                  className="hover:text-black text-gray-400"
                  aria-label="Remove price filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Availability Chip */}
            {filters.availability !== 'available' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-900 font-medium shadow-2xs">
                <span>All Catalog (incl. sold)</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange({ ...filters, availability: 'available' })}
                  className="hover:text-black text-gray-400"
                  aria-label="Remove availability filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Search Query Chip */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-900 font-medium shadow-2xs">
                <span>Search: &ldquo;{searchQuery.trim()}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="hover:text-black text-gray-400"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Clear All Action */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium ml-2 underline underline-offset-4 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Pinterest-Inspired Responsive Masonry Layout (2 columns on mobile and tablet) */}
        <div className="columns-2 lg:columns-3 xl:columns-4 gap-3.5 sm:gap-6 lg:gap-8 [column-fill:_balance]">
          {visiblePaintings.map((painting, index) => {
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
            const sizeString = getDisplayDimensions(painting)

            return (
              <div
                key={painting.id}
                className="break-inside-avoid inline-block w-full mb-5 sm:mb-8 lg:mb-10 group"
              >
                <div className="relative flex flex-col">
                  {/* Artwork Image Box with Multi-Image Preview Slider */}
                  <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200/70 shadow-2xs transition-all duration-500 ease-out group-hover:shadow-md bg-[#F4F3EE]">
                    <ArtworkImageSlider
                      images={painting.painting_images || []}
                      title={painting.title}
                      href={`/gallery/${painting.slug}`}
                      aspectRatio={artAspect}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
                      showArrows={false}
                      priority={index < 4}
                      variant="card"
                    >
                      {/* Curated Offer Badge (Top-Left) */}
                      {hasDiscount && (
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 pointer-events-none">
                          <span className="bg-[#1A1A1A] text-white font-mono text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm shadow-xs">
                            {painting.offer_badge || 'OFFER'}
                          </span>
                        </div>
                      )}

                      {/* Circular Arrow Button (Top-Right hover indicator) */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-white/95 text-black flex items-center justify-center shadow-md">
                          <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2]" />
                        </div>
                      </div>

                      {/* Availability Badge */}
                      {painting.availability_status && painting.availability_status !== 'available' && (
                        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/85 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider rounded-sm z-20 pointer-events-none">
                          {painting.availability_status}
                        </div>
                      )}
                    </ArtworkImageSlider>
                  </div>

                  {/* Artwork Details Directly Below: Name, Medium/Size, Price */}
                  <Link
                    href={`/gallery/${painting.slug}`}
                    prefetch={true}
                    className="mt-2.5 sm:mt-3.5 block focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded-sm"
                  >
                    {/* Primary: Artwork Name */}
                    <h3 className="font-editorial text-base sm:text-xl lg:text-2xl font-normal text-gray-950 group-hover:text-gray-700 transition-colors leading-snug break-words">
                      {painting.title}
                    </h3>

                    {/* Secondary: Medium & Size */}
                    <p className="text-[11px] sm:text-xs text-gray-500 font-light mt-0.5 sm:mt-1 truncate">
                      {[formatMedium(painting.painting_type), sizeString].filter(Boolean).join(' • ')}
                    </p>

                    {/* Primary/Prominent: Price */}
                    <div className="mt-1 sm:mt-1.5 flex items-baseline gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm">
                      {hasDiscount ? (
                        <>
                          <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                            {originalPriceDisplay}
                          </span>
                          <span className="font-bold text-gray-950">
                            {effectivePriceDisplay}
                          </span>
                        </>
                      ) : (
                        <span className="font-bold text-gray-950">
                          {effectivePriceDisplay}
                        </span>
                      )}
                    </div>
                  </Link>

                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredPaintings.length === 0 && (
          <div className="py-24 text-center bg-[#F9F9F8] rounded-3xl border border-dashed border-gray-300">
            <h3 className="font-editorial text-3xl font-normal text-gray-900 mb-2">No artworks found</h3>
            <p className="text-sm text-gray-500 font-light max-w-md mx-auto mb-6">
              No paintings matched your current filter selection. Try adjusting your medium, orientation, or price range.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-semibold hover:bg-gray-800 transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Pagination / Load More Button */}
        {hasMore && (
          <div className="mt-14 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-8 py-3.5 rounded-full bg-white border border-gray-300 text-xs font-semibold uppercase tracking-wider text-gray-900 hover:border-black hover:bg-black hover:text-white transition-all shadow-xs cursor-pointer"
            >
              Load More Artworks
            </button>
          </div>
        )}

      </div>

      {/* Slide-over Filter Drawer */}
      <GalleryFilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalCount={filteredPaintings.length}
        currency={currency}
      />
    </section>
  )
}
