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
          {/* Image gallery */}
          <div className="flex flex-col-reverse">
            <div className="mx-auto mt-6 hidden w-full max-w-2xl sm:block lg:max-w-none">
              <div className="grid grid-cols-4 gap-6" aria-orientation="horizontal" role="tablist">
                {images?.map((img, idx) => (
                  <button key={img.storage_key} className="relative flex h-24 cursor-pointer items-center justify-center rounded-md bg-gray-100 text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4 overflow-hidden border border-gray-200">
                    <span className="sr-only">View image {idx + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paintings/${img.storage_key}`} 
                      alt="" 
                      className="absolute inset-0 h-full w-full object-cover object-center" 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="aspect-h-1 aspect-w-1 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={painting.title}
                className="h-full w-full object-cover object-center sm:rounded-lg"
              />
            </div>
          </div>

          {/* Painting info & interactivity */}
          <div className="mt-10 px-4 sm:px-0 lg:mt-0">
            <ClientDetails 
              painting={painting} 
              frames={frames || []} 
              rates={rates} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
