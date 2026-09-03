import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import CustomerGallerySection from '@/components/CustomerGallerySection'

export const revalidate = 0 // Instant updates from database

export default async function GalleryPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: paintings } = await supabase
    .from('paintings')
    .select(`
      id, title, slug, base_price_bdt, exact_medium, painting_type,
      display_size, width, height, availability_status, is_featured, created_at,
      painting_images(storage_key, is_main),
      frame_options(id, frame_name, outer_size, price_bdt, is_active)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="bg-white min-h-screen pt-8">
      <CustomerGallerySection paintings={paintings || []} />
    </div>
  )
}
