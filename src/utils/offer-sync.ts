import { createAdminClient } from '@/utils/supabase/admin'
import { parseAnnouncementSettings, isOfferCampaignActive, AnnouncementBarSettings } from '@/types/contact'
import { revalidatePath } from 'next/cache'

/**
 * Universal Offer Lifecycle Evaluator & Auto-Cleanup Engine:
 * 
 * 1. Checks if the offer campaign has expired based on announcement bar timer settings.
 * 2. If expired and database paintings still hold active discounts/badges:
 *    - Automatically updates the PostgreSQL database to set discount_price_bdt = null and offer_badge = null.
 *    - Updates site_settings to mark announcement bar as disabled.
 *    - On-demand revalidates all public customer pages and admin routes.
 * 3. Returns { isCampaignLive, cleanedUpCount }.
 */
export async function syncOfferExpirationStatus(
  cachedSettings?: any
): Promise<{ isCampaignLive: boolean; cleanedUp: boolean }> {
  try {
    let settings = cachedSettings
    const adminSupabase = createAdminClient()

    if (!settings) {
      const { data } = await adminSupabase
        .from('site_settings')
        .select('social_links')
        .single()
      settings = data
    }

    const announcementSettings: AnnouncementBarSettings = parseAnnouncementSettings(settings)
    const isCampaignLive = isOfferCampaignActive(announcementSettings)

    // If campaign is still alive or timer is not enabled, no cleanup needed
    if (isCampaignLive) {
      return { isCampaignLive: true, cleanedUp: false }
    }

    // Campaign has expired!
    // Check if any paintings currently still have active discount prices
    const { data: expiredArtworks } = await adminSupabase
      .from('paintings')
      .select('id')
      .not('discount_price_bdt', 'is', null)
      .limit(10)

    if (expiredArtworks && expiredArtworks.length > 0) {
      const now = new Date().toISOString()
      // Wipe discount prices & badges from all paintings in database
      await adminSupabase
        .from('paintings')
        .update({
          discount_price_bdt: null,
          offer_badge: null,
          updated_at: now,
        })
        .not('discount_price_bdt', 'is', null)

      // Also disable the announcement bar in site_settings so banner disappears completely
      try {
        const { data: currentSiteSettings } = await adminSupabase
          .from('site_settings')
          .select('id, social_links')
          .single()

        if (currentSiteSettings) {
          const social = (currentSiteSettings.social_links as any) || {}
          if (social.announcement_bar) {
            social.announcement_bar.enabled = false
            social.announcement_bar.timer_enabled = false
          }
          await adminSupabase
            .from('site_settings')
            .update({
              social_links: social,
              updated_at: now,
            })
            .eq('id', currentSiteSettings.id)
        }
      } catch (settingsErr) {
        console.error('Failed to disable announcement bar on offer expiration:', settingsErr)
      }

      // Revalidate all pages on-demand so changes reflect immediately everywhere
      try {
        revalidatePath('/')
        revalidatePath('/gallery')
        revalidatePath('/admin')
        revalidatePath('/admin/paintings')
      } catch {}

      return { isCampaignLive: false, cleanedUp: true }
    }

    return { isCampaignLive: false, cleanedUp: false }
  } catch (err) {
    console.error('Error in syncOfferExpirationStatus:', err)
    return { isCampaignLive: true, cleanedUp: false }
  }
}
