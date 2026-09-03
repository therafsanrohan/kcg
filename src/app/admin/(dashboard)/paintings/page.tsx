import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ManageArtworksClient from '@/components/admin/ManageArtworksClient'

export const revalidate = 0

export default async function AdminPaintingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: paintings } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, painting_type, exact_medium, display_size, width, height,
      base_price_bdt, availability_status, description, year,
      painting_images(storage_key, is_main),
      frame_options(id, frame_name, outer_size, price_bdt, is_active)
    `)
    .order('created_at', { ascending: false })

  return <ManageArtworksClient initialPaintings={paintings || []} />
}
