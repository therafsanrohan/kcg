'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Helper to generate clean slugs from title
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 6)
}

export async function savePainting(prevState: any, formData: FormData) {
  return await saveArtworkModalAction(prevState, formData)
}

export async function deletePainting(id: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    const { error } = await supabase.from('paintings').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/gallery')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function saveArtworkModalAction(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const id = formData.get('id') as string | null
  const title = (formData.get('title') as string)?.trim()
  const painting_type = (formData.get('painting_type') as string) || 'oil'
  const exact_medium = (formData.get('exact_medium') as string)?.trim() || 'Oil on canvas'
  const display_size = (formData.get('display_size') as string)?.trim() || '24 × 36 in'
  const yearStr = formData.get('year') as string
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear()
  const availability_status = (formData.get('availability_status') as string) || 'available'
  const base_price_bdt = parseFloat(formData.get('base_price_bdt') as string) || 0
  const description = (formData.get('description') as string)?.trim() || ''

  if (!title) {
    return { error: 'Artwork title is required.' }
  }

  // Parse width and height from display_size (e.g. "24 × 36 in" or "60 x 90 cm")
  let width = 60
  let height = 90
  const sizeMatch = display_size.match(/(\d+)\s*[x×X]\s*(\d+)/)
  if (sizeMatch) {
    width = parseFloat(sizeMatch[1])
    height = parseFloat(sizeMatch[2])
  }

  const slug = generateSlug(title)

  try {
    let paintingId = id

    if (id) {
      // Update existing
      const { error: updateErr } = await supabase
        .from('paintings')
        .update({
          title,
          painting_type,
          exact_medium,
          display_size,
          width,
          height,
          year,
          availability_status,
          base_price_bdt,
          description,
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr
    } else {
      // Insert new
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
          year,
          availability_status,
          base_price_bdt,
          description,
          is_published: true,
          is_featured: true,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      paintingId = newPainting.id
    }

    // Handle Frame Options
    const framesRaw = formData.get('frames_json') as string
    if (framesRaw && paintingId) {
      try {
        const frames: Array<{ frame_name: string; outer_size: string; price_bdt: number }> = JSON.parse(framesRaw)
        
        // Remove existing frames if updating
        if (id) {
          await supabase.from('frame_options').delete().eq('painting_id', id)
        }

        if (frames.length > 0) {
          const frameRecords = frames.map((f, idx) => ({
            painting_id: paintingId,
            frame_name: f.frame_name || 'Natural oak',
            outer_size: f.outer_size || '',
            price_bdt: Number(f.price_bdt) || 0,
            is_active: true,
            sort_order: idx + 1,
          }))
          await supabase.from('frame_options').insert(frameRecords)
        }
      } catch (e) {
        console.error('Error parsing frames JSON:', e)
      }
    }

    // Handle Image upload or image file
    const imageFile = formData.get('artwork_image') as File | null
    if (imageFile && imageFile.size > 0 && paintingId) {
      try {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${paintingId}-${Date.now()}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('paintings')
          .upload(fileName, imageFile, { upsert: true })

        if (!uploadErr) {
          // Add to painting_images
          await supabase.from('painting_images').insert({
            painting_id: paintingId,
            storage_key: fileName,
            alt_text: title,
            is_main: true,
            sort_order: 0,
          })
        }
      } catch (imgErr) {
        console.error('Storage upload error:', imgErr)
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/paintings')
    revalidatePath('/gallery')
    revalidatePath('/')

    return { success: true }
  } catch (err: any) {
    console.error('Save painting error:', err)
    return { error: err.message || 'Failed to save artwork.' }
  }
}
