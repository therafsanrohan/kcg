'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateSettings(prevState: any, formData: FormData) {
  const supabase = createAdminClient()

  const newSettings = {
    business_name: (formData.get('business_name') as string)?.trim() || 'Kazi Canvas Gallery',
    whatsapp_number: (formData.get('whatsapp_number') as string)?.trim().replace(/\D/g, '') || '',
    contact_info: (formData.get('contact_info') as string)?.trim() || null,
    gallery_address: (formData.get('gallery_address') as string)?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  try {
    const { data: existing } = await supabase.from('site_settings').select('id').single()

    if (existing) {
      const { error } = await supabase
        .from('site_settings')
        .update(newSettings)
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('site_settings').insert([newSettings])
      if (error) throw error
    }

    // Revalidate entire app since settings are global
    revalidatePath('/', 'layout')
    revalidatePath('/gallery')
    revalidatePath('/admin/settings')

    return { message: 'Settings saved successfully!', type: 'success' }
  } catch (error: any) {
    console.error('Update settings error:', error)
    return { message: error.message || 'An error occurred. Please try again.', type: 'error' }
  }
}
