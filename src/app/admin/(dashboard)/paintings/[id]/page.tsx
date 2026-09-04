import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import PaintingForm from '@/components/admin/PaintingForm'
import ImageUploadManagerClient from './ImageUploadManagerClient'
import FrameManager from '@/components/admin/FrameManager'

export default async function EditPaintingPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
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
    .is('archived_at', null)
    .order('sort_order', { ascending: true })

  const { data: frames } = await supabase
    .from('frame_options')
    .select('*')
    .eq('painting_id', params.id)
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Edit Painting: {painting.title}
          </h2>
        </div>
      </div>
      
      {/* 1. Edit Details */}
      <PaintingForm painting={painting} />
      
      {/* 2. Advanced Image Management */}
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border border-gray-100">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Advanced Images</h3>
        <p className="text-sm text-gray-500 mb-6">
          Upload up to 5 high-resolution images. Crop them to 4:5 ratio for perfect display.
        </p>
        <ImageUploadManagerClient paintingId={painting.id} existingImages={images || []} />
      </div>
      
      {/* 3. Legacy Framework (Left for compatibility, but images replace it) */}
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border border-gray-100">
        <FrameManager paintingId={painting.id} existingFrames={frames || []} />
      </div>
    </div>
  )
}
