import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getExchangeRates } from '@/utils/currency'
import ClientDetails from './ClientDetails'
import Link from 'next/link'

export const revalidate = 60 // 1 minute for fresh updates

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
    .select('storage_key, processed_key, thumbnail_key, alt_text, is_main, sort_order')
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

  return (
    <div className="bg-white py-12 sm:py-20 font-sans">
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
