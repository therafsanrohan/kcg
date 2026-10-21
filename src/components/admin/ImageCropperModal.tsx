'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Check, RefreshCw } from 'lucide-react'

export type CropperAspectRatioPreset = 'original' | 'portrait' | 'landscape' | 'square' | 'custom'

interface ImageCropperModalProps {
  isOpen: boolean
  imageSrc: string
  onClose: () => void
  onCropComplete: (
    croppedBlob: Blob,
    cropData: {
      x: number
      y: number
      zoom: number
      rotation: number
      mode: 'fill' | 'fit'
      aspectRatio: number
      orientation?: 'portrait' | 'landscape' | 'square' | 'custom'
    }
  ) => void
  initialCrop?: { x: number; y: number; zoom: number; rotation: number; mode: 'fill' | 'fit'; aspectRatio?: number }
  defaultAspectRatio?: number
  defaultOrientation?: 'portrait' | 'landscape' | 'square' | 'custom'
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  initialCrop,
  defaultAspectRatio,
  defaultOrientation,
}: ImageCropperModalProps) {
  const [mounted, setMounted] = useState(false)
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? 1)
  const [rotation, setRotation] = useState(initialCrop?.rotation ?? 0)
  const [offset, setOffset] = useState({ x: initialCrop?.x ?? 0, y: initialCrop?.y ?? 0 })
  const [mode, setMode] = useState<'fill' | 'fit'>(initialCrop?.mode ?? 'fill')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Ratio preset selection
  const [aspectPreset, setAspectPreset] = useState<CropperAspectRatioPreset>(() => {
    if (defaultOrientation) return defaultOrientation
    if (defaultAspectRatio) {
      if (Math.abs(defaultAspectRatio - 0.8) < 0.05) return 'portrait'
      if (Math.abs(defaultAspectRatio - 1) < 0.05) return 'square'
      if (Math.abs(defaultAspectRatio - 1.25) < 0.05 || defaultAspectRatio > 1.1) return 'landscape'
    }
    return 'original'
  })

  const [activeAspectRatio, setActiveAspectRatio] = useState<number>(defaultAspectRatio || 0.8)

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

  // Sync with defaultOrientation if prop changes
  useEffect(() => {
    if (defaultOrientation && !initialCrop) {
      setAspectPreset(defaultOrientation)
      if (defaultOrientation === 'portrait') setActiveAspectRatio(0.8)
      else if (defaultOrientation === 'landscape') setActiveAspectRatio(1.25)
      else if (defaultOrientation === 'square') setActiveAspectRatio(1.0)
      else if (defaultOrientation === 'custom' && defaultAspectRatio) setActiveAspectRatio(defaultAspectRatio)
    }
  }, [defaultOrientation, defaultAspectRatio, isOpen, initialCrop])

  const [naturalAspect, setNaturalAspect] = useState<number>(1)

  const handleImageLoad = () => {
    if (imageRef.current) {
      const nw = imageRef.current.naturalWidth
      const nh = imageRef.current.naturalHeight
      if (nw > 0 && nh > 0) {
        const nat = nw / nh
        setNaturalAspect(nat)

        // Automatically capture whether image is portrait, landscape, or square!
        if (!initialCrop) {
          if (Math.abs(nat - 1) <= 0.08) {
            setAspectPreset('square')
            setActiveAspectRatio(1.0)
          } else if (nat > 1.05) {
            setAspectPreset('landscape')
            setActiveAspectRatio(1.25)
          } else {
            setAspectPreset('portrait')
            setActiveAspectRatio(0.8)
          }
        } else if (aspectPreset === 'original') {
          setActiveAspectRatio(nat)
        }
      }
    }
  }

  // Handle preset change
  const handlePresetSelect = (preset: CropperAspectRatioPreset) => {
    setAspectPreset(preset)
    if (preset === 'original') {
      setActiveAspectRatio(naturalAspect)
    } else if (preset === 'portrait') {
      setActiveAspectRatio(0.8) // 4:5
    } else if (preset === 'landscape') {
      setActiveAspectRatio(1.25) // 5:4 or 4:3
    } else if (preset === 'square') {
      setActiveAspectRatio(1.0)
    } else if (preset === 'custom') {
      setActiveAspectRatio(defaultAspectRatio || naturalAspect)
    }
  }

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
      
      // Calculate target canvas dimensions respecting active aspect ratio
      const baseDim = 1200
      let targetWidth = baseDim
      let targetHeight = baseDim

      if (activeAspectRatio >= 1) {
        targetWidth = Math.round(baseDim * activeAspectRatio)
        targetHeight = baseDim
      } else {
        targetWidth = baseDim
        targetHeight = Math.round(baseDim / (activeAspectRatio || 0.8))
      }

      // Bound max canvas dimension to 2400 for memory and performance safety
      if (targetWidth > 2400 || targetHeight > 2400) {
        const factor = 2400 / Math.max(targetWidth, targetHeight)
        targetWidth = Math.round(targetWidth * factor)
        targetHeight = Math.round(targetHeight * factor)
      }

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
      const containerWidth = containerRef.current?.clientWidth || 300
      const containerHeight = containerRef.current?.clientHeight || 300
      const scaledOffsetX = (offset.x / containerWidth) * targetWidth
      const scaledOffsetY = (offset.y / containerHeight) * targetHeight

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
              aspectRatio: activeAspectRatio,
              orientation:
                aspectPreset === 'portrait'
                  ? 'portrait'
                  : aspectPreset === 'landscape'
                  ? 'landscape'
                  : aspectPreset === 'square'
                  ? 'square'
                  : 'custom',
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
  }, [imageRef, activeAspectRatio, aspectPreset, offset, zoom, rotation, mode, onCropComplete, onClose])

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  // Calculate container display box style based on activeAspectRatio
  const containerStyle: React.CSSProperties = {
    aspectRatio: `${activeAspectRatio}`,
    maxHeight: 'min(30vh, 260px)',
    maxWidth: '100%',
    width: activeAspectRatio >= 1 ? 'min(100%, 320px)' : `min(100%, calc(min(30vh, 260px) * ${activeAspectRatio}))`,
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-fade-in overflow-y-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl flex flex-col my-auto overflow-hidden"
        style={{ maxHeight: 'min(92vh, 680px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-sans font-bold text-base sm:text-lg text-gray-950">Crop & Position Artwork</h3>
            <p className="text-[11px] sm:text-xs text-gray-500 font-light">
              Multi-Orientation Aspect Ratio: {aspectPreset.toUpperCase()} ({activeAspectRatio.toFixed(2)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Orientation Aspect Ratio Tabs */}
        <div className="px-5 pt-2 pb-2 sm:px-6 sm:pt-2.5 sm:pb-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {(['original', 'portrait', 'landscape', 'square', 'custom'] as CropperAspectRatioPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                aspectPreset === preset
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
              }`}
            >
              {preset === 'portrait' ? 'Portrait (4:5)' : preset === 'landscape' ? 'Landscape (5:4)' : preset === 'square' ? 'Square (1:1)' : preset}
            </button>
          ))}
        </div>

        {/* Viewport Canvas */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 flex items-center justify-center bg-gray-950 overflow-hidden">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={containerStyle}
            className="relative rounded-2xl overflow-hidden bg-[#F5F4F0] border-2 border-white/20 shadow-2xl cursor-grab active:cursor-grabbing select-none"
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
                onLoad={handleImageLoad}
                className={`max-w-none ${mode === 'fill' ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'}`}
                draggable={false}
              />
            </div>

            {/* Rule-of-Thirds Grid Overlay */}
            <div className="absolute inset-0 border border-white/30 pointer-events-none grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 bg-white border-t border-gray-100 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMode('fill')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'fill' ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fill Frame (Cover)
            </button>
            <button
              type="button"
              onClick={() => setMode('fit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'fit' ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Fit Artwork (Contain)
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ZoomOut className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-gray-700 w-10 text-right shrink-0">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1 sm:pt-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate 90°
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={generateCrop}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
