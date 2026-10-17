'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { FrameOption } from '@/types'
import {
  MeasurementUnit,
  calculateDimensions,
  calculateFramedDimensions,
  formatDimensions,
  toCanonicalMm,
} from '@/utils/measurements'
import { Ruler, Sparkles } from 'lucide-react'

interface ArtworkFramePreviewProps {
  imageUrl?: string | null
  title: string
  widthMm: number
  heightMm: number
  selectedFrame?: FrameOption | null
  displayUnit?: MeasurementUnit
  className?: string
}

export default function ArtworkFramePreview({
  imageUrl,
  title,
  widthMm,
  heightMm,
  selectedFrame,
  displayUnit = 'in',
  className = '',
}: ArtworkFramePreviewProps) {
  const [showTechnicalSpecs, setShowTechnicalSpecs] = useState(false)

  // Derived measurements
  const dims = calculateDimensions(widthMm, heightMm)
  const isFramed = Boolean(selectedFrame && selectedFrame.id !== 'none')

  // Proportional frame border thickness estimation:
  // If outer dimensions are provided, border = (outer - art) / 2
  // Default aesthetically standard border: 38.1 mm (1.5 in)
  const defaultBorderMm = 38.1
  let frameBorderMm = isFramed ? defaultBorderMm : 0

  if (isFramed && selectedFrame?.outer_width_mm && selectedFrame.outer_width_mm > widthMm) {
    frameBorderMm = Math.max(10, (selectedFrame.outer_width_mm - widthMm) / 2)
  }

  const { framedWidthMm, framedHeightMm } = calculateFramedDimensions(
    widthMm,
    heightMm,
    frameBorderMm
  )

  // Calculate relative aspect ratio for preview container
  const containerAspect = dims.aspectRatio > 0 ? dims.aspectRatio : 0.8
  const formattedArtSize = formatDimensions(widthMm, heightMm, displayUnit)
  const formattedFramedSize = formatDimensions(framedWidthMm, framedHeightMm, displayUnit)

  // Color & texture style mapping based on frame name
  const frameName = selectedFrame?.frame_name?.toLowerCase() || ''
  let frameBorderColor = '#2B231D' // deep dark walnut / shadowbox
  let frameBg = '#3D312A'

  if (frameName.includes('oak') || frameName.includes('teak') || frameName.includes('wood')) {
    frameBorderColor = '#C19A6B' // natural oak / warm teak
    frameBg = '#D2B48C'
  } else if (frameName.includes('gold') || frameName.includes('champagne')) {
    frameBorderColor = '#D4AF37' // luxury gold
    frameBg = '#E6CA65'
  } else if (frameName.includes('white')) {
    frameBorderColor = '#ECEAE4' // gallery minimalist white
    frameBg = '#F8F7F4'
  } else if (frameName.includes('charcoal') || frameName.includes('black')) {
    frameBorderColor = '#1A1A1A' // contemporary matte black
    frameBg = '#222222'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Visual Frame & Canvas Unified Container ── */}
      <div className="relative w-full rounded-2xl bg-[#EFECE6] p-6 sm:p-10 flex items-center justify-center overflow-hidden border border-gray-200/80 shadow-inner">
        {/* Gallery Wall Shadow / Lighting Effect */}
        <div className="absolute inset-0 bg-radial from-transparent to-black/5 pointer-events-none" />

        {/* Framing & Artwork Coordinate Container */}
        <div
          className="relative transition-all duration-300 w-full flex items-center justify-center"
          style={{
            aspectRatio: `${containerAspect}`,
            maxWidth: containerAspect >= 1 ? '100%' : `${Math.min(540, Math.round(520 * containerAspect))}px`,
            padding: isFramed ? '16px' : '0px',
            backgroundColor: isFramed ? frameBg : 'transparent',
            borderColor: isFramed ? frameBorderColor : 'transparent',
            borderWidth: isFramed ? '6px' : '0px',
            borderStyle: isFramed ? 'solid' : 'none',
            boxShadow: isFramed
              ? '0 20px 40px -15px rgba(0,0,0,0.35), 0 0 10px rgba(0,0,0,0.1) inset'
              : '0 15px 30px -10px rgba(0,0,0,0.2)',
          }}
        >
          {/* Inner Canvas Image */}
          <div className="relative w-full h-full bg-[#E5E2DC] rounded-sm overflow-hidden shadow-2xs">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center select-none"
                priority
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
                <Ruler className="w-8 h-8 mb-2 stroke-1" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  Artwork Canvas
                </span>
                <span className="text-[11px] mt-1">{formattedArtSize}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Dimension Overlay Badge */}
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>
            {isFramed ? `Framed: ${formattedFramedSize}` : `Artwork: ${formattedArtSize}`}
          </span>
        </div>
      </div>

      {/* ── Derived Spec Information & Toggle ── */}
      <div className="bg-white border border-gray-200/90 rounded-xl p-4 text-xs space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-gray-700" />
            <span className="font-semibold text-gray-900 uppercase tracking-wider text-[11px]">
              Geometric Measurements & Specs
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTechnicalSpecs(!showTechnicalSpecs)}
            className="text-[11px] font-medium text-gray-500 hover:text-black transition-colors underline cursor-pointer"
          >
            {showTechnicalSpecs ? 'Hide details' : 'View full specs'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 text-gray-700">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Artwork Size</span>
            <span className="font-mono font-medium text-gray-950">{formattedArtSize}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Orientation</span>
            <span className="font-medium capitalize text-gray-950">{dims.orientation}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Surface Area</span>
            <span className="font-mono font-medium text-gray-950">
              {dims.areaSqFt.toFixed(2)} sq ft ({dims.areaSqIn.toFixed(0)} sq in)
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-gray-400">Final Framing</span>
            <span className="font-mono font-medium text-gray-950">
              {isFramed ? formattedFramedSize : 'Canvas Only'}
            </span>
          </div>
        </div>

        {showTechnicalSpecs && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-gray-600 bg-gray-50/70 p-3 rounded-lg">
            <div>
              <span className="block text-[9px] text-gray-400">Metric Area:</span>
              <span>{dims.areaSqM.toFixed(3)} m² ({dims.areaSqCm.toFixed(0)} cm²)</span>
            </div>
            <div>
              <span className="block text-[9px] text-gray-400">Perimeter:</span>
              <span>{(dims.perimeterMm / 10).toFixed(1)} cm</span>
            </div>
            <div>
              <span className="block text-[9px] text-gray-400">Frame Border Width:</span>
              <span>{isFramed ? `${(frameBorderMm / 25.4).toFixed(1)} in (${frameBorderMm.toFixed(0)} mm)` : '0 in'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-gray-400">Aspect Ratio:</span>
              <span>{dims.aspectRatio.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
