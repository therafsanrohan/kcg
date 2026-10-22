'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { X, Tag, Percent, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { getPaintingImageUrl } from '@/utils/image'

interface BulkOfferModalProps {
  isOpen: boolean
  onClose: () => void
  selectedArtworks: any[]
  onApply: (type: 'percentage' | 'fixed', value: number, badge: string | null) => Promise<void>
  isApplying: boolean
}

export default function BulkOfferModal({
  isOpen,
  onClose,
  selectedArtworks,
  onApply,
  isApplying,
}: BulkOfferModalProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState<number | ''>(15)
  const [customBadge, setCustomBadge] = useState<string>('')

  // Quick preset options
  const percentagePresets = [5, 10, 15, 20, 25, 30, 40, 50]
  const fixedPresets = [1000, 2000, 3000, 5000, 10000, 15000, 20000]

  const suggestedBadge = useMemo(() => {
    if (!discountValue || discountValue <= 0) return ''
    if (discountType === 'percentage') {
      return `${Math.round(discountValue)}% OFF`
    } else {
      return `৳${Math.round(discountValue).toLocaleString('en-BD')} OFF`
    }
  }, [discountType, discountValue])

  const effectiveBadge = customBadge.trim() ? customBadge.trim() : suggestedBadge

  // Live calculation of preview and eligibility
  const previewData = useMemo(() => {
    const val = typeof discountValue === 'number' ? discountValue : 0

    return selectedArtworks.map((art) => {
      const basePrice = Number(art.base_price_bdt) || 0
      if (basePrice <= 0) {
        return {
          artwork: art,
          basePrice: 0,
          discountedPrice: 0,
          savings: 0,
          isEligible: false,
          reason: 'Base price is 0 or unassigned',
        }
      }

      let discounted = 0
      if (discountType === 'percentage') {
        discounted = Math.round(basePrice * (1 - val / 100))
      } else {
        discounted = Math.round(basePrice - val)
      }

      if (val <= 0) {
        return {
          artwork: art,
          basePrice,
          discountedPrice: basePrice,
          savings: 0,
          isEligible: false,
          reason: 'Please enter a valid discount',
        }
      }

      if (discounted <= 0) {
        return {
          artwork: art,
          basePrice,
          discountedPrice: 0,
          savings: basePrice,
          isEligible: false,
          reason: 'Discount equals or exceeds base price',
        }
      }

      if (discounted >= basePrice) {
        return {
          artwork: art,
          basePrice,
          discountedPrice: basePrice,
          savings: 0,
          isEligible: false,
          reason: 'Discounted price must be lower than base price',
        }
      }

      return {
        artwork: art,
        basePrice,
        discountedPrice: discounted,
        savings: basePrice - discounted,
        isEligible: true,
        reason: null,
      }
    })
  }, [selectedArtworks, discountType, discountValue])

  const eligibleCount = previewData.filter((p) => p.isEligible).length
  const ineligibleCount = previewData.length - eligibleCount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof discountValue !== 'number' || discountValue <= 0 || eligibleCount === 0) return
    await onApply(discountType, discountValue, effectiveBadge || null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-2xs">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-sans text-xl font-bold text-gray-900 leading-tight">
                Apply Offer in Bulk
              </h3>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Targeting {selectedArtworks.length} selected artwork
                {selectedArtworks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Discount Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Discount Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDiscountType('percentage')
                  setDiscountValue(15)
                }}
                className={`py-3 px-4 rounded-2xl border-2 text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                  discountType === 'percentage'
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>Percentage Discount (%)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountType('fixed')
                  setDiscountValue(5000)
                }}
                className={`py-3 px-4 rounded-2xl border-2 text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                  discountType === 'fixed'
                    ? 'border-black bg-black text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="font-bold text-base leading-none">৳</span>
                <span>Fixed Amount (৳ BDT)</span>
              </button>
            </div>
          </div>

          {/* Discount Value and Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              {discountType === 'percentage' ? 'Percentage Off (1% – 99%)' : 'Discount Amount (৳ BDT)'}
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={discountType === 'percentage' ? 99 : 500000}
                step={discountType === 'percentage' ? 1 : 100}
                required
                value={discountValue}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseFloat(e.target.value)
                  setDiscountValue(v)
                }}
                placeholder={discountType === 'percentage' ? 'e.g. 15' : 'e.g. 5000'}
                className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                {discountType === 'percentage' ? '%' : 'BDT'}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[11px] font-medium text-gray-400 mr-1">Presets:</span>
              {(discountType === 'percentage' ? percentagePresets : fixedPresets).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDiscountValue(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-all ${
                    discountValue === preset
                      ? 'border-black bg-gray-900 text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {discountType === 'percentage' ? `${preset}%` : `৳${preset.toLocaleString('en-BD')}`}
                </button>
              ))}
            </div>
          </div>

          {/* Offer Badge Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Badge Label (Shown on Gallery Card)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={50}
                value={customBadge}
                onChange={(e) => setCustomBadge(e.target.value)}
                placeholder={suggestedBadge || 'e.g. 15% OFF, Special Offer'}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              />
              {effectiveBadge && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md">
                  {effectiveBadge}
                </span>
              )}
            </div>
            {/* Quick Badge Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {['Special Offer', 'Eid Collection', 'Curator Pick', 'Limited Deal', 'Spring Art'].map(
                (badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => setCustomBadge(badge)}
                    className="px-2 py-0.5 text-[11px] rounded font-medium border border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black transition-all"
                  >
                    + {badge}
                  </button>
                )
              )}
              {customBadge && (
                <button
                  type="button"
                  onClick={() => setCustomBadge('')}
                  className="px-2 py-0.5 text-[11px] text-gray-400 hover:text-red-500 underline"
                >
                  Reset to auto
                </button>
              )}
            </div>
          </div>

          {/* Live Impact & Preview Summary */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Authoritative Pricing Preview
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {eligibleCount} eligible
                </span>
                {ineligibleCount > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {ineligibleCount} skipped
                  </span>
                )}
              </div>
            </div>

            {/* Artwork Preview Rows */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 divide-y divide-gray-100">
              {previewData.slice(0, 5).map(({ artwork, basePrice, discountedPrice, isEligible, reason }) => {
                const mainImage =
                  artwork.painting_images?.find((img: any) => img.is_main) ??
                  artwork.painting_images?.[0]
                const imageUrl = getPaintingImageUrl(mainImage?.storage_key)

                return (
                  <div
                    key={artwork.id}
                    className={`pt-2 first:pt-0 flex items-center justify-between gap-3 ${
                      !isEligible ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-300">
                        <Image
                          src={imageUrl}
                          alt={artwork.title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {artwork.title}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          {artwork.serial_number || 'No serial'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isEligible ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[11px] text-gray-400 line-through">
                            ৳{basePrice.toLocaleString('en-BD')}
                          </span>
                          <span className="text-xs font-bold text-red-600">
                            ৳{discountedPrice.toLocaleString('en-BD')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600">
                          {reason || 'Skipped'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedArtworks.length > 5 && (
              <p className="text-[11px] text-gray-500 font-light pt-1 text-center">
                + {selectedArtworks.length - 5} more artwork
                {selectedArtworks.length - 5 !== 1 ? 's' : ''} will receive this authoritative
                discount.
              </p>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isApplying || eligibleCount === 0}
            className="px-6 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Authoritative Offer…</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Offer to {eligibleCount} Artworks</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
