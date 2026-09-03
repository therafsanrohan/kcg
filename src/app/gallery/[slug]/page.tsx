import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getExchangeRates } from '@/utils/currency'
import ClientDetails from './ClientDetails'
import Link from 'next/link'

export const revalidate = 3600 // 1 hour

export default async function PaintingDetailsPage({ params }: { params: { slug: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Fetch painting
  const { data: painting } = await supabase
    .from('paintings')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!painting) {
    notFound()
  }

  // Fetch images
  const { data: images } = await supabase
    .from('painting_images')
    .select('storage_key, is_main')
    .eq('painting_id', painting.id)
    .order('sort_order', { ascending: true })

  // Fetch active frames
  const { data: frames } = await supabase
    .from('frame_options')
    .select('*')
    .eq('painting_id', painting.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Fetch exchange rates
  const rates = await getExchangeRates()

  // Fetch site settings for WhatsApp number
  const { data: settings } = await supabase
    .from('site_settings')
    .select('whatsapp_number, business_name')
    .single()

  const mainImage = images?.find(img => img.is_main) || images?.[0]
  const imageUrl = mainImage 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paintings/${mainImage.storage_key}`
    : '/placeholder.jpg'

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol role="list" className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/" className="hover:text-gray-900">Home</Link></li>
            <li>/</li>
            <li><Link href="/gallery" className="hover:text-gray-900">Gallery</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium" aria-current="page">{painting.title}</li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-12 xl:gap-x-16">
          {/* Painting info & interactivity */}
          <div className="mt-10 px-4 sm:px-0 lg:mt-0 lg:col-span-2">
            <ClientDetails 
              painting={painting} 
              frames={frames || []} 
              rates={rates} 
              images={images || []}
              whatsappNumber={settings?.whatsapp_number || '8801824951514'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
