'use client'

import { useState, useEffect } from 'react'
import { FrameOption, DeliveryZone } from '@/types'
import { SUPPORTED_CURRENCIES, Currency, convertCurrency } from '@/utils/currency-shared'
import {
  MeasurementUnit,
  getDisplayDimensions,
  getFrameDisplayDimensions,
} from '@/utils/measurements'
import Image from 'next/image'
import { getPaintingImageUrl, getResponsiveSrcSet } from '@/utils/image'
import { Truck, ShieldCheck, ShoppingBag, Ruler } from 'lucide-react'

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

  const mainImageIdx = images?.findIndex(img => img.is_main) ?? -1
  
  useEffect(() => {
    if (mainImageIdx !== -1) {
      setActiveImageIndex(mainImageIdx)
    }
  }, [mainImageIdx])

  // Persist currency preference
  useEffect(() => {
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

  // Dimensions formatted in current display unit
  const formattedArtworkSize = getDisplayDimensions(painting, displayUnit)
  const formattedArtworkSizeIn = getDisplayDimensions(painting, 'in')
  const formattedArtworkSizeCm = getDisplayDimensions(painting, 'cm')
  
  // WhatsApp Link Builder
  const generateWhatsAppLink = () => {
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    const baseUrl = `https://wa.me/${cleanNumber}`
    const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/gallery/${painting.slug}` : `https://kcg-gray.vercel.app/gallery/${painting.slug}`
    
    // Compute comprehensive size description for message
    const sizeDescription = formattedArtworkSizeIn !== formattedArtworkSizeCm
      ? `${formattedArtworkSizeIn} (${formattedArtworkSizeCm})`
      : formattedArtworkSize
    
    let message = `Hello Kazi Canvas Gallery,\n\nI would like to purchase this artwork.\n\n`
    message += `🎨 Painting: ${painting.title}\n`
    message += `📍 Ref ID: ${painting.id}\n`
    message += `🖌️ Medium: ${painting.exact_medium}\n`
    message += `📐 Size: ${sizeDescription}\n`

    if (hasDiscount) {
      message += `🏷️ Original Price: ${basePrice.toLocaleString('en-BD')} BDT\n`
      message += `🔥 Offer Price: ${discountPrice.toLocaleString('en-BD')} BDT (${painting.offer_badge || 'Discount Offer'})\n`
    } else {
      message += `💰 Artwork Price: ${basePrice.toLocaleString('en-BD')} BDT\n`
    }
    
    if (selectedFrame) {
      const frameSizeStr = getFrameDisplayDimensions(selectedFrame, displayUnit)
      message += `🖼️ Framing: ${selectedFrame.frame_name} (${frameSizeStr})\n`
      message += `   Frame Cost: +${framePrice.toLocaleString('en-BD')} BDT\n`
    } else {
      message += `🖼️ Framing: Canvas Only (Unframed)\n`
    }

    if (selectedZone) {
      message += `🚚 Delivery Zone: ${selectedZone.label}\n`
      if (isQuotationDelivery) {
        message += `   Delivery Fee: Quotation Required based on location\n`
      } else if (isFreeDeliveryOfferActive || selectedZone.pricing_mode === 'free' || deliveryCharge === 0) {
        const promoLabel = isFreeDeliveryOfferActive && selectedZone.free_delivery_label ? ` (${selectedZone.free_delivery_label})` : ''
        message += `   Delivery Fee: FREE Delivery${promoLabel}\n`
      } else {
        message += `   Delivery Fee: +${deliveryCharge.toLocaleString('en-BD')} BDT\n`
      }
    }
    
    message += `\n💳 Total Amount: ${totalPriceBdt.toLocaleString('en-BD')} BDT`
    if (currency !== 'BDT') {
      message += ` (~ ${convertCurrency(totalPriceBdt, currency, rates)} ${currency})\n`
    } else {
      message += `\n`
    }
    
    message += `\n🔗 Link: ${productUrl}\n\nPlease confirm availability and delivery timeframe. Thank you!`
    
    return `${baseUrl}?text=${encodeURIComponent(message)}`
  }

  const activeImage = images?.[activeImageIndex] || images?.[0]
  
  // Try optimized bucket first, fallback to standard if missing
  const bucket = activeImage?.responsive_urls || activeImage?.thumbnail_key ? 'paintings_optimized' : 'paintings'
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
                const thumbBucket = img.thumbnail_key ? 'paintings_optimized' : 'paintings'
                const thumbUrl = getPaintingImageUrl(img.thumbnail_key || img.storage_key, thumbBucket)
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

        <div 
          className="w-full aspect-[3/4] sm:aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-lg relative group select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            key={activeImageUrl}
            src={activeImageUrl}
            srcSet={srcSet}
            sizes="(max-width: 768px) 100vw, 50vw"
            alt={painting.title}
            className="w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-105 pointer-events-none"
          />

          {/* Offer Badge Top Left */}
          {hasDiscount && (
            <div className="absolute top-4 left-4 z-20">
              <span className="bg-red-600 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
                {painting.offer_badge || 'OFFER'}
              </span>
            </div>
          )}

          {/* Availability Badge Top Right */}
          {painting.availability_status && painting.availability_status !== 'available' && (
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg z-20">
              {painting.availability_status}
            </div>
          )}

          {/* Watermark Overlay */}
          <div className="absolute bottom-3 right-3 text-[10px] font-sans font-bold text-white/40 tracking-widest pointer-events-none uppercase">
            Kazi Canvas Gallery
          </div>
        </div>
      </div>

      {/* RIGHT COL: Painting info & interactivity */}
      <div className="flex flex-col gap-y-8 mt-10 lg:mt-0">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gray-950">{painting.title}</h1>
            
            <select 
              value={currency} 
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
              className="text-sm font-sans font-bold text-gray-900 border-gray-300 rounded-md shadow-sm focus:border-black focus:ring-black bg-white px-3 py-1.5"
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c} value={c} className="font-sans text-gray-900 bg-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-sm text-gray-500 capitalize font-medium">{painting.painting_type} &middot; {painting.exact_medium}</p>
          
          {/* Size with unit toggle */}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-700 font-mono bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">
              <Ruler className="h-3.5 w-3.5 text-gray-500" />
              <span>{formattedArtworkSize}</span>
            </div>

            {/* Unit Switcher */}
            <div className="inline-flex rounded-md shadow-2xs border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setDisplayUnit('in')}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  displayUnit === 'in'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                } transition-all`}
              >
                in
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('cm')}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  displayUnit === 'cm'
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:text-black'
                } transition-all`}
              >
                cm
              </button>
            </div>
          </div>
        </div>

        <div className="prose prose-sm text-gray-700">
          <p>{painting.description || 'No description provided.'}</p>
        </div>

        {/* Framing Options */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-3">1. Select Framing Option</h3>
          <div className="space-y-3">
            <label className={`block border p-4 rounded-xl cursor-pointer transition-colors ${selectedFrameId === 'none' ? 'border-black bg-gray-50/80 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="radio" name="frame" value="none" checked={selectedFrameId === 'none'} onChange={() => setSelectedFrameId('none')} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                  <span className="ml-3 font-semibold text-gray-900 text-sm">Painting Only (Unframed Canvas)</span>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase">Included</span>
              </div>
            </label>
            
            {frames.map((frame) => {
              const frameSizeStr = getFrameDisplayDimensions(frame, displayUnit)
              return (
                <label key={frame.id} className={`block border p-4 rounded-xl cursor-pointer transition-colors ${selectedFrameId === frame.id ? 'border-black bg-gray-50/80 ring-1 ring-black' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input type="radio" name="frame" value={frame.id} checked={selectedFrameId === frame.id} onChange={() => setSelectedFrameId(frame.id)} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                      <div className="ml-3">
                        <span className="block font-semibold text-gray-900 text-sm">{frame.frame_name}</span>
                        <span className="block text-xs text-gray-500">Outer Size: {frameSizeStr}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 font-mono">
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
                        </div>
                      </div>

                      <div className="text-right">
                        {isQuotation ? (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Quotation Required
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
              <p className="text-xs text-amber-600 font-medium mt-1">
                * Final delivery charge will be confirmed over WhatsApp based on your destination address.
              </p>
            )}
            {currency !== 'BDT' && (
              <p className="text-xs text-gray-400 mt-1">Final payment will be confirmed in BDT ({totalPriceBdt.toLocaleString()} BDT).</p>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          {isAvailable ? (
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-green-600 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 focus:outline-none"
            >
              <ShoppingBag className="h-5 w-5 fill-white stroke-none" />
              Order Now via WhatsApp
            </a>
          ) : (
             <button
              disabled
              className="flex w-full items-center justify-center rounded-xl border border-transparent bg-gray-300 px-8 py-4 text-base font-bold text-gray-500 cursor-not-allowed uppercase tracking-wider"
            >
              {painting.availability_status}
            </button>
          )}
          
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 font-light">
            <ShieldCheck className="h-4 w-4 text-gray-400" />
            Original handmade artwork &bull; Direct artist consultation &bull; Secure delivery
          </div>
        </div>
      </div>
    </div>
  )
}
