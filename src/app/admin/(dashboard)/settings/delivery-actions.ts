'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'

export async function saveDeliveryZonesAction(prevState: any, formData: FormData) {
  try {
    const { supabase } = await requireAdmin()

    const zonesData = [
      {
        code: 'inside_dhaka',
        label: 'Inside Dhaka City Corporation',
        pricing_mode: (formData.get('inside_dhaka_pricing_mode') as string) || 'free',
        charge_bdt: parseFloat(formData.get('inside_dhaka_charge_bdt') as string) || 0,
        free_delivery: formData.get('inside_dhaka_free_delivery') === 'true',
        estimated_delivery_time: (formData.get('inside_dhaka_estimated_time') as string)?.trim() || '24–48 Hours',
        courier_note: (formData.get('inside_dhaka_courier_note') as string)?.trim() || '',
        is_active: formData.get('inside_dhaka_active') !== 'false',
        sort_order: 1,
      },
      {
        code: 'outside_dhaka',
        label: 'Outside Dhaka City Corporation',
        pricing_mode: (formData.get('outside_dhaka_pricing_mode') as string) || 'fixed',
        charge_bdt: parseFloat(formData.get('outside_dhaka_charge_bdt') as string) || 0,
        free_delivery: formData.get('outside_dhaka_free_delivery') === 'true',
        estimated_delivery_time: (formData.get('outside_dhaka_estimated_time') as string)?.trim() || '2–4 Business Days',
        courier_note: (formData.get('outside_dhaka_courier_note') as string)?.trim() || '',
        is_active: formData.get('outside_dhaka_active') !== 'false',
        sort_order: 2,
      },
      {
        code: 'international',
        label: 'Outside Bangladesh (Worldwide)',
        pricing_mode: (formData.get('international_pricing_mode') as string) || 'destination_quotation',
        charge_bdt: parseFloat(formData.get('international_charge_bdt') as string) || 0,
        free_delivery: formData.get('international_free_delivery') === 'true',
        estimated_delivery_time: (formData.get('international_estimated_time') as string)?.trim() || '5–10 Business Days',
        courier_note: (formData.get('international_courier_note') as string)?.trim() || '',
        is_active: formData.get('international_active') !== 'false',
        sort_order: 3,
      },
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
