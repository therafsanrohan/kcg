'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ImageUpload({ paintingId, existingImages = [] }: { paintingId: string, existingImages?: any[] }) {
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${paintingId}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('paintings')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('painting_images')
        .insert({
          painting_id: paintingId,
          storage_key: filePath,
          is_main: existingImages.length === 0, // make main if first
        })

      if (dbError) throw dbError

      alert('Image uploaded successfully!')
      // In a real app, we would refresh the list here.
      window.location.reload()

    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Images</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {existingImages.map((img) => (
          <div key={img.id} className="relative aspect-w-1 aspect-h-1 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
            {/* Display logic relies on a public URL getter from supabase storage */}
             <div className="absolute inset-0 flex items-center justify-center p-2 text-xs text-center break-all text-gray-500">
               {img.storage_key} 
               <br />
               {img.is_main ? '(Main)' : ''}
             </div>
          </div>
        ))}
      </div>

      <div>
        <label
          className={`cursor-pointer inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${uploading ? 'opacity-50' : ''}`}
        >
          <span>{uploading ? 'Uploading...' : 'Upload New Image'}</span>
          <input
            type="file"
            className="sr-only"
            accept="image/png, image/jpeg, image/webp"
            onChange={uploadImage}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  )
}
