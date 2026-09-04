'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

export async function updateSettings(prevState: any, formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const newSettings = {
      business_name: (formData.get('business_name') as string)?.trim() || 'Kazi Canvas Gallery',
      whatsapp_number: (formData.get('whatsapp_number') as string)?.trim().replace(/\D/g, '') || '',
      contact_info: (formData.get('contact_info') as string)?.trim() || null,
      gallery_address: (formData.get('gallery_address') as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    }

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

    revalidatePath('/', 'layout')
    revalidatePath('/gallery')
    revalidatePath('/admin/settings')

    return { message: 'Settings saved successfully!', type: 'success' }
  } catch (error: any) {
    console.error('Update settings error:', error)
    return { message: error.message || 'An error occurred. Please try again.', type: 'error' }
  }
}
