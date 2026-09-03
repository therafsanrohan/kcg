import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import CustomerGallerySection from '@/components/CustomerGallerySection'

export const revalidate = 0 // Instant updates from database

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all published paintings with images and frame options
  const { data: paintings } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, base_price_bdt, discount_price_bdt, offer_badge, exact_medium, painting_type,
      display_size, width, height, availability_status, is_featured, created_at,
      painting_images(storage_key, is_main),
      frame_options(id, frame_name, outer_size, price_bdt, is_active)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  // Find featured painting for Hero Banner
  const featuredPainting =
    paintings?.find((p: any) => p.is_featured) || paintings?.[0]

  const featuredImage =
    featuredPainting?.painting_images?.find((img: any) => img.is_main) ||
    featuredPainting?.painting_images?.[0]
  const featuredImageUrl = getPaintingImageUrl(featuredImage?.storage_key)

  return (
    <div className="bg-white text-gray-950 font-sans">
      
      {/* ── 1. Hero Section ── */}
      <section className="pt-12 sm:pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            ORIGINAL PAINTINGS &bull; DHAKA
          </span>
          
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal text-gray-950 tracking-tight leading-[1.05] mt-4 mb-6">
            Made by hand.<br />
            Chosen by feeling.
          </h1>

          <p className="text-base sm:text-xl text-gray-600 font-light max-w-xl mb-8 leading-relaxed">
            One-of-one oil and acrylic paintings, ready for homes, workspaces and thoughtful gifts.
          </p>

          <a
            href="#available-works"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-950 border-b border-gray-950 pb-0.5 hover:text-gray-600 hover:border-gray-600 transition-colors group"
          >
            <span>Browse available paintings</span>
            <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </a>
        </div>
      </section>

      {/* ── 2. Featured Artwork Showcase Banner ── */}
      {featuredPainting && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto my-8 sm:my-12">
          <div className="relative w-full h-[450px] sm:h-[580px] lg:h-[650px] rounded-3xl overflow-hidden shadow-lg border border-gray-200/80 group">
            <Image
              src={featuredImageUrl}
              alt={featuredPainting.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center transition-transform duration-1000 group-hover:scale-105"
            />
            
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Bottom-Left Overlay Text */}
            <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-10 z-20 max-w-xl text-white">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                FEATURED WORK
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-normal text-white mt-1 leading-tight">
                {featuredPainting.title}
              </h2>
              <p className="text-sm sm:text-base text-white/90 font-light mt-1">
                {featuredPainting.exact_medium} &bull; {featuredPainting.display_size || `${featuredPainting.width} × ${featuredPainting.height} in`}
              </p>
            </div>

            {/* Bottom-Right Circular Arrow Button */}
            <Link
              href={`/gallery/${featuredPainting.slug}`}
              className="absolute bottom-8 right-6 sm:bottom-12 sm:right-10 z-20 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300"
              title={`View ${featuredPainting.title}`}
            >
              <ArrowUpRight className="h-6 w-6 stroke-[2.5]" />
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. Interactive Gallery Section (Find your piece) ── */}
      <CustomerGallerySection paintings={paintings || []} />

      {/* ── 4. Dark Info Banner: Ready for your wall ── */}
      <section className="bg-[#141414] text-white py-20 sm:py-28 px-6 sm:px-12 lg:px-16 my-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-white tracking-tight mb-6">
            Ready for your wall.
          </h2>
          <p className="text-base sm:text-xl text-gray-300 font-light leading-relaxed">
            Choose from the frame sizes and finishes available for each painting. The painting price, frame price and total are shown separately before you contact us.
          </p>
        </div>
      </section>

      {/* ── 5. Light Info Banner: Handmade paintings ── */}
      <section className="bg-[#FAF9F6] text-gray-950 py-20 sm:py-28 px-6 sm:px-12 lg:px-16 border-t border-gray-200/60">
        <div className="max-w-4xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block mb-4">
            KAZI CANVAS GALLERY
          </span>
          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-gray-950 tracking-tight mb-6 leading-tight">
            Handmade paintings, presented with the clarity collectors expect.
          </h2>
          <p className="text-base sm:text-xl text-gray-600 font-light leading-relaxed">
            Every artwork is individually painted. Visible brushwork, texture and small surface variations are part of the original piece.
          </p>
        </div>
      </section>

    </div>
  )
}
