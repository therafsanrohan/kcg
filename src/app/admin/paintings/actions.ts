'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const paintingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  painting_type: z.enum(['oil', 'acrylic', 'mixed']),
  exact_medium: z.string().min(1, 'Medium is required'),
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  measurement_unit: z.string().default('cm'),
  display_size: z.string().optional(),
  year: z.coerce.number().optional().nullable(),
  base_price_bdt: z.coerce.number().positive(),
  description: z.string().optional(),
  availability_status: z.enum(['available', 'reserved', 'sold']),
  is_featured: z.coerce.boolean().default(false),
  is_published: z.coerce.boolean().default(false),
})

export async function savePainting(prevState: any, formData: FormData) {
  const supabase = createClient()
  
  const id = formData.get('id') as string
  
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    painting_type: formData.get('painting_type'),
    exact_medium: formData.get('exact_medium'),
    width: formData.get('width'),
    height: formData.get('height'),
    measurement_unit: formData.get('measurement_unit'),
    display_size: formData.get('display_size'),
    year: formData.get('year') ? formData.get('year') : null,
    base_price_bdt: formData.get('base_price_bdt'),
    description: formData.get('description'),
    availability_status: formData.get('availability_status'),
    is_featured: formData.get('is_featured') === 'true',
    is_published: formData.get('is_published') === 'true',
  }

  const validatedFields = paintingSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Save Painting.',
    }
  }

  try {
    if (id) {
      const { error } = await supabase
        .from('paintings')
        .update(validatedFields.data)
        .eq('id', id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('paintings')
        .insert(validatedFields.data)
      
      if (error) throw error
    }
  } catch (error: any) {
    return {
      message: `Database Error: ${error.message}`,
    }
  }

  revalidatePath('/admin/paintings')
  revalidatePath('/')
  redirect('/admin/paintings')
}
