'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/supabase/admin-auth'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export interface InvoiceMessage {
  id: string
  invoice_id: string
  sender_type: 'customer' | 'admin'
  sender_name: string
  message_text: string
  is_read?: boolean
  created_at: string
}

export interface ConversationInboxItem {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerPhone: string
  totalAmount: number
  paymentStatus: string
  latestMessage: string
  latestMessageAt: string
  latestSenderType: 'customer' | 'admin'
  unreadCount: number
}

/**
 * Fetch messages for a public invoice using its active share_token
 */
export async function getPublicInvoiceMessages(shareToken: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // 1. Verify invoice share token is valid and active
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id')
      .eq('share_token', shareToken)
      .eq('is_share_link_active', true)
      .maybeSingle()

    if (invErr || !invoice) {
      return { success: false, error: 'Unauthorized or invoice not found', data: [] }
    }

    // 2. Fetch messages for this verified invoice
    const { data: messages, error: msgErr } = await supabase
      .from('invoice_messages')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('created_at', { ascending: true })

    if (msgErr) throw msgErr

    return { success: true, data: (messages as InvoiceMessage[]) || [] }
  } catch (err: any) {
    console.error('getPublicInvoiceMessages error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Send a message as a customer from the public invoice page
 */
export async function sendCustomerInvoiceMessage(shareToken: string, senderName: string, text: string) {
  try {
    const trimmed = (text || '').trim()
    const cleanName = (senderName || '').trim() || 'Collector'

    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty' }
    }
    if (trimmed.length > 2000) {
      return { success: false, error: 'Message exceeds maximum length of 2000 characters' }
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Verify invoice share token
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('share_token', shareToken)
      .eq('is_share_link_active', true)
      .maybeSingle()

    if (invErr || !invoice) {
      return { success: false, error: 'Unauthorized: Link is expired or invalid' }
    }

    const { data: inserted, error: insErr } = await supabase
      .from('invoice_messages')
      .insert({
        invoice_id: invoice.id,
        sender_type: 'customer',
        sender_name: cleanName,
        message_text: trimmed,
      })
      .select()
      .single()

    if (insErr) throw insErr

    return { success: true, data: inserted }
  } catch (err: any) {
    console.error('sendCustomerInvoiceMessage error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Admin: Fetch messages for an invoice by invoice ID
 */
export async function getAdminInvoiceMessages(invoiceId: string) {
  try {
    const { supabase } = await requireAdmin()

    const { data: messages, error } = await supabase
      .from('invoice_messages')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data: (messages as InvoiceMessage[]) || [] }
  } catch (err: any) {
    console.error('getAdminInvoiceMessages error:', err)
    return { success: false, error: err.message, data: [] }
  }
}

/**
 * Admin: Send a reply to an invoice conversation thread
 */
export async function sendAdminInvoiceMessage(invoiceId: string, text: string) {
  try {
    const { supabase, user } = await requireAdmin()
    const trimmed = (text || '').trim()

    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty' }
    }

    const { data: inserted, error } = await supabase
      .from('invoice_messages')
      .insert({
        invoice_id: invoiceId,
        sender_type: 'admin',
        sender_name: 'Gallery Admin',
        message_text: trimmed,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/invoices/${invoiceId}`)
    return { success: true, data: inserted }
  } catch (err: any) {
    console.error('sendAdminInvoiceMessage error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Admin: Mark all customer messages in an invoice as read
 */
export async function markConversationReadAction(invoiceId: string) {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
      .from('invoice_messages')
      .update({ is_read: true })
      .eq('invoice_id', invoiceId)
      .eq('sender_type', 'customer')
      .eq('is_read', false)

    if (error) throw error

    revalidatePath('/admin/conversations')
    revalidatePath(`/admin/invoices/${invoiceId}`)
    return { success: true }
  } catch (err: any) {
    console.error('markConversationReadAction error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Admin: Fetch conversation inbox list grouping latest messages and unread counts
 */
export async function getAdminConversationInboxAction(): Promise<{
  success: boolean
  error?: string
  data: ConversationInboxItem[]
}> {
  try {
    const { supabase } = await requireAdmin()

    // 1. Fetch all invoices with messages ordered by created_at DESC
    const { data: messages, error: msgErr } = await supabase
      .from('invoice_messages')
      .select('id, invoice_id, sender_type, sender_name, message_text, is_read, created_at')
      .order('created_at', { ascending: false })

    if (msgErr) throw msgErr
    if (!messages || messages.length === 0) {
      return { success: true, data: [] }
    }

    // 2. Identify unique invoice IDs
    const invoiceIds = Array.from(new Set(messages.map((m) => m.invoice_id)))

    // 3. Fetch corresponding invoice metadata
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, customer_phone, grand_total_bdt, payment_status')
      .in('id', invoiceIds)

    if (invErr) throw invErr

    const invoiceMap = new Map((invoices || []).map((inv) => [inv.id, inv]))

    // 4. Group by invoice: extract latest message and count unread customer messages
    const grouped = new Map<string, {
      latestMessage: string
      latestMessageAt: string
      latestSenderType: 'customer' | 'admin'
      unreadCount: number
    }>()

    for (const msg of messages) {
      const existing = grouped.get(msg.invoice_id)
      if (!existing) {
        grouped.set(msg.invoice_id, {
          latestMessage: msg.message_text,
          latestMessageAt: msg.created_at,
          latestSenderType: msg.sender_type,
          unreadCount: msg.sender_type === 'customer' && !msg.is_read ? 1 : 0,
        })
      } else {
        if (msg.sender_type === 'customer' && !msg.is_read) {
          existing.unreadCount += 1
        }
      }
    }

    const inboxItems: ConversationInboxItem[] = []

    for (const [invId, groupData] of grouped.entries()) {
      const inv = invoiceMap.get(invId)
      if (inv) {
        inboxItems.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerName: inv.customer_name || 'Collector',
          customerPhone: inv.customer_phone || '',
          totalAmount: Number(inv.grand_total_bdt) || 0,
          paymentStatus: inv.payment_status || 'unpaid',
          latestMessage: groupData.latestMessage,
          latestMessageAt: groupData.latestMessageAt,
          latestSenderType: groupData.latestSenderType,
          unreadCount: groupData.unreadCount,
        })
      }
    }

    return { success: true, data: inboxItems }
  } catch (err: any) {
    console.error('getAdminConversationInboxAction error:', err)
    return { success: false, error: err.message, data: [] }
  }
}
