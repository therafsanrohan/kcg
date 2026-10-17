'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'
import { Client } from '@/types/invoice'

export async function getClients(search?: string): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  try {
    const { supabase } = await requireAdmin()
    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      query = query.or(`name.ilike.${term},phone.ilike.${term},email.ilike.${term},organization_name.ilike.${term},client_number.ilike.${term}`)
    }

    const { data, error } = await query
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('Error fetching clients:', err)
    return { success: false, error: err.message }
  }
}

export async function createClientRecord(clientData: Partial<Client>) {
  try {
    const { supabase } = await requireAdmin()

    if (!clientData.name?.trim() || !clientData.phone?.trim()) {
      return { success: false, error: 'Name and Phone number are required.' }
    }

    const insertPayload: any = {
      name: clientData.name.trim(),
      phone: clientData.phone.trim(),
      email: clientData.email?.trim() || null,
      client_type: clientData.client_type || 'individual',
      organization_name: clientData.organization_name?.trim() || null,
      billing_address: clientData.billing_address?.trim() || null,
      shipping_address: clientData.shipping_address?.trim() || null,
      tax_id: clientData.tax_id?.trim() || null,
      membership_tier: clientData.membership_tier || 'none',
      membership_status: clientData.membership_status || 'active',
      membership_start_date: clientData.membership_start_date || null,
      membership_expiry_date: clientData.membership_expiry_date || null,
      internal_notes: clientData.internal_notes?.trim() || null,
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/clients')
    return { success: true, client: data }
  } catch (err: any) {
    console.error('Error creating client:', err)
    return { success: false, error: err.message }
  }
}

export async function updateClientRecord(id: string, clientData: Partial<Client>) {
  try {
    const { supabase } = await requireAdmin()

    const updatePayload: any = {
      name: clientData.name?.trim(),
      phone: clientData.phone?.trim(),
      email: clientData.email?.trim() || null,
      client_type: clientData.client_type,
      organization_name: clientData.organization_name?.trim() || null,
      billing_address: clientData.billing_address?.trim() || null,
      shipping_address: clientData.shipping_address?.trim() || null,
      tax_id: clientData.tax_id?.trim() || null,
      membership_tier: clientData.membership_tier,
      membership_status: clientData.membership_status,
      membership_start_date: clientData.membership_start_date || null,
      membership_expiry_date: clientData.membership_expiry_date || null,
      internal_notes: clientData.internal_notes?.trim() || null,
    }

    const { error } = await supabase
      .from('clients')
      .update(updatePayload)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/admin/clients')
    return { success: true }
  } catch (err: any) {
    console.error('Error updating client:', err)
    return { success: false, error: err.message }
  }
}
