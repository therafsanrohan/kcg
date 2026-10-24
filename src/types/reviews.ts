export interface Review {
  id: string
  customer_name: string
  customer_email: string
  customer_location?: string | null
  rating: number // 1 to 5
  review_text: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
}

export interface SubmitReviewInput {
  customer_name: string
  customer_email: string
  customer_location?: string
  rating: number
  review_text: string
}
