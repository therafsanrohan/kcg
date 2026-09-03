'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Helper to generate clean URL slugs from title
function generateSlug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') +
    '-' +
    Math.random().toString(36).substring(2, 6)
  )
}

// ─────────────────────────────────────────────
// COMPAT ALIAS – used by legacy PaintingForm
// ─────────────────────────────────────────────
export async function savePainting(prevState: any, formData: FormData) {
  return await saveArtworkAction(prevState, formData)
}

// ─────────────────────────────────────────────
// TOGGLE PUBLISH STATUS
// ─────────────────────────────────────────────
export async function togglePublishPainting(id: string, currentValue: boolean) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { error } = await supabase
      .from('paintings')
      .update({ is_published: !currentValue, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/')
    revalidatePath('/gallery')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────
// DELETE PAINTING
// ─────────────────────────────────────────────
export async function deletePainting(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { error } = await supabase.from('paintings').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/')
    revalidatePath('/gallery')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────
// SAVE (CREATE or UPDATE) PAINTING
// ─────────────────────────────────────────────
export async function saveArtworkAction(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const id = formData.get('id') as string | null
  const title = (formData.get('title') as string)?.trim()
  const painting_type = (formData.get('painting_type') as string) || 'oil'
  const exact_medium =
    (formData.get('exact_medium') as string)?.trim() || 'Oil on canvas'
  const display_size =
    (formData.get('display_size') as string)?.trim() || '24 × 36 in'
  const yearStr = formData.get('year') as string
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
  const availability_status =
    (formData.get('availability_status') as string) || 'available'
  const base_price_bdt =
    parseFloat(formData.get('base_price_bdt') as string) || 0
  const description = (formData.get('description') as string)?.trim() || ''
  // Booleans from checkboxes — checkbox only sends value when checked
  const is_published = formData.get('is_published') === 'true'
  const is_featured = formData.get('is_featured') === 'true'

  if (!title) {
    return { error: 'Artwork title is required.' }
  }

  // Parse width/height from display_size ("24 × 36 in" or "60 x 90 cm")
  let width = 60
  let height = 90
  const sizeMatch = display_size.match(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)/)
  if (sizeMatch) {
    width = parseFloat(sizeMatch[1])
    height = parseFloat(sizeMatch[2])
  }

  const slug = id ? undefined : generateSlug(title) // only set slug on create

  try {
    let paintingId = id

    if (id) {
      // ── UPDATE ──
      const { error: updateErr } = await supabase
        .from('paintings')
        .update({
          title,
          painting_type,
          exact_medium,
          display_size,
          width,
          height,
          measurement_unit: 'cm',
          year,
          availability_status,
          base_price_bdt,
          description,
          is_published,
          is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr
    } else {
      // ── INSERT ──
      const { data: newPainting, error: insertErr } = await supabase
        .from('paintings')
        .insert({
          title,
          slug,
          painting_type,
          exact_medium,
          display_size,
          width,
          height,
          measurement_unit: 'cm',
          year,
          availability_status,
          base_price_bdt,
          description,
          is_published,
          is_featured,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      paintingId = newPainting.id
    }

    // ── FRAME OPTIONS ──
    const framesRaw = formData.get('frames_json') as string
    if (framesRaw && paintingId) {
      try {
        const frames: Array<{
          frame_name: string
          outer_size: string
          price_bdt: number
        }> = JSON.parse(framesRaw)

        // Delete existing frames before re-inserting
        await supabase
          .from('frame_options')
          .delete()
          .eq('painting_id', paintingId)

        if (frames.length > 0) {
          const frameRecords = frames
            .filter((f) => f.frame_name?.trim())
            .map((f, idx) => ({
              painting_id: paintingId,
              frame_name: f.frame_name.trim(),
              outer_size: f.outer_size || '',
              price_bdt: Number(f.price_bdt) || 0,
              is_active: true,
              sort_order: idx + 1,
            }))
          if (frameRecords.length > 0) {
            await supabase.from('frame_options').insert(frameRecords)
          }
        }
      } catch (e) {
        console.error('Error parsing frames JSON:', e)
      }
    }

    // ── IMAGE UPLOAD ──
    const imageFile = formData.get('artwork_image') as File | null
    if (imageFile && imageFile.size > 0 && paintingId) {
      try {
        const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `${paintingId}-${Date.now()}.${fileExt}`

        const { error: uploadErr } = await supabase.storage
          .from('paintings')
          .upload(fileName, imageFile, { upsert: true, contentType: imageFile.type })

        if (uploadErr) {
          console.error('Storage upload error:', uploadErr.message)
          // Don't fail the whole save — painting is saved, just image failed
        } else {
          // If updating, mark old main images as non-main
          if (id) {
            await supabase
              .from('painting_images')
              .update({ is_main: false })
              .eq('painting_id', id)
              .eq('is_main', true)
          }
          // Insert the new image record
          await supabase.from('painting_images').insert({
            painting_id: paintingId,
            storage_key: fileName,
            alt_text: title,
            is_main: true,
            sort_order: 0,
          })
        }
      } catch (imgErr: any) {
        console.error('Storage error:', imgErr)
      }
    }

    // Revalidate all affected pages
    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/')
    revalidatePath('/gallery')
    revalidatePath('/gallery/[slug]', 'page')

    return { success: true }
  } catch (err: any) {
    console.error('Save painting error:', err)
    return { error: err.message || 'Failed to save artwork.' }
  }
}

// ─────────────────────────────────────────────
// COMPAT ALIAS – used by AddArtworkModal
// ─────────────────────────────────────────────
export async function saveArtworkModalAction(prevState: any, formData: FormData) {
  return await saveArtworkAction(prevState, formData)
}
