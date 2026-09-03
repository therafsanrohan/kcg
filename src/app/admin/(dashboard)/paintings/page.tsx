import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ManageArtworksClient from '@/components/admin/ManageArtworksClient'

export const revalidate = 0 // Instant updates from database

export default async function AdminPaintingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: paintings, error } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, painting_type, exact_medium, display_size, width, height,
      base_price_bdt, discount_price_bdt, offer_badge, availability_status, is_published, is_featured, description, year, created_at,
      painting_images(storage_key, is_main),
      frame_options(id, frame_name, outer_size, price_bdt, is_active)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching paintings for admin paintings page:', error)
  }

  return <ManageArtworksClient initialPaintings={paintings || []} />
}
