'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { X, Plus, ImageIcon, Crop, Trash2 } from 'lucide-react'
import { saveArtworkAction } from '@/app/admin/(dashboard)/paintings/actions'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'
import {
  MeasurementUnit,
  parseLegacyDisplaySize,
  fromCanonicalMm,
  ArtworkOrientation,
  calculateSuggestedOuterSize,
  calculateFramePrice,
  isDoubleBitFrame,
  isSingleBitFrame,
} from '@/utils/measurements'
import ImageCropperModal from './ImageCropperModal'
import DimensionInputGroup from './DimensionInputGroup'
import CustomSelect from '@/components/ui/CustomSelect'

export interface FrameRow {
  id: string
  frame_name: string
  outer_size: string
  price_bdt: number | string
}

export const FRAME_PRESET_OPTIONS = [
  'Double-Bit frame (White)',
  'Double-Bit frame (Black)',
  'Single-Bit frame (White)',
  'Single-Bit frame (Black)',
]

export { calculateSuggestedOuterSize }


interface AddArtworkModalProps {
  isOpen: boolean
  onClose: (didSave?: boolean) => void
  initialData?: any
}

function makeDefaultFrames(data: any): FrameRow[] {
  if (data?.frame_options?.length > 0) {
    return data.frame_options.map((f: any) => {
      let name = (f.frame_name || '').trim()
      name = name.replace(/^Double\s*-\s*Bit\s+frame/i, 'Double-Bit frame')
      name = name.replace(/^Single\s*-\s*Bit\s+frame/i, 'Single-Bit frame')
      name = name.replace(/^Double\s*-\s*Bit\s*\(/i, 'Double-Bit frame (')
      name = name.replace(/^Single\s*-\s*Bit\s*\(/i, 'Single-Bit frame (')
      name = name.replace(/\(white\)/i, '(White)')
      name = name.replace(/\(black\)/i, '(Black)')
      return {
        id: f.id || Math.random().toString(36),
        frame_name: name,
        outer_size: f.outer_size || '',
        price_bdt: f.price_bdt ?? 0,
      }
    })
  }
  return []
}

interface FormArtworkImage {
  id: string
  file?: File
  storageKey?: string
  previewUrl: string
  isPrimary: boolean
  croppedBlob?: Blob
}

export default function AddArtworkModal({
  isOpen,
  onClose,
  initialData,
}: AddArtworkModalProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [frames, setFrames] = useState<FrameRow[]>(() => makeDefaultFrames(initialData))
  
  // Multi-image state (1 to 4 images, min 1 mandatory)
  const [artworkImages, setArtworkImages] = useState<FormArtworkImage[]>([])
  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null)
  const activeCropIndexRef = useRef<number | null>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrcToCrop, setImageSrcToCrop] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  // Size state
  const [unit, setUnit] = useState<MeasurementUnit>('in')
  const [width, setWidth] = useState<string>('24')
  const [height, setHeight] = useState<string>('36')
  const [orientation, setOrientation] = useState<ArtworkOrientation>('portrait')
  const [displaySize, setDisplaySize] = useState<string>('24 × 36 in')

  const isEditMode = Boolean(initialData?.id)

  // Reset form state whenever initialData changes (new edit target or cleared for new)
  useEffect(() => {
    setFrames(makeDefaultFrames(initialData))
    setErrorMsg(null)

    // Load existing images if in edit mode (up to 4)
    if (initialData?.painting_images && initialData.painting_images.length > 0) {
      const existing = (initialData.painting_images as any[])
        .filter((img) => !img.archived_at)
        .slice(0, 4)
        .map((img, idx) => ({
          id: img.id || `saved-${idx}`,
          storageKey: img.storage_key,
          previewUrl: getPaintingImageUrl(img.storage_key),
          isPrimary: Boolean(img.is_main || img.primary_image || idx === 0),
        }))
      setArtworkImages(existing)
    } else {
      setArtworkImages([])
    }

    const parsed = parseLegacyDisplaySize(initialData?.display_size)
    const u = (initialData?.measurement_unit as MeasurementUnit) || parsed?.unit || 'in'
    setUnit(u)

    let w = '24'
    let h = '36'
    if (initialData?.width_mm) {
      const val = fromCanonicalMm(initialData.width_mm, u)
      w = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    } else if (parsed?.width) {
      w = String(parsed.width)
    } else if (initialData?.width) {
      w = String(initialData.width)
    }

    if (initialData?.height_mm) {
      const val = fromCanonicalMm(initialData.height_mm, u)
      h = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    } else if (parsed?.height) {
      h = String(parsed.height)
    } else if (initialData?.height) {
      h = String(initialData.height)
    }

    setWidth(w)
    setHeight(h)
    const nw = parseFloat(w) || 0
    const nh = parseFloat(h) || 0
    if (nw > 0 && nh > 0) {
      if (Math.abs(nw - nh) < 0.05) setOrientation('square')
      else setOrientation(nw > nh ? 'landscape' : 'portrait')
    }
    setDisplaySize(initialData?.display_size || `${w} × ${h} ${u}`)
  }, [initialData?.id, initialData?.display_size, initialData?.width_mm, initialData?.height_mm])

  const updatePresetFrames = (w: string, h: string, u: MeasurementUnit) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (!f.frame_name) return f
        const isPreset =
          FRAME_PRESET_OPTIONS.includes(f.frame_name) ||
          isDoubleBitFrame(f.frame_name) ||
          isSingleBitFrame(f.frame_name)
        if (!isPreset) return f

        const newOuter = calculateSuggestedOuterSize(w, h, u, f.frame_name)
        const newPrice = calculateFramePrice(f.frame_name, w, h, u)

        return {
          ...f,
          outer_size: newOuter || f.outer_size,
          price_bdt: newPrice > 0 ? newPrice : f.price_bdt,
        }
      })
    )
  }

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
    updatePresetFrames(newW, height, unit)
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
    updatePresetFrames(width, newH, unit)
  }

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    setUnit(newUnit)
    if (width && height) {
      setDisplaySize(`${width} × ${height} ${newUnit}`)
    }
    updatePresetFrames(width, height, newUnit)
  }

  const handleOrientationChange = (newOrient: ArtworkOrientation) => {
    setOrientation(newOrient)
  }

  const handleAddFrame = useCallback(() => {
    const suggestedSize = calculateSuggestedOuterSize(width, height, unit, 'Double-Bit frame (White)')
    const autoPrice = calculateFramePrice('Double-Bit frame (White)', width, height, unit)
    setFrames((prev) => [
      ...prev,
      { id: Math.random().toString(36), frame_name: '', outer_size: suggestedSize, price_bdt: autoPrice > 0 ? autoPrice : 2700 },
    ])
  }, [width, height, unit])

  const handleAddPresetFrame = useCallback(
    (presetName: string, defaultPrice?: number) => {
      const canonicalName = presetName.replace(/^Double-\s*Bit/i, 'Double-Bit').replace(/^Single-\s*Bit/i, 'Single-Bit').trim()
      setFrames((prev) => {
        // Prevent duplicate frame names on the same artwork
        if (prev.some((f) => f.frame_name.trim().toLowerCase() === canonicalName.toLowerCase())) {
          return prev
        }
        const suggestedSize = calculateSuggestedOuterSize(width, height, unit, canonicalName)
        const autoPrice = calculateFramePrice(canonicalName, width, height, unit)
        return [
          ...prev,
          {
            id: Math.random().toString(36),
            frame_name: canonicalName,
            outer_size: suggestedSize,
            price_bdt: defaultPrice ?? (autoPrice > 0 ? autoPrice : 2700),
          },
        ]
      })
    },
    [width, height, unit]
  )

  const handleRemoveFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleFrameChange = useCallback(
    (id: string, field: keyof FrameRow, val: string | number) => {
      setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: val } : f)))
    },
    []
  )

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
        setErrorMsg(`"${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 5.0 MB.`)
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
      const targetIndex = artworkImages.length
      setArtworkImages((prev) => {
        const combined = [...prev, ...newItems]
        if (!combined.some((img) => img.isPrimary)) {
          combined[0].isPrimary = true
        }
        return combined
      })

      const primaryUrl = newItems[0].previewUrl

      // Pre-capture orientation: auto-detect natural image dimensions (portrait vs landscape)
      const preImg = new window.Image()
      preImg.onload = () => {
        const nw = preImg.naturalWidth
        const nh = preImg.naturalHeight
        if (nw > 0 && nh > 0) {
          const ratio = nw / nh
          const isSq = Math.abs(ratio - 1) <= 0.08
          const isLand = ratio > 1.05
          const detectedOrient: ArtworkOrientation = isSq ? 'square' : isLand ? 'landscape' : 'portrait'
          
          setOrientation(detectedOrient)

          // Auto-adjust width & height dimensions to match detected orientation
          const curW = parseFloat(width) || 0
          const curH = parseFloat(height) || 0
          if (isLand && curW < curH) {
            setWidth(String(curH))
            setHeight(String(curW))
            setDisplaySize(`${curH} × ${curW} ${unit}`)
          } else if (!isLand && !isSq && curW > curH) {
            setWidth(String(curH))
            setHeight(String(curW))
            setDisplaySize(`${curH} × ${curW} ${unit}`)
          } else if (isSq && curW !== curH) {
            const sqDim = Math.round((curW + curH) / 2) || 24
            setWidth(String(sqDim))
            setHeight(String(sqDim))
            setDisplaySize(`${sqDim} × ${sqDim} ${unit}`)
          }
        }
        activeCropIndexRef.current = targetIndex
        setActiveCropIndex(targetIndex)
        setImageSrcToCrop(primaryUrl)
        setCropModalOpen(true)
      }
      preImg.onerror = () => {
        activeCropIndexRef.current = targetIndex
        setActiveCropIndex(targetIndex)
        setImageSrcToCrop(primaryUrl)
        setCropModalOpen(true)
      }
      preImg.src = primaryUrl
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
      try {
        setUploadProgress('Loading image for recropping...')
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

  const handleCropComplete = (
    blob: Blob,
    cropData?: {
      orientation?: ArtworkOrientation
    }
  ) => {
    const cropIdx = activeCropIndexRef.current ?? activeCropIndex
    if (cropIdx === null) return
    const newPreview = URL.createObjectURL(blob)
    setArtworkImages((prev) =>
      prev.map((img, idx) =>
        idx === cropIdx
          ? { ...img, croppedBlob: blob, previewUrl: newPreview }
          : img
      )
    )

    if (cropData?.orientation && cropData.orientation !== orientation) {
      setOrientation(cropData.orientation)
      const curW = parseFloat(width) || 0
      const curH = parseFloat(height) || 0
      if (cropData.orientation === 'landscape' && curW < curH) {
        setWidth(String(curH))
        setHeight(String(curW))
        setDisplaySize(`${curH} × ${curW} ${unit}`)
      } else if (cropData.orientation === 'portrait' && curW > curH) {
        setWidth(String(curH))
        setHeight(String(curW))
        setDisplaySize(`${curH} × ${curW} ${unit}`)
      } else if (cropData.orientation === 'square' && curW !== curH) {
        const sqDim = Math.round((curW + curH) / 2) || 24
        setWidth(String(sqDim))
        setHeight(String(sqDim))
        setDisplaySize(`${sqDim} × ${sqDim} ${unit}`)
      }
    }

    setCropModalOpen(false)
    setActiveCropIndex(null)
    activeCropIndexRef.current = null
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setUploadProgress(null)

    if (artworkImages.length === 0) {
      setErrorMsg('Artwork image is mandatory. Please upload at least 1 image (up to 4 photos max).')
      return
    }
    if (artworkImages.length > 4) {
      setErrorMsg('Maximum 4 images allowed per artwork.')
      return
    }

    const formElement = e.currentTarget
    const formData = new FormData(formElement)

    const title = (formData.get('title') as string)?.trim()
    if (!title) {
      setErrorMsg('Artwork title is required.')
      return
    }

    const paintingType = (formData.get('painting_type') as string)?.trim()
    if (!paintingType) {
      setErrorMsg('Medium is mandatory. Please select a medium for this artwork.')
      return
    }

    formData.set('frames_json', JSON.stringify(frames))
    formData.set('width_input', width)
    formData.set('height_input', height)
    formData.set('measurement_unit_input', unit)
    formData.set('display_size', displaySize)

    // Remove direct binary upload from Server Action payload to avoid 1MB limit
    formData.delete('artwork_image')

    startTransition(async () => {
      try {
        const uploadPaintingId = initialData?.id || 'new'
        const processedPayload: any[] = []

        for (let i = 0; i < artworkImages.length; i++) {
          const item = artworkImages[i]
          const fileToUpload = item.croppedBlob || item.file

          if (fileToUpload) {
            setUploadProgress(`Uploading & optimizing image ${i + 1} of ${artworkImages.length}...`)
            const uploadData = new FormData()
            uploadData.append('paintingId', uploadPaintingId)
            uploadData.append('isPrimary', item.isPrimary ? 'true' : 'false')
            uploadData.append('sortOrder', String(i + 1))

            const fileUploadPayload =
              fileToUpload instanceof File
                ? fileToUpload
                : new File([fileToUpload], `artwork-${Date.now()}-${i + 1}.webp`, {
                    type: fileToUpload.type || 'image/webp',
                  })

            uploadData.append('image', fileUploadPayload)

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
          formData.set('advanced_images_json', JSON.stringify(processedPayload))
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
        const res = await saveArtworkAction(null, formData)
        if (res?.error) {
          setErrorMsg(res.error)
        } else {
          onClose(true) // signal that a save occurred
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save artwork.')
      } finally {
        setUploadProgress(null)
      }
    })
  }

  const primaryImageIndex = artworkImages.findIndex((img) => img.isPrimary)
  const actualPrimaryIndex = primaryImageIndex >= 0 ? primaryImageIndex : 0
  const primaryImage = artworkImages[actualPrimaryIndex]

  if (!isOpen) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 pt-10 sm:pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 relative mb-10">
        {/* Close button */}
        <button
          type="button"
          onClick={() => !isPending && onClose()}
          disabled={isPending}
          className="absolute top-5 right-5 text-gray-400 hover:text-black transition-colors p-1 rounded-lg hover:bg-gray-100 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <h2 className="font-sans text-3xl font-bold text-gray-950">
              {isEditMode ? 'Edit artwork' : 'Add new artwork'}
            </h2>
            {isEditMode && initialData?.serial_number && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-100 border border-gray-200 text-xs font-mono font-bold text-gray-900">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-normal">SERIAL</span>
                {initialData.serial_number}
              </span>
            )}
            {!isEditMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                Auto-Serial (e.g. KCG-OIL-0049)
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 font-light">
            {isEditMode
              ? 'Update the painting details below. The serial number is permanent and immutable.'
              : 'Add the painting details and a clear, high-resolution image. A permanent serial number is generated automatically.'}
          </p>
        </div>

        <div className="px-6 sm:px-8 py-6">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 font-medium">
              ⚠ {errorMsg}
            </div>
          )}

          {uploadProgress && (
            <div className="mb-5 p-3.5 rounded-lg bg-blue-50 text-blue-800 text-xs border border-blue-200 font-semibold flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {initialData?.id && (
              <input type="hidden" name="id" value={initialData.id} />
            )}

            {/* Row 1: Title | Medium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Artwork Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={initialData?.title ?? ''}
                  placeholder="River at Dusk"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
              <div>
                <CustomSelect
                  label="Medium"
                  name="painting_type"
                  required
                  defaultValue={initialData?.painting_type || ''}
                  options={[
                    { value: '', label: '-- Select Medium * --', disabled: true },
                    { value: 'oil', label: 'Oil on canvas' },
                    { value: 'acrylic', label: 'Acrylic on canvas' },
                    { value: 'mixed', label: 'Mixed Media' },
                  ]}
                />
              </div>
            </div>

            {/* Row 2: Year | Exact Medium Specification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Year
                </label>
                <input
                  name="year"
                  type="number"
                  defaultValue={initialData?.year ?? new Date().getFullYear()}
                  placeholder="2026"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Exact Medium Specification <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  name="exact_medium"
                  type="text"
                  defaultValue={initialData?.exact_medium ?? ''}
                  placeholder="e.g. Oil on Belgian linen, Acrylic on canvas"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Structured Dimensions */}
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

            {/* Row 4: Status */}
            <div>
              <CustomSelect
                label="Stock Status"
                name="availability_status"
                defaultValue={initialData?.availability_status ?? 'available'}
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'sold', label: 'Sold' },
                ]}
              />
            </div>

            {/* Price & Offer Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Regular Price, BDT <span className="text-red-500">*</span>
                </label>
                <input
                  name="base_price_bdt"
                  type="number"
                  required
                  min="0"
                  defaultValue={initialData?.base_price_bdt ?? ''}
                  placeholder="85000"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Offer Price, BDT <span className="text-xs font-normal text-gray-400 normal-case">(Optional)</span>
                </label>
                <input
                  name="discount_price_bdt"
                  type="number"
                  min="0"
                  defaultValue={initialData?.discount_price_bdt ?? ''}
                  placeholder="68000"
                  className="w-full rounded-lg border border-red-200 bg-red-50/30 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Offer Badge <span className="text-xs font-normal text-gray-400 normal-case">(Optional)</span>
                </label>
                <input
                  name="offer_badge"
                  type="text"
                  defaultValue={initialData?.offer_badge ?? ''}
                  placeholder="20% OFF or EID SALE"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Frame Options */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-gray-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200">
                <div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-gray-800">
                    Frame Options
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-light">
                    Select popular frame presets or add custom framing
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Double-Bit frame (White)')}
                    className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                    title="Quick add Double-Bit frame (White)"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Double-Bit (White)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Double-Bit frame (Black)')}
                    className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                    title="Quick add Double-Bit frame (Black)"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Double-Bit (Black)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Single-Bit frame (White)')}
                    className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                    title="Quick add Single-Bit frame (White)"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Single-Bit (White)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetFrame('Single-Bit frame (Black)')}
                    className="h-7 px-2 rounded-md border border-gray-300 bg-white hover:bg-black hover:text-white hover:border-black text-[11px] font-bold text-gray-800 flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                    title="Quick add Single-Bit frame (Black)"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Single-Bit (Black)</span>
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
                        onClick={() => handleAddPresetFrame('Double-Bit frame (White)')}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                      >
                        + Double-Bit (White)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetFrame('Double-Bit frame (Black)')}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                      >
                        + Double-Bit (Black)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetFrame('Single-Bit frame (White)')}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                      >
                        + Single-Bit (White)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddPresetFrame('Single-Bit frame (Black)')}
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded hover:border-black transition-colors"
                      >
                        + Single-Bit (Black)
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
                            Frame Finish
                          </label>
                          <select
                            value={
                              FRAME_PRESET_OPTIONS.includes(frame.frame_name.replace(/-\s+/g, '-').trim())
                                ? frame.frame_name.replace(/-\s+/g, '-').trim()
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
                                if (width && height) {
                                  const suggested = calculateSuggestedOuterSize(width, height, unit, val)
                                  const autoPrice = calculateFramePrice(val, width, height, unit)
                                  if (suggested) handleFrameChange(frame.id, 'outer_size', suggested)
                                  if (autoPrice > 0) handleFrameChange(frame.id, 'price_bdt', autoPrice)
                                }
                              }
                            }}
                            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none font-medium cursor-pointer"
                          >
                            <option value="">-- Choose Frame Preset --</option>
                            <option value="Double-Bit frame (White)">Double-Bit (White)</option>
                            <option value="Double-Bit frame (Black)">Double-Bit (Black)</option>
                            <option value="Single-Bit frame (White)">Single-Bit (White)</option>
                            <option value="Single-Bit frame (Black)">Single-Bit (Black)</option>
                          </select>
                        </div>

                        {/* Outer Size */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600">
                              Size
                            </label>
                            {width && height && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetFrameName = frame.frame_name || 'Double-Bit frame (White)'
                                  const suggested = calculateSuggestedOuterSize(width, height, unit, targetFrameName)
                                  const autoPrice = calculateFramePrice(targetFrameName, width, height, unit)
                                  if (suggested) handleFrameChange(frame.id, 'outer_size', suggested)
                                  if (autoPrice > 0) handleFrameChange(frame.id, 'price_bdt', autoPrice)
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
                            Price BDT
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
                          <X className="h-3.5 w-3.5" />
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
              <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={initialData?.description ?? ''}
                placeholder="Tell collectors about the story, texture and inspiration behind this work."
                className="w-full rounded-lg border border-gray-300 p-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all resize-none"
              />
            </div>

            {/* Artwork Images & Crop Setup (Up to 4, min 1 mandatory) */}
            <div className="border border-gray-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-900">
                      Artwork Images & Crop Setup ({artworkImages.length}/4)
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
                    htmlFor="modal_artwork_images_input"
                    className="cursor-pointer bg-black hover:bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photos ({artworkImages.length}/4)</span>
                  </label>
                )}
                <input
                  id="modal_artwork_images_input"
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
                              htmlFor="modal_artwork_images_input"
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
                          htmlFor="modal_artwork_images_input"
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
                  htmlFor="modal_artwork_images_input"
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

            {/* Publish toggles */}
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="is_published"
                    value="true"
                    defaultChecked={initialData?.is_published ?? true}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-black transition-colors duration-200"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-black transition-colors">
                  Published on website
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    name="is_featured"
                    value="true"
                    defaultChecked={initialData?.is_featured ?? false}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-black transition-colors duration-200"></div>
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"></div>
                </div>
                <span className="text-sm font-medium text-gray-800 group-hover:text-black transition-colors">
                  Featured on homepage
                </span>
              </label>
            </div>

            {/* Footer buttons */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={() => !isPending && onClose()}
                disabled={isPending}
                className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 rounded-lg bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-all shadow-sm min-w-[130px] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving…
                  </>
                ) : isEditMode ? (
                  'Update artwork'
                ) : (
                  'Add artwork'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

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
