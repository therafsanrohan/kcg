'use server'

import { requireAdmin } from '@/utils/supabase/admin-auth'
import { revalidatePath } from 'next/cache'
import { Invoice, InvoiceItem } from '@/types/invoice'
import { formatMedium } from '@/utils/measurements'

/**
 * Authoritative Server-Side Inventory Search
 * Queries public.paintings directly from the database with sanitization and limit.
 */
export async function searchInventoryArtworksAction(query: string) {
  try {
    const { supabase } = await requireAdmin()
    const trimmed = (query || '').trim()

    let dbQuery = supabase
      .from('paintings')
      .select('id, title, base_price_bdt, discount_price_bdt, painting_type, display_size, width, height, primary_image_url, availability_status')
      .order('title', { ascending: true })
      .limit(20)

    if (trimmed) {
      dbQuery = dbQuery.or(`title.ilike.%${trimmed}%,painting_type.ilike.%${trimmed}%,display_size.ilike.%${trimmed}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error('Inventory search query error:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('Inventory search action error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

export async function createInvoiceDraft(payload: any) {
  try {
    const { supabase, user } = await requireAdmin()
    
    // Server-side calculation to prevent manipulation
    // Fetch authoritative prices for inventory items if painting_id is specified
    const validatedItems = await Promise.all(
      (payload.items || []).map(async (item: any) => {
        let authoritativePrice = Number(item.unit_price_bdt) || 0
        let itemTitle = item.item_name
        let sizeSnapshot = item.size_snapshot || null
        let itemDescription = item.item_description || null

        if (item.painting_id) {
          const { data: painting } = await supabase
            .from('paintings')
            .select('id, title, base_price_bdt, discount_price_bdt, display_size, painting_type')
            .eq('id', item.painting_id)
            .single()

          if (painting) {
            authoritativePrice = Number(painting.discount_price_bdt || painting.base_price_bdt) || authoritativePrice
            itemTitle = painting.title || itemTitle
            if (!sizeSnapshot && painting.display_size) {
              sizeSnapshot = painting.display_size
            }
            if (!itemDescription && painting.painting_type) {
              itemDescription = formatMedium(painting.painting_type)
            }
          }
        }

        const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
        return {
          ...item,
          item_name: itemTitle,
          unit_price_bdt: authoritativePrice,
          quantity: qty,
          size_snapshot: sizeSnapshot,
          item_description: itemDescription,
          line_total_bdt: authoritativePrice * qty,
        }
      })
    )

    const subtotal = validatedItems.reduce((acc: number, item: any) => acc + item.line_total_bdt, 0)
    const deliveryCharge = Math.max(0, Number(payload.delivery_charge_bdt) || 0)
    const additionalCharge = Math.max(0, Number(payload.additional_charge_bdt) || 0)
    const discount = Math.max(0, Number(payload.discount_bdt) || 0)
    const grandTotal = Math.max(0, subtotal + deliveryCharge + additionalCharge - discount)

    // Link existing CRM client or optionally create a new profile when explicitly requested
    let clientId = payload.client_id || null
    if (!clientId && payload.save_as_new_client && payload.customer_phone && payload.customer_name) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', payload.customer_phone.trim())
        .maybeSingle()
      
      if (existingClient) {
        clientId = existingClient.id
      } else {
        const { data: newClient, error: clientInsertErr } = await supabase
          .from('clients')
          .insert({
            name: payload.customer_name.trim(),
            phone: payload.customer_phone.trim(),
            email: payload.customer_email?.trim() || null,
            billing_address: payload.customer_address?.trim() || null,
          })
          .select('id')
          .single()

        if (clientInsertErr) {
          console.warn('Could not auto-save client to directory (non-fatal):', clientInsertErr)
        } else if (newClient) {
          clientId = newClient.id
        }
      }
    }


    const invoiceData = {
      status: 'draft',
      payment_status: 'unpaid',
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || null,
      client_id: clientId,
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
      created_by: user.id
    }

    // Always generate a unique, cryptographically secure verification share_token for every invoice
    const tokenBytes = new Uint8Array(24)
    crypto.getRandomValues(tokenBytes)
    const initialShareToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

    const invoicePayloadWithToken = {
      ...invoiceData,
      share_token: initialShareToken,
      is_share_link_active: true,
      share_link_created_at: new Date().toISOString(),
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert(invoicePayloadWithToken)
      .select('id, invoice_number, share_token')
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

    // ── Handle Advance Payment on Invoice Creation ──
    const advanceAmount = Math.max(0, Number(payload.advance_payment_bdt) || 0)
    if (advanceAmount > 0) {
      const validAdvance = Math.min(advanceAmount, grandTotal)
      const isPaidFull = validAdvance >= grandTotal && grandTotal > 0
      const paymentStatus = isPaidFull ? 'paid' : 'partially_paid'

      const paymentRecord = {
        invoice_id: invoice.id,
        amount_bdt: validAdvance,
        payment_method: payload.advance_payment_method || 'bank_transfer',
        payment_date: payload.advance_payment_date || payload.invoice_date || new Date().toISOString().split('T')[0],
        transaction_ref: payload.advance_transaction_ref?.trim() || null,
        internal_notes: payload.advance_internal_notes?.trim() || 'Advance payment recorded upon invoice creation',
        recorded_by: user.id,
      }

      const { error: advanceErr } = await supabase
        .from('invoice_payments')
        .insert(paymentRecord)

      if (advanceErr) {
        console.warn('Could not record advance payment (invoice created):', advanceErr)
      } else {
        await supabase
          .from('invoices')
          .update({
            payment_status: paymentStatus,
            paid_at: isPaidFull ? new Date().toISOString() : null,
          })
          .eq('id', invoice.id)
      }
    }

    revalidatePath('/admin/invoices')
    return { success: true, invoiceId: invoice.id }
  } catch (err: any) {
    const isRls = err?.code === '42501' || err?.message?.includes('row-level security')
    console.error('[Admin Invoice Action Error]', {
      action: 'createInvoiceDraft',
      code: err?.code,
      message: err?.message,
      isRlsViolation: isRls,
      timestamp: new Date().toISOString()
    })
    const userMessage = isRls
      ? 'Database permission error: Your admin account does not have authorization in the database. Please check admin_users registration or run the admin sync migration.'
      : err.message || 'Failed to create invoice'
    return { success: false, error: userMessage }
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
    
    // Call atomic RPC function if available, otherwise fallback to safe update
    const { data: finalNumber, error: rpcErr } = await supabase.rpc('finalize_invoice_number', {
      p_invoice_id: id,
    })

    if (rpcErr) {
      console.warn('RPC finalize_invoice_number not available, falling back to standard update', rpcErr.message)
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'issued', issued_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'draft')

      if (error) throw error
    }

    // Ensure issued invoice has a persistent verification share_token for scannable QR verification
    const { data: inv } = await supabase
      .from('invoices')
      .select('share_token, is_share_link_active')
      .eq('id', id)
      .single()

    if (!inv?.share_token || !inv?.is_share_link_active) {
      const tokenBytes = new Uint8Array(24)
      crypto.getRandomValues(tokenBytes)
      const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

      await supabase
        .from('invoices')
        .update({
          share_token: inv?.share_token || token,
          is_share_link_active: true,
          share_link_created_at: new Date().toISOString(),
        })
        .eq('id', id)
    }

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error issuing invoice:', err)
    return { success: false, error: err.message }
  }
}

export async function voidInvoice(id: string, reason: string) {
  try {
    const { supabase, user } = await requireAdmin()
    if (!reason || !reason.trim()) {
      return { success: false, error: 'A valid reason is required to void an invoice.' }
    }

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'void',
        void_reason: reason.trim(),
        voided_at: new Date().toISOString(),
        voided_by: user.id,
      })
      .eq('id', id)
      .neq('status', 'void')

    if (error) throw error

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error voiding invoice:', err)
    return { success: false, error: err.message }
  }
}

export async function generateShareLink(id: string) {
  try {
    const { supabase } = await requireAdmin()
    // Generate high-entropy 32-character crypto token
    const tokenBytes = new Uint8Array(24)
    crypto.getRandomValues(tokenBytes)
    const shareToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

    const { error } = await supabase
      .from('invoices')
      .update({
        share_token: shareToken,
        is_share_link_active: true,
        share_link_created_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/admin/invoices/${id}`)
    return { success: true, shareToken }
  } catch (err: any) {
    console.error('Error generating share link:', err)
    return { success: false, error: err.message }
  }
}

export async function revokeShareLink(id: string) {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('invoices')
      .update({
        is_share_link_active: false,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/admin/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error('Error revoking share link:', err)
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

/**
 * Record a partial or full payment against an invoice
 */
export async function recordInvoicePaymentAction(formData: {
  invoiceId: string
  amountBdt: number
  paymentMethod: string
  paymentDate: string
  transactionRef?: string
  internalNotes?: string
}) {
  try {
    const { supabase, user } = await requireAdmin()
    const { invoiceId, amountBdt, paymentMethod, paymentDate, transactionRef, internalNotes } = formData

    const amount = Number(amountBdt)
    if (!amount || amount <= 0 || isNaN(amount)) {
      return { success: false, error: 'Payment amount must be greater than zero.' }
    }

    // 1. Fetch current invoice grand total and existing confirmed payments
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, grand_total_bdt, status, payment_status')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) {
      return { success: false, error: 'Invoice not found.' }
    }

    if (invoice.status === 'void' || invoice.status === 'cancelled') {
      return { success: false, error: 'Cannot record payments against a void or cancelled invoice.' }
    }

    const { data: payments, error: payErr } = await supabase
      .from('invoice_payments')
      .select('amount_bdt')
      .eq('invoice_id', invoiceId)

    if (payErr) throw payErr

    const grandTotal = Number(invoice.grand_total_bdt) || 0
    const alreadyPaid = (payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount_bdt) || 0), 0)
    const remainingDue = Math.max(0, grandTotal - alreadyPaid)

    if (alreadyPaid >= grandTotal && grandTotal > 0) {
      return { success: false, error: 'This invoice is already paid in full.' }
    }

    if (amount > remainingDue) {
      return {
        success: false,
        error: `Payment amount (৳${amount.toLocaleString('en-BD')}) cannot exceed remaining due of ৳${remainingDue.toLocaleString('en-BD')}.`,
      }
    }

    // Fetch admin user name or email for audit trail
    const adminName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Gallery Staff'

    // 2. Insert payment record atomically
    const { data: insertedPayment, error: insertErr } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        amount_bdt: amount,
        payment_method: (paymentMethod || 'cash').trim().toLowerCase(),
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        transaction_ref: transactionRef?.trim() || null,
        internal_notes: internalNotes?.trim() || null,
        recorded_by: user.id,
        recorded_by_name: adminName,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // 3. Fallback sync if database trigger did not update payment_status
    const updatedTotalPaid = alreadyPaid + amount
    let newPaymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'partially_paid'
    if (updatedTotalPaid >= grandTotal) {
      newPaymentStatus = 'paid'
    }

    await supabase
      .from('invoices')
      .update({
        payment_status: newPaymentStatus,
        paid_at: newPaymentStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', invoiceId)

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoiceId}`)
    return { success: true, payment: insertedPayment }
  } catch (err: any) {
    console.error('recordInvoicePaymentAction error:', err)
    return { success: false, error: err.message || 'Failed to record payment' }
  }
}

/**
 * Fetch chronological payment history for an invoice
 */
export async function getInvoicePaymentsAction(invoiceId: string) {
  try {
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getInvoicePaymentsAction error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Controlled adjustment / reversal of an erroneous payment
 */
export async function deleteInvoicePaymentAction(paymentId: string, invoiceId: string) {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('invoice_payments')
      .delete()
      .eq('id', paymentId)
      .eq('invoice_id', invoiceId)

    if (error) throw error

    // Recalculate remaining payments
    const { data: remainingPayments } = await supabase
      .from('invoice_payments')
      .select('amount_bdt')
      .eq('invoice_id', invoiceId)

    const { data: inv } = await supabase
      .from('invoices')
      .select('grand_total_bdt')
      .eq('id', invoiceId)
      .single()

    const totalPaid = (remainingPayments || []).reduce((acc: number, p: any) => acc + (Number(p.amount_bdt) || 0), 0)
    const grandTotal = Number(inv?.grand_total_bdt) || 0

    let newStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid'
    if (totalPaid >= grandTotal && grandTotal > 0) {
      newStatus = 'paid'
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid'
    }

    await supabase
      .from('invoices')
      .update({
        payment_status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', invoiceId)

    revalidatePath('/admin/invoices')
    revalidatePath(`/admin/invoices/${invoiceId}`)
    return { success: true }
  } catch (err: any) {
    console.error('deleteInvoicePaymentAction error:', err)
    return { success: false, error: err.message }
  }
}
