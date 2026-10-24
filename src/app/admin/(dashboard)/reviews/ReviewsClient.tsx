'use client'

import React, { useState, useTransition } from 'react'
import { Review } from '@/types/reviews'
import { updateReviewStatusAction, deleteReviewAction } from '@/app/actions/reviews'
import { Star, CheckCircle, XCircle, Trash2, Clock, Mail, MapPin } from 'lucide-react'

interface ReviewsClientProps {
  initialReviews: Review[]
}

export default function ReviewsClient({ initialReviews }: ReviewsClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await updateReviewStatusAction(id, newStatus)
      if (res.success) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: newStatus,
                  approved_at: newStatus === 'approved' ? new Date().toISOString() : null,
                  updated_at: new Date().toISOString(),
                }
              : r
          )
        )
        setStatusMessage(`Review successfully marked as ${newStatus}.`)
        setTimeout(() => setStatusMessage(null), 3000)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) {
      return
    }
    startTransition(async () => {
      const res = await deleteReviewAction(id)
      if (res.success) {
        setReviews((prev) => prev.filter((r) => r.id !== id))
        setStatusMessage('Review deleted permanently.')
        setTimeout(() => setStatusMessage(null), 3000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 font-editorial">
            Customer Reviews
          </h1>
          <p className="text-sm text-gray-500 font-light mt-1">
            Moderate and curate on-site collector feedback. Only approved reviews appear publicly.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>{pendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>{approvedCount} Live & Approved</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            filter === 'all'
              ? 'border-black text-black font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          All ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'pending'
              ? 'border-amber-500 text-amber-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Pending</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            filter === 'approved'
              ? 'border-emerald-500 text-emerald-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Approved ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
            filter === 'rejected'
              ? 'border-rose-500 text-rose-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Rejected ({reviews.filter((r) => r.status === 'rejected').length})
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="p-3 bg-gray-900 text-white text-xs rounded-xl flex items-center justify-between animate-fade-in">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-gray-300 bg-white/50">
          <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No reviews found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {filter === 'pending'
              ? 'All submitted reviews have been moderated.'
              : `There are currently no reviews in the "${filter}" filter.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200/90 shadow-2xs space-y-4 hover:border-gray-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Author Info & Star Rating */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {review.customer_name}
                    </span>
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        review.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : review.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {review.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-light">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-gray-400" />
                      {review.customer_email}
                    </span>
                    {review.customer_location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {review.customer_location}
                      </span>
                    )}
                    <span>&bull;</span>
                    <span>
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Star Rating Visual */}
                <div className="flex items-center gap-1" aria-label={`${review.rating} stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? 'fill-[#FBBC04] text-[#FBBC04]'
                          : 'fill-transparent text-gray-200'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-semibold text-gray-700 ml-1">
                    {review.rating}/5
                  </span>
                </div>
              </div>

              {/* Review Text Body */}
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-gray-200/60 text-sm text-gray-800 leading-relaxed font-light">
                {review.review_text}
              </div>

              {/* Admin Actions Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {review.status !== 'approved' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(review.id, 'approved')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-medium cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  )}

                  {review.status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(review.id, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:text-rose-600 hover:border-rose-300 transition-colors text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(review.id)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete review permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
