import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { FileText, Printer, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { InvoiceItem } from '@/types/invoice'
import InvoicePrintButton from '@/app/admin/(dashboard)/invoices/[id]/InvoicePrintButton'
import PublicInvoiceConversation from './PublicInvoiceConversation'

export const revalidate = 0

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!token) notFound()

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Query only invoices with matching active share token, with resilient fallback
  let invoice: any = null
  const resWithPayments = await supabase
    .from('invoices')
    .select('*, invoice_items(*), invoice_payments(*)')
    .eq('share_token', token)
    .eq('is_share_link_active', true)
    .maybeSingle()

  if (resWithPayments.error || !resWithPayments.data) {
    const resFallback = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('share_token', token)
      .eq('is_share_link_active', true)
      .maybeSingle()

    invoice = resFallback.data
  } else {
    invoice = resWithPayments.data
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">Invoice Link Unavailable</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            This invoice link has expired, been revoked, or is invalid. Please contact Kazi Canvas Gallery support to request an updated invoice link.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors"
            >
              Return to Gallery
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const items: InvoiceItem[] = invoice.invoice_items || []
  const payments: any[] = (invoice.invoice_payments || []).sort(
    (a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  )
  const isVoid = invoice.status === 'void'
  const isPaid = invoice.payment_status === 'paid'
  const isPartiallyPaid = invoice.payment_status === 'partially_paid'

  const grandTotal = Number(invoice.grand_total_bdt) || 0
  const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amount_bdt) || 0), 0)
  const remainingDue = Math.max(0, grandTotal - totalPaid)

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Bar for Public Visitor */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/"
            className="font-sans font-bold text-lg text-gray-950 tracking-tight hover:opacity-80"
          >
            Kazi Canvas Gallery
          </Link>
          <div className="flex items-center gap-2">
            <InvoicePrintButton
              invoiceNumber={invoice.invoice_number}
              customerName={invoice.customer_name}
            />
          </div>
        </div>

        {/* Invoice Container */}
        <div className="invoice-paper-doc bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-12 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 relative">
          {/* Status Alert for VOID, PAID or PARTIALLY PAID */}
          {isVoid ? (
            <div className="bg-rose-50 border-2 border-dashed border-rose-300 rounded-2xl p-4 text-center text-rose-800 space-y-1">
              <span className="text-lg sm:text-xl font-black tracking-widest uppercase">
                *** VOID INVOICE ***
              </span>
              <p className="text-xs text-rose-700">
                This invoice has been voided and is no longer an active payment request.
              </p>
            </div>
          ) : isPaid ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between text-emerald-800 text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Payment Received & Authenticated
              </span>
              <span className="font-mono text-[11px] text-emerald-700">Paid in Full</span>
            </div>
          ) : isPartiallyPaid ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-amber-900 text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <Clock className="w-4 h-4 text-amber-600" />
                Partially Paid &bull; Deposit Received
              </span>
              <span className="font-mono text-[11px] text-amber-800 font-bold">
                Due: ৳{remainingDue.toLocaleString('en-BD')}
              </span>
            </div>
          ) : null}

          {/* Issuer & Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-100 pb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-950 tracking-tight">
                Kazi Canvas Gallery
              </h2>
              <p className="text-xs text-gray-500 font-light mt-1">
                Original Fine Art & Custom Framing Studio
              </p>
              <p className="text-xs text-gray-500 font-light">Dhaka, Bangladesh</p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Invoice Reference
              </div>
              <div className="text-xl font-bold font-mono text-gray-950 mt-0.5">
                {invoice.invoice_number}
              </div>
              <div className="text-xs text-gray-500 mt-1">Date: {invoice.invoice_date}</div>
              {invoice.due_date && (
                <div className="text-xs text-gray-500">Payment Due: {invoice.due_date}</div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="border-b border-gray-100 pb-8">
            <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Billed To
            </div>
            <div className="font-bold text-gray-950 text-lg">{invoice.customer_name}</div>
            <div className="text-xs text-gray-600 font-mono mt-0.5">{invoice.customer_phone}</div>
            {invoice.customer_address && (
              <div className="text-xs text-gray-600 mt-1 max-w-sm whitespace-pre-line">
                {invoice.customer_address}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-2">Artwork / Item</th>
                  <th className="py-3 px-2 text-center">Qty</th>
                  <th className="py-3 px-2 text-right">Price</th>
                  <th className="py-3 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 px-2">
                      <div className="font-bold text-gray-950">{item.item_name}</div>
                      {(item.size_snapshot || item.item_description) && (
                        <div className="text-gray-500 font-light mt-0.5">
                          {[item.size_snapshot, item.item_description].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-gray-800">{item.quantity}</td>
                    <td className="py-4 px-2 text-right font-mono text-gray-800">
                      ৳{Number(item.unit_price_bdt).toLocaleString('en-BD')}
                    </td>
                    <td className="py-4 px-2 text-right font-mono font-bold text-gray-950">
                      ৳{Number(item.line_total_bdt).toLocaleString('en-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row sm:justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              {items.some((i) => i.item_type === 'painting') && (
                <div className="flex justify-between text-gray-600">
                  <span>Artwork Subtotal</span>
                  <span className="font-mono">
                    ৳{items
                      .filter((i) => i.item_type === 'painting')
                      .reduce((sum, i) => sum + (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1), 0)
                      .toLocaleString('en-BD')}
                  </span>
                </div>
              )}
              {items.some((i) => i.item_type === 'frame') && (
                <div className="flex justify-between text-gray-600">
                  <span>Frame Subtotal</span>
                  <span className="font-mono">
                    ৳{items
                      .filter((i) => i.item_type === 'frame')
                      .reduce((sum, i) => sum + (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1), 0)
                      .toLocaleString('en-BD')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-700 font-semibold">
                <span>Items Subtotal</span>
                <span className="font-mono">৳{Number(invoice.subtotal_bdt).toLocaleString('en-BD')}</span>
              </div>
              {Number(invoice.delivery_charge_bdt) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge</span>
                  <span className="font-mono">+৳{Number(invoice.delivery_charge_bdt).toLocaleString('en-BD')}</span>
                </div>
              )}
              {Number(invoice.additional_charge_bdt) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Additional Services</span>
                  <span className="font-mono">+৳{Number(invoice.additional_charge_bdt).toLocaleString('en-BD')}</span>
                </div>
              )}
              {Number(invoice.discount_bdt) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount</span>
                  <span className="font-mono">-৳{Number(invoice.discount_bdt).toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-950">
                <span>Grand Total</span>
                <span className="font-mono">৳{grandTotal.toLocaleString('en-BD')}</span>
              </div>

              {totalPaid > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold text-xs pt-1">
                  <span>Payments Received</span>
                  <span className="font-mono">-৳{totalPaid.toLocaleString('en-BD')}</span>
                </div>
              )}

              <div className={`flex justify-between border-t border-dashed border-gray-200 pt-2 text-sm font-bold ${
                remainingDue > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                <span>Outstanding Balance</span>
                <span className="font-mono">৳{remainingDue.toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          {/* Payment Receipts Summary if partial/multiple payments exists */}
          {payments.length > 0 && (
            <div className="border-t border-gray-100 pt-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Payment History & Receipts
              </div>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-gray-800 capitalize">
                        {p.payment_method.replace('_', ' ')} Payment
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {p.payment_date} {p.transaction_ref ? `• Ref: ${p.transaction_ref}` : ''}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-800">
                      ৳{Number(p.amount_bdt).toLocaleString('en-BD')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Notes */}
          {(invoice.notes || invoice.terms) && (
            <div className="border-t border-gray-100 pt-6 text-[11px] text-gray-500 font-light space-y-2">
              {invoice.notes && (
                <p>
                  <strong className="font-semibold text-gray-700">Notes:</strong> {invoice.notes}
                </p>
              )}
              {invoice.terms && (
                <p>
                  <strong className="font-semibold text-gray-700">Terms & Conditions:</strong> {invoice.terms}
                </p>
              )}
            </div>
          )}

          {/* Document Footer with Verified Gallery Status & Clickable Creatiancy Link */}
          <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
              Official Invoice &bull; Kazi Canvas Gallery
            </span>

            <span>
              Developed by{' '}
              <a
                href="https://www.creatiancy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gray-600 hover:text-black transition-colors underline underline-offset-4"
              >
                Creatiancy
              </a>
            </span>
          </div>
        </div>

        {/* Live Customer Conversation Concierge */}
        <PublicInvoiceConversation
          shareToken={token}
          customerName={invoice.customer_name}
          invoiceNumber={invoice.invoice_number}
        />
      </div>
    </div>
  )
}


