import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import RelatedArtworksSection, { RelatedArtworkCandidate } from './RelatedArtworksSection'

interface RelatedArtworksLoaderProps {
  currentArtwork: {
    id: string
    title: string
    painting_type: string
    base_price_bdt: number
    discount_price_bdt?: number | null
    width_mm?: number | null
    height_mm?: number | null
    width?: number | null
    height?: number | null
  }
  rates: Record<string, number>
}

export default async function RelatedArtworksLoader({
  currentArtwork,
  rates,
}: RelatedArtworksLoaderProps) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch candidate artworks asynchronously without blocking primary artwork view
  const { data: candidates } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, serial_number, base_price_bdt, discount_price_bdt, offer_badge, painting_type,
      display_size, width, height, width_mm, height_mm, availability_status, created_at,
      painting_images(id, storage_key, thumbnail_key, responsive_urls, is_main, sort_order)
    `)
    .eq('is_published', true)
    .is('archived_at', null)
    .neq('id', currentArtwork.id)
    .order('created_at', { ascending: false })
    .limit(24)

  if (!candidates || candidates.length === 0) {
    return null
  }

  return (
    <RelatedArtworksSection
      currentArtwork={currentArtwork}
      candidates={(candidates as unknown as RelatedArtworkCandidate[]) || []}
      rates={rates}
    />
  )
}
