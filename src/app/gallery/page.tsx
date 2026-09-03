import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SearchBar from '@/components/SearchBar'
import FilterSort from '@/components/FilterSort'

export const revalidate = 0 // Dynamic page depending on search params

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; sort?: string }
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const q = searchParams.q || ''
  const type = searchParams.type || 'all'
  const sort = searchParams.sort || 'newest'

  let query = supabase
    .from('paintings')
    .select(`
      id, title, slug, base_price_bdt, exact_medium, painting_type, availability_status,
      painting_images(storage_key, is_main)
    `)
    .eq('is_published', true)

  // Filters
  if (type !== 'all') {
    query = query.eq('painting_type', type)
  }

  // FTS Search
  if (q) {
    // using websearch_to_tsquery for natural language search
    query = query.textSearch('title', q, { type: 'websearch', config: 'english' })
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

  const { data: paintings, error } = await query

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-gray-200 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">The Collection</h1>
            <p className="mt-4 text-base text-gray-500">Explore our original handmade paintings.</p>
          </div>
          <div className="mt-6 md:mt-0 w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <SearchBar defaultQuery={q} />
            <FilterSort defaultType={type} defaultSort={sort} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {paintings?.map((painting: any) => {
            const mainImage = painting.painting_images?.find((img: any) => img.is_main) || painting.painting_images?.[0]
            const imageUrl = mainImage 
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paintings/${mainImage.storage_key}`
              : '/placeholder.jpg'

            return (
              <div key={painting.id} className="group relative">
                <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-100 group-hover:opacity-75 transition-opacity sm:h-64 border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={painting.title}
                    className="h-full w-full object-cover object-center"
                  />
                  {painting.availability_status !== 'available' && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 text-xs font-bold uppercase rounded">
                      {painting.availability_status}
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-sm text-gray-500 capitalize">{painting.painting_type} &middot; {painting.exact_medium}</h3>
                <p className="mt-1 text-base font-semibold text-gray-900">{painting.title}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{painting.base_price_bdt} BDT</p>
                <Link href={`/gallery/${painting.slug}`} className="absolute inset-0">
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
