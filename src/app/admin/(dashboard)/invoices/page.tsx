import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Plus, FileText, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Invoice } from '@/types/invoice'

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

      {/* ── Table / List ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {invoiceList.length === 0 ? (
          <div className="py-20 text-center px-4">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-sans text-xl font-bold text-gray-900 mb-1">No invoices yet</h3>
            <p className="text-sm text-gray-500 font-light max-w-sm mx-auto mb-6">
              Create customer invoices with itemized artwork, custom framing, and delivery fees.
            </p>
            <Link
              href="/admin/invoices/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-4 px-6">Invoice #</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Payment</th>
                  <th className="py-4 px-6 text-right">Grand Total</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {invoiceList.map((inv) => {
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-gray-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{inv.customer_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{inv.customer_phone}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {inv.invoice_date}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            inv.status === 'issued'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : inv.status === 'cancelled'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            inv.payment_status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.payment_status === 'partially_paid'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.payment_status === 'partially_paid' ? 'Partially Paid' : inv.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-gray-900">
                        ৳{Number(inv.grand_total_bdt).toLocaleString('en-BD')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all shadow-xs"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
