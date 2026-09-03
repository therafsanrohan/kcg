import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SearchBar from '@/components/SearchBar'
import FilterSort from '@/components/FilterSort'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'

export const revalidate = 0 // Dynamic page depending on search params

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>
}) {
  const resolvedParams = await searchParams
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const q = resolvedParams?.q?.trim() || ''
  const type = resolvedParams?.type || 'all'
  const sort = resolvedParams?.sort || 'newest'

  let query = supabase
    .from('paintings')
    .select(`
      id, title, slug, base_price_bdt, exact_medium, painting_type, availability_status,
      painting_images(storage_key, is_main)
    `)
    .eq('is_published', true)

  // Filter by painting type
  if (type !== 'all') {
    query = query.eq('painting_type', type)
  }

  // Multi-column forgiving search
  if (q) {
    // Sanitize query to prevent PostgREST syntax errors with special chars
    const sanitized = q.replace(/[%_,()]/g, ' ')
    query = query.or(`title.ilike.%${sanitized}%,exact_medium.ilike.%${sanitized}%,search_tags.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
  }

  // Sorting
  if (sort === 'price_asc') {
    query = query.order('base_price_bdt', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('base_price_bdt', { ascending: false })
  } else {
    // newest default
    query = query.order('created_at', { ascending: false })
  }

  const { data: paintings } = await query

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-gray-100 pb-8 mb-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Original Collection</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mt-1">Artwork Gallery</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
              Explore our curated portfolio of authentic oil, acrylic, and mixed media art.
            </p>
          </div>
          <div className="mt-6 md:mt-0 w-full md:w-auto flex flex-col sm:flex-row gap-3 sm:items-center">
            <SearchBar defaultQuery={q} />
            <FilterSort defaultType={type} defaultSort={sort} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {paintings?.map((painting: any, idx: number) => {
            const mainImage = painting.painting_images?.find((img: any) => img.is_main) || painting.painting_images?.[0]
            const imageUrl = getPaintingImageUrl(mainImage?.storage_key)

            return (
              <div key={painting.id} className="group relative flex flex-col items-start justify-between cursor-pointer animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100 aspect-[3/4] shadow-sm transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1.5">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500 z-10" />
                  <Image
                    src={imageUrl}
                    alt={painting.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  {painting.availability_status && painting.availability_status !== 'available' && (
                    <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md z-20">
                      {painting.availability_status}
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-white/95 backdrop-blur-sm text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                      View Details
                    </span>
                  </div>
                </div>
                <div className="mt-4 w-full">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 capitalize">{painting.painting_type} &bull; {painting.exact_medium}</h3>
                  <p className="mt-1 text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-1">{painting.title}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{Number(painting.base_price_bdt).toLocaleString('en-BD')} BDT</p>
                </div>
                <Link href={`/gallery/${painting.slug}`} className="absolute inset-0 z-30">
                  <span className="sr-only">View Details for {painting.title}</span>
                </Link>
              </div>
            )
          })}

          {(!paintings || paintings.length === 0) && (
            <div className="col-span-full py-24 text-center">
              <h3 className="text-lg font-medium text-gray-900">No paintings found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
