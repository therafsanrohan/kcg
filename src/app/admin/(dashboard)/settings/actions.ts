'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function updateSettings(prevState: any, formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { message: 'Unauthorized', type: 'error' }
  }

  const newSettings = {
    business_name: formData.get('business_name') as string,
    whatsapp_number: formData.get('whatsapp_number') as string,
    contact_info: formData.get('contact_info') as string,
    gallery_address: formData.get('gallery_address') as string,
  }

  try {
    // Check if settings exist
    const { data: existing } = await supabase.from('site_settings').select('id').single()

    if (existing) {
      const { error } = await supabase.from('site_settings').update(newSettings).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('site_settings').insert([newSettings])
      if (error) throw error
    }

    revalidatePath('/', 'layout') // revalidate everywhere since settings are global
    return { message: 'Settings updated successfully!', type: 'success' }
  } catch (error: any) {
    return { message: error.message || 'An error occurred', type: 'error' }
  }
}
