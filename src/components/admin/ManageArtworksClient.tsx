'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import AddArtworkModal from '@/components/admin/AddArtworkModal'
import { deletePainting } from '@/app/admin/(dashboard)/paintings/actions'
import { getPaintingImageUrl } from '@/utils/image'

interface ManageArtworksClientProps {
  initialPaintings: any[]
}

export default function ManageArtworksClient({ initialPaintings }: ManageArtworksClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPainting, setEditingPainting] = useState<any | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const handleOpenAdd = () => {
    setEditingPainting(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (painting: any) => {
    setEditingPainting(painting)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      startDeleteTransition(async () => {
        await deletePainting(id)
      })
    }
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between pb-8 mb-8 border-b border-gray-200/60">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            INVENTORY
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-gray-950 mt-1">
            Manage artworks
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 font-light">
            Update stock, pricing, framing and images from one place.
          </p>
        </div>

        <div className="mt-6 sm:mt-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-11 px-5 rounded-lg bg-black text-white text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add artwork</span>
          </button>
        </div>
      </div>

      {/* Artworks Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="py-4 pl-6 pr-4 text-xs font-semibold text-gray-900 tracking-wider">
                  Artwork
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-900 tracking-wider">
                  Type
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-900 tracking-wider">
                  Price
                </th>
                <th className="py-4 px-4 text-xs font-semibold text-gray-900 tracking-wider">
                  Status
                </th>
                <th className="py-4 pr-6 pl-4 text-right text-xs font-semibold text-gray-900 tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {initialPaintings && initialPaintings.length > 0 ? (
                initialPaintings.map((painting) => {
                  const mainImage =
                    painting.painting_images?.find((img: any) => img.is_main) ||
                    painting.painting_images?.[0]
                  const imageUrl = getPaintingImageUrl(mainImage?.storage_key)

                  // Minimum frame price
                  const activeFrames = painting.frame_options?.filter((f: any) => f.is_active) || []
                  const minFrame = activeFrames.length > 0
                    ? Math.min(...activeFrames.map((f: any) => Number(f.price_bdt) || 0))
                    : null

                  const status = painting.availability_status || 'available'

                  return (
                    <tr key={painting.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Artwork Thumbnail + Info */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <Image
                              src={imageUrl}
                              alt={painting.title}
                              fill
                              sizes="56px"
                              className="object-cover object-center"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">
                              {painting.title}
                            </p>
                            <p className="text-xs text-gray-500 font-light mt-0.5">
                              {painting.exact_medium} &bull; {painting.display_size || `${painting.width} &times; ${painting.height} in`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-4 text-sm font-medium text-gray-900 capitalize">
                        {painting.painting_type === 'mixed' ? 'Mixed Media' : painting.painting_type}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        <p className="text-sm font-bold text-gray-900 font-mono">
                          &#2547;{Number(painting.base_price_bdt).toLocaleString('en-BD')}
                        </p>
                        {minFrame !== null && minFrame > 0 ? (
                          <p className="text-[11px] text-gray-500 font-light mt-0.5">
                            Frame from +&#2547;{minFrame.toLocaleString('en-BD')}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 font-light mt-0.5">
                            Canvas only
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {status === 'available' && (
                          <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-[#EBF5EE] text-[#2D7A4D]">
                            AVAILABLE
                          </span>
                        )}
                        {status === 'sold' && (
                          <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-[#EFEFEF] text-[#767676]">
                            SOLD
                          </span>
                        )}
                        {status === 'reserved' && (
                          <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded bg-[#FEF6E7] text-[#975A16]">
                            RESERVED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(painting)}
                            className="h-9 w-9 rounded-lg border border-gray-200 hover:border-gray-400 bg-white text-gray-700 hover:text-black flex items-center justify-center transition-all shadow-2xs"
                            title="Edit artwork"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(painting.id, painting.title)}
                            className="h-9 w-9 rounded-lg border border-gray-200 hover:border-red-300 bg-white text-red-500 hover:text-red-700 flex items-center justify-center transition-all shadow-2xs"
                            title="Delete artwork"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-500">
                    <p className="text-base font-serif text-gray-900 mb-1">No artworks added yet.</p>
                    <p className="text-sm text-gray-400 mb-4 font-light">
                      Click &quot;Add artwork&quot; above to add your first painting.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add artwork</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AddArtworkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingPainting}
      />
    </div>
  )
}
