import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import Image from 'next/image'
import { getPaintingImageUrl } from '@/utils/image'
import { ArrowUpRight, ArrowRight, ChevronDown } from 'lucide-react'
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
      painting_images(storage_key, thumbnail_key, responsive_urls, is_main, archived_at),
      frame_options(id, frame_name, outer_size, price_bdt, is_active)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  // Find featured painting for Hero Banner
  const featuredPainting =
    paintings?.find((p: any) => p.is_featured) || paintings?.[0]

  const featuredImage =
    featuredPainting?.painting_images?.find((img: any) => !img.archived_at && img.is_main) ||
    featuredPainting?.painting_images?.find((img: any) => !img.archived_at) ||
    featuredPainting?.painting_images?.[0]
  const featuredImageUrl = getPaintingImageUrl(featuredImage?.storage_key)

  // Find artwork to pair with Our Story section
  const storyPainting =
    paintings?.find((p: any) => !p.is_featured && p.painting_images?.length) ||
    paintings?.[1] ||
    featuredPainting

  const storyImage =
    storyPainting?.painting_images?.find((img: any) => !img.archived_at && img.is_main) ||
    storyPainting?.painting_images?.find((img: any) => !img.archived_at) ||
    storyPainting?.painting_images?.[0]
  const storyImageUrl = storyImage
    ? getPaintingImageUrl(storyImage.storage_key || storyImage.thumbnail_key)
    : null

  return (
    <div className="bg-white text-gray-950 font-sans">
      
      {/* ── 1. Hero Section ── */}
      <section className="pt-10 sm:pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-4xl">
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-950 tracking-tight leading-[1.05] mb-6">
            Made by hand.<br />
            <span className="font-light text-gray-700">Chosen by feeling.</span>
          </h1>

          <p className="text-sm sm:text-base text-gray-600 font-light max-w-xl mb-6 leading-relaxed">
            One-of-one oil and acrylic paintings on stretched canvas, thoughtfully crafted for residences, contemporary spaces, and private collectors.
          </p>

          <div className="flex items-center gap-6">
            <a
              href="#available-works"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] font-medium text-gray-950 border-b border-black pb-1 hover:text-gray-600 hover:border-gray-400 transition-all group"
            >
              <span>Explore collection</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
            </a>
            <span className="text-xs text-gray-400 font-mono">
              {paintings?.length || 0} works catalogued
            </span>
          </div>
        </div>
      </section>

      {/* ── 2. Featured Artwork Showcase Banner ── */}
      {featuredPainting && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto my-4 sm:my-8">
          <div className="relative w-full h-[400px] sm:h-[520px] lg:h-[600px] overflow-hidden border border-gray-200/60 bg-[#F4F3EE] group">
            <Image
              src={featuredImageUrl}
              alt={featuredPainting.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
            />
            
            {/* Subtle Gradient for Legend Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

            {/* Bottom-Left Overlay Text: Editorial Label */}
            <div className="absolute bottom-8 left-6 sm:bottom-12 sm:left-12 z-20 max-w-xl text-white">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/80 font-medium block mb-2">
                EXHIBITION SPOTLIGHT
              </span>
              <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-white leading-tight">
                {featuredPainting.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 font-light mt-2 tracking-wide">
                {featuredPainting.exact_medium} &bull; {featuredPainting.display_size || `${featuredPainting.width} × ${featuredPainting.height} in`}
              </p>
            </div>

            {/* Bottom-Right Arrow Link */}
            <Link
              href={`/gallery/${featuredPainting.slug}`}
              className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12 z-20 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/95 text-black flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300 shadow-md"
              title={`View ${featuredPainting.title}`}
            >
              <ArrowUpRight className="h-5 w-5 stroke-[2]" />
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. Interactive Gallery Section (Find your piece) ── */}
      <Suspense fallback={null}>
        <CustomerGallerySection paintings={paintings || []} />
      </Suspense>

      {/* ── 4. Compact Our Story Section ── */}
      <section className="border-t border-gray-200/80 bg-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200/70 bg-[#FAF9F5] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Text content */}
              <div className={storyImageUrl ? "lg:col-span-7 xl:col-span-7 space-y-4 sm:space-y-5" : "lg:col-span-12 space-y-4 sm:space-y-5"}>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.26em] text-gray-500 font-semibold block">
                  OUR STORY
                </span>
                <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-gray-950 font-normal leading-snug">
                  Art that makes a space feel like your own.
                </h2>
                <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed max-w-2xl">
                  Kazi Canvas Gallery began its journey in 2018 with a simple belief: the right artwork can change how a space feels. Today, we continue helping people discover art that brings warmth, character, and personality to their spaces.
                </p>
                <div className="pt-2">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-md bg-[#1A1A1A] text-white text-xs uppercase tracking-[0.18em] font-medium hover:bg-black transition-all shadow-xs group"
                  >
                    <span>Discover Our Story</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* Artwork preview thumbnail paired with story */}
              {storyImageUrl && (
                <div className="lg:col-span-5 xl:col-span-5">
                  <Link
                    href="/about"
                    className="group/story-card block relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] overflow-hidden rounded-xl border border-gray-200/80 bg-[#F4F3EE] shadow-2xs"
                    aria-label="Discover Our Story"
                  >
                    <Image
                      src={storyImageUrl}
                      alt="Kazi Canvas Gallery - Our Story"
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover/story-card:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover/story-card:bg-transparent transition-colors" />
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Editorial Information Split ── */}
      <section className="border-t border-gray-200/80 bg-[#FAF9F5] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-[0.24em] text-gray-400 font-semibold block">
              AUTHENTICITY & CRAFT
            </span>
            <h3 className="font-editorial text-3xl sm:text-4xl text-gray-950 font-normal leading-tight">
              Individually created with traditional patience.
            </h3>
            <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed">
              Every canvas represents original hours of physical composition, rich pigment layering, and deliberate texture. Small organic surface marks attest to the authentic touch of hand-applied fine oils and acrylics.
            </p>
          </div>

          <div className="space-y-4 md:border-l md:border-gray-200/80 md:pl-8 lg:pl-12">
            <span className="text-[10px] uppercase tracking-[0.24em] text-gray-400 font-semibold block">
              COLLECTOR ASSURANCE
            </span>
            <h3 className="font-editorial text-3xl sm:text-4xl text-gray-950 font-normal leading-tight">
              Pristine framing and reliable delivery.
            </h3>
            <p className="text-sm sm:text-base text-gray-600 font-light leading-relaxed">
              Select tailored gallery floating frames or receive the piece canvas-only. Artwork pricing, framing options, and destination logistics are transparently detailed before direct artist consultation.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
