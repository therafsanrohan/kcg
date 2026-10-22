import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { cache, Suspense } from 'react'
import { getExchangeRates } from '@/utils/currency'
import ClientDetails from './ClientDetails'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPaintingImageUrl } from '@/utils/image'
import { formatMedium } from '@/utils/measurements'
import RelatedArtworksLoader from '@/components/gallery/RelatedArtworksLoader'
import RelatedArtworksSkeleton from '@/components/gallery/RelatedArtworksSkeleton'

// 60-second Incremental Static Regeneration with immediate on-demand revalidation on admin edits
export const revalidate = 60

/**
 * Request-scoped deduplicated artwork fetcher.
 * Merges painting record, high-res images, and frame options into a single SQL join.
 * Shares the exact same promise between generateMetadata and PaintingDetailsPage.
 */
const getArtworkDetail = cache(async (slug: string) => {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: painting, error } = await supabase
    .from('paintings')
    .select(`
      *,
      painting_images(
        id, storage_key, processed_key, thumbnail_key, responsive_urls,
        alt_text, is_main, sort_order, archived_at
      ),
      frame_options(
        id, painting_id, frame_name, outer_size, outer_width_mm, outer_height_mm,
        price_bdt, sort_order, is_active
      )
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  return { painting, error }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { painting } = await getArtworkDetail(slug)

  if (!painting) {
    return {
      title: 'Artwork Not Found | Kazi Canvas Gallery',
      robots: { index: false, follow: false },
    }
  }

  const images = (painting.painting_images || [])
    .filter((img: any) => !img.archived_at)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const mainImage = images.find((img: any) => img.is_main) || images[0]
  const imageUrl = getPaintingImageUrl(mainImage?.storage_key)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'
  const pageUrl = `${siteUrl}/gallery/${slug}`

  return {
    title: `${painting.title} | Original Canvas Art | Kazi Canvas Gallery`,
    description:
      painting.description ||
      `Original handmade ${formatMedium(painting.painting_type)} painting by Kazi Canvas Gallery. Explore high-resolution artwork views and custom framing.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${painting.title} | Kazi Canvas Gallery`,
      description:
        painting.description ||
        `Original handmade ${formatMedium(painting.painting_type)} painting by Kazi Canvas Gallery.`,
      url: pageUrl,
      type: 'article',
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: painting.title,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${painting.title} | Kazi Canvas Gallery`,
      description:
        painting.description ||
        `Original handmade ${formatMedium(painting.painting_type)} painting.`,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function PaintingDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch artwork detail, delivery zones, exchange rates, and business settings concurrently in parallel
  const [artworkData, deliveryZonesResult, rates, settingsResult] = await Promise.all([
    getArtworkDetail(slug),
    supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    getExchangeRates(),
    supabase
      .from('site_settings')
      .select('whatsapp_number, business_name')
      .single(),
  ])

  const { painting } = artworkData
  if (!painting) {
    notFound()
  }

  // Filter & sort active images
  const images = (painting.painting_images || [])
    .filter((img: any) => !img.archived_at)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // Filter & sort active frame options
  const frames = (painting.frame_options || [])
    .filter((f: any) => f.is_active)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const deliveryZones = deliveryZonesResult.data || []
  const settings = settingsResult.data

  const primaryImage = images.find((img: any) => img.is_main) || images[0]
  const artworkImageUrl = getPaintingImageUrl(primaryImage?.storage_key)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: painting.title,
    description: painting.description || `${painting.title} by Kazi Canvas Gallery`,
    artMedium: formatMedium(painting.painting_type),
    artform: 'Painting',
    artworkSurface: 'Canvas',
    image: artworkImageUrl,
    url: `${siteUrl}/gallery/${slug}`,
    creator: {
      '@type': 'Organization',
      name: 'Kazi Canvas Gallery',
      url: siteUrl,
    },
    offers: {
      '@type': 'Offer',
      price: painting.discount_price_bdt || painting.base_price_bdt,
      priceCurrency: 'BDT',
      availability:
        painting.availability_status === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      url: `${siteUrl}/gallery/${slug}`,
    },
  }

  return (
    <div className="bg-[#FAF9F5] py-12 sm:py-20 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol role="list" className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-gray-900 font-medium">Home</Link></li>
            <li>/</li>
            <li><Link href="/gallery" className="hover:text-gray-900 font-medium">Gallery</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-bold" aria-current="page">{painting.title}</li>
          </ol>
        </nav>

        {/* Primary Artwork Presentation (Rendered Immediately) */}
        <ClientDetails 
          painting={painting} 
          frames={frames} 
          deliveryZones={deliveryZones}
          rates={rates} 
          images={images}
          whatsappNumber={settings?.whatsapp_number || '8801824951514'}
        />

        {/* Secondary Recommendations (Streamed asynchronously via Suspense to prevent blocking LCP) */}
        <Suspense fallback={<RelatedArtworksSkeleton />}>
          <RelatedArtworksLoader
            currentArtwork={{
              id: painting.id,
              title: painting.title,
              painting_type: painting.painting_type,
              base_price_bdt: painting.base_price_bdt,
              discount_price_bdt: painting.discount_price_bdt,
              width_mm: painting.width_mm,
              height_mm: painting.height_mm,
              width: painting.width,
              height: painting.height,
            }}
            rates={rates}
          />
        </Suspense>
      </div>
    </div>
  )
}
