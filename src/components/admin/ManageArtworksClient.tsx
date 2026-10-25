'use client'

import React, { useState, useTransition, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  X,
  Star,
  Sparkles,
  ArrowUpRight,
  Tag,
  Percent,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import AddArtworkModal from '@/components/admin/AddArtworkModal'
import BulkOfferModal from '@/components/admin/BulkOfferModal'
import AnnouncementPromptModal from '@/components/admin/AnnouncementPromptModal'
import {
  deletePainting,
  togglePublishPainting,
  toggleFeaturedPainting,
  bulkUpdateVisibilityAction,
  bulkApplyOfferAction,
  bulkRemoveOfferAction,
} from '@/app/admin/(dashboard)/paintings/actions'
import { getPaintingImageUrl } from '@/utils/image'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import { formatMedium } from '@/utils/measurements'

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
  const { toast, confirm: confirmModal } = useAdminFeedback()

  // ── Existing Modal & Action States ──
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPainting, setEditingPainting] = useState<any | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()
  const [isFeaturing, startFeaturingTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [featuringId, setFeaturingId] = useState<string | null>(null)

  // ── Search & Filter States ──
  const [searchQuery, setSearchQuery] = useState('')
  const [mediumFilter, setMediumFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [offerFilter, setOfferFilter] = useState('all')

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // ── Selection States (Modes A, B, C) ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  // ── Bulk Actions Modal & Loading States ──
  const [isBulkOfferOpen, setIsBulkOfferOpen] = useState(false)
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  // ── Announcement Prompt Modal State (Triggers after offer application) ──
  const [isAnnouncementPromptOpen, setIsAnnouncementPromptOpen] = useState(false)
  const [promptOfferCount, setPromptOfferCount] = useState(1)
  const [promptDefaultBadge, setPromptDefaultBadge] = useState('Special Offer')

  // ── Reset selection when filters change to prevent accidental bulk actions ──
  useEffect(() => {
    setCurrentPage(1)
    if (selectAllMatching) {
      setSelectAllMatching(false)
    }
  }, [searchQuery, mediumFilter, statusFilter, visibilityFilter, offerFilter])

  // ── Filtered Artworks ──
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return initialPaintings.filter((p) => {
      // Search matching
      if (q) {
        const matchesQuery =
          p.title?.toLowerCase().includes(q) ||
          p.serial_number?.toLowerCase().includes(q) ||
          formatMedium(p.painting_type).toLowerCase().includes(q) ||
          p.painting_type?.toLowerCase().includes(q) ||
          p.availability_status?.toLowerCase().includes(q)
        if (!matchesQuery) return false
      }

      // Medium filter
      if (mediumFilter !== 'all' && p.painting_type !== mediumFilter) {
        return false
      }

      // Availability status filter
      if (statusFilter !== 'all' && p.availability_status !== statusFilter) {
        return false
      }

      // Visibility filter
      if (visibilityFilter === 'published' && !p.is_published) return false
      if (visibilityFilter === 'unpublished' && p.is_published) return false

      // Offer filter (matches both discounted price or offer badge)
      const hasOffer = Boolean((p.discount_price_bdt && Number(p.discount_price_bdt) > 0) || p.offer_badge)
      if (offerFilter === 'with_offer' && !hasOffer) return false
      if (offerFilter === 'without_offer' && hasOffer) return false

      return true
    })
  }, [initialPaintings, searchQuery, mediumFilter, statusFilter, visibilityFilter, offerFilter])

  // ── Pagination Calculations ──
  const totalFilteredCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedPaintings = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return filtered.slice(startIndex, startIndex + pageSize)
  }, [filtered, safeCurrentPage, pageSize])

  const currentPageIds = useMemo(
    () => paginatedPaintings.map((p) => p.id),
    [paginatedPaintings]
  )

  // ── Selection Status ──
  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedPaintings.length === 0) return false
    return paginatedPaintings.every((p) => selectedIds.has(p.id))
  }, [paginatedPaintings, selectedIds])

  const isSomeCurrentPageSelected = useMemo(() => {
    if (isAllCurrentPageSelected) return false
    return paginatedPaintings.some((p) => selectedIds.has(p.id))
  }, [paginatedPaintings, selectedIds, isAllCurrentPageSelected])

  // Count of currently selected items
  const selectedCount = selectAllMatching ? totalFilteredCount : selectedIds.size

  // Artworks currently selected (for bulk modal preview)
  const selectedArtworks = useMemo(() => {
    if (selectAllMatching) {
      return filtered
    }
    return initialPaintings.filter((p) => selectedIds.has(p.id))
  }, [selectAllMatching, filtered, initialPaintings, selectedIds])

  // ── Selection Handlers ──
  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selectAllMatching) {
        // If transitioning from Mode C to individual deselection, populate all filtered minus deselected
        const allFilteredIds = filtered.map((p) => p.id)
        allFilteredIds.forEach((fid) => next.add(fid))
        next.delete(id)
        setSelectAllMatching(false)
      } else {
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }

  const handleToggleSelectPage = () => {
    if (isAllCurrentPageSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentPageIds.forEach((id) => next.delete(id))
        return next
      })
      setSelectAllMatching(false)
    } else {
      // Select all on current page (Mode B)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        currentPageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handleSelectAllMatching = () => {
    setSelectAllMatching(true)
    const allFilteredIds = filtered.map((p) => p.id)
    setSelectedIds(new Set(allFilteredIds))
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
    setSelectAllMatching(false)
  }

  const isFilterActive =
    searchQuery.trim() !== '' ||
    mediumFilter !== 'all' ||
    statusFilter !== 'all' ||
    visibilityFilter !== 'all' ||
    offerFilter !== 'all'

  const handleResetFilters = () => {
    setSearchQuery('')
    setMediumFilter('all')
    setStatusFilter('all')
    setVisibilityFilter('all')
    setOfferFilter('all')
    setCurrentPage(1)
  }

  // ── Bulk Actions Handlers ──
  const getTargetIds = (): string[] => {
    if (selectAllMatching) {
      return filtered.map((p) => p.id)
    }
    return Array.from(selectedIds)
  }

  const handleApplyOfferConfirm = async (
    type: 'percentage' | 'fixed',
    val: number,
    badge: string | null
  ) => {
    const ids = getTargetIds()
    if (ids.length === 0) return

    setIsBulkLoading(true)
    try {
      const res = await bulkApplyOfferAction(ids, type, val, badge)
      setIsBulkOfferOpen(false)
      handleClearSelection()
      if (res.success) {
        toast(res.message, 'success')
        router.refresh()
        // Prompt admin to immediately configure / activate the Top Announcement Bar
        setPromptOfferCount(ids.length)
        setPromptDefaultBadge(badge || 'Special Offer')
        setIsAnnouncementPromptOpen(true)
      } else {
        toast(res.error || res.message, 'error')
      }
    } catch (err: any) {
      toast(err.message || 'Failed to apply offer in bulk.', 'error')
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleBulkRemoveOffer = () => {
    const ids = getTargetIds()
    if (ids.length === 0) return

    confirmModal({
      title: 'Remove Offers in Bulk',
      message: `Are you sure you want to remove active offers from ${ids.length} selected artwork${
        ids.length !== 1 ? 's' : ''
      }? Original base prices will remain strictly untouched.`,
      confirmText: `Remove Offers (${ids.length})`,
      isDestructive: false,
      onConfirm: async () => {
        setIsBulkLoading(true)
        try {
          const res = await bulkRemoveOfferAction(ids)
          handleClearSelection()
          if (res.success) {
            toast(res.message, 'success')
            router.refresh()
          } else {
            toast(res.error || res.message, 'error')
          }
        } catch (err: any) {
          toast(err.message || 'Failed to remove offers.', 'error')
        } finally {
          setIsBulkLoading(false)
        }
      },
    })
  }

  const handleBulkVisibility = (isPublished: boolean) => {
    const ids = getTargetIds()
    if (ids.length === 0) return

    const actionText = isPublished ? 'Publish' : 'Hide'
    confirmModal({
      title: `${actionText} Selected Artworks`,
      message: isPublished
        ? `Publish ${ids.length} selected artwork${
            ids.length !== 1 ? 's' : ''
          } to the public gallery? Artworks without any uploaded images will be safely skipped.`
        : `Hide ${ids.length} selected artwork${
            ids.length !== 1 ? 's' : ''
          }? They will be immediately hidden from the public gallery and customer view, while all artwork data and images remain completely safe.`,
      confirmText: `${actionText} (${ids.length})`,
      isDestructive: !isPublished,
      onConfirm: async () => {
        setIsBulkLoading(true)
        try {
          const res = await bulkUpdateVisibilityAction(ids, isPublished)
          handleClearSelection()
          if (res.success) {
            toast(res.message, 'success')
            router.refresh()
          } else {
            toast(res.error || res.message, 'error')
          }
        } catch (err: any) {
          toast(err.message || `Failed to update visibility in bulk.`, 'error')
        } finally {
          setIsBulkLoading(false)
        }
      },
    })
  }

  // ── Individual Actions ──
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
    confirmModal({
      title: 'Delete Artwork',
      message: `Are you sure you want to delete "${title}"? This will permanently remove the artwork and all associated images from the website.`,
      confirmText: 'Delete Permanently',
      isDestructive: true,
      onConfirm: () => {
        setDeletingId(id)
        startDeleteTransition(async () => {
          const res = await deletePainting(id)
          setDeletingId(null)
          if (res?.success) {
            toast(`"${title}" was deleted successfully.`, 'success')
            router.refresh()
          } else {
            toast(res?.error || 'Failed to delete painting.', 'error')
          }
        })
      },
    })
  }

  const handleTogglePublish = (id: string, currentValue: boolean) => {
    setTogglingId(id)
    startToggleTransition(async () => {
      const res = await togglePublishPainting(id, currentValue)
      setTogglingId(null)
      if (res?.success) {
        toast(`Visibility updated to ${!currentValue ? 'Published' : 'Hidden'}.`, 'success')
        router.refresh()
      } else {
        toast(res?.error || 'Failed to update visibility.', 'error')
      }
    })
  }

  const handleToggleFeatured = (id: string, currentValue: boolean, title: string) => {
    setFeaturingId(id)
    startFeaturingTransition(async () => {
      const res = await toggleFeaturedPainting(id, currentValue)
      setFeaturingId(null)
      if (res?.success) {
        toast(
          !currentValue
            ? `"${title}" is now set as the Homepage Exhibition Spotlight!`
            : `"${title}" removed from homepage spotlight.`,
          'success'
        )
        router.refresh()
      } else {
        toast(res?.error || 'Failed to update featured spotlight.', 'error')
      }
    })
  }

  const currentFeatured = useMemo(() => {
    return initialPaintings.find((p) => p.is_featured) || null
  }, [initialPaintings])

  const totalCount = initialPaintings.length
  const availableCount = initialPaintings.filter(
    (p) => p.availability_status === 'available'
  ).length
  const reservedCount = initialPaintings.filter(
    (p) => p.availability_status === 'reserved'
  ).length
  const publishedCount = initialPaintings.filter((p) => p.is_published).length
  const unpublishedCount = initialPaintings.filter((p) => !p.is_published).length
  const withOfferCount = initialPaintings.filter(
    (p) => (p.discount_price_bdt && Number(p.discount_price_bdt) > 0) || p.offer_badge
  ).length

  return (
    <div className="pb-24">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between pb-8 mb-8 border-b border-gray-200/70">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 letter-spacing-widest">
            INVENTORY MANAGEMENT
          </span>
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
            Manage artworks
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
            Search, filter, edit individual works, or apply offers and visibility in bulk.
          </p>
          {/* Summary stats */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {/* Total */}
            <button
              type="button"
              onClick={handleResetFilters}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                !isFilterActive
                  ? 'bg-black text-white shadow-xs ring-1 ring-black'
                  : 'text-gray-700 bg-white border border-gray-200 hover:border-gray-400'
              }`}
              title="Click to reset filters and view all"
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${!isFilterActive ? 'bg-white' : 'bg-gray-400'}`} />
              {totalCount} total
            </button>

            {/* Available */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === 'available' ? 'all' : 'available')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                statusFilter === 'available'
                  ? 'bg-[#2D7A4D] text-white shadow-xs ring-1 ring-[#2D7A4D]'
                  : 'text-[#2D7A4D] bg-[#EBF5EE] border border-[#c3e6cb] hover:bg-[#d4edd9]'
              }`}
              title="Click to filter Available artworks"
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusFilter === 'available' ? 'bg-white' : 'bg-[#2D7A4D]'}`} />
              {availableCount} available
            </button>

            {/* Active (Published) */}
            <button
              type="button"
              onClick={() => {
                setVisibilityFilter(visibilityFilter === 'published' ? 'all' : 'published')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                visibilityFilter === 'published'
                  ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600'
                  : 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100/80'
              }`}
              title="Click to filter Active (Published) artworks"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{publishedCount} active</span>
            </button>

            {/* Inactive (Unpublished) */}
            <button
              type="button"
              onClick={() => {
                setVisibilityFilter(visibilityFilter === 'unpublished' ? 'all' : 'unpublished')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                visibilityFilter === 'unpublished'
                  ? 'bg-gray-700 text-white shadow-xs ring-1 ring-gray-700'
                  : 'text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200/80'
              }`}
              title="Click to filter Inactive (Hidden) artworks"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{unpublishedCount} inactive</span>
            </button>

            {/* Reserved */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter(statusFilter === 'reserved' ? 'all' : 'reserved')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                statusFilter === 'reserved'
                  ? 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-600'
                  : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100/80'
              }`}
              title="Click to filter Reserved artworks"
            >
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusFilter === 'reserved' ? 'bg-white' : 'bg-amber-500'}`} />
              {reservedCount} reserved
            </button>

            {/* On Offer */}
            <button
              type="button"
              onClick={() => {
                setOfferFilter(offerFilter === 'with_offer' ? 'all' : 'with_offer')
                setCurrentPage(1)
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 transition-all cursor-pointer ${
                offerFilter === 'with_offer'
                  ? 'bg-red-600 text-white ring-2 ring-red-600/30 shadow-xs'
                  : 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100/80'
              }`}
              title="Click to toggle offer filter"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{withOfferCount} on offer</span>
            </button>
            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-amber-200/80 border border-amber-300 rounded-full px-3 py-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-800" />
                {selectedCount} selected
              </span>
            )}
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

      {/* ── Homepage Exhibition Spotlight Card ── */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/30 to-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-900 flex items-center gap-1.5">
              <span>Homepage Exhibition Spotlight</span>
              {currentFeatured && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              )}
            </div>
            {currentFeatured ? (
              <div className="font-semibold text-gray-950 text-sm mt-0.5">
                {currentFeatured.title}{' '}
                <span className="text-xs text-gray-600 font-normal">
                  ({formatMedium(currentFeatured.painting_type)}
                  {currentFeatured.display_size ? ` · ${currentFeatured.display_size}` : ''})
                </span>
              </div>
            ) : (
              <div className="text-xs text-amber-800 font-light mt-0.5">
                No specific artwork is marked as Spotlight. Homepage currently defaults to newest artwork. Click &ldquo;Set Spotlight&rdquo; on any artwork below to feature it.
              </div>
            )}
          </div>
        </div>

        {currentFeatured && (
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-gray-900 text-xs font-semibold border border-amber-200 hover:border-black transition-all shrink-0 self-start sm:self-auto shadow-2xs"
          >
            <span>View on Homepage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="mb-5 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, serial, medium, or status…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
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

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Medium Filter */}
            <div className="relative">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="h-9 pl-3 pr-8 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-black outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">All Mediums</option>
                <option value="acrylic">Acrylic on canvas</option>
                <option value="oil">Oil on canvas</option>
                <option value="mixed">Mixed Media</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 pl-3 pr-8 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-black outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Visibility Filter */}
            <div className="relative">
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="h-9 pl-3 pr-8 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:border-black outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="all">All Visibility</option>
                <option value="published">Published (Visible)</option>
                <option value="unpublished">Unpublished (Hidden)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Offer Filter */}
            <div className="relative">
              <Tag
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  offerFilter === 'with_offer' ? 'text-red-600' : 'text-gray-400'
                }`}
              />
              <select
                value={offerFilter}
                onChange={(e) => setOfferFilter(e.target.value)}
                className={`h-9 pl-8 pr-8 text-xs font-medium rounded-xl outline-none transition-all cursor-pointer appearance-none ${
                  offerFilter === 'with_offer'
                    ? 'bg-red-50 border border-red-300 text-red-700 font-semibold focus:border-red-600 focus:ring-1 focus:ring-red-600'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 focus:border-black'
                }`}
              >
                <option value="all">All Pricing</option>
                <option value="with_offer">With Active Offer ({withOfferCount})</option>
                <option value="without_offer">Regular Price Only</option>
              </select>
              <ChevronDown
                className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                  offerFilter === 'with_offer' ? 'text-red-500' : 'text-gray-400'
                }`}
              />
            </div>

            {/* Reset Filters */}
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-3 rounded-xl border border-dashed border-gray-300 hover:border-black text-gray-600 hover:text-black text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter stats & helper */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Found <strong className="text-gray-900 font-semibold">{totalFilteredCount}</strong>{' '}
            artwork{totalFilteredCount !== 1 ? 's' : ''} matching criteria
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="text-xs bg-transparent border-b border-gray-300 font-semibold text-gray-800 pb-0.5 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Selection Mode C Banner (Cross-Page Matching) ── */}
      {isAllCurrentPageSelected && totalFilteredCount > paginatedPaintings.length && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              All <strong className="font-bold">{paginatedPaintings.length}</strong> artworks on
              this page are selected.
            </span>
          </div>
          <div>
            {!selectAllMatching ? (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="text-xs font-bold text-amber-950 underline hover:text-black transition-colors"
              >
                Select all {totalFilteredCount} artworks matching current filters across all pages
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  All {totalFilteredCount} matching artworks selected
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs text-amber-900 underline hover:text-black"
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Artworks Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {/* Select All Checkbox Header (Mode B) */}
                <th className="py-3.5 pl-5 pr-2 w-10">
                  <button
                    type="button"
                    onClick={handleToggleSelectPage}
                    className="p-1 rounded-md text-gray-500 hover:text-black transition-colors cursor-pointer"
                    title={
                      isAllCurrentPageSelected
                        ? 'Deselect all on this page'
                        : 'Select all on this page'
                    }
                  >
                    {isAllCurrentPageSelected ? (
                      <CheckSquare className="w-4 h-4 text-black fill-black/10" />
                    ) : isSomeCurrentPageSelected ? (
                      <MinusSquare className="w-4 h-4 text-black" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 pl-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Artwork
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Serial
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Medium
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
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Spotlight
                </th>
                <th className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {paginatedPaintings.length > 0 ? (
                paginatedPaintings.map((painting) => {
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
                  const isFeatured = painting.is_featured ?? false
                  const isThisDeleting = deletingId === painting.id
                  const isThisToggling = togglingId === painting.id
                  const isThisFeaturing = featuringId === painting.id
                  const isSelected = selectedIds.has(painting.id)

                  return (
                    <tr
                      key={painting.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      } ${!isPublished ? 'opacity-70' : ''}`}
                    >
                      {/* Row Checkbox (Mode A) */}
                      <td className="py-4 pl-5 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleRow(painting.id)}
                          className="p-1 rounded-md text-gray-400 hover:text-black transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-black fill-black/10" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </td>

                      {/* Artwork thumbnail & title */}
                      <td className="py-4 pl-2 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
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
                              {painting.display_size
                                ? painting.display_size
                                : painting.width && painting.height
                                ? `${painting.width} × ${painting.height} cm`
                                : ''}
                            </p>
                            {painting.year && (
                              <p className="text-[11px] text-gray-400 font-light">{painting.year}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Serial */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                          {painting.serial_number || '—'}
                        </span>
                      </td>

                      {/* Medium */}
                      <td className="py-4 px-4 text-sm text-gray-800 font-medium whitespace-nowrap">
                        {formatMedium(painting.painting_type)}
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

                      {/* Spotlight / Featured toggle */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          disabled={isThisFeaturing || isFeaturing}
                          onClick={() => handleToggleFeatured(painting.id, isFeatured, painting.title)}
                          title={
                            isFeatured
                              ? 'Currently Featured Spotlight on Homepage. Click to unfeature.'
                              : 'Set this artwork as the Featured Spotlight on Homepage'
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                            isFeatured
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-xs'
                              : 'bg-white text-gray-500 border border-gray-200 hover:border-amber-400 hover:text-amber-800 hover:bg-amber-50/50'
                          } ${isThisFeaturing ? 'opacity-50 animate-pulse' : ''}`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isFeatured
                                ? 'fill-amber-500 text-amber-600'
                                : 'text-gray-400'
                            }`}
                          />
                          <span>{isFeatured ? 'Spotlight' : 'Set Spotlight'}</span>
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
                  <td colSpan={9} className="py-20 text-center">
                    {isFilterActive ? (
                      <>
                        <p className="text-lg font-sans font-bold text-gray-800 mb-1">
                          No artworks match the current filters.
                        </p>
                        <p className="text-sm text-gray-400 font-light">
                          Try adjusting your search query, medium, status, or visibility filters.
                        </p>
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-black font-semibold transition-all inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset all filters
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-sans font-bold text-gray-900 mb-1">
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

        {/* ── Table Footer & Pagination ── */}
        {totalFilteredCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 font-light">
              Showing {(safeCurrentPage - 1) * pageSize + 1} to{' '}
              {Math.min(safeCurrentPage * pageSize, totalFilteredCount)} of {totalFilteredCount}{' '}
              artworks
              {totalFilteredCount !== totalCount && ` (filtered from ${totalCount} total)`}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:border-black hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1
                    // Show first, last, and window around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - safeCurrentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition-all ${
                            safeCurrentPage === pageNum
                              ? 'bg-black text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (
                      pageNum === safeCurrentPage - 2 ||
                      pageNum === safeCurrentPage + 2
                    ) {
                      return (
                        <span key={pageNum} className="text-xs text-gray-400 px-1">
                          …
                        </span>
                      )
                    }
                    return null
                  })}
                </div>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:border-black hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Bulk Action Toolbar ── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92vw] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-800 p-2 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left: Count & Clear */}
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 text-gray-950 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {selectAllMatching
                    ? `All ${selectedCount} matching selected`
                    : `${selectedCount} selected`}
                </span>
              </span>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-gray-400 hover:text-white underline transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Right: Bulk Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => setIsBulkOfferOpen(true)}
                className="h-9 px-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                title="Apply percentage or fixed discount offer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Apply Offer</span>
              </button>

              <button
                type="button"
                disabled={isBulkLoading}
                onClick={handleBulkRemoveOffer}
                className="h-9 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-gray-700"
                title="Remove discounts from selected artworks"
              >
                <Percent className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Remove Offer</span>
              </button>

              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleBulkVisibility(true)}
                className="h-9 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all border border-gray-700"
                title="Publish artworks to public gallery"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Publish</span>
              </button>

              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleBulkVisibility(false)}
                className="h-9 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-gray-700"
                title="Hide artworks from public gallery"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Offer Modal ── */}
      <BulkOfferModal
        isOpen={isBulkOfferOpen}
        onClose={() => setIsBulkOfferOpen(false)}
        selectedArtworks={selectedArtworks}
        onApply={handleApplyOfferConfirm}
        isApplying={isBulkLoading}
      />

      {/* Add / Edit Individual Artwork Modal */}
      <AddArtworkModal
        key={isModalOpen ? (editingPainting?.id ?? 'new') : 'closed'}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialData={editingPainting}
      />

      {/* ── Prompt to Activate Top Announcement Bar immediately upon applying offers ── */}
      <AnnouncementPromptModal
        isOpen={isAnnouncementPromptOpen}
        onClose={() => setIsAnnouncementPromptOpen(false)}
        offerCount={promptOfferCount}
        defaultBadge={promptDefaultBadge}
        onSuccess={() => {
          toast('Top Announcement & Special Offer Bar is now live!', 'success')
          router.refresh()
        }}
      />
    </div>
  )
}
