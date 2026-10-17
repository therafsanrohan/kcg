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

      const imageRecords = advancedImages.map((img) => {
        const deliverableKey =
          img.storageKey ||
          img.displayKey ||
          img.responsiveUrls?.['1600'] ||
          img.responsiveUrls?.['960'] ||
          img.thumbnailKey ||
          img.originalKey

        return {
          painting_id: paintingId,
          storage_key: deliverableKey,
          processed_key: deliverableKey,
          thumbnail_key: img.thumbnailKey || deliverableKey,
          responsive_urls: img.responsiveUrls || {},
          is_main: Boolean(img.isPrimary),
          primary_image: Boolean(img.isPrimary),
          sort_order: Number(img.sortOrder) || 1,
          mime_type: img.mimeType || 'image/webp',
          file_format: img.mimeType?.split('/')[1] || 'webp',
          processing_status: 'completed',
        }
      })

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

/**
 * Permanently and safely deletes an artwork image.
 * 1. Checks admin authorization.
 * 2. Verifies the image belongs to the specified painting.
 * 3. Removes file variants from Supabase Storage (paintings_optimized & paintings_master).
 * 4. Deletes the database record.
 * 5. Reassigns the primary/cover image if the deleted image was primary.
 * 6. Revalidates relevant paths.
 */
export async function deletePaintingImageAction({
  imageId,
  paintingId,
}: {
  imageId: string
  paintingId: string
}) {
  try {
    const { supabase } = await requireAdmin()

    // 1. Fetch the target image record to confirm ownership and inspect keys
    const { data: targetImage, error: fetchErr } = await supabase
      .from('painting_images')
      .select('*')
      .eq('id', imageId)
      .eq('painting_id', paintingId)
      .single()

    if (fetchErr || !targetImage) {
      return { error: 'Image record not found or does not belong to this artwork.' }
    }

    const wasPrimary = Boolean(targetImage.is_main || targetImage.primary_image)

    // 2. Identify storage keys to safely remove
    const storageKeysToRemove: string[] = []
    if (targetImage.storage_key) storageKeysToRemove.push(targetImage.storage_key)
    if (targetImage.thumbnail_key && targetImage.thumbnail_key !== targetImage.storage_key) {
      storageKeysToRemove.push(targetImage.thumbnail_key)
    }
    if (targetImage.responsive_urls && typeof targetImage.responsive_urls === 'object') {
      Object.values(targetImage.responsive_urls).forEach((val) => {
        if (typeof val === 'string' && val.trim() && !storageKeysToRemove.includes(val)) {
          storageKeysToRemove.push(val)
        }
      })
    }

    // 3. Remove files from Supabase Storage buckets
    // Check if any other active painting image uses the same storage key before removing
    for (const key of storageKeysToRemove) {
      const { data: sharedCheck } = await supabase
        .from('painting_images')
        .select('id')
        .neq('id', imageId)
        .eq('storage_key', key)
        .is('archived_at', null)
        .limit(1)

      if (!sharedCheck || sharedCheck.length === 0) {
        // Safe to remove from storage buckets
        try {
          await supabase.storage.from('paintings_optimized').remove([key])
          await supabase.storage.from('paintings_master').remove([key])
          await supabase.storage.from('paintings').remove([key])
        } catch (storageErr) {
          console.warn('Storage delete warning (non-fatal):', storageErr)
        }
      }
    }

    // 4. Delete the database record
    const { error: deleteDbErr } = await supabase
      .from('painting_images')
      .delete()
      .eq('id', imageId)

    if (deleteDbErr) {
      throw deleteDbErr
    }

    // 5. If the deleted image was primary, select the next available image to become primary
    if (wasPrimary) {
      const { data: remainingImages } = await supabase
        .from('painting_images')
        .select('id')
        .eq('painting_id', paintingId)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })
        .limit(1)

      if (remainingImages && remainingImages.length > 0) {
        await supabase
          .from('painting_images')
          .update({ is_main: true, primary_image: true })
          .eq('id', remainingImages[0].id)
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath(`/admin/paintings/${paintingId}`)
    revalidatePath('/')
    revalidatePath('/gallery')

    return { success: true }
  } catch (err: any) {
    console.error('Delete painting image error:', err)
    return { error: err.message || 'Failed to delete artwork image.' }
  }
}

/**
 * Sets a specific image as the primary cover image for the artwork.
 */
export async function setPrimaryPaintingImageAction({
  imageId,
  paintingId,
}: {
  imageId: string
  paintingId: string
}) {
  try {
    const { supabase } = await requireAdmin()

    // 1. Reset all images for this painting
    await supabase
      .from('painting_images')
      .update({ is_main: false, primary_image: false })
      .eq('painting_id', paintingId)

    // 2. Set target image as primary
    const { error } = await supabase
      .from('painting_images')
      .update({ is_main: true, primary_image: true })
      .eq('id', imageId)
      .eq('painting_id', paintingId)

    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath(`/admin/paintings/${paintingId}`)
    revalidatePath('/')
    revalidatePath('/gallery')

    return { success: true }
  } catch (err: any) {
    console.error('Set primary image error:', err)
    return { error: err.message || 'Failed to update primary image.' }
  }
}

