'use client'

import { useState, useTransition, useRef } from 'react'
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
import { FRAME_PRESET_OPTIONS, calculateSuggestedOuterSize } from './AddArtworkModal'

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
  const activeCropIndexRef = useRef<number | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrcToCrop, setImageSrcToCrop] = useState<string | null>(null)

  const handleAddFrame = () => {
    const suggestedSize = calculateSuggestedOuterSize(width, height, unit)
    setFrames((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        frame_name: '',
        outer_size: suggestedSize,
        price_bdt: 2700,
      },
    ])
  }

  const handleAddPresetFrame = (presetName: string, defaultPrice: number = 2700) => {
    const suggestedSize = calculateSuggestedOuterSize(width, height, unit)
    setFrames((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        frame_name: presetName,
        outer_size: suggestedSize,
        price_bdt: defaultPrice,
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
      const targetIndex = artworkImages.length
      // WHENEVER ANY image is added, INSTANTLY open the cropper on this image!
      activeCropIndexRef.current = targetIndex
      setActiveCropIndex(targetIndex)
      setImageSrcToCrop(newItems[0].previewUrl)
      setCropModalOpen(true)
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

    activeCropIndexRef.current = index
    setActiveCropIndex(index)

    if (target.file || target.croppedBlob) {
      setImageSrcToCrop(target.previewUrl)
      setCropModalOpen(true)
    } else if (target.storageKey) {
      // Existing saved image from Supabase
      try {
        setUploadProgress('Loading existing image for recropping...')
        const res = await fetch(target.previewUrl)
        const blob = await res.blob()
        const objUrl = URL.createObjectURL(blob)
        setImageSrcToCrop(objUrl)
        setCropModalOpen(true)
      } catch (err: any) {
        setErrorMsg('Could not load current image for recropping: ' + err.message)
      } finally {
        setUploadProgress(null)
      }
    }
  }

  const handleCropComplete = (blob: Blob) => {
    const cropIdx = activeCropIndexRef.current ?? activeCropIndex
    if (cropIdx !== null) {
      const croppedUrl = URL.createObjectURL(blob)
      setArtworkImages((prev) =>
        prev.map((item, idx) =>
          idx === cropIdx
            ? { ...item, croppedBlob: blob, previewUrl: croppedUrl }
            : item
        )
      )
    }
    setCropModalOpen(false)
    setActiveCropIndex(null)
    activeCropIndexRef.current = null
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
  const primaryImageIndex = artworkImages.findIndex((img) => img.isPrimary)
  const actualPrimaryIndex = primaryImageIndex >= 0 ? primaryImageIndex : 0
  const primaryImage = artworkImages[actualPrimaryIndex]

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
        <div className="border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="bg-gray-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200">
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-gray-800">
                FRAME OPTIONS
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5 font-light">
                Select popular frame presets or add custom framing
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddPresetFrame('Double- Bit frame (White)')}
                className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                title="Quick add Double- Bit frame (White)"
              >
                <Plus className="h-3 w-3" />
                <span>+ Double- Bit (White)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPresetFrame('Double- Bit frame (Black)')}
                className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                title="Quick add Double- Bit frame (Black)"
              >
                <Plus className="h-3 w-3" />
                <span>+ Double- Bit (Black)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPresetFrame('Single- Bit frame (White)')}
                className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                title="Quick add Single- Bit frame (White)"
              >
                <Plus className="h-3 w-3" />
                <span>+ Single- Bit (White)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddPresetFrame('Single- Bit frame (Black)')}
                className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                title="Quick add Single- Bit frame (Black)"
              >
                <Plus className="h-3 w-3" />
                <span>+ Single- Bit (Black)</span>
              </button>
              <button
                type="button"
                onClick={handleAddFrame}
                className="h-7 px-2.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-[11px] font-semibold text-gray-700 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>+ Custom Frame</span>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {frames.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                <p className="text-xs text-gray-500 font-medium">
                  No frame options added yet. Click a quick preset below:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Double- Bit frame (White)')}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                  >
                    + Double- Bit (White)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Double- Bit frame (Black)')}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                  >
                    + Double- Bit (Black)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Single- Bit frame (White)')}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                  >
                    + Single- Bit (White)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Single- Bit frame (Black)')}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                  >
                    + Single- Bit (Black)
                  </button>
                </div>
              </div>
            ) : (
              frames.map((frame) => (
                <div
                  key={frame.id}
                  className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/80 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_110px_36px] gap-2.5 items-end">
                    {/* Frame Finish with Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                        FRAME FINISH
                      </label>
                      <select
                        value={
                          FRAME_PRESET_OPTIONS.includes(frame.frame_name)
                            ? frame.frame_name
                            : frame.frame_name
                            ? 'custom'
                            : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'custom') {
                            if (FRAME_PRESET_OPTIONS.includes(frame.frame_name)) {
                              handleFrameChange(frame.id, 'frame_name', '')
                            }
                          } else {
                            handleFrameChange(frame.id, 'frame_name', val)
                            if (!frame.outer_size && width && height) {
                              const suggested = calculateSuggestedOuterSize(width, height, unit)
                              if (suggested) handleFrameChange(frame.id, 'outer_size', suggested)
                            }
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none font-medium cursor-pointer"
                      >
                        <option value="">-- Choose Frame Preset --</option>
                        <optgroup label="Bit Frames (Most Popular)">
                          <option value="Double- Bit frame (White)">Double- Bit frame (White)</option>
                          <option value="Double- Bit frame (Black)">Double- Bit frame (Black)</option>
                          <option value="Single- Bit frame (White)">Single- Bit frame (White)</option>
                          <option value="Single- Bit frame (Black)">Single- Bit frame (Black)</option>
                          <option value="Double-Bit frame (Natural Wood)">Double-Bit frame (Natural Wood)</option>
                          <option value="Double-Bit frame (Gold)">Double-Bit frame (Gold)</option>
                        </optgroup>
                        <optgroup label="Floating Frames">
                          <option value="Minimalist Floating Frame (Black)">Minimalist Floating Frame (Black)</option>
                          <option value="Minimalist Floating Frame (White)">Minimalist Floating Frame (White)</option>
                          <option value="Minimalist Floating Frame (Natural Oak)">Minimalist Floating Frame (Natural Oak)</option>
                          <option value="Raw Teakwood Floating Frame">Raw Teakwood Floating Frame</option>
                          <option value="Champagne Gold Floating Frame">Champagne Gold Floating Frame</option>
                        </optgroup>
                        <optgroup label="Shadowbox & Gallery">
                          <option value="Matte Black Shadowbox">Matte Black Shadowbox</option>
                          <option value="Natural Oak Shadowbox">Natural Oak Shadowbox</option>
                          <option value="Classic Gilded Gold Frame">Classic Gilded Gold Frame</option>
                        </optgroup>
                        <option value="custom">✏️ Custom / Type by Hand...</option>
                      </select>
                    </div>

                    {/* Outer Size */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600">
                          FRAME SIZE
                        </label>
                        {(!frame.outer_size || frame.outer_size.trim() === '') && width && height && (
                          <button
                            type="button"
                            onClick={() => {
                              const suggested = calculateSuggestedOuterSize(width, height, unit)
                              if (suggested) handleFrameChange(frame.id, 'outer_size', suggested)
                            }}
                            className="text-[9px] text-blue-600 hover:underline cursor-pointer"
                          >
                            Auto-calc
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={frame.outer_size}
                        onChange={(e) =>
                          handleFrameChange(frame.id, 'outer_size', e.target.value)
                        }
                        placeholder="30 × 42 in"
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none font-medium"
                      />
                    </div>

                    {/* Price BDT */}
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                        PRICE, BDT
                      </label>
                      <input
                        type="number"
                        value={frame.price_bdt}
                        onChange={(e) =>
                          handleFrameChange(frame.id, 'price_bdt', e.target.value)
                        }
                        placeholder="2700"
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none font-medium"
                      />
                    </div>

                    {/* Delete Frame */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFrame(frame.id)}
                      className="h-8 w-8 sm:w-9 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 bg-white transition-all cursor-pointer mb-0.5"
                      title="Remove frame"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Custom Name input if 'custom' is selected or frame name isn't in presets */}
                  {(!FRAME_PRESET_OPTIONS.includes(frame.frame_name) || frame.frame_name === '') && (
                    <div className="pt-1">
                      <input
                        type="text"
                        value={frame.frame_name}
                        onChange={(e) =>
                          handleFrameChange(frame.id, 'frame_name', e.target.value)
                        }
                        placeholder="Type custom frame finish name (e.g. Italian Walnut Baroque)"
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
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

        {/* Artwork Images & Crop Setup (Up to 4, min 1 mandatory) */}
        <div className="border border-gray-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <label className="block text-[11px] font-bold tracking-wider uppercase text-gray-900">
                  ARTWORK IMAGES & CROP SETUP ({artworkImages.length}/4)
                </label>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700">
                  1 Mandatory
                </span>
              </div>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Upload 1 to 4 photos. Set your cover photo and click Crop to adjust its framing ratio.
              </p>
            </div>

            {artworkImages.length < 4 && (
              <label
                htmlFor="artwork_images_input"
                className="cursor-pointer bg-black hover:bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photos ({artworkImages.length}/4)</span>
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

          {/* If images exist: Prominent Cover Image Showcase & Recrop Card */}
          {artworkImages.length > 0 && primaryImage ? (
            <div className="space-y-4">
              {/* Primary Cover Image Showcase */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                  {/* Image Preview Box */}
                  <div className="relative w-36 sm:w-44 aspect-[4/5] bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
                    <Image
                      src={primaryImage.previewUrl}
                      alt="Cover photo preview"
                      fill
                      className="object-contain p-1"
                      sizes="176px"
                      unoptimized={primaryImage.previewUrl.startsWith('blob:')}
                    />
                    <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded shadow-sm">
                      Cover
                    </span>
                    {primaryImage.croppedBlob && (
                      <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-xs">
                        ✓ Cropped
                      </span>
                    )}
                  </div>

                  {/* Primary Image Info & Prominent Crop Button */}
                  <div className="flex-1 flex flex-col justify-between self-stretch text-center sm:text-left">
                    <div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                          Primary Cover Photo
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                          {orientation.toUpperCase()} RATIO ({displaySize})
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-light leading-relaxed mb-3">
                        This cover photo represents the artwork in the gallery catalog and homepage. Click the button below to crop, rotate, or fit the framing.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {/* Dedicated, prominent Crop button */}
                      <button
                        type="button"
                        onClick={() => handleStartCrop(actualPrimaryIndex)}
                        className="px-4 py-2 rounded-lg bg-black hover:bg-gray-800 text-white text-xs font-bold tracking-wide flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Crop / Adjust Cover Photo</span>
                      </button>
                      {artworkImages.length < 4 && (
                        <label
                          htmlFor="artwork_images_input"
                          className="px-3 py-2 rounded-lg border border-gray-300 hover:border-black bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add More Photos</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* All Photos Strip / Gallery (1 to 4) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-600">
                    All Photos ({artworkImages.length} of 4)
                  </span>
                  <span className="text-[11px] text-gray-400 font-light">
                    Click "Crop" to adjust each photo individually
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {artworkImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`relative flex flex-col rounded-xl border overflow-hidden bg-white shadow-2xs transition-all ${
                        img.isPrimary
                          ? 'border-black ring-2 ring-black/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[4/5] w-full bg-gray-100 overflow-hidden flex items-center justify-center">
                        <Image
                          src={img.previewUrl}
                          alt={`Artwork photo ${idx + 1}`}
                          fill
                          className="object-contain p-1"
                          sizes="(max-width: 640px) 50vw, 25vw"
                          unoptimized={img.previewUrl.startsWith('blob:')}
                        />
                        {img.isPrimary ? (
                          <span className="absolute top-2 left-2 bg-black text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded shadow-sm">
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(idx)}
                            className="absolute top-2 left-2 bg-white/95 hover:bg-black hover:text-white text-gray-800 text-[9px] font-semibold px-1.5 py-0.5 rounded shadow-sm cursor-pointer transition-colors"
                          >
                            Set Cover
                          </button>
                        )}
                        {img.croppedBlob && (
                          <span className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[8px] font-bold uppercase px-1 py-0.5 rounded shadow-xs">
                            ✓ Cropped
                          </span>
                        )}
                      </div>

                      {/* Footer Controls - Always Visible */}
                      <div className="p-2 border-t border-gray-100 flex items-center justify-between gap-1 bg-gray-50/70">
                        <span className="text-[10px] font-mono text-gray-500">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartCrop(idx)}
                            className="text-[11px] font-semibold text-gray-700 hover:text-black bg-white hover:bg-gray-100 border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Crop photo"
                          >
                            <Crop className="w-3 h-3 text-gray-600" />
                            <span>Crop</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Slot */}
                  {artworkImages.length < 4 && (
                    <label
                      htmlFor="artwork_images_input"
                      className="aspect-[4/5] rounded-xl border-2 border-dashed border-gray-200 hover:border-black bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-400 mb-1" />
                      <span className="text-xs font-semibold text-gray-700">Add Photo</span>
                      <span className="text-[10px] text-gray-400 font-light mt-0.5">
                        {4 - artworkImages.length} slot{4 - artworkImages.length > 1 ? 's' : ''} left
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Empty state: Dropzone */
            <label
              htmlFor="artwork_images_input"
              className="border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-gray-50 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">
                Click to select artwork photos
              </p>
              <p className="text-xs text-red-600 font-semibold mt-1">
                * At least 1 photo is mandatory (up to 4 photos max)
              </p>
              <p className="text-[11px] text-gray-500 font-light mt-1 max-w-sm">
                Image cropper will open automatically to crop your photo to the {orientation.toUpperCase()} ratio ({displaySize}).
              </p>
              <div className="mt-4 px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg shadow-xs hover:bg-gray-800 transition-colors">
                Choose Artwork Image
              </div>
            </label>
          )}
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
          key={`${imageSrcToCrop}-${activeCropIndexRef.current ?? 'crop'}`}
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
