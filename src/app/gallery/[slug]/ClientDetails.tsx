'use client'

import { useState, useEffect, useRef } from 'react'
import { FrameOption, DeliveryZone } from '@/types'
import { SUPPORTED_CURRENCIES, Currency, convertCurrency } from '@/utils/currency-shared'
import {
  MeasurementUnit,
  getDisplayDimensions,
  getFrameDisplayDimensions,
  toCanonicalMm,
} from '@/utils/measurements'
import Image from 'next/image'
import { getPaintingImageUrl, getResponsiveSrcSet } from '@/utils/image'
import { Truck, ShieldCheck, ShoppingBag, Ruler, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import ArtworkFramePreview from '@/components/admin/ArtworkFramePreview'
import CustomSelect from '@/components/ui/CustomSelect'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon'

interface PaintingData {
  id: string
  title: string
  slug: string
  painting_type: string
  exact_medium: string
  width?: number
  height?: number
  measurement_unit?: string | null
  display_size?: string | null
  width_mm?: number | null
  height_mm?: number | null
  base_price_bdt: number
  discount_price_bdt?: number | null
  offer_badge?: string | null
  availability_status: string
  description: string
}

const isOfferActive = (startsAt?: string | null, endsAt?: string | null) => {
  if (!startsAt && !endsAt) return true
  const now = new Date()
  if (startsAt && new Date(startsAt) > now) return false
  if (endsAt && new Date(endsAt) < now) return false
  return true
}

export default function ClientDetails({ 
  painting, 
  frames, 
  deliveryZones = [],
  rates, 
  images,
  whatsappNumber
}: { 
  painting: PaintingData
  frames: FrameOption[]
  deliveryZones?: DeliveryZone[]
  rates: Record<string, number>
  images: any[]
  whatsappNumber: string
}) {
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [selectedFrameId, setSelectedFrameId] = useState<string>('none')
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('inside_dhaka')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [displayUnit, setDisplayUnit] = useState<MeasurementUnit>('in')
  const [isMounted, setIsMounted] = useState(false)

  const mainImageIdx = images?.findIndex(img => img.is_main) ?? -1
  
  useEffect(() => {
    if (mainImageIdx !== -1) {
      setActiveImageIndex(mainImageIdx)
    }
  }, [mainImageIdx])

  // Persist currency preference & mark mounted
  useEffect(() => {
    setIsMounted(true)
    const updateCurr = () => {
      const saved = localStorage.getItem('preferredCurrency') as Currency
      if (saved && SUPPORTED_CURRENCIES.includes(saved)) {
        setCurrency(saved)
      }
    }
    updateCurr()
    window.addEventListener('preferredCurrencyChanged', updateCurr)
    return () => window.removeEventListener('preferredCurrencyChanged', updateCurr)
  }, [])

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c)
    localStorage.setItem('preferredCurrency', c)
    window.dispatchEvent(new Event('preferredCurrencyChanged'))
  }

  // Multi-image slider navigation
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isSwiping = useRef(false)

  const goToPrevImage = () => {
    if (!images || images.length <= 1) return
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNextImage = () => {
    if (!images || images.length <= 1) return
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!images || images.length <= 1) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!images || images.length <= 1 || touchStartX.current === null || touchStartY.current === null) return
    const diffX = touchStartX.current - e.touches[0].clientX
    const diffY = touchStartY.current - e.touches[0].clientY
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwiping.current = true
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!images || images.length <= 1 || touchStartX.current === null) return
    const currentX = e.changedTouches[0].clientX
    const diffX = touchStartX.current - currentX
    if (isSwiping.current && Math.abs(diffX) >= 35) {
      if (diffX > 0) goToNextImage()
      else goToPrevImage()
    }
    touchStartX.current = null
    touchStartY.current = null
    isSwiping.current = false
  }

  const selectedFrame = frames?.find(f => f.id === selectedFrameId)
  const selectedZone = deliveryZones?.find(z => z.code === selectedZoneCode) || deliveryZones?.[0]
  
  const hasDiscount = Boolean(painting.discount_price_bdt && Number(painting.discount_price_bdt) > 0)
  const basePrice = Number(painting.base_price_bdt) || 0
  const discountPrice = hasDiscount ? Number(painting.discount_price_bdt) : basePrice
  const framePrice = selectedFrame ? Number(selectedFrame.price_bdt) || 0 : 0
  
  const isQuotationDelivery = selectedZone?.pricing_mode === 'courier_quotation' || selectedZone?.pricing_mode === 'destination_quotation'
  const isFreeDeliveryOfferActive = selectedZone?.free_delivery && isOfferActive(selectedZone?.offer_starts_at, selectedZone?.offer_ends_at)
  
  // Calculate delivery charge based on active offer or standard mode
  let deliveryCharge = 0
  if (!isQuotationDelivery) {
    if (selectedZone?.pricing_mode === 'free' || isFreeDeliveryOfferActive) {
      deliveryCharge = 0
    } else {
      deliveryCharge = Number(selectedZone?.charge_bdt) || 0
    }
  }

  const totalPriceBdt = discountPrice + framePrice + deliveryCharge
  const originalTotalPriceBdt = basePrice + framePrice + deliveryCharge

  const isAvailable = painting.availability_status === 'available'

  // Canonical mm dimensions
  const widthMm = painting.width_mm && painting.width_mm > 0
    ? painting.width_mm
    : toCanonicalMm(painting.width || 60, (painting.measurement_unit as MeasurementUnit) || 'cm')
  
  const heightMm = painting.height_mm && painting.height_mm > 0
    ? painting.height_mm
    : toCanonicalMm(painting.height || 90, (painting.measurement_unit as MeasurementUnit) || 'cm')

  // Dimensions formatted in current display unit
  const formattedArtworkSize = getDisplayDimensions(painting, displayUnit)
  const formattedArtworkSizeIn = getDisplayDimensions(painting, 'in')
  const formattedArtworkSizeFt = getDisplayDimensions(painting, 'ft')
  
  // WhatsApp Link Builder
  const generateWhatsAppLink = () => {
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    const baseUrl = `https://wa.me/${cleanNumber}`

    // Production URL safeguard (never send localhost:3000 to customers)
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const siteOrigin =
      isLocalhost || typeof window === 'undefined' ? 'https://kazicanvasgallery.com' : window.location.origin
    const productUrl = `${siteOrigin}/gallery/${painting.slug}`
    
    // Compute comprehensive size description for message
    const sizeDescription = formattedArtworkSizeIn !== formattedArtworkSizeFt
      ? `${formattedArtworkSizeIn} (${formattedArtworkSizeFt})`
      : formattedArtworkSize
    
    // Format framing line
    const framingLine = selectedFrame
      ? `${selectedFrame.frame_name} (+${framePrice.toLocaleString('en-BD')} BDT)`
      : 'Wooden fabric Canvas'

    // Format delivery fee line
    let deliveryFeeText = ''
    if (selectedZone) {
      if (isQuotationDelivery) {
        if (selectedZone.code === 'outside_dhaka' || selectedZone.label.toLowerCase().includes('outside dhaka')) {
          deliveryFeeText = 'As per Sundarban Courier / S.A. Paribahan charges'
        } else if (
          selectedZone.code === 'international' ||
          selectedZone.label.toLowerCase().includes('worldwide') ||
          selectedZone.label.toLowerCase().includes('outside bangladesh')
        ) {
          deliveryFeeText = 'As per mailing address'
        } else {
          deliveryFeeText = 'As per courier quotation'
        }
      } else if (isFreeDeliveryOfferActive || selectedZone.pricing_mode === 'free' || deliveryCharge === 0) {
        deliveryFeeText = 'FREE Delivery'
      } else {
        deliveryFeeText = `+${deliveryCharge.toLocaleString('en-BD')} BDT`
      }
    }

    const shortRefId = painting.id ? `#${painting.id.slice(0, 8).toUpperCase()}` : ''

    let message = `Hello Kazi Canvas Gallery,\n\nI would like to acquire this artwork:\n\n`
    message += `*Artwork:* ${painting.title}\n`
    message += `*Medium:* ${painting.exact_medium || painting.painting_type || 'Oil on canvas'}\n`
    message += `*Size:* ${sizeDescription}\n`

    if (hasDiscount) {
      message += `*Artwork Price:* ${discountPrice.toLocaleString('en-BD')} BDT (${painting.offer_badge || 'Discount Offer'})\n`
    } else {
      message += `*Artwork Price:* ${basePrice.toLocaleString('en-BD')} BDT\n`
    }
    
    message += `*Framing:* ${framingLine}\n`

    if (selectedZone) {
      message += `*Delivery Zone:* ${selectedZone.label} (${deliveryFeeText})\n`
    }
    
    message += `\n*Total Amount:* ${totalPriceBdt.toLocaleString('en-BD')} BDT`
    if (currency !== 'BDT') {
      message += ` (~ ${convertCurrency(totalPriceBdt, currency, rates)} ${currency})`
    }
    
    message += `\n\n*Artwork Link:* ${productUrl}`
    if (shortRefId) {
      message += `\n*Ref:* ${shortRefId}`
    }
    message += `\n\nPlease confirm availability and delivery timeframe. Thank you!`
    
    return `${baseUrl}?text=${encodeURIComponent(message)}`
  }

  const activeImage = images?.[activeImageIndex] || images?.[0]
  
  // Use paintings_optimized bucket by default
  const bucket = 'paintings_optimized'
  const activeImageUrl = getPaintingImageUrl(activeImage?.storage_key || activeImage?.processed_key, bucket)
  const srcSet = getResponsiveSrcSet(activeImage?.responsive_urls, bucket)

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
      
      {/* LEFT COL: Image gallery */}
      <div>
        {/* Thumbnails */}
        {images && images.length > 1 && (
          <div className="mb-4 overflow-x-auto pb-2">
            <div className="flex space-x-3">
              {images.map((img, idx) => {
                const thumbUrl = getPaintingImageUrl(img.thumbnail_key || img.storage_key, 'paintings_optimized')
                const isSelected = idx === activeImageIndex
                return (
                  <button
                    key={img.storage_key || idx} 
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 h-20 w-20 sm:h-24 sm:w-24 cursor-pointer items-center justify-center rounded-xl bg-gray-100 overflow-hidden border-2 transition-all ${isSelected ? 'border-black ring-2 ring-black/20 scale-95 shadow-sm' : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'}`}
                  >
                    <span className="sr-only">View image {idx + 1}</span>
                    <Image 
                      src={thumbUrl} 
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover object-center" 
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Unified Artwork & Frame Live Preview Canvas with Swipe & Navigation */}
        <div
          className="relative group/detail-slider"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ArtworkFramePreview
            imageUrl={activeImageUrl}
            title={painting.title}
            widthMm={widthMm}
            heightMm={heightMm}
            selectedFrame={selectedFrame}
            displayUnit={displayUnit}
          />

          {/* Slider Prev / Next Controls for Multi-Image Artworks */}
          {images && images.length > 1 && (
            <>
              {/* Counter Badge */}
              <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-medium tracking-wider bg-black/60 text-white/95 backdrop-blur-md shadow-2xs">
                  {activeImageIndex + 1} / {images.length}
                </span>
              </div>

              {/* Prev Button */}
              <button
                type="button"
                onClick={goToPrevImage}
                aria-label="Previous artwork image"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 text-gray-900 border border-black/5 shadow-md backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/detail-slider:opacity-100 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:opacity-100"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={goToNextImage}
                aria-label="Next artwork image"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/90 text-gray-900 border border-black/5 shadow-md backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/detail-slider:opacity-100 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:opacity-100"
              >
                <ChevronRight className="h-5 w-5 stroke-[2.2]" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* RIGHT COL: Painting info & interactivity */}
      <div className="flex flex-col gap-y-8 mt-10 lg:mt-0">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 block mb-1.5">
                ORIGINAL CANVAS
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-gray-950 tracking-[-0.01em] leading-tight">
                {painting.title}
              </h1>
            </div>
            
            <div className="w-24">
              <CustomSelect 
                value={currency} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCurrencyChange(e.target.value as Currency)}
                aria-label="Select currency"
                className="text-xs font-mono font-medium text-gray-800 py-1.5 pl-2.5 pr-7"
                options={SUPPORTED_CURRENCIES.map(c => ({ value: c, label: c }))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs sm:text-sm text-gray-500 font-light">
            {painting.painting_type} &bull; {painting.exact_medium}
          </p>
          
          {/* Size with unit toggle */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-700 font-mono bg-white border border-gray-200 px-2.5 py-1 rounded-sm">
              <Ruler className="h-3 w-3 text-gray-400" />
              <span>{formattedArtworkSize}</span>
            </div>

            {/* Unit Switcher with all 4 supported units */}
            <div className="inline-flex rounded-md shadow-2xs border border-gray-200 bg-white p-0.5">
              {(['in', 'ft', 'cm', 'mm'] as MeasurementUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setDisplayUnit(u)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    displayUnit === u
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:text-black'
                  } transition-all`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="prose prose-sm text-gray-700">
          <p>{painting.description || 'No description provided.'}</p>
        </div>

        {/* Framing Options */}
        <div className="border-t border-gray-200/80 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-4">
            1. Framing Selection
          </h3>
          <div className="space-y-2.5">
            <label className={`block border p-3.5 rounded-lg cursor-pointer transition-colors ${selectedFrameId === 'none' ? 'border-black bg-gray-50/60 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="radio" name="frame" value="none" checked={selectedFrameId === 'none'} onChange={() => setSelectedFrameId('none')} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                  <span className="ml-3 font-medium text-gray-900 text-sm">Wooden fabric Canvas</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400 uppercase">Included</span>
              </div>
            </label>
            
            {frames.map((frame) => {
              const frameSizeStr = getFrameDisplayDimensions(frame, displayUnit)
              return (
                <label key={frame.id} className={`block border p-3.5 rounded-lg cursor-pointer transition-colors ${selectedFrameId === frame.id ? 'border-black bg-gray-50/60 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input type="radio" name="frame" value={frame.id} checked={selectedFrameId === frame.id} onChange={() => setSelectedFrameId(frame.id)} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                      <div className="ml-3">
                        <span className="block font-medium text-gray-900 text-sm">{frame.frame_name}</span>
                        <span className="block text-xs text-gray-500 font-light">Outer: {frameSizeStr}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-medium text-gray-900">
                      + {convertCurrency(frame.price_bdt, currency, rates)} {currency}
                    </span>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Delivery Zone Selector */}
        {deliveryZones.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-gray-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">2. Delivery Location</h3>
            </div>
            <div className="space-y-3">
              {deliveryZones.map((zone) => {
                const isSelected = selectedZoneCode === zone.code
                const isQuotation = zone.pricing_mode === 'courier_quotation' || zone.pricing_mode === 'destination_quotation'
                const isFreePromoActive = zone.free_delivery && isOfferActive(zone.offer_starts_at, zone.offer_ends_at)
                const isFree = zone.pricing_mode === 'free' || isFreePromoActive || (zone.charge_bdt === 0 && !isQuotation)

                return (
                  <label
                    key={zone.id}
                    className={`block border p-4 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'border-black bg-gray-50/80 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="delivery_zone"
                          value={zone.code}
                          checked={isSelected}
                          onChange={() => setSelectedZoneCode(zone.code)}
                          className="h-4 w-4 text-black focus:ring-black border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="flex items-center gap-2">
                            <span className="block font-semibold text-gray-900 text-sm">{zone.label}</span>
                            {isFreePromoActive && zone.free_delivery_label && (
                              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {zone.free_delivery_label}
                              </span>
                            )}
                          </div>
                          <span className="block text-xs text-gray-500">{zone.estimated_delivery_time || 'Standard Delivery'}</span>
                          {zone.code === 'inside_dhaka' && (
                            <span className="block text-xs text-gray-500 font-medium mt-0.5">Delivery by personal agent</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {isQuotation ? (
                          <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block max-w-[200px] sm:max-w-none text-right">
                            {zone.code === 'outside_dhaka' || zone.label.toLowerCase().includes('outside dhaka')
                              ? 'As per Sundarban Courier / S.A. Paribahan charges'
                              : zone.code === 'international' || zone.label.toLowerCase().includes('worldwide') || zone.label.toLowerCase().includes('outside bangladesh')
                              ? 'As per mailing address'
                              : 'As per courier quotation'}
                          </span>
                        ) : isFree ? (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                            FREE
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-gray-900 font-mono">
                            + {convertCurrency(zone.charge_bdt, currency, rates)} {currency}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Total Price & Summary */}
        <div className="border-t border-gray-200 pt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Price</p>
            <div className="flex items-baseline gap-3 mt-1">
              {hasDiscount && (
                <span className="text-xl font-normal text-gray-400 line-through font-mono">
                  {convertCurrency(originalTotalPriceBdt, currency, rates)}
                </span>
              )}
              <p className={`text-3xl font-bold font-mono ${hasDiscount ? 'text-red-600' : 'text-gray-950'}`}>
                {convertCurrency(totalPriceBdt, currency, rates)} <span className="text-xl font-normal text-gray-500">{currency}</span>
              </p>
            </div>
            {isQuotationDelivery && (
              <p className="text-xs text-amber-700 font-medium mt-1">
                * Delivery charge will be confirmed {
                  selectedZone?.code === 'outside_dhaka' || selectedZone?.label.toLowerCase().includes('outside dhaka')
                    ? 'as per Sundarban Courier / S.A. Paribahan charges'
                    : selectedZone?.code === 'international' || selectedZone?.label.toLowerCase().includes('worldwide') || selectedZone?.label.toLowerCase().includes('outside bangladesh')
                    ? 'as per mailing address'
                    : 'as per courier quotation'
                }.
              </p>
            )}
            {currency !== 'BDT' && (
              <p className="text-xs text-gray-400 mt-1">Final payment will be confirmed in BDT ({totalPriceBdt.toLocaleString()} BDT).</p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-8">
          {isAvailable ? (
            <button
              type="button"
              onClick={() => {
                const url = generateWhatsAppLink()
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-md bg-[#1A1A1A] px-8 py-4 text-xs uppercase tracking-[0.18em] font-semibold text-white shadow-sm hover:bg-black transition-colors focus:outline-none cursor-pointer"
            >
              <WhatsAppIcon className="h-4 w-4 fill-white flex-shrink-0" />
              <span>Inquire & Acquire via WhatsApp</span>
            </button>
          ) : (
             <button
              disabled
              className="flex w-full items-center justify-center rounded-md bg-gray-200 px-8 py-4 text-xs font-mono font-semibold text-gray-500 cursor-not-allowed uppercase tracking-wider"
            >
              {painting.availability_status}
            </button>
          )}
          
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400 font-light">
            <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
            Original one-of-one physical artwork &bull; Direct consultation &bull; Secure shipment
          </div>
        </div>
      </div>
    </div>
  )
}
