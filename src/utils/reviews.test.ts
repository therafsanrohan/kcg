import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import {
  submitReviewAction,
  getApprovedReviews,
  getAllReviewsForAdmin,
  updateReviewStatusAction,
  deleteReviewAction,
} from './reviews'

async function runReviewTests() {
  console.log('--- Starting Reviews Flow Automated Verification ---')

  const testEmail = `test_collector_${Date.now()}@example.com`
  const testInput = {
    customer_name: 'Dr. Zunaid Ahmed',
    customer_email: testEmail,
    customer_location: 'Banani, Dhaka',
    rating: 5,
    review_text: 'The palette knife texture and depth of color on this original canvas exceeded all my expectations.',
  }

  // 1. Submit review
  console.log('1. Submitting customer review directly on website...')
  const submitResult = await submitReviewAction(testInput)
  if (!submitResult.success || !submitResult.review) {
    throw new Error('Failed to submit review: ' + submitResult.error)
  }
  const reviewId = submitResult.review.id
  console.log(`✓ Review submitted successfully with id: ${reviewId}, status: ${submitResult.review.status}`)
  if (submitResult.review.status !== 'pending') {
    throw new Error('Expected new review to have status "pending", got: ' + submitResult.review.status)
  }

  // 2. Verify pending review is NOT visible in public approved reviews
  console.log('2. Verifying public getApprovedReviews() does NOT expose pending review...')
  const initialApproved = await getApprovedReviews()
  const foundPending = initialApproved.find((r) => r.id === reviewId)
  if (foundPending) {
    throw new Error('Security violation: Pending review is visible to the public!')
  }
  console.log('✓ Verified: Pending review is hidden from public view.')

  // 3. Admin: Check review in admin list
  console.log('3. Verifying review is present in admin list...')
  const adminReviews = await getAllReviewsForAdmin()
  const inAdminList = adminReviews.find((r) => r.id === reviewId)
  if (!inAdminList) {
    throw new Error('Review not found in admin list!')
  }
  console.log(`✓ Found review in admin list with status: ${inAdminList.status}`)

  // 4. Admin approval
  console.log('4. Admin approving the review...')
  const approveResult = await updateReviewStatusAction(reviewId, 'approved')
  if (!approveResult.success) {
    throw new Error('Failed to approve review!')
  }
  console.log('✓ Review approved successfully by admin.')

  // 5. Verify approved review is now visible in public getApprovedReviews()
  console.log('5. Verifying approved review now appears in public website feed...')
  const updatedApproved = await getApprovedReviews()
  const foundApproved = updatedApproved.find((r) => r.id === reviewId)
  if (!foundApproved) {
    throw new Error('Approved review is not visible in public getApprovedReviews()!')
  }
  console.log(`✓ Verified: Approved review is publicly visible for customer: "${foundApproved.customer_name}" with rating ${foundApproved.rating}/5.`)

  // 6. Cleanup test review
  console.log('6. Cleaning up test review...')
  const deleteResult = await deleteReviewAction(reviewId)
  if (!deleteResult.success) {
    throw new Error('Failed to cleanup test review!')
  }
  const finalApproved = await getApprovedReviews()
  if (finalApproved.some((r) => r.id === reviewId)) {
    throw new Error('Deleted review still present!')
  }
  console.log('✓ Cleaned up test review. Database remains pristine.')

  console.log('--- All Reviews Flow Verification Tests Passed Successfully! ---')
}

runReviewTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
