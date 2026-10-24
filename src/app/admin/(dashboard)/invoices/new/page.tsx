import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import NewInvoiceClient from './NewInvoiceClient'

export const revalidate = 0

export default async function NewInvoicePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: paintings } = await supabase
    .from('paintings')
    .select('id, title, base_price_bdt, discount_price_bdt, painting_type, display_size, width, height, primary_image_url')
    .order('title', { ascending: true })

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, email, billing_address, organization_name, client_type')
    .order('name', { ascending: true })

  return <NewInvoiceClient paintings={paintings || []} clients={clients || []} />
}
