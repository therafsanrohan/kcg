'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight } from 'lucide-react'
import { Currency, convertCurrency, FALLBACK_RATES } from '@/utils/currency-shared'
import { getDisplayDimensions, getArtworkAspectRatio, formatMedium } from '@/utils/measurements'
import ArtworkImageSlider from '@/components/ArtworkImageSlider'

export interface RelatedArtworkCandidate {
  id: string
  title: string
  slug: string
  serial_number?: string | null
  base_price_bdt: number
  discount_price_bdt?: number | null
  offer_badge?: string | null
  painting_type: string
  display_size?: string | null
  width?: number | null
  height?: number | null
  width_mm?: number | null
  height_mm?: number | null
  availability_status: string
  created_at?: string
  painting_images?: any[]
}

interface RelatedArtworksSectionProps {
  currentArtwork: {
    id: string
    title: string
    painting_type: string
    base_price_bdt: number
    discount_price_bdt?: number | null
    width_mm?: number | null
    height_mm?: number | null
    width?: number | null
    height?: number | null
  }
  candidates: RelatedArtworkCandidate[]
  rates?: Record<string, number>
}

// Helper to determine aspect ratio category (portrait, landscape, square)
function getOrientationCategory(w?: number | null, h?: number | null): 'portrait' | 'landscape' | 'square' | 'unknown' {
  if (!w || !h || isNaN(w) || isNaN(h)) return 'unknown'
  const diff = Math.abs(w - h)
  if (diff <= 2) return 'square'
  return h > w ? 'portrait' : 'landscape'
}

