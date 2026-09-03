'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, X } from 'lucide-react'
import AddArtworkModal from '@/components/admin/AddArtworkModal'
import { deletePainting, togglePublishPainting } from '@/app/admin/(dashboard)/paintings/actions'
import { getPaintingImageUrl } from '@/utils/image'

interface ManageArtworksClientProps {
  initialPaintings: any[]
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-[#EBF5EE] text-[#2D7A4D]',
  sold: 'bg-[#EFEFEF] text-[#767676]',
  reserved: 'bg-[#FEF6E7] text-[#975A16]',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'AVAILABLE',
  sold: 'SOLD',
  reserved: 'RESERVED',
}

export default function ManageArtworksClient({ initialPaintings }: ManageArtworksClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPainting, setEditingPainting] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleOpenAdd = () => {
    setEditingPainting(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (painting: any) => {
    setEditingPainting(painting)
    setIsModalOpen(true)
  }

  const handleModalClose = useCallback(
    (didSave?: boolean) => {
      setIsModalOpen(false)
      setEditingPainting(null)
      if (didSave) {
        router.refresh()
      }
    },
    [router]
  )

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"?\n\nThis will remove it from the website permanently.`)) {
      setDeletingId(id)
      startDeleteTransition(async () => {
        await deletePainting(id)
        setDeletingId(null)
        router.refresh()
      })
    }
  }

  const handleTogglePublish = (id: string, currentValue: boolean) => {
    setTogglingId(id)
    startToggleTransition(async () => {
      await togglePublishPainting(id, currentValue)
      setTogglingId(null)
      router.refresh()
    })
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return initialPaintings
    return initialPaintings.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.exact_medium?.toLowerCase().includes(q) ||
        p.painting_type?.toLowerCase().includes(q) ||
        p.availability_status?.toLowerCase().includes(q)
    )
  }, [initialPaintings, searchQuery])

  const totalCount = initialPaintings.length
  const availableCount = initialPaintings.filter(
    (p) => p.availability_status === 'available'
  ).length

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between pb-8 mb-8 border-b border-gray-200/70">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 letter-spacing-widest">
            INVENTORY
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-gray-950 mt-1 leading-tight">
            Manage artworks
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
            Update stock, pricing, framing and images from one place.
          </p>
          {/* Summary stats */}
          <div className="flex items-center gap-4 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
              {totalCount} total
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D7A4D] bg-[#EBF5EE] border border-[#c3e6cb] rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A4D] inline-block" />
              {availableCount} available
            </span>
          </div>
        </div>

        <div className="mt-6 sm:mt-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-11 px-5 rounded-xl bg-black text-white text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 transform"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add artwork</span>
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="mb-5 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, medium, type or status…"
          className="w-full sm:max-w-sm rounded-xl border border-gray-200 bg-white pl-10 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Artworks Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3.5 pl-6 pr-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Artwork
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Visible
                </th>
                <th className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((painting) => {
                  const mainImage =
                    painting.painting_images?.find((img: any) => img.is_main) ??
                    painting.painting_images?.[0]
                  const imageUrl = getPaintingImageUrl(mainImage?.storage_key)

                  const activeFrames =
                    painting.frame_options?.filter((f: any) => f.is_active) ?? []
                  const minFrame =
                    activeFrames.length > 0
                      ? Math.min(...activeFrames.map((f: any) => Number(f.price_bdt) || 0))
                      : null

                  const status = painting.availability_status ?? 'available'
                  const isPublished = painting.is_published ?? false
                  const isThisDeleting = deletingId === painting.id
                  const isThisToggling = togglingId === painting.id

                  return (
                    <tr
                      key={painting.id}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        !isPublished ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Artwork */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <Image
                              src={imageUrl}
                              alt={painting.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                              {painting.title}
                            </p>
                            <p className="text-xs text-gray-500 font-light mt-0.5 line-clamp-1">
                              {painting.exact_medium}
                              {painting.display_size
                                ? ` · ${painting.display_size}`
                                : painting.width && painting.height
                                ? ` · ${painting.width} × ${painting.height}`
                                : ''}
                            </p>
                            {painting.year && (
                              <p className="text-[11px] text-gray-400 font-light">{painting.year}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-4 text-sm text-gray-700 capitalize font-medium">
                        {painting.painting_type === 'mixed'
                          ? 'Mixed Media'
                          : painting.painting_type}
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4">
                        {painting.discount_price_bdt && Number(painting.discount_price_bdt) > 0 ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400 line-through tabular-nums">
                                &#2547;{Number(painting.base_price_bdt).toLocaleString('en-BD')}
                              </span>
                              <span className="text-sm font-bold text-red-600 tabular-nums">
                                &#2547;{Number(painting.discount_price_bdt).toLocaleString('en-BD')}
                              </span>
                            </div>
                            {painting.offer_badge && (
                              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded">
                                {painting.offer_badge}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-gray-900 tabular-nums">
                            &#2547;{Number(painting.base_price_bdt).toLocaleString('en-BD')}
                          </p>
                        )}
                        {minFrame !== null && minFrame > 0 ? (
                          <p className="text-[11px] text-gray-500 font-light mt-0.5 tabular-nums">
                            +&#2547;{minFrame.toLocaleString('en-BD')} frame
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400 font-light mt-0.5">
                            canvas only
                          </p>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full ${
                            STATUS_STYLES[status] ?? STATUS_STYLES.available
                          }`}
                        >
                          {STATUS_LABELS[status] ?? 'UNKNOWN'}
                        </span>
                      </td>

                      {/* Publish toggle */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          disabled={isThisToggling || isToggling}
                          onClick={() => handleTogglePublish(painting.id, isPublished)}
                          title={isPublished ? 'Click to unpublish' : 'Click to publish'}
                          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all ${
                            isPublished
                              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                              : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-green-50 hover:border-green-200 hover:text-green-700'
                          } ${isThisToggling ? 'opacity-50' : ''}`}
                        >
                          {isPublished ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(painting)}
                            className="h-9 w-9 rounded-xl border border-gray-200 hover:border-gray-400 bg-white text-gray-600 hover:text-black flex items-center justify-center transition-all shadow-2xs hover:shadow"
                            title="Edit artwork"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isThisDeleting || isDeleting}
                            onClick={() => handleDelete(painting.id, painting.title)}
                            className={`h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center transition-all shadow-2xs hover:shadow ${
                              isThisDeleting
                                ? 'opacity-50 cursor-not-allowed'
                                : 'text-red-500 hover:text-red-700 hover:border-red-200'
                            }`}
                            title="Delete artwork"
                          >
                            {isThisDeleting ? (
                              <svg
                                className="animate-spin h-4 w-4 text-red-400"
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
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    {searchQuery ? (
                      <>
                        <p className="text-lg font-serif text-gray-800 mb-1">
                          No results for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-sm text-gray-400 font-light">
                          Try a different title, medium or type.
                        </p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-4 text-sm text-black underline font-medium"
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-serif text-gray-900 mb-1">
                          No artworks added yet.
                        </p>
                        <p className="text-sm text-gray-400 mb-5 font-light">
                          Click &ldquo;Add artwork&rdquo; above to add your first painting.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAdd}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                          Add artwork
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400 font-light">
              Showing {filtered.length} of {totalCount} artwork{totalCount !== 1 ? 's' : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal — key forces remount when editing a different painting */}
      <AddArtworkModal
        key={isModalOpen ? (editingPainting?.id ?? 'new') : 'closed'}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialData={editingPainting}
      />
    </div>
  )
}
