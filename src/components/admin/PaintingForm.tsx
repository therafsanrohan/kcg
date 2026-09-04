'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { savePainting } from '@/app/admin/(dashboard)/paintings/actions'
import { Painting } from '@/types'
import { MeasurementUnit, parseLegacyDisplaySize, fromMm } from '@/utils/measurements'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
      const val = fromMm(painting.width_mm, initialUnit)
      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    }
    return initialParsed?.width ? String(initialParsed.width) : painting?.width ? String(painting.width) : '24'
  })
  const [height, setHeight] = useState<string>(() => {
    if (painting?.height_mm) {
      const val = fromMm(painting.height_mm, initialUnit)
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

  const [frames, setFrames] = useState<FrameRow[]>(
    painting?.frame_options?.length
      ? painting.frame_options.map((f: any) => ({
          id: f.id || Math.random().toString(),
          frame_name: f.frame_name,
          outer_size: f.outer_size || '',
          price_bdt: f.price_bdt || 0,
        }))
      : [
          {
            id: '1',
            frame_name: 'Natural oak',
            outer_size: '27 × 39 in',
            price_bdt: 0,
          },
        ]
  )

  const [selectedFileName, setSelectedFileName] = useState<string>('no file selected')

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name)
    } else {
      setSelectedFileName('no file selected')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)
    formData.set('frames_json', JSON.stringify(frames))
    formData.set('width_input', width)
    formData.set('height_input', height)
    formData.set('measurement_unit_input', unit)
    formData.set('display_size', displaySize)

    startTransition(async () => {
      const res = await savePainting(null, formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        router.push('/admin')
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
            <label htmlFor="painting_type" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              PAINTING TYPE
            </label>
            <select
              id="painting_type"
              name="painting_type"
              defaultValue={painting?.painting_type || 'oil'}
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none bg-white transition-all"
            >
              <option value="oil">Oil</option>
              <option value="acrylic">Acrylic</option>
              <option value="mixed">Mixed</option>
            </select>
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
          <div className="sm:col-span-2 bg-[#FAF9F6] border border-gray-200/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold tracking-wider uppercase text-gray-800">
                ARTWORK DIMENSIONS & DISPLAY SIZE
              </label>
              <span className="text-[10px] text-gray-500 font-medium">Automatic conversion enabled</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                  WIDTH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  placeholder="24"
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 bg-white focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                  HEIGHT
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  placeholder="36"
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 bg-white focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                  UNIT
                </label>
                <select
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value as MeasurementUnit)}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 bg-white focus:border-black outline-none"
                >
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimeters (cm)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                  DISPLAY TEXT
                </label>
                <input
                  type="text"
                  value={displaySize}
                  onChange={(e) => setDisplaySize(e.target.value)}
                  placeholder="24 × 36 in"
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 bg-white focus:border-black outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="availability_status" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
              STOCK STATUS
            </label>
            <select
              id="availability_status"
              name="availability_status"
              defaultValue={painting?.availability_status || 'available'}
              className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none bg-white transition-all capitalize"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
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
            ARTWORK IMAGE
          </label>
          <div className="border border-gray-300 rounded-md p-2 flex items-center gap-3 bg-white">
            <label
              htmlFor="artwork_image_standalone"
              className="cursor-pointer bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-2xs"
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
          <p className="mt-1.5 text-[11px] text-gray-400 font-light">
            JPG, PNG or WebP, up to 12 MB. Use a sharp, straight-on image.
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
    </div>
  )
}
