'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

export async function saveAdvancedImagesAction(paintingId: string, advancedImages: any[]) {
  try {
    const { supabase } = await requireAdmin()

    if (advancedImages.length > 0) {
      // Soft delete old images by archiving them (instead of hard delete)
      await supabase
        .from('painting_images')
        .update({ archived_at: new Date().toISOString() })
        .eq('painting_id', paintingId)
        .is('archived_at', null)

      const imageRecords = advancedImages.map((img) => ({
        painting_id: paintingId,
        storage_key: img.originalKey,
        thumbnail_key: img.thumbnailKey,
        responsive_urls: img.responsiveUrls,
        is_main: img.isPrimary,
        primary_image: img.isPrimary,
        sort_order: img.sortOrder,
        mime_type: img.mimeType,
        file_format: img.mimeType?.split('/')[1] || 'webp'
      }))

      const { error: imgInsertErr } = await supabase.from('painting_images').insert(imageRecords)
      if (imgInsertErr) {
        throw imgInsertErr
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath(`/admin/paintings/${paintingId}`)
    revalidatePath('/')
    revalidatePath('/gallery')

    return { success: true }
  } catch (err: any) {
    console.error('Save images error:', err)
    return { error: err.message || 'Failed to save image metadata.' }
  }
}
