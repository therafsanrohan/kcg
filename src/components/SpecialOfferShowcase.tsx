'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Currency, convertCurrency, FALLBACK_RATES } from '@/utils/currency-shared'
import { formatMedium, getDisplayDimensions, getArtworkAspectRatio } from '@/utils/measurements'
import ArtworkImageSlider from '@/components/ArtworkImageSlider'

interface SpecialOfferShowcaseProps {
  paintings: any[]
}

export default function SpecialOfferShowcase({ paintings }: SpecialOfferShowcaseProps) {
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)

  // Filter artworks with active discount or offer badge
  const offerPaintings = paintings.filter(
    (p) =>
      p.is_published !== false &&
      !p.archived_at &&
      ((p.discount_price_bdt && Number(p.discount_price_bdt) > 0) || Boolean(p.offer_badge))
  )

  useEffect(() => {
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) setRates(data.rates)
      })
      .catch(() => {})
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

  if (offerPaintings.length === 0) {
    return null
  }

  return (
    <section className="pt-4 pb-8 sm:pt-6 sm:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-gray-200/80">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-600 block mb-1.5 font-mono">
            LIMITED TIME
          </span>
          <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-gray-950 tracking-[-0.01em]">
            Special Offers
          </h2>
        </div>

        <Link
          href="/#available-works?category=offers"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium text-gray-950 border-b border-black pb-1 hover:text-red-600 hover:border-red-600 transition-all self-start sm:self-auto group"
        >
          <span>View All ({offerPaintings.length})</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Responsive Gallery Grid: 2 columns on mobile & tablet, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6 lg:gap-8">
        {offerPaintings.slice(0, 4).map((painting, index) => {
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
              className="group flex flex-col w-full"
            >
              <div className="relative flex flex-col h-full">
                {/* Artwork Image Box */}
                <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200/70 shadow-2xs transition-all duration-500 ease-out group-hover:shadow-md bg-[#F4F3EE]">
                  <ArtworkImageSlider
                    images={painting.painting_images || []}
                    title={painting.title}
                    href={`/gallery/${painting.slug}`}
                    aspectRatio={artAspect}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    showArrows={false}
                    priority={index < 2}
                    variant="card"
                  >
                    {/* Offer Badge (Top-Left) */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 pointer-events-none">
                      <span className="bg-[#DC2626] text-white font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-sm shadow-sm">
                        {painting.offer_badge || 'OFFER'}
                      </span>
                    </div>

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

                {/* Details */}
                <Link
                  href={`/gallery/${painting.slug}`}
                  prefetch={true}
                  className="mt-2.5 sm:mt-3.5 block focus:outline-none focus-visible:ring-1 focus-visible:ring-black rounded-sm"
                >
                  <h3 className="font-editorial text-base sm:text-xl font-normal text-gray-950 group-hover:text-gray-700 transition-colors leading-snug break-words">
                    {painting.title}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-gray-500 font-light mt-0.5 sm:mt-1 truncate">
                    {[formatMedium(painting.painting_type), sizeString].filter(Boolean).join(' • ')}
                  </p>

                  <div className="mt-1 sm:mt-1.5 flex items-baseline gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm">
                    {hasDiscount ? (
                      <>
                        <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                          {originalPriceDisplay}
                        </span>
                        <span className="font-bold text-[#DC2626]">
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
    </section>
  )
}
