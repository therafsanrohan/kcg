'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploadManager, { ManagedImage } from '@/components/admin/ImageUploadManager'
import { saveAdvancedImagesAction, deletePaintingImageAction, setPrimaryPaintingImageAction } from './image-actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'

export default function ImageUploadManagerClient({ paintingId, existingImages }: { paintingId: string, existingImages: any[] }) {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useAdminFeedback()

  const handleUploadSuccess = async (images: ManagedImage[]) => {
    try {
      setIsSaving(true)
      
      const payload = images.map((img: any) => {
        const baseFileName = (img.originalKey || img.storageKey)?.split('/').pop()?.split('.')[0] || img.id
        const fallbackThumb = `${paintingId}/${baseFileName}_thumb.webp`
        const responsive = img.responsiveUrls || {
          480: `${paintingId}/${baseFileName}_480w.webp`,
          960: `${paintingId}/${baseFileName}_960w.webp`,
          1600: `${paintingId}/${baseFileName}_1600w.webp`,
          2560: `${paintingId}/${baseFileName}_2560w.webp`,
        }

        const displayKey =
          img.storageKey && !img.storageKey.includes('_master.')
            ? img.storageKey
            : responsive['1600'] || responsive['960'] || fallbackThumb

        return {
          id: img.id,
          originalKey: img.originalKey || img.storageKey,
          storageKey: displayKey,
          thumbnailKey: img.thumbnailKey || fallbackThumb,
          responsiveUrls: responsive,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
          mimeType: img.isPrimary ? 'image/avif' : 'image/webp',
        }
      })

      const result = await saveAdvancedImagesAction(paintingId, payload)
      
      if (result.error) {
        toast(result.error, 'error')
      } else {
        toast('Images processed and saved successfully!', 'success')
        router.refresh()
      }

    } catch (err: any) {
      toast('Failed to save to database: ' + err.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSavedImage = async (imageId: string) => {
    try {
      const res = await deletePaintingImageAction({ imageId, paintingId })
      if (res?.error) {
        toast(res.error, 'error')
        return false
      }
      toast('Image permanently deleted.', 'success')
      router.refresh()
      return true
    } catch (err: any) {
      toast('Failed to delete image: ' + err.message, 'error')
      return false
    }
  }

  const handleSetPrimarySavedImage = async (imageId: string) => {
    try {
      const res = await setPrimaryPaintingImageAction({ imageId, paintingId })
      if (res?.error) {
        toast(res.error, 'error')
        return false
      }
      toast('Cover image updated.', 'success')
      router.refresh()
      return true
    } catch (err: any) {
      toast('Failed to set primary image: ' + err.message, 'error')
      return false
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
        onDeleteSavedImage={handleDeleteSavedImage}
        onSetPrimarySavedImage={handleSetPrimarySavedImage}
      />
    </div>
  )
}

