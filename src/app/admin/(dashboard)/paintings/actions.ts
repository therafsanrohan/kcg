'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
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

export async function savePainting(prevState: any, formData: FormData) {
  return await saveArtworkAction(prevState, formData)
}

// ─────────────────────────────────────────────
// TOGGLE PUBLISH STATUS
// ─────────────────────────────────────────────
export async function togglePublishPainting(id: string, currentValue: boolean) {
  try {
    const { supabase } = await requireAdmin()

    // Block publishing if painting has 0 images
    if (!currentValue === true) {
      const { count } = await supabase
        .from('painting_images')
        .select('id', { count: 'exact', head: true })
        .eq('painting_id', id)

      if (!count || count === 0) {
        return { success: false, error: 'Cannot publish artwork without at least 1 image.' }
      }
    }

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
    console.error('Toggle publish error:', err)
    return { success: false, error: err.message || 'Unauthorized action.' }
  }
}

// ─────────────────────────────────────────────
// DELETE PAINTING
// ─────────────────────────────────────────────
export async function deletePainting(id: string) {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase.from('paintings').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/')
    revalidatePath('/gallery')
    return { success: true }
  } catch (err: any) {
    console.error('Delete painting error:', err)
    return { success: false, error: err.message || 'Unauthorized action.' }
  }
}

// ─────────────────────────────────────────────
// SAVE (CREATE or UPDATE) PAINTING
// ─────────────────────────────────────────────
export async function saveArtworkAction(prevState: any, formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const id = formData.get('id') as string | null
    const title = (formData.get('title') as string)?.trim()
    const painting_type = (formData.get('painting_type') as string) || 'oil'
    const exact_medium = (formData.get('exact_medium') as string)?.trim() || 'Oil on canvas'
    const display_size = (formData.get('display_size') as string)?.trim() || '24 × 36 in'
    const yearStr = formData.get('year') as string
    const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
    const availability_status = (formData.get('availability_status') as string) || 'available'
    const base_price_bdt = parseFloat(formData.get('base_price_bdt') as string) || 0
    const discountStr = formData.get('discount_price_bdt') as string
    const discount_price_bdt =
      discountStr && !isNaN(parseFloat(discountStr)) && parseFloat(discountStr) > 0
        ? parseFloat(discountStr)
        : null
    const offer_badge = (formData.get('offer_badge') as string)?.trim() || null
    const description = (formData.get('description') as string)?.trim() || ''

    // Booleans from checkboxes
    const is_published = formData.get('is_published') === 'true'
    const is_featured = formData.get('is_featured') === 'true'

    if (!title) {
      return { error: 'Artwork title is required.' }
    }

    // Canonical mm dimension calculation
    const widthInputStr = formData.get('width_input') as string
    const heightInputStr = formData.get('height_input') as string
    const unitInput = (formData.get('measurement_unit_input') as string) || (formData.get('measurement_unit') as string) || 'in'
    
    let width_mm: number | null = null
    let height_mm: number | null = null
    let width = 60
    let height = 90
    let measurement_unit = 'cm'

    if (widthInputStr && heightInputStr && !isNaN(parseFloat(widthInputStr)) && !isNaN(parseFloat(heightInputStr))) {
      const wVal = parseFloat(widthInputStr)
      const hVal = parseFloat(heightInputStr)
      const unit = (unitInput.toLowerCase() === 'in' ? 'in' : unitInput.toLowerCase() === 'mm' ? 'mm' : 'cm') as 'mm' | 'cm' | 'in'
      
      const mmPerUnit: Record<string, number> = { mm: 1, cm: 10, in: 25.4 }
      width_mm = Math.round(wVal * (mmPerUnit[unit] || 10) * 10) / 10
      height_mm = Math.round(hVal * (mmPerUnit[unit] || 10) * 10) / 10
      width = wVal
      height = hVal
      measurement_unit = unit
    } else {
      // Fallback: parse from display_size ("24 × 36 in" or "60 x 90 cm")
      const sizeMatch = display_size.match(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(in|cm|mm)?/i)
      if (sizeMatch) {
        width = parseFloat(sizeMatch[1])
        height = parseFloat(sizeMatch[2])
        const unit = (sizeMatch[3] || 'in').toLowerCase() === 'cm' ? 'cm' : (sizeMatch[3] || 'in').toLowerCase() === 'mm' ? 'mm' : 'in'
        measurement_unit = unit
        const mmPerUnit: Record<string, number> = { mm: 1, cm: 10, in: 25.4 }
        width_mm = Math.round(width * mmPerUnit[unit] * 10) / 10
        height_mm = Math.round(height * mmPerUnit[unit] * 10) / 10
      }
    }

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
          measurement_unit,
          width_mm,
          height_mm,
          year,
          availability_status,
          base_price_bdt,
          discount_price_bdt,
          offer_badge,
          description,
          is_published,
          is_featured,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr
    } else {
      // ── INSERT ──
      const slug = generateSlug(title)
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
          measurement_unit,
          width_mm,
          height_mm,
          year,
          availability_status,
          base_price_bdt,
          discount_price_bdt,
          offer_badge,
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
          outer_width_mm?: number | null
          outer_height_mm?: number | null
        }> = JSON.parse(framesRaw)

        await supabase.from('frame_options').delete().eq('painting_id', paintingId)

        if (frames.length > 0) {
          const frameRecords = frames
            .filter((f) => f.frame_name?.trim())
            .map((f, idx) => {
              let outer_width_mm = f.outer_width_mm || null
              let outer_height_mm = f.outer_height_mm || null

              // If mm is not explicitly provided, try parsing outer_size
              if (!outer_width_mm && f.outer_size) {
                const match = f.outer_size.match(/(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(in|cm|mm)?/i)
                if (match) {
                  const w = parseFloat(match[1])
                  const h = parseFloat(match[2])
                  const u = (match[3] || 'in').toLowerCase() === 'cm' ? 'cm' : (match[3] || 'in').toLowerCase() === 'mm' ? 'mm' : 'in'
                  const factor = u === 'in' ? 25.4 : u === 'mm' ? 1 : 10
                  outer_width_mm = Math.round(w * factor * 10) / 10
                  outer_height_mm = Math.round(h * factor * 10) / 10
                }
              }

              return {
                painting_id: paintingId,
                frame_name: f.frame_name.trim(),
                outer_size: f.outer_size || '',
                outer_width_mm,
                outer_height_mm,
                price_bdt: Number(f.price_bdt) || 0,
                is_active: true,
                sort_order: idx + 1,
              }
            })
          if (frameRecords.length > 0) {
            await supabase.from('frame_options').insert(frameRecords)
          }
        }
      } catch (e) {
        console.error('Error parsing frames JSON:', e)
      }
    }

    // ── SINGLE IMAGE FALLBACK (Legacy compatibility) ──
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
        } else {
          if (id) {
            await supabase
              .from('painting_images')
              .update({ is_main: false })
              .eq('painting_id', id)
              .eq('is_main', true)
          }
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

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/')
    revalidatePath('/gallery')

    return { success: true }
  } catch (err: any) {
    console.error('Save painting error:', err)
    return { error: err.message || 'Failed to save artwork.' }
  }
}

export async function saveArtworkModalAction(prevState: any, formData: FormData) {
  return await saveArtworkAction(prevState, formData)
}
