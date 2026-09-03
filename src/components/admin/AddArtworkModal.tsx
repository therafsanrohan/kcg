'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { X, Plus, ImageIcon } from 'lucide-react'
import { saveArtworkAction } from '@/app/admin/(dashboard)/paintings/actions'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'

export interface FrameRow {
  id: string
  frame_name: string
  outer_size: string
  price_bdt: number | string
}

interface AddArtworkModalProps {
  isOpen: boolean
  onClose: (didSave?: boolean) => void
  initialData?: any
}

function makeDefaultFrames(data: any): FrameRow[] {
  if (data?.frame_options?.length > 0) {
    return data.frame_options.map((f: any) => ({
      id: f.id || Math.random().toString(36),
      frame_name: f.frame_name || '',
      outer_size: f.outer_size || '',
      price_bdt: f.price_bdt ?? 0,
    }))
  }
  return []
}

export default function AddArtworkModal({
  isOpen,
  onClose,
  initialData,
}: AddArtworkModalProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [frames, setFrames] = useState<FrameRow[]>(() => makeDefaultFrames(initialData))
  const [selectedFileName, setSelectedFileName] = useState<string>('no file selected')

  const isEditMode = Boolean(initialData?.id)

  // Reset form state whenever initialData changes (new edit target or cleared for new)
  useEffect(() => {
    setFrames(makeDefaultFrames(initialData))
    setSelectedFileName('no file selected')
    setErrorMsg(null)
  }, [initialData?.id])

  const handleAddFrame = useCallback(() => {
    setFrames((prev) => [
      ...prev,
      { id: Math.random().toString(36), frame_name: '', outer_size: '', price_bdt: 0 },
    ])
  }, [])

  const handleRemoveFrame = useCallback((id: string) => {
    setFrames((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleFrameChange = useCallback(
    (id: string, field: keyof FrameRow, val: string) => {
      setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: val } : f)))
    },
    []
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFileName(e.target.files?.[0]?.name ?? 'no file selected')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)
    formData.set('frames_json', JSON.stringify(frames))

    startTransition(async () => {
      const res = await saveArtworkAction(null, formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else {
        onClose(true) // signal that a save occurred
      }
    })
  }

  // Existing image for edit mode
  const existingImage = isEditMode
    ? initialData?.painting_images?.find((img: any) => img.is_main) ??
      initialData?.painting_images?.[0]
    : null
  const existingImageUrl = existingImage ? getPaintingImageUrl(existingImage.storage_key) : null

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
          <h2 className="font-serif text-3xl font-normal text-gray-950 pr-8">
            {isEditMode ? 'Edit artwork' : 'Add new artwork'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 font-light">
            {isEditMode
              ? 'Update the painting details below.'
              : 'Add the painting details and a clear, high-resolution image.'}
          </p>
        </div>

        <div className="px-6 sm:px-8 py-6">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 font-medium">
              ⚠ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {initialData?.id && (
              <input type="hidden" name="id" value={initialData.id} />
            )}

            {/* Row 1: Title | Type */}
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
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Painting Type
                </label>
                <select
                  name="painting_type"
                  defaultValue={initialData?.painting_type ?? 'oil'}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white transition-all"
                >
                  <option value="oil">Oil</option>
                  <option value="acrylic">Acrylic</option>
                  <option value="mixed">Mixed Media</option>
                </select>
              </div>
            </div>

            {/* Row 2: Medium | Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Medium
                </label>
                <input
                  name="exact_medium"
                  type="text"
                  defaultValue={initialData?.exact_medium ?? 'Oil on canvas'}
                  placeholder="Oil on canvas"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                  Artwork Size
                </label>
                <input
                  name="display_size"
                  type="text"
                  defaultValue={initialData?.display_size ?? '24 × 36 in'}
                  placeholder="24 × 36 in"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Row 3: Year | Status */}
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
                  Stock Status
                </label>
                <select
                  name="availability_status"
                  defaultValue={initialData?.availability_status ?? 'available'}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white transition-all"
                >
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </select>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                Artwork Price, BDT <span className="text-red-500">*</span>
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

            {/* Frame Options */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50/80 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                <div>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-gray-700">
                    Frame Options
                  </span>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-light">
                    Add framing options with price
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFrame}
                  className="h-8 px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 flex items-center gap-1.5 hover:border-gray-500 hover:bg-gray-50 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add frame
                </button>
              </div>

              <div className="p-4 space-y-3">
                {frames.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2 font-light italic">
                    No frames added yet. Click &quot;Add frame&quot; to add one.
                  </p>
                ) : (
                  frames.map((frame) => (
                    <div
                      key={frame.id}
                      className="grid grid-cols-[1fr_120px_100px_36px] gap-2 items-end"
                    >
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                          Frame Finish
                        </label>
                        <input
                          type="text"
                          value={frame.frame_name}
                          onChange={(e) =>
                            handleFrameChange(frame.id, 'frame_name', e.target.value)
                          }
                          placeholder="Natural oak"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1">
                          Size
                        </label>
                        <input
                          type="text"
                          value={frame.outer_size}
                          onChange={(e) =>
                            handleFrameChange(frame.id, 'outer_size', e.target.value)
                          }
                          placeholder="27 × 39 in"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none"
                        />
                      </div>
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
                          placeholder="0"
                          className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 bg-white focus:border-black outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFrame(frame.id)}
                        className="h-8 w-9 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-600 hover:border-red-200 bg-white transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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

            {/* Image Upload */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                Artwork Image
              </label>

              {/* Current image preview for edit mode */}
              {existingImageUrl && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="relative h-14 w-14 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                    <Image
                      src={existingImageUrl}
                      alt="Current artwork"
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Current image</p>
                    <p className="text-[11px] text-gray-500 font-light">
                      Upload a new file below to replace it
                    </p>
                  </div>
                </div>
              )}

              {/* No image placeholder for edit mode */}
              {isEditMode && !existingImageUrl && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <div className="h-14 w-14 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 font-light">No image added yet</p>
                </div>
              )}

              <div className="border border-gray-300 rounded-lg p-2 flex items-center gap-3 bg-white">
                <label
                  htmlFor="modal_artwork_image"
                  className="cursor-pointer bg-black text-white text-xs font-semibold px-3.5 py-1.5 rounded-md hover:bg-gray-800 transition-colors flex-shrink-0"
                >
                  Choose File
                </label>
                <input
                  id="modal_artwork_image"
                  name="artwork_image"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-xs text-gray-500 font-mono truncate">
                  {selectedFileName}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400 font-light">
                JPG, PNG or WebP · up to 12 MB · use a sharp, straight-on photo
              </p>
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
    </div>
  )
}