export default function RelatedArtworksSection({
  currentArtwork,
  candidates = [],
  rates = FALLBACK_RATES,
}: RelatedArtworksSectionProps) {
  const [currency, setCurrency] = useState<Currency>('BDT')

  // Sync with global currency preference
  useEffect(() => {
    const updateCurr = () => {
      const saved = (localStorage.getItem('preferredCurrency') as Currency) || 'BDT'
      setCurrency(saved)
    }
    updateCurr()
    window.addEventListener('preferredCurrencyChanged', updateCurr)
    return () => window.removeEventListener('preferredCurrencyChanged', updateCurr)
  }, [])

  // Deterministic, weighted relevance ranking algorithm
  const rankedArtworks = useMemo(() => {
    if (!candidates || candidates.length === 0) return []

    const currentPrice = Number(currentArtwork.discount_price_bdt || currentArtwork.base_price_bdt) || 1
    const currentOrientation = getOrientationCategory(
      currentArtwork.width_mm || currentArtwork.width,
      currentArtwork.height_mm || currentArtwork.height
    )
    const currentMedium = (currentArtwork.painting_type || '').toLowerCase()

    const scored = candidates
      .filter((art) => art.id !== currentArtwork.id)
      .map((candidate) => {
        let score = 0

        // 1. Same Medium / Category (+50 pts)
        const candMedium = (candidate.painting_type || '').toLowerCase()
        if (candMedium && candMedium === currentMedium) {
          score += 50
        }

        // 2. Price Proximity (+30 pts max)
        const candPrice = Number(candidate.discount_price_bdt || candidate.base_price_bdt) || 1
        const priceDiffRatio = Math.abs(candPrice - currentPrice) / Math.max(currentPrice, 10000)
        const priceScore = Math.max(0, 30 * (1 - Math.min(priceDiffRatio, 1)))
        score += priceScore

        // 3. Similar Dimensions / Orientation (+20 pts)
        const candOrientation = getOrientationCategory(
          candidate.width_mm || candidate.width,
          candidate.height_mm || candidate.height
        )
        if (candOrientation !== 'unknown' && candOrientation === currentOrientation) {
          score += 20
        }

        // 4. Availability preference (Available artworks get slight boost over sold)
        if (candidate.availability_status === 'available') {
          score += 10
        }

        return {
          artwork: candidate,
          score,
        }
      })

    // Sort descending by score, deterministic secondary tie-breaker by created_at / id
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (b.artwork.created_at || '').localeCompare(a.artwork.created_at || '')
    })

    // Return top 4 most relevant artworks
    return scored.slice(0, 4).map((s) => s.artwork)
  }, [currentArtwork, candidates])

  if (rankedArtworks.length === 0) {
    return null
  }

  return (
    <section className="mt-24 pt-16 border-t border-gray-200/80" aria-labelledby="related-artworks-heading">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-gray-400 block mb-2">
            Curated Discovery
          </span>
          <h2
            id="related-artworks-heading"
            className="font-editorial text-3xl sm:text-4xl font-normal text-gray-950 tracking-tight"
          >
            More to Explore
          </h2>
        </div>

        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-900 hover:text-gray-600 transition-colors group cursor-pointer"
        >
          <span>View Full Collection</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid: 2 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {rankedArtworks.map((painting) => {
          const hasDiscount = Boolean(
            painting.discount_price_bdt && Number(painting.discount_price_bdt) > 0
          )
          const basePrice = Number(painting.base_price_bdt) || 0
          const effectivePrice = hasDiscount ? Number(painting.discount_price_bdt) : basePrice

          const effectivePriceDisplay = `${convertCurrency(effectivePrice, currency, rates)} ${currency}`
          const originalPriceDisplay = `${convertCurrency(basePrice, currency, rates)} ${currency}`

          const sizeString = getDisplayDimensions(painting)
          const aspectRatio = getArtworkAspectRatio(painting)

          const images = (painting.painting_images || []).map((img: any) => ({
            id: img.id,
            storage_key: img.storage_key,
            thumbnail_key: img.thumbnail_key,
            responsive_urls: img.responsive_urls,
            is_main: img.is_main,
            sort_order: img.sort_order,
          }))

          return (
            <div key={painting.id} className="group flex flex-col">
              {/* Image Container with Slider */}
              <div className="relative rounded-2xl overflow-hidden bg-stone-100 shadow-2xs group-hover:shadow-md transition-shadow duration-300">
                <ArtworkImageSlider
                  images={images}
                  title={painting.title}
                  href={`/gallery/${painting.slug}`}
                  aspectRatio={aspectRatio}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  showArrows={false}
                  showDots={images.length > 1}
                  showCounter={false}
                >
                  {/* Offer Badge */}
                  {hasDiscount && (
                    <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                      <span className="bg-[#1A1A1A] text-white font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-xs">
                        {painting.offer_badge || 'OFFER'}
                      </span>
                    </div>
                  )}

                  {/* Top-Right Arrow Hover Indicator */}
                  <div className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="h-7 w-7 rounded-full bg-white/95 text-black flex items-center justify-center shadow-md">
                      <ArrowUpRight className="h-3.5 w-3.5 stroke-[2]" />
                    </div>
                  </div>

                  {/* Availability Badge if sold/reserved */}
                  {painting.availability_status && painting.availability_status !== 'available' && (
                    <div className="absolute bottom-2.5 left-2.5 bg-black/85 text-white px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-sm z-20 pointer-events-none">
                      {painting.availability_status}
                    </div>
                  )}
                </ArtworkImageSlider>
              </div>

              {/* Artwork Details */}
              <Link
                href={`/gallery/${painting.slug}`}
                className="mt-3 block focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded-sm"
              >
                <h3 className="font-editorial text-lg sm:text-xl font-normal text-gray-950 group-hover:text-gray-700 transition-colors leading-snug truncate">
                  {painting.title}
                </h3>

                <p className="text-[11px] text-gray-500 font-light mt-0.5 truncate">
                  {[formatMedium(painting.painting_type), sizeString].filter(Boolean).join(' • ')}
                </p>

                <div className="mt-1 flex items-baseline gap-2 font-mono text-xs sm:text-sm">
                  {hasDiscount ? (
                    <>
                      <span className="text-[11px] text-gray-400 line-through">
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
          )
        })}
      </div>
    </section>
  )
}
