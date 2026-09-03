import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import PaintingForm from '@/components/admin/PaintingForm'
import ImageUpload from '@/components/admin/ImageUpload'
import FrameManager from '@/components/admin/FrameManager'

export default async function EditPaintingPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: painting } = await supabase
    .from('paintings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!painting) {
    notFound()
  }

  const { data: images } = await supabase
    .from('painting_images')
    .select('*')
    .eq('painting_id', params.id)
    .order('sort_order', { ascending: true })

  const { data: frames } = await supabase
    .from('frame_options')
    .select('*')
    .eq('painting_id', params.id)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Painting
          </h2>
        </div>
      </div>
      
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border border-gray-100">
        <PaintingForm painting={painting} />
        
        <ImageUpload paintingId={painting.id} existingImages={images || []} />
        
        <FrameManager paintingId={painting.id} existingFrames={frames || []} />
      </div>
    </div>
  )
}
