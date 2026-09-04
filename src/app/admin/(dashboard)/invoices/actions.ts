'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'
import { Invoice, InvoiceItem } from '@/types/invoice'

export async function createInvoiceDraft(payload: any) {
  try {
    const { supabase, user } = await requireAdmin()
    
    // Server-side calculation to prevent manipulation
    // We expect payload to contain customer info, delivery_zone, and items.
    // In a real production system, you'd fetch the latest prices from DB here
    // but for simplicity and snapshotting, we use the values passed from the client
    // provided we recalculate the totals.
    
    const subtotal = payload.items.reduce((acc: number, item: any) => acc + (item.unit_price_bdt * item.quantity), 0)
    const deliveryCharge = Number(payload.delivery_charge_bdt) || 0
    const additionalCharge = Number(payload.additional_charge_bdt) || 0
    const discount = Number(payload.discount_bdt) || 0
    const grandTotal = subtotal + deliveryCharge + additionalCharge - discount

    const invoiceData = {
      status: 'draft',
      payment_status: 'unpaid',
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || null,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || null,
      customer_address: payload.customer_address || null,
      delivery_zone_code: payload.delivery_zone_code || null,
      currency_code: payload.currency_code || 'BDT',
      exchange_rate_snapshot: payload.exchange_rate_snapshot || 1,
      subtotal_bdt: subtotal,
      discount_bdt: discount,
      delivery_charge_bdt: deliveryCharge,
      additional_charge_bdt: additionalCharge,
      grand_total_bdt: grandTotal,
      notes: payload.notes || null,
      terms: payload.terms || null,
      created_by: user.id
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select('id, invoice_number')
      .single()

    if (invoiceErr) throw invoiceErr

    if (payload.items && payload.items.length > 0) {
      const itemsData = payload.items.map((item: any, idx: number) => ({
        invoice_id: invoice.id,
        item_type: item.item_type,
        painting_id: item.painting_id || null,
        item_name: item.item_name,
        item_description: item.item_description || null,
        artwork_sku: item.artwork_sku || null,
        size_snapshot: item.size_snapshot || null,
        quantity: item.quantity,
        unit_price_bdt: item.unit_price_bdt,
        line_total_bdt: item.unit_price_bdt * item.quantity,
        sort_order: idx
      }))

      const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsData)
      if (itemsErr) throw itemsErr
    }

    revalidatePath('/admin/invoices')
    return { success: true, invoiceId: invoice.id }
  } catch (err: any) {
    console.error('Error creating invoice draft:', err)
    return { success: false, error: err.message || 'Failed to create invoice' }
  }
}

export async function updateInvoiceDraft(id: string, payload: any) {
  try {
    const { supabase } = await requireAdmin()
    
    // Only allow update if status is draft
    const { data: existing, error: fetchErr } = await supabase.from('invoices').select('status').eq('id', id).single()
    if (fetchErr) throw fetchErr
    if (existing.status !== 'draft') throw new Error('Only draft invoices can be edited.')

    const subtotal = payload.items.reduce((acc: number, item: any) => acc + (item.unit_price_bdt * item.quantity), 0)
    const deliveryCharge = Number(payload.delivery_charge_bdt) || 0
    const additionalCharge = Number(payload.additional_charge_bdt) || 0
    const discount = Number(payload.discount_bdt) || 0
    const grandTotal = subtotal + deliveryCharge + additionalCharge - discount

    const invoiceData = {
      invoice_date: payload.invoice_date,
      due_date: payload.due_date || null,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email || null,
      customer_address: payload.customer_address || null,
      delivery_zone_code: payload.delivery_zone_code || null,
      currency_code: payload.currency_code || 'BDT',
      exchange_rate_snapshot: payload.exchange_rate_snapshot || 1,
      subtotal_bdt: subtotal,
      discount_bdt: discount,
      delivery_charge_bdt: deliveryCharge,
      additional_charge_bdt: additionalCharge,
      grand_total_bdt: grandTotal,
      notes: payload.notes || null,
      terms: payload.terms || null,
    }

    const { error: invoiceErr } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id)

    if (invoiceErr) throw invoiceErr

    // Delete old items and re-insert
    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    if (payload.items && payload.items.length > 0) {
      const itemsData = payload.items.map((item: any, idx: number) => ({
        invoice_id: id,
        item_type: item.item_type,
        painting_id: item.painting_id || null,
        item_name: item.item_name,
        item_description: item.item_description || null,
        artwork_sku: item.artwork_sku || null,
        size_snapshot: item.size_snapshot || null,
        quantity: item.quantity,
        unit_price_bdt: item.unit_price_bdt,
        line_total_bdt: item.unit_price_bdt * item.quantity,
        sort_order: idx
      }))

      const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsData)
      if (itemsErr) throw itemsErr
    }

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error updating invoice:', err)
    return { success: false, error: err.message || 'Failed to update invoice' }
  }
}

export async function issueInvoice(id: string) {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'issued', issued_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'draft')

    if (error) throw error
    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error issuing invoice:', err)
    return { success: false, error: err.message }
  }
}

export async function markInvoicePaid(id: string) {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('invoices')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['draft', 'issued'])

    if (error) throw error
    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error marking as paid:', err)
    return { success: false, error: err.message }
  }
}

export async function cancelInvoice(id: string) {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error cancelling invoice:', err)
    return { success: false, error: err.message }
  }
}
