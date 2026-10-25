import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import NewInvoiceClient from './NewInvoiceClient'
import { syncOfferExpirationStatus } from '@/utils/offer-sync'

export const revalidate = 0

export default async function NewInvoicePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Universal Offer Lifecycle Evaluator: ensures accurate pricing in invoices
  const { isCampaignLive } = await syncOfferExpirationStatus()

  let { data: paintings } = await supabase
    .from('paintings')
    .select('id, title, base_price_bdt, discount_price_bdt, painting_type, display_size, width, height, primary_image_url')
    .order('title', { ascending: true })

  if (!isCampaignLive && paintings) {
    paintings = paintings.map((p) => ({
      ...p,
      discount_price_bdt: null,
    }))
  }

  const [clientsRes, deliveryZonesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, phone, email, billing_address, organization_name, client_type')
      .order('name', { ascending: true }),
    supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <NewInvoiceClient
      paintings={paintings || []}
      clients={clientsRes.data || []}
      deliveryZones={deliveryZonesRes.data || []}
    />
  )
}
