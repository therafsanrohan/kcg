import { getAllReviewsForAdmin } from '@/utils/reviews'
import ReviewsClient from './ReviewsClient'

export const dynamic = 'force-dynamic'

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsForAdmin()

  return <ReviewsClient initialReviews={reviews} />
}
