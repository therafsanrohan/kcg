'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Check, RefreshCw } from 'lucide-react'

interface ImageCropperModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedBlob: Blob, cropData: { x: number; y: number; zoom: number; rotation: number; mode: 'fill' | 'fit' }) => void
  initialCrop?: { x: number; y: number; zoom: number; rotation: number; mode: 'fill' | 'fit' }
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  initialCrop,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1)
  const [rotation, setRotation] = useState(initialCrop?.rotation ?? 0)
  const [offset, setOffset] = useState({ x: initialCrop?.x ?? 0, y: initialCrop?.y ?? 0 })
  const [mode, setMode] = useState<'fill' | 'fit'>(initialCrop?.mode ?? 'fill')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialCrop) {
      setZoom(initialCrop.zoom)
      setRotation(initialCrop.rotation)
      setOffset({ x: initialCrop.x, y: initialCrop.y })
      setMode(initialCrop.mode)
    } else {
      setZoom(1)
      setRotation(0)
      setOffset({ x: 0, y: 0 })
      setMode('fill')
    }
  }, [initialCrop, imageSrc, isOpen])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setOffset({ x: 0, y: 0 })
    setMode('fill')
  }

  const generateCrop = useCallback(async () => {
    if (!imageRef.current) return
    setIsProcessing(true)

    try {
      const img = imageRef.current
      const canvas = document.createElement('canvas')
      
      // Target 4:5 aspect ratio derivative for gallery cards (e.g. 960x1200)
      const targetWidth = 960
      const targetHeight = 1200
      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Fill background
      ctx.fillStyle = '#F5F4F0'
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      ctx.save()

      // Center transformations
      ctx.translate(targetWidth / 2, targetHeight / 2)
      ctx.rotate((rotation * Math.PI) / 180)

      // Calculate drawing scale based on mode
      let baseScale = 1
      if (mode === 'fill') {
        baseScale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight)
      } else {
        baseScale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight)
      }

      const finalScale = baseScale * zoom
      const drawWidth = img.naturalWidth * finalScale
      const drawHeight = img.naturalHeight * finalScale

      // Apply drag offset scaled to target canvas resolution
      const scaledOffsetX = (offset.x / (containerRef.current?.clientWidth || 300)) * targetWidth
      const scaledOffsetY = (offset.y / (containerRef.current?.clientHeight || 400)) * targetHeight

      ctx.drawImage(
        img,
        -drawWidth / 2 + scaledOffsetX,
        -drawHeight / 2 + scaledOffsetY,
        drawWidth,
        drawHeight
      )

      ctx.restore()

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false)
          if (blob) {
            onCropComplete(blob, {
              x: offset.x,
              y: offset.y,
              zoom,
              rotation,
              mode,
            })
            onClose()
          }
        },
        'image/webp',
        0.92
      )
    } catch (err) {
      console.error('Cropping error:', err)
      setIsProcessing(false)
    }
  }, [imageSrc, offset, zoom, rotation, mode, onCropComplete, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-lg text-gray-950">Crop & Position Artwork</h3>
            <p className="text-xs text-gray-500 font-light">4:5 Gallery Aspect Ratio Preview</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport Canvas (4:5 ratio) */}
        <div className="p-6 flex-1 flex items-center justify-center bg-gray-950 overflow-hidden">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-64 h-[320px] sm:w-72 sm:h-[360px] rounded-2xl overflow-hidden bg-[#F5F4F0] border-2 border-white/20 shadow-2xl cursor-grab active:cursor-grabbing select-none"
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {/* eslint-disable-next-html-element-is-necessary */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className={`max-w-none ${mode === 'fill' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}`}
                draggable={false}
              />
            </div>

            {/* Subtle Grid Overlay */}
            <div className="absolute inset-0 border border-white/30 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 space-y-4 bg-white border-t border-gray-100">
          {/* Mode Switcher */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setMode('fill')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'fill' ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fill Frame (Cover)
            </button>
            <button
              type="button"
              onClick={() => setMode('fit')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'fit' ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Fit Artwork (Contain)
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-gray-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <ZoomIn className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-mono font-bold text-gray-700 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={generateCrop}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
