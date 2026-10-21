'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getPaintingImageUrl } from '@/utils/image'

export interface ArtworkImageItem {
  id?: string
  storage_key?: string
  processed_key?: string
  thumbnail_key?: string
  responsive_urls?: Record<string, string> | any
  is_main?: boolean
  alt_text?: string
  archived_at?: string | null
}

interface ArtworkImageSliderProps {
  images: ArtworkImageItem[]
  title: string
  href?: string
  aspectRatio?: number
  priority?: boolean
  sizes?: string
  className?: string
  children?: React.ReactNode // Badges or overlays
  onImageChange?: (index: number) => void
  controlledIndex?: number
  showDots?: boolean
  showArrows?: boolean
  showCounter?: boolean
}

export default function ArtworkImageSlider({
  images = [],
  title,
  href,
  aspectRatio = 0.8,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  className = '',
  children,
  onImageChange,
  controlledIndex,
  showDots = true,
  showArrows = true,
  showCounter = true,
}: ArtworkImageSliderProps) {
  // Filter active images (exclude archived ones if archived_at is present)
  const activeImages = images.filter((img) => !img.archived_at)
  const displayImages = activeImages.length > 0 ? activeImages : images

  // Initial index should prefer is_main image
  const defaultInitial = displayImages.findIndex((img) => img.is_main)
  const [internalIndex, setInternalIndex] = useState(defaultInitial >= 0 ? defaultInitial : 0)

  // Use controlled index if passed, otherwise internal state
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex

  // Track swipe touch coordinates
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const isSwiping = useRef<boolean>(false)
  const justSwipedRef = useRef<boolean>(false)
  const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalImages = displayImages.length
  const hasMultipleImages = totalImages > 1

  const goToPrevious = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      const next = currentIndex === 0 ? totalImages - 1 : currentIndex - 1
      setInternalIndex(next)
      onImageChange?.(next)
    },
    [currentIndex, totalImages, onImageChange]
  )

  const goToNext = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      const next = currentIndex === totalImages - 1 ? 0 : currentIndex + 1
      setInternalIndex(next)
      onImageChange?.(next)
    },
    [currentIndex, totalImages, onImageChange]
  )

  const goToIndex = useCallback(
    (index: number, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      setInternalIndex(index)
      onImageChange?.(index)
    },
    [onImageChange]
  )

  // Keyboard navigation when slider has focus
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasMultipleImages) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goToNext()
      }
    },
    [hasMultipleImages, goToPrevious, goToNext]
  )

  // Touch Swipe Handlers (Optimized to not hijack vertical page scroll)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = null
    isSwiping.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!hasMultipleImages || touchStartX.current === null || touchStartY.current === null) return
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY

    const diffX = touchStartX.current - currentX
    const diffY = touchStartY.current - currentY

    // If user is predominantly moving horizontally, flag as swiping
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwiping.current = true
    }
    touchEndX.current = currentX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleImages || touchStartX.current === null || touchEndX.current === null) {
      touchStartX.current = null
      touchStartY.current = null
      touchEndX.current = null
      return
    }

    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 35 // Threshold for valid swipe in px

    if (isSwiping.current && Math.abs(distance) >= minSwipeDistance) {
      e.stopPropagation()
      justSwipedRef.current = true
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current)
      swipeTimeoutRef.current = setTimeout(() => {
        justSwipedRef.current = false
      }, 350)

      if (distance > 0) {
        // Swiped Left -> Next
        goToNext()
      } else {
        // Swiped Right -> Previous
        goToPrevious()
      }
    }

    touchStartX.current = null
    touchStartY.current = null
    touchEndX.current = null
    isSwiping.current = false
  }

  const currentImage = displayImages[currentIndex] || displayImages[0]
  
  // Prefer 1000w responsive variant or thumbnail for cards
  const imageKey =
    currentImage?.responsive_urls?.['1000'] ||
    currentImage?.responsive_urls?.['1600'] ||
    currentImage?.thumbnail_key ||
    currentImage?.storage_key ||
    currentImage?.processed_key

  const imageUrl = getPaintingImageUrl(imageKey)

  // Ensure safe numerical aspect ratio
  const validAspect = typeof aspectRatio === 'number' && aspectRatio > 0 ? aspectRatio : 0.8

  return (
    <div
      tabIndex={hasMultipleImages ? 0 : undefined}
      role={hasMultipleImages ? 'region' : undefined}
      aria-label={hasMultipleImages ? `${title} image gallery` : undefined}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClickCapture={(e) => {
        if (justSwipedRef.current) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
      className={`group/slider relative w-full overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${className}`}
      style={{
        aspectRatio: `${validAspect}`,
      }}
    >
      {/* ── Artwork Image (Wrapped with Link if href provided) ── */}
      {imageUrl ? (
        href ? (
          <Link
            href={href}
            className="absolute inset-0 z-0 block cursor-pointer"
            aria-label={`View ${title}`}
            onClick={(e) => {
              if (justSwipedRef.current) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
          >
            <Image
              key={imageKey || currentIndex}
              src={imageUrl}
              alt={currentImage?.alt_text || `${title} - Preview ${currentIndex + 1}`}
              fill
              sizes={sizes}
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              className="object-cover object-center transition-transform duration-700 ease-out will-change-transform"
            />
          </Link>
        ) : (
          <Image
            key={imageKey || currentIndex}
            src={imageUrl}
            alt={currentImage?.alt_text || `${title} - Preview ${currentIndex + 1}`}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover object-center transition-transform duration-700 ease-out will-change-transform"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs font-light">
          No image available
        </div>
      )}

      {/* ── Injected Overlays / Badges ── */}
      {children}

      {/* ── Multi-Image Controls & Indicators (Rendered ONLY when multiple images exist) ── */}
      {hasMultipleImages && (
        <>
          {/* Subtle Slide Counter Badge (Top-Right) */}
          {showCounter && (
            <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider bg-black/60 text-white/95 backdrop-blur-md shadow-2xs">
                {currentIndex + 1} / {totalImages}
              </span>
            </div>
          )}

          {/* Previous Arrow Button */}
          {showArrows && (
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous artwork image"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/90 text-gray-900 border border-black/5 shadow-sm backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/slider:opacity-100 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:opacity-100"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
            </button>
          )}

          {/* Next Arrow Button */}
          {showArrows && (
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next artwork image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/90 text-gray-900 border border-black/5 shadow-sm backdrop-blur-md flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover/slider:opacity-100 hover:bg-white hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:opacity-100"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
            </button>
          )}

          {/* Modern Pagination Dots (Bottom-Center) */}
          {showDots && (
            <div
              className="absolute bottom-2.5 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none"
              role="tablist"
              aria-label="Artwork image dots"
            >
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md pointer-events-auto">
                {displayImages.map((_, dotIdx) => {
                  const isActive = dotIdx === currentIndex
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Go to image ${dotIdx + 1} of ${totalImages}`}
                      onClick={(e) => goToIndex(dotIdx, e)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        isActive
                          ? 'w-4 h-1.5 bg-white shadow-xs'
                          : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
