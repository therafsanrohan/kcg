import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Dedicated, authenticated REST API route for external Billing Hub integration
// Accepts Bearer Token matching SUPABASE_SERVICE_ROLE_KEY or specific Billing API Secret

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!authHeader || !authHeader.startsWith('Bearer ') || !serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing Billing Hub authorization token' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (token !== serviceKey) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      count: invoices?.length || 0,
      data: invoices,
    })
  } catch (err: any) {
    console.error('[Billing Hub API Error]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!authHeader || !authHeader.startsWith('Bearer ') || !serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid credentials' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (token !== serviceKey) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.customer_name || !body.customer_phone || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request: customer_name, customer_phone, and items array are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Recalculate totals server-side
    const subtotal = body.items.reduce(
      (sum: number, it: any) => sum + (Number(it.unit_price_bdt) || 0) * (Number(it.quantity) || 1),
      0
    )
    const delivery = Number(body.delivery_charge_bdt) || 0
    const additional = Number(body.additional_charge_bdt) || 0
    const discount = Number(body.discount_bdt) || 0
    const grandTotal = subtotal + delivery + additional - discount

    const invoicePayload = {
      status: body.status || 'draft',
      payment_status: body.payment_status || 'unpaid',
      invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
      due_date: body.due_date || null,
      client_id: body.client_id || null,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      customer_email: body.customer_email || null,
      customer_address: body.customer_address || null,
      subtotal_bdt: subtotal,
      delivery_charge_bdt: delivery,
      additional_charge_bdt: additional,
      discount_bdt: discount,
      grand_total_bdt: grandTotal,
      notes: body.notes || null,
      terms: body.terms || null,
    }

    const { data: newInvoice, error: invErr } = await supabase
      .from('invoices')
      .insert(invoicePayload)
      .select('id, invoice_number')
      .single()

    if (invErr) throw invErr

    const itemRows = body.items.map((it: any, idx: number) => ({
      invoice_id: newInvoice.id,
      item_type: it.item_type || 'custom',
      painting_id: it.painting_id || null,
      item_name: it.item_name,
      item_description: it.item_description || null,
      size_snapshot: it.size_snapshot || null,
      quantity: it.quantity || 1,
      unit_price_bdt: it.unit_price_bdt || 0,
      line_total_bdt: (it.unit_price_bdt || 0) * (it.quantity || 1),
      sort_order: idx,
    }))

    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemRows)
    if (itemsErr) throw itemsErr

    return NextResponse.json({
      success: true,
      invoice_id: newInvoice.id,
      invoice_number: newInvoice.invoice_number,
      grand_total_bdt: grandTotal,
    })
  } catch (err: any) {
    console.error('[Billing Hub API Error - POST]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
