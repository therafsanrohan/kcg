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

export interface AnnouncementBarSettings {
  enabled: boolean
  text: string
  highlight_badge: string
  link_url: string
  link_label: string
  timer_enabled: boolean
  timer_end_date: string // ISO string or datetime-local format
}

export function parseAnnouncementSettings(siteSettings?: any): AnnouncementBarSettings {
  const social = siteSettings?.social_links || {}
  const announcement = social.announcement_bar || {}

  return {
    enabled: announcement.enabled ?? false,
    text: announcement.text ?? 'Special Seasonal Offer — Limited Edition Original Canvases at Curated Prices',
    highlight_badge: announcement.highlight_badge ?? 'Special Offer',
    link_url: announcement.link_url ?? '/#available-works?category=offers',
    link_label: announcement.link_label ?? 'Explore Pieces',
    timer_enabled: announcement.timer_enabled ?? false,
    timer_end_date: announcement.timer_end_date ?? '',
  }
}
