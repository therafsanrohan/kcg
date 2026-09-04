'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploadManager, { ManagedImage } from '@/components/admin/ImageUploadManager'
import { saveAdvancedImagesAction } from './image-actions'

export default function ImageUploadManagerClient({ paintingId, existingImages }: { paintingId: string, existingImages: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()

  const handleUploadSuccess = async (images: ManagedImage[]) => {
    try {
      setIsSaving(true)
      
      const payload = images.map(img => ({
        id: img.id,
        originalKey: img.storageKey,
        thumbnailKey: `${paintingId}/${img.storageKey?.split('/').pop()?.split('.')[0]}_thumb.webp`,
        responsiveUrls: {
          480: `${paintingId}/${img.storageKey?.split('/').pop()?.split('.')[0]}_480w.webp`,
          960: `${paintingId}/${img.storageKey?.split('/').pop()?.split('.')[0]}_960w.webp`,
          1600: `${paintingId}/${img.storageKey?.split('/').pop()?.split('.')[0]}_1600w.webp`,
          2560: `${paintingId}/${img.storageKey?.split('/').pop()?.split('.')[0]}_2560w.webp`,
        },
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        mimeType: img.isPrimary ? 'image/avif' : 'image/webp'
      }))

      const result = await saveAdvancedImagesAction(paintingId, payload)
      
      if (result.error) {
        alert(result.error)
      } else {
        alert('Images processed and saved successfully!')
        router.refresh()
      }

    } catch (err: any) {
      alert('Failed to save to database: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {isSaving && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold animate-pulse">
          Saving optimized variants to database...
        </div>
      )}
      <ImageUploadManager 
        paintingId={paintingId}
        existingImages={existingImages}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  )
}
