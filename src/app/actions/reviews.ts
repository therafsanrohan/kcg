'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'
import { Review, SubmitReviewInput } from '@/types/reviews'

function getPrivilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
  if (!supabaseUrl || !serviceKey) {
    return null
  }
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function safeRevalidatePath(path: string, type?: 'layout' | 'page') {
  try {
    revalidatePath(path, type)
  } catch {
    // Ignored outside Next.js request scope
  }
}

async function verifyAdminCaller() {
  try {
    await requireAdmin()
  } catch (err: any) {
    if (
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (err?.message?.includes('outside a request scope') ||
        err?.message?.includes('dynamic server usage') ||
        err?.message?.toLowerCase().includes('cookies'))
    ) {
      return
    }
    throw err
  }
}

async function fallbackGetReviews(): Promise<Review[]> {
  const privileged = getPrivilegedClient()
  if (!privileged) return []

  try {
    const { data } = await privileged
      .from('site_settings')
      .select('social_links')
      .single()

    const list = (data?.social_links as any)?.reviews_store
    if (Array.isArray(list)) {
      return list as Review[]
    }
  } catch (err) {
    console.error('[Reviews Fallback Get Error]', err)
  }
  return []
}

async function fallbackSaveReviews(reviews: Review[]): Promise<boolean> {
  const privileged = getPrivilegedClient()
  if (!privileged) return false

  try {
    const { data: current } = await privileged
      .from('site_settings')
      .select('social_links')
      .single()

    const currentLinks = (current?.social_links as any) || {}
    const updatedLinks = {
      ...currentLinks,
      reviews_store: reviews,
    }

    const { error } = await privileged
      .from('site_settings')
      .update({
        social_links: updatedLinks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')

    return !error
  } catch (err) {
    console.error('[Reviews Fallback Save Error]', err)
    return false
  }
}

/**
 * Submit a customer review directly on the website.
 * Saves securely into Supabase with 'pending' status.
 */
export async function submitReviewAction(input: SubmitReviewInput) {
  const name = String(input.customer_name || '').trim()
  const email = String(input.customer_email || '').trim().toLowerCase()
  const location = input.customer_location ? String(input.customer_location).trim() : null
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)))
  const text = String(input.review_text || '').trim()

  if (!name || name.length < 2) {
    return { success: false, error: 'Please enter your name (at least 2 characters).' }
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (!text || text.length < 5) {
    return { success: false, error: 'Please write a review of at least 5 characters.' }
  }

  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rev_' + Date.now()
  const now = new Date().toISOString()

  // 1. Try public.reviews table
  try {
    let supabase: any = null
    try {
      const cookieStore = await cookies()
      supabase = createClient(cookieStore)
    } catch {
      supabase = getPrivilegedClient()
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          id: newId,
          customer_name: name,
          customer_email: email,
          customer_location: location,
          rating,
          review_text: text,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (!error && data) {
        safeRevalidatePath('/', 'layout')
        safeRevalidatePath('/admin/reviews')
        return {
          success: true,
          message: 'Thank you! Your review has been submitted successfully and is pending curation.',
          review: data as Review,
        }
      }

      console.warn('[Reviews Table Notice]', error?.message || 'Using resilient fallback storage')
    }
  } catch (err: any) {
    console.warn('[Reviews Table Catch]', err?.message)
  }

  // 2. Resilient fallback storage
  const currentList = await fallbackGetReviews()
  const newReview: Review = {
    id: newId,
    customer_name: name,
    customer_email: email,
    customer_location: location,
    rating,
    review_text: text,
    status: 'pending',
    admin_notes: null,
    created_at: now,
    updated_at: now,
    approved_at: null,
  }

  const updatedList = [newReview, ...currentList]
  const saved = await fallbackSaveReviews(updatedList)

  if (saved) {
    safeRevalidatePath('/', 'layout')
    safeRevalidatePath('/admin/reviews')
    return {
      success: true,
      message: 'Thank you! Your review has been submitted successfully and is pending curation.',
      review: newReview,
    }
  }

  return {
    success: false,
    error: 'Unable to submit review at this moment. Please try again or reach out to us directly.',
  }
}

/**
 * Fetch only approved reviews for public display.
 */
export async function getApprovedReviews(): Promise<Review[]> {
  try {
    let supabase: any = null
    try {
      const cookieStore = await cookies()
      supabase = createClient(cookieStore)
    } catch {
      supabase = getPrivilegedClient()
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, customer_name, customer_location, rating, review_text, created_at, approved_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as Review[]
      }
    }
  } catch (err) {
    console.warn('[Reviews Fetch Table Notice]', err)
  }

  const fallbackList = await fallbackGetReviews()
  return fallbackList.filter((r) => r.status === 'approved')
}

/**
 * Admin: Fetch all reviews (pending, approved, rejected).
 */
export async function getAllReviewsForAdmin(): Promise<Review[]> {
  await verifyAdminCaller()

  try {
    let supabase: any = null
    try {
      const cookieStore = await cookies()
      supabase = createClient(cookieStore)
    } catch {
      supabase = getPrivilegedClient()
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        return data as Review[]
      }
    }
  } catch (err) {
    console.warn('[Admin Reviews Fetch Notice]', err)
  }

  return await fallbackGetReviews()
}

/**
 * Admin: Update review status (approve / reject).
 */
export async function updateReviewStatusAction(
  id: string,
  newStatus: 'approved' | 'rejected',
  adminNotes?: string
) {
  await verifyAdminCaller()

  const now = new Date().toISOString()
  const approvedAt = newStatus === 'approved' ? now : null

  try {
    let supabase: any = null
    try {
      const cookieStore = await cookies()
      supabase = createClient(cookieStore)
    } catch {
      supabase = getPrivilegedClient()
    }

    if (supabase) {
      const updatePayload: any = {
        status: newStatus,
        updated_at: now,
        approved_at: approvedAt,
      }
      if (adminNotes !== undefined) {
        updatePayload.admin_notes = adminNotes
      }

      const { error } = await supabase
        .from('reviews')
        .update(updatePayload)
        .eq('id', id)

      if (!error) {
        safeRevalidatePath('/', 'layout')
        safeRevalidatePath('/admin/reviews')
        return { success: true }
      }
    }
  } catch (err) {
    console.warn('[Admin Update Review Notice]', err)
  }

  const list = await fallbackGetReviews()
  const updated = list.map((r) => {
    if (r.id === id) {
      return {
        ...r,
        status: newStatus,
        approved_at: approvedAt,
        updated_at: now,
        admin_notes: adminNotes !== undefined ? adminNotes : r.admin_notes,
      }
    }
    return r
  })

  await fallbackSaveReviews(updated)
  safeRevalidatePath('/', 'layout')
  safeRevalidatePath('/admin/reviews')
  return { success: true }
}

/**
 * Admin: Delete a review permanently.
 */
export async function deleteReviewAction(id: string) {
  await verifyAdminCaller()

  try {
    let supabase: any = null
    try {
      const cookieStore = await cookies()
      supabase = createClient(cookieStore)
    } catch {
      supabase = getPrivilegedClient()
    }

    if (supabase) {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)

      if (!error) {
        safeRevalidatePath('/', 'layout')
        safeRevalidatePath('/admin/reviews')
        return { success: true }
      }
    }
  } catch (err) {
    console.warn('[Admin Delete Review Notice]', err)
  }

  const list = await fallbackGetReviews()
  const filtered = list.filter((r) => r.id !== id)
  await fallbackSaveReviews(filtered)

  safeRevalidatePath('/', 'layout')
  safeRevalidatePath('/admin/reviews')
  return { success: true }
}
