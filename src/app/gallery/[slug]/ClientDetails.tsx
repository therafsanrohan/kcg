'use client'

import { useState, useEffect } from 'react'
import { FrameOption } from '@/types'
import { SUPPORTED_CURRENCIES, Currency, convertCurrency } from '@/utils/currency'

interface PaintingData {
  id: string
  title: string
  slug: string
  painting_type: string
  exact_medium: string
  width: number
  height: number
  base_price_bdt: number
  availability_status: string
  description: string
}

export default function ClientDetails({ 
  painting, 
  frames, 
  rates 
}: { 
  painting: PaintingData
  frames: FrameOption[]
  rates: Record<string, number>
}) {
  const [currency, setCurrency] = useState<Currency>('BDT')
  const [selectedFrameId, setSelectedFrameId] = useState<string>('none')
  
  // Persist currency preference
  useEffect(() => {
    const saved = localStorage.getItem('preferredCurrency') as Currency
    if (saved && SUPPORTED_CURRENCIES.includes(saved)) {
      setCurrency(saved)
    }
  }, [])

  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c)
    localStorage.setItem('preferredCurrency', c)
  }

  const selectedFrame = frames.find(f => f.id === selectedFrameId)
  const basePrice = painting.base_price_bdt
  const framePrice = selectedFrame ? selectedFrame.price_bdt : 0
  const totalPriceBdt = basePrice + framePrice

  const isAvailable = painting.availability_status === 'available'
  
  // WhatsApp Generation
  const generateWhatsAppLink = () => {
    const baseUrl = 'https://wa.me/8801824951514'
    const productUrl = `${window.location.origin}/gallery/${painting.slug}`
    
    let message = `Hello Kazi Canvas Gallery,\n\nI would like to purchase this painting.\n\n`
    message += `Painting: ${painting.title}\n`
    message += `Reference: ${painting.id.split('-')[0]}\n`
    message += `Medium: ${painting.exact_medium}\n`
    message += `Painting size: ${painting.width}x${painting.height} cm\n`
    message += `Painting price: ${basePrice} BDT\n`
    
    if (selectedFrame) {
      message += `Frame: ${selectedFrame.frame_name}\n`
      message += `Frame size: ${selectedFrame.outer_size || 'N/A'}\n`
      message += `Frame price: ${framePrice} BDT\n`
    } else {
      message += `Frame: Painting only (Unframed)\n`
    }
    
    message += `Total: ${totalPriceBdt} BDT`
    if (currency !== 'BDT') {
      message += ` (Approx. ${convertCurrency(totalPriceBdt, currency, rates)} ${currency})\n`
    } else {
      message += `\n`
    }
    
    message += `Product link: ${productUrl}\n\nPlease confirm availability and delivery details.`
    
    return `${baseUrl}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="flex flex-col gap-y-8">
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

      <div className="border-t border-gray-200 pt-6 flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-500">Total Price</p>
          <p className="text-3xl font-bold text-gray-900">
            {convertCurrency(totalPriceBdt, currency, rates)} <span className="text-xl font-normal text-gray-500">{currency}</span>
          </p>
          {currency !== 'BDT' && (
            <p className="text-xs text-gray-400 mt-1">Final payment will be confirmed in BDT ({totalPriceBdt.toLocaleString()} BDT).</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isAvailable ? (
          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-8 py-4 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
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
          <a href="https://wa.me/8801824951514" target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm text-gray-600 hover:underline">
            Check Availability on WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
