'use client'

import { useState, useEffect } from 'react'
import { FrameOption } from '@/types'
import { SUPPORTED_CURRENCIES, Currency, convertCurrency } from '@/utils/currency'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'

interface PaintingData {
  id: string
  title: string
  slug: string
  painting_type: string
  exact_medium: string
  width: number
  height: number
  base_price_bdt: number
  discount_price_bdt?: number | null
  offer_badge?: string | null
  availability_status: string
  description: string
}

export default function ClientDetails({ 
  painting, 
  frames, 
  rates,
  images,
  whatsappNumber
}: { 
  painting: PaintingData
  frames: FrameOption[]
  rates: Record<string, number>
  images: any[]
  whatsappNumber: string
}) {
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [selectedFrameId, setSelectedFrameId] = useState<string>('none')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
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
  
  const hasDiscount = Boolean(painting.discount_price_bdt && Number(painting.discount_price_bdt) > 0)
  const basePrice = Number(painting.base_price_bdt) || 0
  const discountPrice = hasDiscount ? Number(painting.discount_price_bdt) : basePrice
  const framePrice = selectedFrame ? Number(selectedFrame.price_bdt) || 0 : 0
  
  const totalPriceBdt = discountPrice + framePrice
  const originalTotalPriceBdt = basePrice + framePrice

  const isAvailable = painting.availability_status === 'available'
  
  // WhatsApp Generation
  const generateWhatsAppLink = () => {
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '')
    const baseUrl = `https://wa.me/${cleanNumber}`
    const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/gallery/${painting.slug}` : `https://kcg-gray.vercel.app/gallery/${painting.slug}`
    
    let message = `Hello Kazi Canvas Gallery,\n\nI would like to inquire about purchasing this artwork.\n\n`
    message += `Painting: ${painting.title}\n`
    message += `Medium: ${painting.exact_medium}\n`
    message += `Size: ${painting.width} x ${painting.height} cm\n`

    if (hasDiscount) {
      message += `Original Price: ${basePrice.toLocaleString('en-BD')} BDT\n`
      message += `Offer Price: ${discountPrice.toLocaleString('en-BD')} BDT (${painting.offer_badge || 'Discount Offer'})\n`
    } else {
      message += `Artwork Price: ${basePrice.toLocaleString('en-BD')} BDT\n`
    }
    
    if (selectedFrame) {
      message += `Framing: ${selectedFrame.frame_name} (${selectedFrame.outer_size || 'Custom Size'})\n`
      message += `Frame Price: +${framePrice.toLocaleString('en-BD')} BDT\n`
    } else {
      message += `Framing: Unframed (Canvas Only)\n`
    }
    
    message += `Total Amount: ${totalPriceBdt.toLocaleString('en-BD')} BDT`
    if (currency !== 'BDT') {
      message += ` (~ ${convertCurrency(totalPriceBdt, currency, rates)} ${currency})\n`
    } else {
      message += `\n`
    }
    
    message += `\nLink: ${productUrl}\n\nPlease confirm availability and delivery timeframe. Thank you!`
    
    return `${baseUrl}?text=${encodeURIComponent(message)}`
  }

  const activeImage = images?.[activeImageIndex] || images?.[0]
  const activeImageUrl = getPaintingImageUrl(activeImage?.storage_key)

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
      
      {/* LEFT COL: Image gallery */}
      <div>
        {/* Thumbnails */}
        {images && images.length > 1 && (
          <div className="mb-4 overflow-x-auto pb-2">
            <div className="flex space-x-3">
              {images.map((img, idx) => {
                const thumbUrl = getPaintingImageUrl(img.storage_key)
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
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="w-full aspect-[3/4] sm:aspect-[4/5] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-lg relative group">
          <Image
            key={activeImageUrl}
            src={activeImageUrl}
            alt={painting.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-center transition-all duration-500 group-hover:scale-105"
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
        </div>
      </div>

      {/* RIGHT COL: Painting info & interactivity */}
      <div className="flex flex-col gap-y-8 mt-10 lg:mt-0">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{painting.title}</h1>
            
            <select 
              value={currency} 
              onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-black focus:ring-black"
            >
              {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <p className="mt-2 text-sm text-gray-500 capitalize">{painting.painting_type} &middot; {painting.exact_medium}</p>
          <p className="mt-1 text-sm text-gray-500">Size: {painting.width} x {painting.height} cm</p>
        </div>

        <div className="prose prose-sm text-gray-700">
          <p>{painting.description || 'No description provided.'}</p>
        </div>

        {/* Framing Options */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900">Framing Options</h3>
          <div className="mt-4 space-y-4">
            <label className={`block border p-4 rounded-lg cursor-pointer transition-colors ${selectedFrameId === 'none' ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="radio" name="frame" value="none" checked={selectedFrameId === 'none'} onChange={() => setSelectedFrameId('none')} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                  <span className="ml-3 font-medium text-gray-900">Painting Only (Unframed)</span>
                </div>
                <span className="text-gray-900">Included</span>
              </div>
            </label>
            
            {frames.map((frame) => (
              <label key={frame.id} className={`block border p-4 rounded-lg cursor-pointer transition-colors ${selectedFrameId === frame.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input type="radio" name="frame" value={frame.id} checked={selectedFrameId === frame.id} onChange={() => setSelectedFrameId(frame.id)} className="h-4 w-4 text-black focus:ring-black border-gray-300" />
                    <div className="ml-3">
                      <span className="block font-medium text-gray-900">{frame.frame_name}</span>
                      <span className="block text-sm text-gray-500">Outer Size: {frame.outer_size || 'N/A'}</span>
                    </div>
                  </div>
                  <span className="text-gray-900 font-medium">
                    + {convertCurrency(frame.price_bdt, currency, rates)} {currency}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Total Price & Offer Details */}
        <div className="border-t border-gray-200 pt-6 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Price</p>
            <div className="flex items-baseline gap-3 mt-1">
              {hasDiscount && (
                <span className="text-xl font-normal text-gray-400 line-through">
                  {convertCurrency(originalTotalPriceBdt, currency, rates)}
                </span>
              )}
              <p className={`text-3xl font-bold ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                {convertCurrency(totalPriceBdt, currency, rates)} <span className="text-xl font-normal text-gray-500">{currency}</span>
              </p>
            </div>
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
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-8 py-4 text-base font-medium text-white shadow-lg hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Buy Now via WhatsApp
            </a>
          ) : (
            <button
              disabled
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-gray-300 px-8 py-4 text-base font-medium text-gray-500 cursor-not-allowed uppercase tracking-wider"
            >
              {painting.availability_status}
            </button>
          )}
          
          {painting.availability_status === 'reserved' && (
            <a href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm text-gray-600 hover:underline">
              Check Availability on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
