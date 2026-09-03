import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Image from 'next/image'

export const revalidate = 3600 // revalidate at most every hour

export default async function Home() {
  const supabase = createClient()
  
  // Fetch featured paintings
  const { data: featured } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, base_price_bdt, exact_medium,
      painting_images(storage_key, is_main)
    `)
    .eq('is_featured', true)
    .eq('is_published', true)
    .limit(4)

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8 bg-gray-50 border-b border-gray-100">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl font-serif">
            Premium Handmade Canvas Art
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Discover original, breathtaking oil and acrylic paintings crafted by Kazi Canvas Gallery. Elevate your space with authentic art.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/gallery"
              className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="sm:flex sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-serif">Featured Artwork</h2>
          <Link href="/gallery" className="hidden text-sm font-semibold text-black sm:block hover:underline">
            Browse all art <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8">
          {featured?.map((painting: any) => {
            const mainImage = painting.painting_images?.find((img: any) => img.is_main) || painting.painting_images?.[0]
            // We would ideally fetch the public URL from Supabase, but for now we'll simulate the path
            const imageUrl = mainImage 
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paintings/${mainImage.storage_key}`
              : '/placeholder.jpg'

            return (
              <div key={painting.id} className="group relative">
                <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1 group-hover:opacity-75 transition-opacity sm:h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={painting.title}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <h3 className="mt-4 text-sm text-gray-500">{painting.exact_medium}</h3>
                <p className="mt-1 text-base font-semibold text-gray-900 font-serif">{painting.title}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{painting.base_price_bdt} BDT</p>
                <Link href={`/gallery/${painting.slug}`} className="absolute inset-0">
                  <span className="sr-only">View Details for {painting.title}</span>
                </Link>
              </div>
            )
          })}
          
          {(!featured || featured.length === 0) && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No featured paintings available at the moment.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
