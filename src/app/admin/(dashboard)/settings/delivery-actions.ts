'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

function getZoneData(formData: FormData, code: string, defaultLabel: string, defaultSort: number) {
  const startsAt = formData.get(`${code}_offer_starts_at`) as string
  const endsAt = formData.get(`${code}_offer_ends_at`) as string

  return {
    code,
    label: defaultLabel,
    pricing_mode: (formData.get(`${code}_pricing_mode`) as string) || 'fixed',
    charge_bdt: parseFloat(formData.get(`${code}_charge_bdt`) as string) || 0,
    free_delivery: formData.get(`${code}_free_delivery`) === 'true',
    free_delivery_label: (formData.get(`${code}_free_delivery_label`) as string)?.trim() || null,
    offer_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
    offer_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    estimated_delivery_time: (formData.get(`${code}_estimated_time`) as string)?.trim() || '',
    courier_note: (formData.get(`${code}_courier_note`) as string)?.trim() || '',
    is_active: formData.get(`${code}_active`) !== 'false',
    sort_order: defaultSort,
  }
}

export async function saveDeliveryZonesAction(prevState: any, formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const zonesData = [
      getZoneData(formData, 'inside_dhaka', 'Inside Dhaka City Corporation', 1),
      getZoneData(formData, 'outside_dhaka', 'Outside Dhaka City Corporation', 2),
      getZoneData(formData, 'international', 'Outside Bangladesh (Worldwide)', 3),
    ]

    for (const zone of zonesData) {
      const { error } = await supabase
        .from('delivery_zones')
        .upsert(
          {
            code: zone.code,
            label: zone.label,
            pricing_mode: zone.pricing_mode,
            charge_bdt: zone.charge_bdt,
            free_delivery: zone.free_delivery,
            free_delivery_label: zone.free_delivery_label,
            offer_starts_at: zone.offer_starts_at,
            offer_ends_at: zone.offer_ends_at,
            estimated_delivery_time: zone.estimated_delivery_time,
            courier_note: zone.courier_note,
            is_active: zone.is_active,
            sort_order: zone.sort_order,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'code' }
        )

      if (error) throw error
    }

    revalidatePath('/', 'layout')
    return { type: 'success', message: 'Delivery zones updated successfully!' }
  } catch (err: any) {
    console.error('Save delivery zones error:', err)
    return { type: 'error', message: err.message || 'Failed to save delivery zone configuration.' }
  }
}
