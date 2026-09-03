import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Image from 'next/image'

export const revalidate = 3600 // revalidate at most every hour

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
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
    <div className="bg-white selection:bg-black selection:text-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="absolute inset-y-0 right-0 -z-10 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-50 sm:w-[150%] xl:w-[100%] animate-fade-in"></div>
        <div className="mx-auto max-w-3xl py-32 sm:py-48 lg:py-56 text-center transform transition-all duration-700 ease-out translate-y-0 opacity-100">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl leading-tight">
            Premium Handmade <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-400">Canvas Art</span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-gray-600 max-w-2xl mx-auto font-light">
            Discover original, breathtaking oil and acrylic paintings crafted by Kazi Canvas Gallery. Elevate your space with authentic, timeless art.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/gallery"
              className="rounded-full bg-black px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="sm:flex sm:items-end sm:justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Featured Artwork</h2>
            <p className="mt-2 text-gray-500 font-light">Our handpicked selection of masterpieces</p>
          </div>
          <Link href="/gallery" className="hidden text-sm font-semibold text-black sm:block hover:text-gray-600 transition-colors group">
            Browse all art <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 xl:gap-x-10">
          {featured?.map((painting: any, idx: number) => {
            const mainImage = painting.painting_images?.find((img: any) => img.is_main) || painting.painting_images?.[0]
            const imageUrl = mainImage 
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paintings/${mainImage.storage_key}`
              : '/placeholder.jpg'

            return (
              <div key={painting.id} className="group relative flex flex-col items-start justify-between cursor-pointer animate-fade-in-up" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 aspect-[3/4] shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 z-10" />
                  <Image
                    src={imageUrl}
                    alt={painting.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-white/90 backdrop-blur-sm text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      View Details
                    </span>
                  </div>
                </div>
                <div className="mt-5 w-full">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{painting.exact_medium}</h3>
                  <p className="text-xl font-bold text-gray-900 line-clamp-1">{painting.title}</p>
                  <p className="mt-1 text-base font-medium text-gray-600">{painting.base_price_bdt.toLocaleString()} BDT</p>
                </div>
                <Link href={`/gallery/${painting.slug}`} className="absolute inset-0 z-30">
                  <span className="sr-only">View Details for {painting.title}</span>
                </Link>
              </div>
            )
          })}
          
          {(!featured || featured.length === 0) && (
            <div className="col-span-full py-24 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-lg font-medium">No featured paintings available at the moment.</p>
              <p className="text-sm mt-2 text-gray-400">Check back soon for new arrivals.</p>
            </div>
          )}
        </div>
        
        <div className="mt-12 text-center sm:hidden">
          <Link href="/gallery" className="inline-flex text-sm font-semibold text-black hover:text-gray-600 transition-colors group">
            Browse all art <span className="ml-2 inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
