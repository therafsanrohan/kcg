'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  ArrowUpRight,
  ExternalLink,
  Star,
  X,
  CheckCircle,
  Sparkles,
  MessageSquareHeart,
  Quote,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { Review } from '@/types/reviews'
import { submitReviewAction } from '@/app/actions/reviews'

export interface GoogleReviewsConfig {
  verifiedRating?: number | null
  verifiedReviewCount?: number | null
}

interface GoogleReviewsSectionProps {
  className?: string
  config?: GoogleReviewsConfig
  approvedReviews?: Review[]
}

export const GOOGLE_WRITE_REVIEW_URL =
  'https://search.google.com/local/writereview?placeid=ChIJUfPQ0YfHVTcR_mpKLL_BJww'
export const GOOGLE_SEE_REVIEWS_URL =
  'https://search.google.com/local/reviews?placeid=ChIJUfPQ0YfHVTcR_mpKLL_BJww'

export function GoogleLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
}

const QUICK_TAGS = [
  'Canvas Texture & Quality',
  'Rich Layered Pigments',
  'Bespoke Floating Frame',
  'Pristine Packaging',
  'Personal Artist Guidance',
  'Warm & Expressive Atmosphere',
]

export default function GoogleReviewsSection({
  className = '',
  config,
  approvedReviews = [],
}: GoogleReviewsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRating, setSelectedRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerLocation, setCustomerLocation] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [isPending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Carousel index for approved reviews if multiple exist
  const [reviewIndex, setReviewIndex] = useState(0)

  // Prevent background scroll when review modal is active
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setSubmitError(null)
      setIsSubmitted(false)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  const handleAddTag = (tag: string) => {
    setReviewText((prev) => {
      const cleanPrev = prev.trim()
      if (!cleanPrev) return tag + ' - '
      if (cleanPrev.includes(tag)) return cleanPrev
      return `${cleanPrev}\n• ${tag}`
    })
  }

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    startTransition(async () => {
      const res = await submitReviewAction({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_location: customerLocation,
        rating: selectedRating,
        review_text: reviewText,
      })

      if (res.success) {
        setIsSubmitted(true)
        setCustomerName('')
        setCustomerEmail('')
        setCustomerLocation('')
        setReviewText('')
        setSelectedRating(5)
      } else {
        setSubmitError(res.error || 'Failed to submit review. Please try again.')
      }
    })
  }

  return (
    <section
      id="google-reviews"
      aria-labelledby="google-reviews-heading"
      className={`border-t border-gray-200/80 bg-[#FAF9F5] py-14 sm:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20 ${className}`}
    >
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
        
        {/* Main Review Hub Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-gray-200/80 bg-white/70 p-6 sm:p-10 lg:p-12 shadow-2xs backdrop-blur-[2px] transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Heading, Star visual, & Editorial Context */}
            <div className="lg:col-span-7 xl:col-span-7 space-y-4 sm:space-y-5">
              
              {/* Trust Badge with Google Brand & Star Rating Visual */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200/90 shadow-2xs">
                  <GoogleLogo className="h-4 w-4 flex-shrink-0" />
                  <span className="text-[11px] font-semibold tracking-wider text-gray-800 uppercase">
                    Google
                  </span>
                  <div className="h-3 w-[1px] bg-gray-200" />
                  
                  {/* Clean 5-star visual rating */}
                  <div
                    className="flex items-center gap-0.5"
                    aria-label="Five star Google rating visual"
                    title="Five-star visual rating on Google"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="h-3.5 w-3.5 fill-[#FBBC04] text-[#FBBC04]"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Optional verified score only if explicitly provided by owner */}
                  {config?.verifiedRating ? (
                    <span className="text-xs font-semibold text-gray-900 ml-0.5">
                      {config.verifiedRating.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <span className="text-[11px] uppercase tracking-[0.24em] text-gray-500 font-semibold block">
                  COLLECTOR FEEDBACK
                </span>
              </div>

              {/* Main Heading */}
              <h2
                id="google-reviews-heading"
                className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-gray-950 font-normal leading-snug"
              >
                Google Reviews & Collector Stories
              </h2>

              {/* Descriptive Editorial Paragraph */}
              <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed max-w-2xl">
                Every original painting is created by hand with patience and chosen by personal feeling. We invite patrons and collectors to share their feedback directly on our verified Google Business Profile.
              </p>

              {/* Verified Trust Pillars */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span>Direct Google Submission</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span>100% Verified Profiles</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] font-bold">✓</span>
                  <span>Official Business Listed</span>
                </div>
              </div>
            </div>

            {/* Right Column: Direct Actions */}
            <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3.5 sm:gap-4 justify-center">
              
              {/* Primary Action Button: Write a Review directly on Google */}
              <a
                href={GOOGLE_WRITE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between px-6 py-4 rounded-xl bg-[#1A1A1A] text-white hover:bg-black transition-all shadow-sm hover:shadow-md cursor-pointer text-left w-full"
                aria-label="Write a Review on Google (opens in new tab)"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Star className="h-4 w-4 fill-white text-white" />
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-[0.18em] font-semibold">
                      Write a Review
                    </span>
                    <span className="block text-[11px] text-gray-300 font-light">
                      Rate and review directly on Google
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              {/* Secondary Action Button: See Reviews on Google */}
              <a
                href={GOOGLE_SEE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between px-6 py-4 rounded-xl bg-white border border-gray-300/90 text-gray-900 hover:border-black hover:bg-gray-50/80 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                aria-label="See Reviews on Google (opens in new tab)"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-200/80 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <GoogleLogo className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs uppercase tracking-[0.18em] font-semibold text-gray-950">
                      See Reviews on Google
                    </span>
                    <span className="block text-[11px] text-gray-500 font-light">
                      Browse verified Google Business reviews
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
              </a>

            </div>

          </div>
        </div>

        {/* ── Approved Collector Reviews Showcase (Only Approved Reviews are Shown) ── */}
        {approvedReviews.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500 font-semibold block">
                  APPROVED TESTIMONIALS
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl text-gray-950 font-normal">
                  Words from Our Collectors
                </h3>
              </div>
              {approvedReviews.length > 3 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewIndex((prev) => (prev > 0 ? prev - 1 : approvedReviews.length - 1))
                    }
                    className="p-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="Previous review"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReviewIndex((prev) => (prev < approvedReviews.length - 1 ? prev + 1 : 0))
                    }
                    className="p-2 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    aria-label="Next review"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedReviews.slice(0, 6).map((item) => (
                <a
                  key={item.id}
                  href={GOOGLE_SEE_REVIEWS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/review-card rounded-2xl border border-gray-200/80 bg-white/80 p-6 shadow-2xs space-y-4 flex flex-col justify-between hover:border-black/30 hover:shadow-md transition-all cursor-pointer block"
                  aria-label={`Read review by ${item.customer_name} on Google`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= item.rating
                                ? 'fill-[#FBBC04] text-[#FBBC04]'
                                : 'fill-transparent text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" />
                          Verified Collector
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover/review-card:text-black transition-colors" />
                      </div>
                    </div>

                    <p className="text-sm text-gray-800 font-light leading-relaxed italic group-hover/review-card:text-gray-950 transition-colors">
                      &ldquo;{item.review_text}&rdquo;
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-900 group-hover/review-card:text-black transition-colors">
                      {item.customer_name}
                    </span>
                    {item.customer_location && (
                      <span className="flex items-center gap-1 font-light">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {item.customer_location}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Direct On-Site Review Submission Modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-[#FAF9F5] border border-gray-200 p-6 sm:p-8 shadow-2xl space-y-5 animate-fade-in-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-black hover:bg-gray-200/60 transition-colors cursor-pointer"
              aria-label="Close review dialog"
            >
              <X className="h-5 w-5" />
            </button>

            {isSubmitted ? (
              /* Success Confirmation Screen */
              <div className="py-6 text-center space-y-4 animate-fade-in">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-editorial text-2xl text-gray-950 font-normal">
                    Review Submitted Successfully!
                  </h3>
                  <p className="text-sm text-gray-600 font-light max-w-sm mx-auto leading-relaxed">
                    Thank you for sharing your collector experience. Your review has been saved securely and will appear on the gallery website once curated by our team.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl bg-[#1A1A1A] text-white hover:bg-black transition-all text-xs uppercase tracking-wider font-semibold cursor-pointer shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Direct Review Submission Form */
              <form onSubmit={handleSubmitReview} className="space-y-4">
                
                {/* Header */}
                <div className="space-y-1.5 pr-8">
                  <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-gray-500">
                    Kazi Canvas Gallery
                  </span>
                  <h3
                    id="review-modal-title"
                    className="font-editorial text-2xl sm:text-3xl text-gray-950 font-normal"
                  >
                    Share Your Experience
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 font-light">
                    Submit your feedback directly on our website. Your review will be stored securely and displayed upon admin approval.
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-fade-in">
                    {submitError}
                  </div>
                )}

                {/* Star Rating Selector */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled =
                          hoverRating > 0 ? star <= hoverRating : star <= selectedRating
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setSelectedRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`h-6 w-6 transition-colors ${
                                isFilled
                                  ? 'fill-[#FBBC04] text-[#FBBC04]'
                                  : 'fill-transparent text-gray-300'
                              }`}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-xs font-medium text-gray-600 ml-2">
                      {hoverRating > 0
                        ? `${hoverRating} of 5 Stars`
                        : `${selectedRating} of 5 Stars`}
                    </span>
                  </div>
                </div>

                {/* Customer Name & Location Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1"
                    >
                      Your Name *
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Farhana Rahman"
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-location"
                      className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1"
                    >
                      City / Location
                    </label>
                    <input
                      id="customer-location"
                      type="text"
                      value={customerLocation}
                      onChange={(e) => setCustomerLocation(e.target.value)}
                      placeholder="e.g. Dhaka, Bangladesh"
                      className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Customer Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="customer-email"
                      className="block text-xs uppercase tracking-wider font-semibold text-gray-700"
                    >
                      Your Email *
                    </label>
                    <span className="text-[10px] text-gray-400">Kept private; never published</span>
                  </div>
                  <input
                    id="customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. farhana@example.com"
                    className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                  />
                </div>

                {/* Review Textarea */}
                <div>
                  <label
                    htmlFor="review-draft"
                    className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1"
                  >
                    Your Review *
                  </label>
                  <textarea
                    id="review-draft"
                    rows={4}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with the artwork's physical texture, framing finish, safe delivery, or artist consultation..."
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-950 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all resize-none"
                  />
                </div>

                {/* Quick Inspiration Tags */}
                <div className="space-y-1">
                  <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Quick Talking Points:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="text-[11px] px-2.5 py-0.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black transition-all cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#1A1A1A] text-white hover:bg-black transition-all font-semibold text-xs uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isPending ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <MessageSquareHeart className="h-4 w-4" />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:text-black hover:border-gray-400 transition-colors text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {/* Optional Separate Google Review Link */}
                <div className="pt-2 text-center border-t border-gray-200/60">
                  <span className="text-[11px] text-gray-500 font-light">
                    Prefer to leave a review on Google?{' '}
                    <a
                      href={GOOGLE_WRITE_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium text-gray-800 hover:text-black inline-flex items-center gap-0.5"
                    >
                      <span>Open Google Reviews</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </span>
                </div>

              </form>
            )}

          </div>
        </div>
      )}
    </section>
  )
}
