'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import { UploadCloud, Crop, Check, Star, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import { getPaintingImageUrl } from '@/utils/image'

// Interface representing a single image's state during upload/cropping
export interface ManagedImage {
  id: string // local temporary ID
  file: File | null // The raw file
  previewUrl: string // Object URL for display
  storageKey?: string // Set after successful upload to master bucket
  isPrimary: boolean
  sortOrder: number
  // Crop data
  crop: { x: number; y: number }
  zoom: number
  croppedAreaPixels: any
  // Status
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  errorMessage?: string
}

interface ImageUploadManagerProps {
  paintingId: string
  existingImages?: any[]
  onUploadSuccess: (images: ManagedImage[]) => void
  onDeleteSavedImage?: (imageId: string) => Promise<boolean>
  onSetPrimarySavedImage?: (imageId: string) => Promise<boolean>
}

// User specified maximum 3 images per artwork
const MAX_IMAGES = 3
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function ImageUploadManager({
  paintingId,
  existingImages = [],
  onUploadSuccess,
  onDeleteSavedImage,
  onSetPrimarySavedImage,
}: ImageUploadManagerProps) {
  const { toast } = useAdminFeedback()
  const [images, setImages] = useState<ManagedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [cropModalImageId, setCropModalImageId] = useState<string | null>(null)

  // Local state for existing saved images (allows immediate removal upon confirmed deletion)
  const [savedImages, setSavedImages] = useState<any[]>(existingImages)

  // State for Safe Deletion Confirmation Modal
  const [deletingImage, setDeletingImage] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // State for setting primary saved image
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null)

  // For the active cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined) // undefined = free/original
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const totalImageCount = savedImages.length + images.length

  // Generate a safe local ID
  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files)

    // Check limits (strict 3 images max per artwork)
    if (totalImageCount + newFiles.length > MAX_IMAGES) {
      toast(`You can only have up to ${MAX_IMAGES} images per artwork. Currently you have ${totalImageCount}.`, 'warning')
      return
    }

    const newManagedImages: ManagedImage[] = newFiles
      .map((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`, 'warning')
        }
        return {
          id: generateId(),
          file: file,
          previewUrl: URL.createObjectURL(file),
          isPrimary: totalImageCount === 0 && images.length === 0, // First image is primary by default if none exist
          sortOrder: totalImageCount + images.length,
          crop: { x: 0, y: 0 },
          zoom: 1,
          croppedAreaPixels: null,
          status: 'idle' as const,
        }
      })
      .filter((img) => img.file && img.file.size <= MAX_FILE_SIZE_BYTES)

    if (newManagedImages.length > 0) {
      setImages((prev) => {
        const updated = [...prev, ...newManagedImages]
        // If there are no saved images and no primary selected, mark first as primary
        if (savedImages.length === 0 && !updated.find((img) => img.isPrimary)) {
          updated[0].isPrimary = true
        }
        return updated
      })
    }
  }

  // Remove pending unsaved image immediately
  const removePendingImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      const filtered = prev.filter((img) => img.id !== id)
      // Ensure one is primary if no saved images exist
      if (savedImages.length === 0 && filtered.length > 0 && !filtered.find((img) => img.isPrimary)) {
        filtered[0].isPrimary = true
      }
      return filtered
    })
  }

  const setPrimaryPending = (id: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    )
  }

  // Handle setting primary on a saved image
  const handleSetPrimarySaved = async (imageId: string) => {
    if (!onSetPrimarySavedImage) return
    try {
      setIsSettingPrimary(imageId)
      const success = await onSetPrimarySavedImage(imageId)
      if (success) {
        setSavedImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_main: img.id === imageId,
            primary_image: img.id === imageId,
          }))
        )
      }
    } finally {
      setIsSettingPrimary(null)
    }
  }

  // Trigger Safe Deletion confirmation modal
  const promptDeleteSavedImage = (image: any) => {
    setDeletingImage(image)
  }

  // Confirm and execute image deletion
  const handleConfirmDelete = async () => {
    if (!deletingImage || !onDeleteSavedImage || isDeleting) return

    try {
      setIsDeleting(true)
      const wasPrimary = Boolean(deletingImage.is_main || deletingImage.primary_image)
      const success = await onDeleteSavedImage(deletingImage.id)

      if (success) {
        setSavedImages((prev) => {
          const remaining = prev.filter((img) => img.id !== deletingImage.id)
          // If the deleted image was primary and there are remaining images, make first remaining primary
          if (wasPrimary && remaining.length > 0) {
            remaining[0].is_main = true
            remaining[0].primary_image = true
          }
          return remaining
        })
        setDeletingImage(null)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const openCropper = (id: string) => {
    const img = images.find((i) => i.id === id)
    if (img) {
      setCrop(img.crop)
      setZoom(img.zoom)
      setCropModalImageId(id)
    }
  }

  const saveCrop = () => {
    if (cropModalImageId) {
      setImages((prev) =>
        prev.map((img) => {
          if (img.id === cropModalImageId) {
            return {
              ...img,
              crop,
              zoom,
              croppedAreaPixels,
            }
          }
          return img
        })
      )
      setCropModalImageId(null)
    }
  }

  const handleUploadAndProcess = async () => {
    if (images.length === 0) return

    const updatedImages = [...images]

    // 1. Upload original files to Supabase
    for (let i = 0; i < updatedImages.length; i++) {
      const img = updatedImages[i]
      if (img.status === 'idle' && img.file) {
        updatedImages[i].status = 'uploading'
        setImages([...updatedImages])

        try {
          const fileExt = img.file.name.split('.').pop()
          const fileName = `${paintingId}/${Date.now()}_${img.id}.${fileExt}`

          const { data, error } = await supabase.storage
            .from('paintings_master')
            .upload(fileName, img.file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (error) throw error

          updatedImages[i].storageKey = data.path
          updatedImages[i].status = 'processing'
          setImages([...updatedImages])
        } catch (err: any) {
          updatedImages[i].status = 'error'
          updatedImages[i].errorMessage = err.message
          setImages([...updatedImages])
        }
      }
    }

    // 2. Call Server API to generate responsive variants
    try {
      const imagesToProcess = updatedImages.filter(
        (img) => img.status === 'processing' && img.storageKey
      )
      if (imagesToProcess.length > 0) {
        const response = await fetch('/api/images/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paintingId,
            images: imagesToProcess.map((img) => ({
              id: img.id,
              storageKey: img.storageKey,
              cropData: img.croppedAreaPixels,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to process images on server.')
        }

        const procResult = await response.json()
        const processedList = procResult.processed || []

        for (let i = 0; i < updatedImages.length; i++) {
          if (updatedImages[i].status === 'processing') {
            updatedImages[i].status = 'done'
            const matched = processedList.find((p: any) => p.id === updatedImages[i].id)
            if (matched) {
              updatedImages[i].storageKey = matched.displayKey || matched.storageKey
              ;(updatedImages[i] as any).originalKey = matched.originalKey
              ;(updatedImages[i] as any).thumbnailKey = matched.thumbnailKey
              ;(updatedImages[i] as any).responsiveUrls = matched.responsiveUrls
            }
          }
        }
        setImages([...updatedImages])

        onUploadSuccess(updatedImages)
      }
    } catch (err: any) {
      toast('Error during image processing: ' + err.message, 'error')
    }
  }

  // Active Cropper Image
  const activeCropImage = images.find((i) => i.id === cropModalImageId)

  return (
    <div className="space-y-6">
      {/* ── 1. EXISTING SAVED IMAGES ── */}
      {savedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Current Artwork Images ({savedImages.length}/{MAX_IMAGES})
              </h4>
              <p className="text-[11px] text-gray-500 font-light mt-0.5">
                Saved in database and Supabase storage. You can delete or set a cover image at any time.
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {MAX_IMAGES - totalImageCount} slot(s) remaining
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedImages.map((img, idx) => {
              const isMain = Boolean(img.is_main || img.primary_image)
              const imgUrl = getPaintingImageUrl(
                img.thumbnail_key || img.storage_key,
                'paintings_optimized'
              )

              return (
                <div
                  key={img.id || idx}
                  className={`relative bg-white border rounded-xl p-3 flex flex-col gap-3 transition-all ${
                    isMain
                      ? 'border-black shadow-sm ring-1 ring-black'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Image Preview Box */}
                  <div className="relative aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden group">
                    <Image
                      src={imgUrl}
                      alt="Artwork image"
                      fill
                      sizes="(max-width: 768px) 100vw, 300px"
                      className="object-cover"
                    />

                    {/* Primary Badge */}
                    {isMain && (
                      <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md z-10">
                        <Star className="h-3 w-3 fill-yellow-400 stroke-none" />
                        Cover / Primary
                      </div>
                    )}

                    {/* Hover Overlay with Delete & Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                      <button
                        type="button"
                        onClick={() => promptDeleteSavedImage(img)}
                        className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg flex items-center gap-1"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Actions & Status Bar */}
                  <div className="flex items-center justify-between pt-1">
                    {!isMain ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimarySaved(img.id)}
                        disabled={isSettingPrimary === img.id}
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Star className="w-3.5 h-3.5" />
                        {isSettingPrimary === img.id ? 'Setting...' : 'Make Cover'}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-gray-900 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Primary Cover
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => promptDeleteSavedImage(img)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 2. UPLOAD DROPZONE (Allowed if total < MAX_IMAGES) ── */}
      {totalImageCount < MAX_IMAGES ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragging ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/webp"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
            }}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <UploadCloud className="h-6 w-6 text-gray-600" />
          </div>
          <h4 className="mt-4 text-sm font-semibold text-gray-900">Upload Artwork Images</h4>
          <p className="mt-1 text-xs text-gray-500">
            Drag and drop up to {MAX_IMAGES - totalImageCount} more image(s), or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-black font-bold underline"
            >
              browse
            </button>
            .
          </p>
          <p className="mt-2 text-[10px] text-gray-400">
            Max 25MB per file. Maximum limit of {MAX_IMAGES} images per artwork.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <p className="text-xs font-semibold text-gray-700">
            Maximum limit reached ({MAX_IMAGES} of {MAX_IMAGES} images).
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Delete an existing or pending image to upload a new one.
          </p>
        </div>
      )}

      {/* ── 3. PENDING UNSAVED IMAGES LIST ── */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Pending Uploads ({images.length})
            </h4>
            <span className="text-[11px] text-gray-500 font-light">
              Crop to 4:5 ratio and click &quot;Upload &amp; Process&quot;
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className={`relative bg-white border rounded-xl p-3 flex flex-col gap-3 transition-all ${
                  img.isPrimary ? 'border-black shadow-sm ring-1 ring-black' : 'border-gray-200'
                }`}
              >
                {/* Image Preview */}
                <div className="relative aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden group">
                  <Image
                    src={img.previewUrl}
                    alt="Preview"
                    fill
                    className={`object-cover ${img.croppedAreaPixels ? 'scale-105' : ''}`}
                  />

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCropper(img.id)}
                      className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform shadow-md"
                      title="Crop 4:5"
                    >
                      <Crop className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePendingImage(img.id)}
                      className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-md"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Overlay */}
                  {img.status !== 'idle' && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      {img.status === 'uploading' && (
                        <span className="text-xs font-bold text-blue-600 animate-pulse">
                          Uploading...
                        </span>
                      )}
                      {img.status === 'processing' && (
                        <span className="text-xs font-bold text-purple-600 animate-pulse">
                          Processing...
                        </span>
                      )}
                      {img.status === 'done' && <Check className="w-6 h-6 text-green-500" />}
                      {img.status === 'error' && (
                        <span className="text-xs font-bold text-red-600 text-center px-2">
                          {img.errorMessage}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Details & Primary Toggle & Remove Action */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setPrimaryPending(img.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                      img.isPrimary
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-white' : ''}`} />
                    {img.isPrimary ? 'Primary Image' : 'Set Primary'}
                  </button>

                  <button
                    type="button"
                    onClick={() => removePendingImage(img.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                    title="Remove this pending image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleUploadAndProcess}
              className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition-colors"
            >
              Upload &amp; Process Images
            </button>
          </div>
        </div>
      )}

      {/* ── 4. SAFE DELETION CONFIRMATION MODAL ── */}
      {deletingImage && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-red-50 text-red-600 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-950">Delete Artwork Image</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Are you sure you want to permanently delete this image from Supabase storage and database? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Thumbnail preview of what is being deleted */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="relative w-14 h-18 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                <Image
                  src={getPaintingImageUrl(
                    deletingImage.thumbnail_key || deletingImage.storage_key,
                    'paintings_optimized'
                  )}
                  alt="Image to delete"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <p className="font-semibold text-gray-800 truncate">
                  {deletingImage.storage_key?.split('/').pop() || 'Artwork image'}
                </p>
                <p className="text-gray-400 font-mono text-[10px] mt-0.5">
                  {deletingImage.is_main ? 'Current Primary Cover' : 'Secondary Image'}
                </p>
                {deletingImage.is_main && savedImages.length > 1 && (
                  <p className="text-amber-700 text-[11px] mt-1 font-medium">
                    Another image will automatically be selected as the new cover.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingImage(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. CROPPER MODAL ── */}
      {cropModalImageId && activeCropImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-4xl h-[70vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <Cropper
              image={activeCropImage.previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) =>
                setCroppedAreaPixels(croppedAreaPixels)
              }
            />
          </div>

          <div className="mt-4 w-full max-w-xl bg-white p-4 rounded-2xl shadow-xl flex flex-col gap-3">
            {/* Aspect Ratio Selector Pills */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Aspect Ratio
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Free / Original', value: undefined },
                  { label: 'Portrait (4:5)', value: 4 / 5 },
                  { label: 'Landscape (16:9)', value: 16 / 9 },
                  { label: 'Square (1:1)', value: 1 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCropAspect(preset.value)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      cropAspect === preset.value
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Zoom
                </span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full sm:w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCropModalImageId(null)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCrop}
                  className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-lg shadow-md transition-colors cursor-pointer"
                >
                  Save Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

