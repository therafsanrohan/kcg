'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Upload, Trash2, Crop, Star, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import ImageCropperModal from './ImageCropperModal'
import { getPaintingImageUrl } from '@/utils/image'

export interface ImageItem {
  id: string
  file?: File
  storage_key: string
  previewUrl: string
  is_main: boolean
  sort_order: number
  cropData?: { x: number; y: number; zoom: number; rotation: number; mode: 'fill' | 'fit' }
  croppedBlob?: Blob
}

interface MultiImageManagerProps {
  initialImages?: any[]
  onChange: (images: ImageItem[]) => void
}

export default function MultiImageManager({ initialImages = [], onChange }: MultiImageManagerProps) {
  const [images, setImages] = useState<ImageItem[]>(() => {
    if (!initialImages || initialImages.length === 0) return []
    return initialImages.map((img, idx) => ({
      id: img.id || `init-${idx}-${Date.now()}`,
      storage_key: img.storage_key,
      previewUrl: getPaintingImageUrl(img.storage_key),
      is_main: img.is_main ?? idx === 0,
      sort_order: img.sort_order ?? idx,
    }))
  })

  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null)

  const updateImagesList = (newItems: ImageItem[]) => {
    // Ensure at least one image is main
    let items = [...newItems]
    if (items.length > 0 && !items.some((img) => img.is_main)) {
      items[0].is_main = true
    }
    // Re-index sort order
    items = items.map((img, idx) => ({ ...img, sort_order: idx }))
    setImages(items)
    onChange(items)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const selectedFiles = Array.from(e.target.files)
    const availableSlots = 5 - images.length

    if (availableSlots <= 0) {
      alert('Maximum 5 images allowed per artwork.')
      return
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots)
    const newItems: ImageItem[] = filesToUpload.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      file,
      storage_key: '',
      previewUrl: URL.createObjectURL(file),
      is_main: images.length === 0 && idx === 0,
      sort_order: images.length + idx,
    }))

    updateImagesList([...images, ...newItems])
    e.target.value = ''
  }

  const handleSetMain = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      is_main: idx === index,
    }))
    updateImagesList(updated)
  }

  const handleRemove = (index: number) => {
    if (images.length === 1) {
      alert('At least 1 image is required for an artwork.')
      return
    }
    const updated = images.filter((_, idx) => idx !== index)
    updateImagesList(updated)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= images.length) return

    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp

    updateImagesList(updated)
  }

  const handleCropComplete = (croppedBlob: Blob, cropData: any) => {
    if (activeCropIndex === null || !images[activeCropIndex]) return

    const croppedPreviewUrl = URL.createObjectURL(croppedBlob)
    const updated = [...images]
    updated[activeCropIndex] = {
      ...updated[activeCropIndex],
      previewUrl: croppedPreviewUrl,
      croppedBlob,
      cropData,
    }
    updateImagesList(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700">
            Artwork Images <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 font-light mt-0.5">
            Add 1 to 5 photos. First image is default cover. Crop to 4:5 gallery aspect ratio.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
          {images.length} / 5
        </span>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <div
            key={img.id}
            className={`relative rounded-2xl overflow-hidden bg-gray-100 border-2 transition-all group aspect-[3/4] flex flex-col justify-between ${
              img.is_main ? 'border-black ring-2 ring-black/20 shadow-md' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {/* Image Preview */}
            <div className="relative w-full h-full">
              <Image
                src={img.previewUrl}
                alt={`Artwork ${idx + 1}`}
                fill
                sizes="150px"
                className="object-cover object-center"
              />

              {/* Cover Badge */}
              {img.is_main ? (
                <div className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
                  <Star className="h-3 w-3 fill-yellow-400 stroke-none" />
                  Cover
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSetMain(idx)}
                  className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs text-gray-800 hover:bg-black hover:text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors z-10 opacity-0 group-hover:opacity-100"
                >
                  Set Cover
                </button>
              )}

              {/* Controls Hover Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCropIndex(idx)}
                    title="Crop image (4:5)"
                    className="h-7 w-7 rounded-lg bg-white/90 text-black hover:bg-white flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                  >
                    <Crop className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    title="Remove image"
                    className="h-7 w-7 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Move Order Buttons */}
                <div className="flex items-center justify-center gap-2">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      title="Move left"
                      className="h-7 w-7 rounded-lg bg-white/90 text-black hover:bg-white flex items-center justify-center shadow-xs"
                    >
                      <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  )}
                  {idx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      title="Move right"
                      className="h-7 w-7 rounded-lg bg-white/90 text-black hover:bg-white flex items-center justify-center shadow-xs"
                    >
                      <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Upload Button Box if < 5 images */}
        {images.length < 5 && (
          <label className="relative rounded-2xl border-2 border-dashed border-gray-300 hover:border-black bg-gray-50 hover:bg-gray-100/50 aspect-[3/4] flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 mb-2">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-900">Add Photo</span>
            <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, WebP</span>
          </label>
        )}
      </div>

      {/* Cropper Modal */}
      {activeCropIndex !== null && images[activeCropIndex] && (
        <ImageCropperModal
          isOpen={activeCropIndex !== null}
          imageSrc={images[activeCropIndex].previewUrl}
          initialCrop={images[activeCropIndex].cropData}
          onClose={() => setActiveCropIndex(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
