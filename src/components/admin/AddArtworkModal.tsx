'use client'

import { useState, useTransition } from 'react'
import { X, Plus } from 'lucide-react'
import { saveArtworkModalAction } from '@/app/admin/(dashboard)/paintings/actions'

export interface FrameRow {
  id: string
  frame_name: string
  outer_size: string
  price_bdt: number | string
}

interface AddArtworkModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any // for editing
}

export default function AddArtworkModal({ isOpen, onClose, initialData }: AddArtworkModalProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Frame options dynamic list
  const [frames, setFrames] = useState<FrameRow[]>(
    initialData?.frame_options?.length > 0
      ? initialData.frame_options.map((f: any) => ({
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

  if (!isOpen) return null

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

    startTransition(async () => {
      const res = await saveArtworkModalAction(null, formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        onClose()
      }
    })
  }

  const isEditMode = Boolean(initialData?.id)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative my-8">
        
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors p-1"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pr-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-gray-950">
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
          {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}

          {/* Grid Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Artwork Title */}
            <div>
              <label htmlFor="title" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                ARTWORK TITLE
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={initialData?.title || ''}
                placeholder="River at Dusk"
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>

            {/* Painting Type */}
            <div>
              <label htmlFor="painting_type" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                PAINTING TYPE
              </label>
              <select
                id="painting_type"
                name="painting_type"
                defaultValue={initialData?.painting_type || 'oil'}
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none bg-white transition-all"
              >
                <option value="oil">Oil</option>
                <option value="acrylic">Acrylic</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            {/* Medium */}
            <div>
              <label htmlFor="exact_medium" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                MEDIUM
              </label>
              <input
                id="exact_medium"
                name="exact_medium"
                type="text"
                defaultValue={initialData?.exact_medium || 'Oil on canvas'}
                placeholder="Oil on canvas"
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>

            {/* Artwork Size */}
            <div>
              <label htmlFor="display_size" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                ARTWORK SIZE
              </label>
              <input
                id="display_size"
                name="display_size"
                type="text"
                defaultValue={initialData?.display_size || '24 × 36 in'}
                placeholder="24 × 36 in"
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>

            {/* Year */}
            <div>
              <label htmlFor="year" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                YEAR
              </label>
              <input
                id="year"
                name="year"
                type="number"
                defaultValue={initialData?.year || 2026}
                placeholder="2026"
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>

            {/* Stock Status */}
            <div>
              <label htmlFor="availability_status" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                STOCK STATUS
              </label>
              <select
                id="availability_status"
                name="availability_status"
                defaultValue={initialData?.availability_status || 'available'}
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black outline-none bg-white transition-all capitalize"
              >
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Artwork Price, BDT */}
            <div>
              <label htmlFor="base_price_bdt" className="block text-[11px] font-bold tracking-wider uppercase text-gray-800 mb-1.5">
                ARTWORK PRICE, BDT
              </label>
              <input
                id="base_price_bdt"
                name="base_price_bdt"
                type="number"
                required
                defaultValue={initialData?.base_price_bdt || 85000}
                placeholder="85000"
                className="w-full rounded-md border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>
          </div>

          {/* Frame Options Box */}
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
              defaultValue={initialData?.description || ''}
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
                htmlFor="artwork_image"
                className="cursor-pointer bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors shadow-2xs"
              >
                Choose File
              </label>
              <input
                id="artwork_image"
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
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
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
    </div>
  )
}
