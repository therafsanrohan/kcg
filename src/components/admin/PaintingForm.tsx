'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Crop, Trash2, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { savePainting } from '@/app/admin/(dashboard)/paintings/actions'
import { Painting } from '@/types'
import { MeasurementUnit, parseLegacyDisplaySize, fromCanonicalMm, formatDimensions, ArtworkOrientation } from '@/utils/measurements'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ImageCropperModal from './ImageCropperModal'
import DimensionInputGroup from './DimensionInputGroup'
import CustomSelect from '@/components/ui/CustomSelect'
import { getPaintingImageUrl } from '@/utils/image'

interface FrameRow {
  id: string
  frame_name: string
  outer_size: string
  price_bdt: number | string
}

export default function PaintingForm({ painting }: { painting?: Painting & { frame_options?: any[] } }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Size state
  const initialParsed = parseLegacyDisplaySize(painting?.display_size)
  const initialUnit = (painting?.measurement_unit as MeasurementUnit) || initialParsed?.unit || 'in'
  const [unit, setUnit] = useState<MeasurementUnit>(initialUnit)
  const [width, setWidth] = useState<string>(() => {
    if (painting?.width_mm) {
      const val = fromCanonicalMm(painting.width_mm, initialUnit)
      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    }
    return initialParsed?.width ? String(initialParsed.width) : painting?.width ? String(painting.width) : '24'
  })
  const [height, setHeight] = useState<string>(() => {
    if (painting?.height_mm) {
      const val = fromCanonicalMm(painting.height_mm, initialUnit)
      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    }
    return initialParsed?.height ? String(initialParsed.height) : painting?.height ? String(painting.height) : '36'
  })
  const [orientation, setOrientation] = useState<ArtworkOrientation>(() => {
    const numW = parseFloat(width) || 0
    const numH = parseFloat(height) || 0
    if (numW > 0 && numH > 0) {
      if (Math.abs(numW - numH) < 0.05) return 'square'
      return numW > numH ? 'landscape' : 'portrait'
    }
    return 'portrait'
  })
  const [displaySize, setDisplaySize] = useState<string>(
    painting?.display_size || `${width} × ${height} ${unit}`
  )

  const handleWidthChange = (newW: string) => {
    setWidth(newW)
    if (newW && height) {
      setDisplaySize(`${newW} × ${height} ${unit}`)
      const nw = parseFloat(newW) || 0
      const nh = parseFloat(height) || 0
      if (orientation !== 'custom' && nw > 0 && nh > 0) {
        if (Math.abs(nw - nh) < 0.05) setOrientation('square')
        else setOrientation(nw > nh ? 'landscape' : 'portrait')
      }
    }
  }

  const handleHeightChange = (newH: string) => {
    setHeight(newH)
    if (width && newH) {
      setDisplaySize(`${width} × ${newH} ${unit}`)
      const nw = parseFloat(width) || 0
      const nh = parseFloat(newH) || 0
      if (orientation !== 'custom' && nw > 0 && nh > 0) {
        if (Math.abs(nw - nh) < 0.05) setOrientation('square')
        else setOrientation(nw > nh ? 'landscape' : 'portrait')
      }
    }
  }

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    setUnit(newUnit)
    if (width && height) {
      setDisplaySize(`${width} × ${height} ${newUnit}`)
    }
  }

  const handleOrientationChange = (newOrient: ArtworkOrientation) => {
    setOrientation(newOrient)
  }

  const [frames, setFrames] = useState<FrameRow[]>(() => {
    if (painting?.frame_options?.length) {
      return painting.frame_options.map((f: any, idx: number) => ({
        id: f.id || `frame-${idx + 1}`,
        frame_name: f.frame_name,
        outer_size: f.outer_size || '',
        price_bdt: f.price_bdt || 0,
      }))
    }
    return []
  })

  // Multi-Image State for Artwork
  interface FormArtworkImage {
    id: string
    file?: File
    storageKey?: string // existing saved image key
    previewUrl: string
    isPrimary: boolean
    croppedBlob?: Blob
  }

  const [artworkImages, setArtworkImages] = useState<FormArtworkImage[]>(() => {
    if (painting?.painting_images && painting.painting_images.length > 0) {
      return (painting.painting_images as any[])
        .filter((img) => !img.archived_at)
        .map((img, idx) => ({
          id: img.id || `saved-${idx}`,
          storageKey: img.storage_key,
          previewUrl: getPaintingImageUrl(img.storage_key),
          isPrimary: Boolean(img.is_main || img.primary_image || idx === 0),
        }))
    }
    return []
  })

  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrcToCrop, setImageSrcToCrop] = useState<string | null>(null)

  const handleAddFrame = () => {
    setFrames((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        frame_name: '',
        outer_size: '',
        price_bdt: 0,
      },
    ])
  }

  const handleRemoveFrame = (id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id))
  }

  const handleFrameChange = (id: string, field: keyof FrameRow, val: string) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: val } : f))
    )
  }

  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 4 - artworkImages.length
    if (remainingSlots <= 0) {
      setErrorMsg('Maximum 4 images allowed per artwork.')
      e.target.value = ''
      return
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots)
    const newItems: FormArtworkImage[] = []

    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Max limit is 5.0 MB.`)
        continue
      }
      const previewUrl = URL.createObjectURL(file)
      newItems.push({
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        isPrimary: artworkImages.length === 0 && newItems.length === 0,
      })
    }

    if (newItems.length > 0) {
      setArtworkImages((prev) => {
        const combined = [...prev, ...newItems]
        if (!combined.some((img) => img.isPrimary)) {
          combined[0].isPrimary = true
        }
        return combined
      })
      // Open cropper immediately for the first newly added image if it's the cover
      if (artworkImages.length === 0 && newItems[0].file) {
        setImageSrcToCrop(newItems[0].previewUrl)
        setActiveCropIndex(0)
        setCropModalOpen(true)
      }
    }

    e.target.value = ''
  }

  const handleSetPrimary = (index: number) => {
    setArtworkImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      }))
    )
  }

  const handleRemoveImage = (index: number) => {
    setArtworkImages((prev) => {
      const target = prev[index]
      if (target?.previewUrl && target.file) {
        URL.revokeObjectURL(target.previewUrl)
      }
      const updated = prev.filter((_, idx) => idx !== index)
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true
      }
      return updated
    })
  }

  const handleStartCrop = async (index: number) => {
    const target = artworkImages[index]
    if (!target) return

    if (target.file || target.croppedBlob) {
      setImageSrcToCrop(target.previewUrl)
      setActiveCropIndex(index)
      setCropModalOpen(true)
    } else if (target.storageKey) {
      // Existing saved image from Supabase
      try {
        setUploadProgress('Loading existing image for recropping...')
        const res = await fetch(target.previewUrl)
        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        setImageSrcToCrop(objUrl)
        setActiveCropIndex(index)
        setCropModalOpen(true)
      } catch (err: any) {
        setErrorMsg('Could not load current image for recropping: ' + err.message)
      } finally {
        setUploadProgress(null)
      }
    }
  }

  const handleCropComplete = (blob: Blob) => {
    if (activeCropIndex !== null && artworkImages[activeCropIndex]) {
      const croppedUrl = URL.createObjectURL(blob)
      setArtworkImages((prev) => {
        const copy = [...prev]
        copy[activeCropIndex] = {
          ...copy[activeCropIndex],
          croppedBlob: blob,
          previewUrl: croppedUrl,
        }
        return copy
      })
    }
    setCropModalOpen(false)
    setActiveCropIndex(null)
    setImageSrcToCrop(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setUploadProgress(null)

    // Validate dimensions before processing
    const numWidth = parseFloat(width)
    const numHeight = parseFloat(height)
    if (!width || isNaN(numWidth) || numWidth <= 0) {
      setErrorMsg('Please enter a valid Width greater than 0.')
      return
    }
    if (!height || isNaN(numHeight) || numHeight <= 0) {
      setErrorMsg('Please enter a valid Height greater than 0.')
      return
    }

    if (artworkImages.length === 0) {
      setErrorMsg('Artwork image is mandatory. Please upload at least 1 image (up to 4 max).')
      return
    }

    if (artworkImages.length > 4) {
      setErrorMsg('Maximum 4 images allowed per artwork.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('frames_json', JSON.stringify(frames))
    formData.set('width_input', width)
    formData.set('height_input', height)
    formData.set('measurement_unit_input', unit)
    formData.set('display_size', displaySize)

    // Remove raw binary from Server Action payload
    formData.delete('artwork_image')

    startTransition(async () => {
      try {
        const uploadPaintingId = painting?.id || 'new'
        const processedPayload: any[] = []

        // Process and upload each image
        for (let i = 0; i < artworkImages.length; i++) {
          const item = artworkImages[i]
          const fileToUpload = item.croppedBlob || item.file

          if (fileToUpload) {
            setUploadProgress(`Uploading & optimizing image ${i + 1} of ${artworkImages.length}...`)
            const uploadData = new FormData()
            uploadData.append('paintingId', uploadPaintingId)
            uploadData.append('isPrimary', item.isPrimary ? 'true' : 'false')
            uploadData.append('sortOrder', String(i + 1))

            const filePayload =
              fileToUpload instanceof File
                ? fileToUpload
                : new File([fileToUpload], `artwork-${Date.now()}-${i + 1}.webp`, {
                    type: fileToUpload.type || 'image/webp',
                  })

            uploadData.append('image', filePayload)

            const uploadRes = await fetch('/api/images/upload', {
              method: 'POST',
              body: uploadData,
            })

            const jsonRes = await uploadRes.json()
            if (!uploadRes.ok || !jsonRes.success) {
              throw new Error(jsonRes.error || `Failed to process image ${i + 1}.`)
            }

            processedPayload.push({
              id: item.id,
              originalKey: jsonRes.data.masterStorageKey || jsonRes.data.storageKey,
              storageKey: jsonRes.data.displayKey || jsonRes.data.storageKey,
              displayKey: jsonRes.data.displayKey || jsonRes.data.storageKey,
              thumbnailKey: jsonRes.data.thumbnailKey,
              responsiveUrls: jsonRes.data.responsiveUrls,
              isPrimary: item.isPrimary,
              sortOrder: i + 1,
              mimeType: jsonRes.data.mimeType || 'image/webp',
            })
          } else if (item.storageKey) {
            // Already persisted image
            processedPayload.push({
              id: item.id,
              originalKey: item.storageKey,
              storageKey: item.storageKey,
              displayKey: item.storageKey,
              thumbnailKey: item.storageKey,
              responsiveUrls: {},
              isPrimary: item.isPrimary,
              sortOrder: i + 1,
              mimeType: 'image/webp',
            })
          }
        }

        if (processedPayload.length > 0) {
          // Send as advanced_images_json to store all images atomically
          formData.set('advanced_images_json', JSON.stringify(processedPayload))

          // Also set uploaded_image_json for the primary image for backward-compatible fallback
          const primaryItem = processedPayload.find((p) => p.isPrimary) || processedPayload[0]
          if (primaryItem) {
            formData.set(
              'uploaded_image_json',
              JSON.stringify({
                storageKey: primaryItem.storageKey,
                displayKey: primaryItem.displayKey,
                thumbnailKey: primaryItem.thumbnailKey,
                responsiveUrls: primaryItem.responsiveUrls,
                isPrimary: true,
                sortOrder: 1,
                mimeType: primaryItem.mimeType,
              })
            )
          }
        }

        setUploadProgress('Saving artwork details to database...')
        const res = await savePainting(null, formData)
        if (res?.error) {
          setErrorMsg(res.error)
        } else {
          router.push('/admin')
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save artwork.')
      } finally {
        setUploadProgress(null)
      }
    })
  }


  const isEditMode = Boolean(painting?.id)

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
      <div className="mb-6">
        <h2 className="font-sans text-3xl font-bold text-gray-950">
          {isEditMode ? 'Edit artwork' : 'Add new artwork'}
        </h2>
        <p className="mt-1 text-sm text-gray-500 font-light">
          Add the painting details and a clear, high-resolution image.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
          {errorMsg}
        </div>
      )}

      {uploadProgress && (
        <div className="mb-6 p-3 rounded-lg bg-blue-50 text-blue-800 text-xs border border-blue-200 font-semibold flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          <span>{uploadProgress}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {painting?.id && <input type="hidden" name="id" value={painting.id} />}

        {/* Grid Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="title" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              ARTWORK TITLE
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={painting?.title || ''}
              placeholder="River at Dusk"
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>

          <div>
            <CustomSelect
              label="PAINTING TYPE"
              id="painting_type"
              name="painting_type"
              defaultValue={painting?.painting_type || 'oil'}
              options={[
                { value: 'oil', label: 'Oil' },
                { value: 'acrylic', label: 'Acrylic' },
                { value: 'mixed', label: 'Mixed Media' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="exact_medium" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              MEDIUM
            </label>
            <input
              id="exact_medium"
              name="exact_medium"
              type="text"
              defaultValue={painting?.exact_medium || 'Oil on canvas'}
              placeholder="Oil on canvas"
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="year" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              YEAR
            </label>
            <input
              id="year"
              name="year"
              type="number"
              defaultValue={painting?.year || 2026}
              placeholder="2026"
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>

          {/* Structured Artwork Dimensions */}
          <div className="sm:col-span-2">
            <DimensionInputGroup
              width={width}
              height={height}
              unit={unit}
              orientation={orientation}
              onWidthChange={handleWidthChange}
              onHeightChange={handleHeightChange}
              onUnitChange={handleUnitChange}
              onOrientationChange={handleOrientationChange}
            />
          </div>

          <div>
            <CustomSelect
              label="STOCK STATUS"
              id="availability_status"
              name="availability_status"
              defaultValue={painting?.availability_status || 'available'}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'sold', label: 'Sold' },
              ]}
            />
          </div>

          <div>
            <label htmlFor="base_price_bdt" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              ARTWORK PRICE, BDT
            </label>
            <input
              id="base_price_bdt"
              name="base_price_bdt"
              type="number"
              required
              defaultValue={painting?.base_price_bdt || 85000}
              placeholder="85000"
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>
        </div>

        {/* Frame Options */}
        <div className="border border-gray-200/80 rounded-xl p-4 sm:p-5 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase text-gray-800">
              FRAME OPTIONS
            </span>
            <button
              type="button"
              onClick={handleAddFrame}
              className="h-8 px-3 rounded-md border border-gray-200 hover:border-gray-400 bg-white text-xs font-semibold text-gray-800 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add frame</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 font-light mb-4">
            Add each available frame finish, its final outer size and price.
          </p>

          <div className="space-y-3">
            {frames.map((frame) => (
              <div key={frame.id} className="bg-[#FAF9F6] border border-gray-200/70 p-3.5 rounded-lg flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-700 mb-1">
                    FRAME FINISH
                  </label>
                  <input
                    type="text"
                    value={frame.frame_name}
                    onChange={(e) => handleFrameChange(frame.id, 'frame_name', e.target.value)}
                    placeholder="Natural oak"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:border-black outline-none"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-700 mb-1">
                    FRAME SIZE
                  </label>
                  <input
                    type="text"
                    value={frame.outer_size}
                    onChange={(e) => handleFrameChange(frame.id, 'outer_size', e.target.value)}
                    placeholder="27 × 39 in"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:border-black outline-none"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-700 mb-1">
                    PRICE, BDT
                  </label>
                  <input
                    type="number"
                    value={frame.price_bdt}
                    onChange={(e) => handleFrameChange(frame.id, 'price_bdt', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 bg-white focus:border-black outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFrame(frame.id)}
                  className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 bg-white transition-all flex-shrink-0"
                  title="Remove frame"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
            DESCRIPTION
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={painting?.description || ''}
            placeholder="Tell collectors about the story, texture and inspiration behind this work."
            className="w-full rounded-md border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
          />
        </div>

        {/* Artwork Images (Up to 5) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-gray-800">
                ARTWORK IMAGES ({artworkImages.length}/4) — {orientation.toUpperCase()} RATIO (MUST HAVE AT LEAST 1)
              </label>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Upload up to 4 photos. 1 image is strictly mandatory. Choose cover, adjust crop, and save.
              </p>
            </div>
            {artworkImages.length < 4 && (
              <label
                htmlFor="artwork_images_input"
                className="cursor-pointer bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos</span>
              </label>
            )}
            <input
              id="artwork_images_input"
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFilesSelect}
              className="hidden"
            />
          </div>

          {/* Images Grid */}
          {artworkImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-3">
              {artworkImages.map((img, idx) => (
                <div
                  key={img.id}
                  className={`group relative flex flex-col rounded-xl border overflow-hidden bg-white shadow-2xs transition-all ${
                    img.isPrimary
                      ? 'border-black ring-2 ring-black/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[4/5] w-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    <Image
                      src={img.previewUrl}
                      alt={`Artwork photo ${idx + 1}`}
                      fill
                      className="object-contain p-1"
                      sizes="(max-width: 640px) 50vw, 20vw"
                      unoptimized={img.previewUrl.startsWith('blob:')}
                    />

                    {/* Primary Badge */}
                    {img.isPrimary ? (
                      <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded shadow-sm">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(idx)}
                        className="absolute top-2 left-2 bg-black/60 hover:bg-black text-white text-[10px] font-semibold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Make Cover
                      </button>
                    )}

                    {/* Top Right Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartCrop(idx)}
                        className="h-6 w-6 rounded bg-white/90 hover:bg-white text-gray-700 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
                        title="Crop / adjust"
                      >
                        <Crop className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="h-6 w-6 rounded bg-white/90 hover:bg-red-50 text-red-600 shadow-sm flex items-center justify-center transition-transform hover:scale-105"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Caption & Status */}
                  <div className="p-2 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">#{idx + 1}</span>
                    {img.croppedBlob ? (
                      <span className="text-emerald-700 font-semibold text-[10px]">Cropped</span>
                    ) : img.file ? (
                      <span className="text-blue-700 font-semibold text-[10px]">New</span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">Saved</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Upload Placeholder if under limit */}
              {artworkImages.length < 5 && (
                <label
                  htmlFor="artwork_images_input"
                  className="aspect-[4/5] border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl flex flex-col items-center justify-center p-3 text-center cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-white shadow-2xs border border-gray-200 flex items-center justify-center mb-1 text-gray-500">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">Add Image</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 font-light">Up to 5 images</span>
                </label>
              )}
            </div>
          ) : (
            /* Empty State */
            <label
              htmlFor="artwork_images_input"
              className="mt-2 block border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl p-8 text-center cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-white shadow-2xs border border-gray-200 flex items-center justify-center mb-3 text-gray-500">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Click to upload artwork photos</p>
              <p className="text-xs text-gray-500 font-light mt-1">
                Select 1 to 5 images. High resolution PNG, JPG or WebP up to 5 MB each.
              </p>
              <span className="inline-block mt-3 px-4 py-1.5 rounded-md bg-black text-white text-xs font-semibold shadow-2xs">
                Select Photos
              </span>
            </label>
          )}

          <p className="mt-2 text-[11px] text-gray-400 font-light">
            JPG, PNG or WebP, up to 5 MB each. Supports Portrait, Landscape, Square and Custom ratios.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <Link
            href="/admin"
            className="px-6 py-2.5 rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-md bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {isPending ? 'Saving...' : isEditMode ? 'Update artwork' : 'Add artwork'}
          </button>
        </div>
      </form>

      {/* Multi-Orientation Aspect Ratio Image Cropper Modal */}
      {cropModalOpen && imageSrcToCrop && (
        <ImageCropperModal
          isOpen={cropModalOpen}
          imageSrc={imageSrcToCrop}
          defaultOrientation={orientation}
          defaultAspectRatio={
            parseFloat(width) && parseFloat(height) && parseFloat(height) > 0
              ? parseFloat(width) / parseFloat(height)
              : undefined
          }
          onClose={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
