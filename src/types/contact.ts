export interface ContactSettings {
  phone: string
  phone_enabled: boolean
  whatsapp: string
  whatsapp_enabled: boolean
  email: string
  email_enabled: boolean
  address: string
  address_enabled: boolean
  facebook_url: string
  facebook_enabled: boolean
  instagram_url: string
  instagram_enabled: boolean
  business_hours: string
  business_hours_enabled: boolean
}

export function parseContactSettings(siteSettings?: any): ContactSettings {
  const social = siteSettings?.social_links || {}

  return {
    phone: social.phone ?? (siteSettings?.contact_info?.includes('Phone:') ? siteSettings.contact_info.replace(/Phone:\s*/i, '') : siteSettings?.contact_info || '+880 1824 951 514'),
    phone_enabled: social.phone_enabled ?? true,
    whatsapp: social.whatsapp || siteSettings?.whatsapp_number || '8801824951514',
    whatsapp_enabled: social.whatsapp_enabled ?? true,
    email: social.email || 'kazicanvasgallery@gmail.com',
    email_enabled: social.email_enabled ?? true,
    address: social.address || siteSettings?.gallery_address || 'Dhaka, Bangladesh',
    address_enabled: social.address_enabled ?? true,
    facebook_url: social.facebook_url || 'https://www.facebook.com/kazicanvasgallery',
    facebook_enabled: social.facebook_enabled ?? true,
    instagram_url: social.instagram_url || 'https://www.instagram.com/kazicanvasgallery',
    instagram_enabled: social.instagram_enabled ?? true,
    business_hours: social.business_hours || 'Saturday – Thursday: 10:00 AM – 8:00 PM',
    business_hours_enabled: social.business_hours_enabled ?? true,
  }
}
