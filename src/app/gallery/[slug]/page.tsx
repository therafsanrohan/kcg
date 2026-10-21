import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getExchangeRates } from '@/utils/currency'
import ClientDetails from './ClientDetails'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getPaintingImageUrl } from '@/utils/image'

export const revalidate = 0 // Instant updates from database

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: painting } = await supabase
    .from('paintings')
    .select('title, description, exact_medium, painting_type, base_price_bdt, painting_images(storage_key, is_main)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!painting) {
    return {
      title: 'Artwork Not Found | Kazi Canvas Gallery',
      robots: { index: false, follow: false },
    }
  }

  const mainImage =
    painting.painting_images?.find((img: any) => img.is_main) ||
    painting.painting_images?.[0]
  const imageUrl = getPaintingImageUrl(mainImage?.storage_key)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'
  const pageUrl = `${siteUrl}/gallery/${slug}`

  return {
    title: `${painting.title} | Original Canvas Art | Kazi Canvas Gallery`,
    description:
      painting.description ||
      `Original handmade ${painting.exact_medium || painting.painting_type || 'canvas'} painting by Kazi Canvas Gallery. Explore high-resolution artwork views and custom framing.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${painting.title} | Kazi Canvas Gallery`,
      description:
        painting.description ||
        `Original handmade ${painting.exact_medium || 'canvas'} painting by Kazi Canvas Gallery.`,
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
        `Original handmade ${painting.exact_medium || 'canvas'} painting.`,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function PaintingDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Fetch painting
  const { data: painting } = await supabase
    .from('paintings')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!painting) {
    notFound()
  }

  // Fetch images
  const { data: images } = await supabase
    .from('painting_images')
    .select('storage_key, processed_key, thumbnail_key, responsive_urls, alt_text, is_main, sort_order')
    .eq('painting_id', painting.id)
    .order('sort_order', { ascending: true })

  // Fetch active frames
  const { data: frames } = await supabase
    .from('frame_options')
    .select('*')
    .eq('painting_id', painting.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Fetch active delivery zones
  const { data: deliveryZones } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Fetch exchange rates
  const rates = await getExchangeRates()

  // Fetch site settings for WhatsApp number
  const { data: settings } = await supabase
    .from('site_settings')
    .select('whatsapp_number, business_name')
    .single()

  const primaryImage =
    images?.find((img) => img.is_main) || images?.[0]
  const artworkImageUrl = getPaintingImageUrl(primaryImage?.storage_key)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: painting.title,
    description: painting.description || `${painting.title} by Kazi Canvas Gallery`,
    artMedium: painting.exact_medium || painting.painting_type,
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

        <ClientDetails 
          painting={painting} 
          frames={frames || []} 
          deliveryZones={deliveryZones || []}
          rates={rates} 
          images={images || []}
          whatsappNumber={settings?.whatsapp_number || '8801824951514'}
        />
      </div>
    </div>
  )
}
