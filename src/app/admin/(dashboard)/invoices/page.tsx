import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Plus, FileText, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Invoice } from '@/types/invoice'
import InvoicesListClient from './InvoicesListClient'

export const revalidate = 0 // Instant updates from database

export default async function InvoicesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Try querying with invoice_payments join, with safe fallback if table is not yet migrated
  let invoices: any[] | null = null
  let error: any = null

  const resWithPayments = await supabase
    .from('invoices')
    .select('*, invoice_items(*), invoice_payments(*)')
    .order('created_at', { ascending: false })

  if (resWithPayments.error) {
    // If invoice_payments table does not exist or relation is not found, fallback to standard query
    const resFallback = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .order('created_at', { ascending: false })

    if (resFallback.error) {
      console.error('Error fetching invoices:', resFallback.error.message || resFallback.error)
      error = resFallback.error
    } else {
      invoices = resFallback.data
    }
  } else {
    invoices = resWithPayments.data
  }

  const invoiceList: any[] = invoices || []

  const totalInvoices = invoiceList.length
  // Total Revenue collected across all confirmed payments
  const totalRevenue = invoiceList.reduce((acc, inv) => {
    const paidSum = (inv.invoice_payments || []).reduce(
      (pSum: number, p: any) => pSum + (Number(p.amount_bdt) || 0),
      0
    )
    if (paidSum > 0) return acc + paidSum
    if (inv.payment_status === 'paid') return acc + (Number(inv.grand_total_bdt) || 0)
    return acc
  }, 0)

  const pendingCount = invoiceList.filter(
    (inv) => inv.payment_status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'void'
  ).length

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            FINANCIALS & SALES
          </span>
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
            Invoices
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
            Generate and track customer invoices for paintings and custom framing.
          </p>

          {/* Metrics */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-xs">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              {totalInvoices} Total
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2D7A4D] bg-[#EBF5EE] border border-[#c3e6cb] rounded-full px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2D7A4D]" />
              ৳{totalRevenue.toLocaleString('en-BD')} Collected
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {pendingCount} Pending Payment
            </span>
          </div>
        </div>

        <div className="mt-6 sm:mt-0">
          <Link
            href="/admin/invoices/new"
            className="h-11 px-5 rounded-xl bg-black text-white text-sm font-semibold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 transform inline-flex"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* ── Table / List with Smart Filters & In-page Payment Modal ── */}
      <InvoicesListClient initialInvoices={invoiceList} />
    </div>
  )
}
