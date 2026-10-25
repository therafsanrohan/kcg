import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import CustomerGallerySection from '@/components/CustomerGallerySection'
import { parseAnnouncementSettings, isOfferCampaignActive } from '@/types/contact'
import { syncOfferExpirationStatus } from '@/utils/offer-sync'

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Art Collection & Catalog | Kazi Canvas Gallery',
  description: 'Browse our complete collection of handmade oil and acrylic paintings on canvas. Discover authentic, original contemporary art with custom framing options.',
  alternates: {
    canonical: 'https://kazicanvasgallery.com/gallery',
  },
  openGraph: {
    title: 'Art Collection & Catalog | Kazi Canvas Gallery',
    description: 'Browse our complete collection of handmade oil and acrylic paintings on canvas.',
    url: 'https://kazicanvasgallery.com/gallery',
    type: 'website',
  },
}

export const revalidate = 60 // 60s ISR cache with immediate on-demand revalidation on admin changes

export default async function GalleryPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const [paintingsResult, settingsResult] = await Promise.all([
    supabase
      .from('paintings')
      .select(`
        id, title, slug, serial_number, base_price_bdt, discount_price_bdt, offer_badge, exact_medium, painting_type,
        display_size, width, height, width_mm, height_mm, availability_status, is_featured, created_at,
        painting_images(storage_key, thumbnail_key, responsive_urls, is_main)
      `)
      .eq('is_published', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('site_settings').select('social_links').single(),
  ])

  let paintings = paintingsResult.data
  const announcementSettings = parseAnnouncementSettings(settingsResult.data)

  // Universal Offer Lifecycle Evaluator & Auto-Cleanup Engine:
  // If timer expired, automatically cleans DB and revalidates everywhere
  const { isCampaignLive } = await syncOfferExpirationStatus(settingsResult.data)

  if (paintingsResult.error) {
    const fallback = await supabase
      .from('paintings')
      .select(`
        id, title, slug, base_price_bdt, discount_price_bdt, offer_badge, exact_medium, painting_type,
        display_size, width, height, width_mm, height_mm, availability_status, is_featured, created_at,
        painting_images(storage_key, thumbnail_key, responsive_urls, is_main)
      `)
      .eq('is_published', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    paintings = (fallback.data?.map((p) => ({ ...p, serial_number: null })) || []) as any
  }

  // Gracefully fallback in-memory paintings to regular price if expired
  if (!isCampaignLive && paintings) {
    paintings = paintings.map((p: any) => ({
      ...p,
      discount_price_bdt: null,
      offer_badge: null,
    }))
  }

  return (
    <div className="bg-[#FAF9F5] min-h-screen pt-2 sm:pt-4 lg:pt-8">
      <Suspense fallback={null}>
        <CustomerGallerySection paintings={paintings || []} />
      </Suspense>
    </div>
  )
}
