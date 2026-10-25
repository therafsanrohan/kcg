'use client'

import React, { useEffect } from 'react'
import { X, RotateCcw, SlidersHorizontal, Tag } from 'lucide-react'
import { Currency } from '@/utils/currency-shared'

export interface FilterState {
  category: string // 'all' | 'offers' | 'oil' | 'acrylic' | 'mixed'
  orientation: string // 'all' | 'portrait' | 'landscape' | 'square'
  minPrice: number | null
  maxPrice: number | null
  availability: string // 'available' | 'all'
  sortBy: string // 'newest' | 'price_asc' | 'price_desc'
}

interface GalleryFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFilterChange: (newFilters: FilterState) => void
  onReset: () => void
  totalCount: number
  currency: Currency
  hasOffers?: boolean
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Mediums' },
  { value: 'oil', label: 'Oil on canvas' },
  { value: 'acrylic', label: 'Acrylic on canvas' },
  { value: 'mixed', label: 'Mixed Media' },
]

const ORIENTATION_OPTIONS = [
  { value: 'all', label: 'All Shapes' },
  { value: 'portrait', label: 'Portrait (Vertical)', aspect: 'w-3 h-4' },
  { value: 'landscape', label: 'Landscape (Horizontal)', aspect: 'w-4 h-3' },
  { value: 'square', label: 'Square (1:1)', aspect: 'w-3.5 h-3.5' },
]

const PRICE_PRESETS = [
  { label: 'All Prices', min: null, max: null },
  { label: 'Under ৳25,000', min: null, max: 25000 },
  { label: '৳25,000 – ৳50,000', min: 25000, max: 50000 },
  { label: 'Above ৳50,000', min: 50000, max: null },
]

export default function GalleryFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  totalCount,
  currency,
  hasOffers = false,
}: GalleryFilterDrawerProps) {
  // Prevent background scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handlePricePreset = (min: number | null, max: number | null) => {
    onFilterChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    })
  }

  const isPresetActive = (min: number | null, max: number | null) => {
    return filters.minPrice === min && filters.maxPrice === max
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <h2 className="font-editorial text-2xl font-normal text-gray-950">Filters</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-gray-400 hover:text-black font-mono uppercase tracking-wider flex items-center gap-1 px-2.5 py-1 rounded transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filter Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            
            {/* 1. Medium / Category */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-3 font-mono">
                Medium / Artwork Type
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  CATEGORY_OPTIONS[0],
                  ...(hasOffers ? [{ value: 'offers', label: 'Special Offer', isOffer: true }] : []),
                  ...CATEGORY_OPTIONS.slice(1),
                ].map((cat) => {
                  const active = filters.category === cat.value
                  const isOfferOption = (cat as any).isOffer

                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => onFilterChange({ ...filters, category: cat.value })}
                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all inline-flex items-center justify-between gap-1.5 ${
                        active
                          ? isOfferOption
                            ? 'border-red-600 bg-red-600 text-white shadow-xs'
                            : 'border-black bg-black text-white shadow-xs'
                          : isOfferOption
                          ? 'border-red-200 bg-red-50/60 text-red-700 hover:border-red-400 hover:bg-red-50'
                          : 'border-gray-200 bg-[#FAF9F6] text-gray-700 hover:border-gray-400 hover:bg-white'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isOfferOption && <Tag className="h-3 w-3 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Orientation */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-3 font-mono">
                Artwork Orientation
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ORIENTATION_OPTIONS.map((orient) => {
                  const active = filters.orientation === orient.value
                  return (
                    <button
                      key={orient.value}
                      type="button"
                      onClick={() => onFilterChange({ ...filters, orientation: orient.value })}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        active
                          ? 'border-black bg-black text-white shadow-xs'
                          : 'border-gray-200 bg-[#FAF9F6] text-gray-700 hover:border-gray-400 hover:bg-white'
                      }`}
                    >
                      {orient.aspect && (
                        <span
                          className={`inline-block rounded-xs border ${
                            active ? 'border-white bg-white/20' : 'border-gray-400 bg-gray-200'
                          } ${orient.aspect}`}
                        />
                      )}
                      <span>{orient.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Price Range Presets */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-3 font-mono">
                Price Range ({currency})
              </span>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PRICE_PRESETS.map((preset) => {
                  const active = isPresetActive(preset.min, preset.max)
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePricePreset(preset.min, preset.max)}
                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        active
                          ? 'border-black bg-black text-white shadow-xs'
                          : 'border-gray-200 bg-[#FAF9F6] text-gray-700 hover:border-gray-400 hover:bg-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>

              {/* Custom Min / Max Price Inputs */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">
                    Min ৳
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Min"
                    value={filters.minPrice !== null ? filters.minPrice : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value))
                      onFilterChange({ ...filters, minPrice: val })
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-black outline-none bg-[#FAF9F6]"
                  />
                </div>
                <span className="text-gray-300 mt-5 font-mono">&mdash;</span>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">
                    Max ৳
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Max"
                    value={filters.maxPrice !== null ? filters.maxPrice : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value))
                      onFilterChange({ ...filters, maxPrice: val })
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-black outline-none bg-[#FAF9F6]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Availability Filter */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-3 font-mono">
                Availability
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, availability: 'available' })}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    filters.availability === 'available'
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-gray-200 bg-[#FAF9F6] text-gray-700 hover:border-gray-400 hover:bg-white'
                  }`}
                >
                  Available Now
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, availability: 'all' })}
                  className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    filters.availability === 'all'
                      ? 'border-black bg-black text-white shadow-xs'
                      : 'border-gray-200 bg-[#FAF9F6] text-gray-700 hover:border-gray-400 hover:bg-white'
                  }`}
                >
                  All Artworks
                </button>
              </div>
            </div>

          </div>

          {/* Footer (Apply Action) */}
          <div className="p-6 border-t border-gray-100 bg-[#FAFAFA] flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Show {totalCount} {totalCount === 1 ? 'Artwork' : 'Artworks'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
