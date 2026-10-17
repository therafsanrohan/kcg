'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Crop, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { savePainting } from '@/app/admin/(dashboard)/paintings/actions'
import { Painting } from '@/types'
import { MeasurementUnit, parseLegacyDisplaySize, fromCanonicalMm, formatDimensions } from '@/utils/measurements'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ImageCropperModal from './ImageCropperModal'
import DimensionInputGroup from './DimensionInputGroup'
import CustomSelect from '@/components/ui/CustomSelect'

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
  const [displaySize, setDisplaySize] = useState<string>(
    painting?.display_size || `${width} × ${height} ${unit}`
  )

  const handleWidthChange = (newW: string) => {
    setWidth(newW)
    if (newW && height) {
      setDisplaySize(`${newW} × ${height} ${unit}`)
    }
  }

  const handleHeightChange = (newH: string) => {
    setHeight(newH)
    if (width && newH) {
      setDisplaySize(`${width} × ${newH} ${unit}`)
    }
  }

  const handleUnitChange = (newUnit: MeasurementUnit) => {
    setUnit(newUnit)
    if (width && height) {
      setDisplaySize(`${width} × ${height} ${newUnit}`)
    }
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
    return [
      {
        id: 'frame-default',
        frame_name: 'Natural oak',
        outer_size: '27 × 39 in',
        price_bdt: 0,
      },
    ]
  })

  const [selectedFileName, setSelectedFileName] = useState<string>('no file selected')
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageSrcToCrop, setImageSrcToCrop] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null)

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(`Selected file is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maximum allowed size is 5.0 MB.`)
        clearSelectedImage()
        return
      }
      setErrorMsg(null)
      setSelectedFile(file)
      setSelectedFileName(file.name)
      const objUrl = URL.createObjectURL(file)
      setImageSrcToCrop(objUrl)
      setCropModalOpen(true)
    } else {
      clearSelectedImage()
    }
  }

  const clearSelectedImage = () => {
    setSelectedFileName('no file selected')
    setSelectedFile(null)
    if (imageSrcToCrop) {
      URL.revokeObjectURL(imageSrcToCrop)
    }
    if (cropPreviewUrl) {
      URL.revokeObjectURL(cropPreviewUrl)
    }
    setImageSrcToCrop(null)
    setCroppedBlob(null)
    setCropPreviewUrl(null)
    const fileInput = document.getElementById('artwork_image_standalone') as HTMLInputElement | null
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob)
    setCropPreviewUrl(URL.createObjectURL(blob))
    setCropModalOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setUploadProgress(null)
    const formData = new FormData(e.currentTarget)
    formData.set('frames_json', JSON.stringify(frames))
    formData.set('width_input', width)
    formData.set('height_input', height)
    formData.set('measurement_unit_input', unit)
    formData.set('display_size', displaySize)

    // Remove raw binary from Server Action payload
    formData.delete('artwork_image')

    const fileToUpload = croppedBlob || selectedFile

    startTransition(async () => {
      try {
        if (fileToUpload) {
          setUploadProgress('Uploading & optimizing high-resolution artwork...')
          const uploadData = new FormData()
          const uploadPaintingId = painting?.id || 'new'
          uploadData.append('paintingId', uploadPaintingId)
          uploadData.append('isPrimary', 'true')
          uploadData.append('sortOrder', '1')

          const filePayload = fileToUpload instanceof File
            ? fileToUpload
            : new File([fileToUpload], `artwork-${Date.now()}.webp`, { type: fileToUpload.type || 'image/webp' })

          uploadData.append('image', filePayload)

          const uploadRes = await fetch('/api/images/upload', {
            method: 'POST',
            body: uploadData,
          })

          const jsonRes = await uploadRes.json()
          if (!uploadRes.ok || !jsonRes.success) {
            throw new Error(jsonRes.error || 'Failed to process and upload image.')
          }

          formData.set('uploaded_image_json', JSON.stringify(jsonRes.data))
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
              onWidthChange={handleWidthChange}
              onHeightChange={handleHeightChange}
              onUnitChange={handleUnitChange}
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

        {/* Artwork Image Upload */}
        <div>
          <label className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
            ARTWORK IMAGE (4:5 GALLERY RATIO)
          </label>

          {/* 4:5 Cropped Preview if available */}
          {cropPreviewUrl && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-4">
              <div className="relative w-16 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                <Image
                  src={cropPreviewUrl}
                  alt="4:5 Crop preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  4:5 Gallery Crop Ready
                </p>
                <p className="text-[11px] text-gray-500">
                  Image optimized and framed to 4:5 portrait ratio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCropModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Recrop</span>
              </button>
            </div>
          )}

          <div className="border border-gray-300 rounded-md p-2 flex items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <label
                htmlFor="artwork_image_standalone"
                className="cursor-pointer bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-2xs flex-shrink-0"
              >
                Choose File
              </label>
              <input
                id="artwork_image_standalone"
                name="artwork_image"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-xs text-gray-600 font-mono truncate">
                {selectedFileName}
              </span>
            </div>

            {(cropPreviewUrl || selectedFileName !== 'no file selected') && (
              <button
                type="button"
                onClick={clearSelectedImage}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded transition-colors flex items-center gap-1 flex-shrink-0"
                title="Remove selected image"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="mt-1.5 text-[11px] text-gray-400 font-light">
            JPG, PNG or WebP, up to 12 MB. Selecting an image automatically opens the 4:5 portrait cropper.
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

      {/* 4:5 Aspect Ratio Image Cropper Modal */}
      {cropModalOpen && imageSrcToCrop && (
        <ImageCropperModal
          isOpen={cropModalOpen}
          imageSrc={imageSrcToCrop}
          onClose={() => setCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
