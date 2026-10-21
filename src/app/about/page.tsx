import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getPaintingImageUrl } from '@/utils/image'

export const metadata: Metadata = {
  title: 'Our Story | Kazi Canvas Gallery',
  description:
    'Kazi Canvas Gallery began its journey in 2018 with a love for art and a simple idea: the right artwork can make a space feel different.',
  openGraph: {
    title: 'Our Story | Kazi Canvas Gallery',
    description:
      'Kazi Canvas Gallery began its journey in 2018 with a love for art and a simple idea: the right artwork can make a space feel different.',
    type: 'website',
  },
}

export const revalidate = 3600 // Cache for 1 hour with on-demand revalidation

export default async function AboutPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch an authentic published painting from the gallery to pair with the story
  const { data: paintings } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, exact_medium, display_size, width, height, is_featured,
      painting_images(storage_key, thumbnail_key, is_main, archived_at)
    `)
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)

  const showcasePainting = paintings?.[0]
  const showcaseImage =
    showcasePainting?.painting_images?.find((img: any) => !img.archived_at && img.is_main) ||
    showcasePainting?.painting_images?.find((img: any) => !img.archived_at) ||
    showcasePainting?.painting_images?.[0]

  const showcaseImageUrl = showcaseImage
    ? getPaintingImageUrl(showcaseImage.storage_key || showcaseImage.thumbnail_key)
    : null

  const sizeLabel =
    showcasePainting?.display_size ||
    (showcasePainting?.width && showcasePainting?.height
      ? `${showcasePainting.width} × ${showcasePainting.height} in`
      : null)

  return (
    <div className="bg-[#FBFBFA] min-h-[calc(100vh-140px)]">
      {/* ── Breadcrumb / Header Eyebrow ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-xs font-mono uppercase tracking-[0.2em] text-gray-400">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span className="mx-2.5 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Our Story</span>
        </nav>
      </div>

      {/* ── Main Editorial Story Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Editorial Story Copy */}
          <div className="lg:col-span-7 xl:col-span-6 space-y-8">
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-[0.28em] font-semibold text-gray-400 block">
                ABOUT KAZI CANVAS GALLERY
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-normal text-gray-950 tracking-tight leading-[1.08]">
                Our Story
              </h1>
            </div>

            {/* Exact story body text formatted with comfortable, spacious editorial typesetting */}
            <div className="space-y-6 text-base sm:text-lg text-gray-700 font-light leading-relaxed">
              <p className="text-gray-900 font-normal text-lg sm:text-xl leading-relaxed">
                Kazi Canvas Gallery began its journey in 2018 with a love for art and a simple idea: the right artwork can make a space feel different.
              </p>

              <p>
                Since then, our aim has been to help people find art that feels right for them. We believe art is not just something to hang on a wall. It can bring warmth to a room, reflect your personality, and make a place feel more like your own.
              </p>

              <p>
                Whether it is for your home, office, or a special corner, we want you to find something you will enjoy looking at every day. Every space has its own character, and we believe the right artwork can add something special to it.
              </p>

              <p className="pt-2 text-gray-900 font-normal">
                Our journey is still growing, and our love for art remains the same.
              </p>

              <p className="text-gray-600">
                Explore our collection and find the artwork that feels right for your space.
              </p>
            </div>

            {/* CTA Button -> Main Artwork Collection */}
            <div className="pt-4">
              <Link
                href="/gallery"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-md bg-[#1A1A1A] text-white text-xs uppercase tracking-[0.22em] font-medium hover:bg-black transition-all shadow-xs group"
              >
                <span>Explore Our Collection</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column: Authentic Gallery Artwork Showcase */}
          <div className="lg:col-span-5 xl:col-span-6 lg:pl-6">
            {showcaseImageUrl ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200/80 bg-[#F4F3EE] shadow-sm group">
                  <Image
                    src={showcaseImageUrl}
                    alt={showcasePainting?.title ? `${showcasePainting.title} - Kazi Canvas Gallery` : 'Kazi Canvas Gallery artwork'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                    className="object-cover object-center transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                  />

                  {showcasePainting?.slug && (
                    <Link
                      href={`/gallery/${showcasePainting.slug}`}
                      className="absolute inset-0 z-10"
                      aria-label={`View ${showcasePainting.title}`}
                    />
                  )}

                  {showcasePainting?.slug && (
                    <Link
                      href={`/gallery/${showcasePainting.slug}`}
                      className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-white/95 text-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-md"
                      title={`View ${showcasePainting.title}`}
                    >
                      <ArrowUpRight className="h-4 w-4 stroke-[2]" />
                    </Link>
                  )}
                </div>

                {/* Subtitle / Artwork Information Caption */}
                {showcasePainting && (
                  <div className="flex items-baseline justify-between gap-4 text-xs text-gray-500 font-light px-1">
                    <div>
                      <span className="font-medium text-gray-900">{showcasePainting.title}</span>
                      {showcasePainting.exact_medium && (
                        <span> &bull; {showcasePainting.exact_medium}</span>
                      )}
                    </div>
                    {sizeLabel && <span className="font-mono text-gray-400">{sizeLabel}</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-[4/5] rounded-2xl border border-dashed border-gray-300 bg-[#F7F6F2] flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <p className="text-xs uppercase tracking-[0.2em] font-mono">Original Fine Art &bull; Est. 2018</p>
                <p className="mt-2 text-sm font-light text-gray-500">Kazi Canvas Gallery Studio</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ── Subtle Gallery Values Footer Ribbon ── */}
      <section className="border-t border-gray-200/80 bg-[#FAF9F5] py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold block">ORIGIN</span>
            <p className="text-sm font-medium text-gray-900">Founded in 2018</p>
            <p className="text-xs text-gray-500 font-light">Dedicated to original, handcrafted canvas artwork.</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold block">MEDIUM</span>
            <p className="text-sm font-medium text-gray-900">Oil &amp; Acrylic on Canvas</p>
            <p className="text-xs text-gray-500 font-light">Traditional layering and rich physical textures.</p>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold block">CARE</span>
            <p className="text-sm font-medium text-gray-900">Custom Framing &amp; Delivery</p>
            <p className="text-xs text-gray-500 font-light">Direct artist consultation for homes and offices.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
