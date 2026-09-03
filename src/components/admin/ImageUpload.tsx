'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ImageUpload({ paintingId, existingImages = [] }: { paintingId: string, existingImages?: any[] }) {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const supabase = createClient()
  const router = useRouter()

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

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

      showMessage('Image uploaded successfully!', 'success')
      router.refresh()

    } catch (error: any) {
      showMessage(error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string, storageKey: string) {
    if (!confirm('Are you sure you want to delete this image?')) return
    
    try {
      setUploading(true)
      
      const { error: storageError } = await supabase.storage.from('paintings').remove([storageKey])
      if (storageError) throw storageError
      
      const { error: dbError } = await supabase.from('painting_images').delete().eq('id', id)
      if (dbError) throw dbError
      
      showMessage('Image deleted successfully!', 'success')
      router.refresh()
    } catch (error: any) {
      showMessage(error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleSetMain(id: string) {
    try {
      setUploading(true)
      
      // First, set all images for this painting to not main
      const { error: resetError } = await supabase
        .from('painting_images')
        .update({ is_main: false })
        .eq('painting_id', paintingId)
        
      if (resetError) throw resetError
      
      // Then set the selected one as main
      const { error: updateError } = await supabase
        .from('painting_images')
        .update({ is_main: true })
        .eq('id', id)
        
      if (updateError) throw updateError
      
      showMessage('Main image updated!', 'success')
      router.refresh()
    } catch (error: any) {
      showMessage(error.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Images</h3>
      
      {message.text && (
        <div className={`mb-4 p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {existingImages.map((img) => {
          const publicUrl = supabase.storage.from('paintings').getPublicUrl(img.storage_key).data.publicUrl
          
          return (
            <div key={img.id} className="relative group rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex flex-col">
              <div className="relative aspect-square w-full">
                <Image
                  src={publicUrl}
                  alt="Painting Image"
                  fill
                  className="object-cover"
                />
                {img.is_main && (
                  <div className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1 rounded shadow">
                    Main Image
                  </div>
                )}
              </div>
              <div className="flex bg-white divide-x divide-gray-200 border-t border-gray-200">
                {!img.is_main && (
                  <button
                    type="button"
                    onClick={() => handleSetMain(img.id)}
                    disabled={uploading}
                    className="flex-1 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                  >
                    Set Main
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id, img.storage_key)}
                  disabled={uploading}
                  className="flex-1 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <label
          className={`cursor-pointer inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <span>{uploading ? 'Processing...' : 'Upload New Image'}</span>
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
