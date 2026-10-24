import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import CustomerGallerySection from '@/components/CustomerGallerySection'

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

  const { data: initialPaintings, error: paintingsErr } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, serial_number, base_price_bdt, discount_price_bdt, offer_badge, exact_medium, painting_type,
      display_size, width, height, width_mm, height_mm, availability_status, is_featured, created_at,
      painting_images(storage_key, thumbnail_key, responsive_urls, is_main)
    `)
    .eq('is_published', true)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  let paintings = initialPaintings

  if (paintingsErr) {
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

  return (
    <div className="bg-[#FAF9F5] min-h-screen pt-2 sm:pt-4 lg:pt-8">
      <Suspense fallback={null}>
        <CustomerGallerySection paintings={paintings || []} />
      </Suspense>
    </div>
  )
}
