'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

function isValidUrl(urlString: string): boolean {
  if (!urlString) return true
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidEmail(emailString: string): boolean {
  if (!emailString) return true
  // Safe general email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailString)
}

export async function updateSettings(prevState: any, formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const businessName = (formData.get('business_name') as string)?.trim() || 'Kazi Canvas Gallery'
    const phone = (formData.get('phone') as string)?.trim() || ''
    const phoneEnabled = formData.get('phone_enabled') === 'on'
    
    const whatsapp = (formData.get('whatsapp_number') as string)?.trim().replace(/\D/g, '') || ''
    const whatsappEnabled = formData.get('whatsapp_enabled') === 'on'

    const email = (formData.get('email') as string)?.trim() || ''
    const emailEnabled = formData.get('email_enabled') === 'on'

    const address = (formData.get('address') as string)?.trim() || ''
    const addressEnabled = formData.get('address_enabled') === 'on'

    const facebookUrl = (formData.get('facebook_url') as string)?.trim() || ''
    const facebookEnabled = formData.get('facebook_enabled') === 'on'

    const instagramUrl = (formData.get('instagram_url') as string)?.trim() || ''
    const instagramEnabled = formData.get('instagram_enabled') === 'on'

    const businessHours = (formData.get('business_hours') as string)?.trim() || ''
    const businessHoursEnabled = formData.get('business_hours_enabled') === 'on'

    // Server-side validation
    if (email && !isValidEmail(email)) {
      return { message: 'Please provide a valid email address (e.g. name@domain.com).', type: 'error' }
    }

    if (facebookUrl && !isValidUrl(facebookUrl)) {
      return { message: 'Facebook link must be a valid web URL starting with https:// or http://', type: 'error' }
    }

    if (instagramUrl && !isValidUrl(instagramUrl)) {
      return { message: 'Instagram link must be a valid web URL starting with https:// or http://', type: 'error' }
    }

    const socialLinksPayload = {
      phone,
      phone_enabled: phoneEnabled,
      whatsapp,
      whatsapp_enabled: whatsappEnabled,
      email,
      email_enabled: emailEnabled,
      address,
      address_enabled: addressEnabled,
      facebook_url: facebookUrl,
      facebook_enabled: facebookEnabled,
      instagram_url: instagramUrl,
      instagram_enabled: instagramEnabled,
      business_hours: businessHours,
      business_hours_enabled: businessHoursEnabled,
    }

    const newSettings = {
      business_name: businessName,
      whatsapp_number: whatsapp || '8801824951514',
      contact_info: phone ? `Phone: ${phone}` : (email || null),
      gallery_address: address || null,
      social_links: socialLinksPayload,
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
    revalidatePath('/')
    revalidatePath('/gallery')
    revalidatePath('/about')
    revalidatePath('/admin/settings')

    return { message: 'Site & Contact settings saved successfully!', type: 'success' }
  } catch (error: any) {
    console.error('Update settings error:', error)
    return { message: error.message || 'An error occurred while saving settings.', type: 'error' }
  }
}
