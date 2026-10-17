import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, Check, Clock, X, FileText, Ban } from 'lucide-react'
import { Invoice, InvoiceItem } from '@/types/invoice'
import { issueInvoice, markInvoicePaid, cancelInvoice } from '../actions'
import InvoicePrintButton from './InvoicePrintButton'
import InvoiceShareControls from './InvoiceShareControls'
import VoidInvoiceModal from './VoidInvoiceModal'
import AdminInvoiceConversation from './AdminInvoiceConversation'
import PaymentManager from './PaymentManager'

export const revalidate = 0

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), invoice_payments(*)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  const items: InvoiceItem[] = invoice.invoice_items || []
  const payments: any[] = (invoice.invoice_payments || []).sort(
    (a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  )
  const isVoid = invoice.status === 'void'
  const isCancelled = invoice.status === 'cancelled'

  const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amount_bdt) || 0), 0)
  const remainingDue = Math.max(0, Number(invoice.grand_total_bdt) - totalPaid)

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/invoices"
            className="h-10 w-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-black hover:bg-gray-100 transition-all shadow-xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 font-mono">
                {invoice.invoice_number}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  isVoid
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                    : invoice.status === 'issued'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : invoice.status === 'cancelled'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {invoice.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  invoice.payment_status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : invoice.payment_status === 'partially_paid'
                    ? 'bg-amber-50 text-amber-800 border border-amber-300'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {invoice.payment_status === 'partially_paid' ? 'Partially Paid' : invoice.payment_status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-light mt-0.5">
              Created on {invoice.invoice_date}
              {invoice.voided_at && ` • Voided on ${new Date(invoice.voided_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && (
            <form
              action={async () => {
                'use server'
                await issueInvoice(invoice.id)
              }}
            >
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Issue Invoice</span>
              </button>
            </form>
          )}

          {invoice.payment_status !== 'paid' && invoice.status !== 'cancelled' && !isVoid && (
            <form
              action={async () => {
                'use server'
                await markInvoicePaid(invoice.id)
              }}
            >
              <button
                type="submit"
                className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Mark as Paid</span>
              </button>
            </form>
          )}

          {/* Void Invoice Workflow */}
          {!isVoid && (
            <VoidInvoiceModal
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoice_number}
            />
          )}

          {/* Share & Delivery Controls (WhatsApp, SMS, Email, Public Link) */}
          <InvoiceShareControls
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            customerName={invoice.customer_name}
            customerPhone={invoice.customer_phone}
            customerEmail={invoice.customer_email}
            grandTotal={Number(invoice.grand_total_bdt)}
            dueDate={invoice.due_date}
            initialShareToken={invoice.share_token}
            initialIsActive={invoice.is_share_link_active}
          />

          <InvoicePrintButton
            invoiceNumber={invoice.invoice_number}
            customerName={invoice.customer_name}
          />
        </div>
      </div>

      {/* ── Invoice Canvas Card ── */}
      <div className="invoice-paper-doc bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 relative overflow-hidden">
        {/* VOID Watermark Banner */}
        {isVoid && (
          <div className="bg-rose-50 border-2 border-dashed border-rose-300 rounded-2xl p-4 text-center text-rose-800 space-y-1">
            <span className="text-xl sm:text-2xl font-black tracking-widest uppercase">
              *** VOID INVOICE ***
            </span>
            {invoice.void_reason && (
              <p className="text-xs text-rose-700 font-medium">
                Reason: {invoice.void_reason}
              </p>
            )}
          </div>
        )}

        {/* Gallery Info & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-100 pb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight">
              Kazi Canvas Gallery
            </h2>
            <p className="text-xs text-gray-500 font-light mt-1">
              Original Fine Art & Custom Framing
            </p>
            <p className="text-xs text-gray-500 font-light">Dhaka, Bangladesh</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Invoice Number</div>
            <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">{invoice.invoice_number}</div>
            <div className="text-xs text-gray-500 mt-1">Date: {invoice.invoice_date}</div>
            {invoice.due_date && (
              <div className="text-xs text-gray-500">Due: {invoice.due_date}</div>
            )}
          </div>
        </div>

        {/* Customer Bill To */}
        <div className="border-b border-gray-100 pb-8">
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Billed To</div>
          <div className="font-bold text-gray-900 text-lg">{invoice.customer_name}</div>
          <div className="text-sm text-gray-600 font-mono mt-0.5">{invoice.customer_phone}</div>
          {invoice.customer_email && (
            <div className="text-sm text-gray-600">{invoice.customer_email}</div>
          )}
          {invoice.customer_address && (
            <div className="text-sm text-gray-600 mt-1 max-w-sm whitespace-pre-line">
              {invoice.customer_address}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 px-2">Item</th>
                <th className="py-3 px-2">Type / Size</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 px-2">
                    <div className="font-semibold text-gray-900">{item.item_name}</div>
                    {item.item_description && (
                      <div className="text-xs text-gray-500 font-light mt-0.5">{item.item_description}</div>
                    )}
                  </td>
                  <td className="py-4 px-2 text-gray-600 text-xs">
                    <span className="capitalize">{item.item_type}</span>
                    {item.size_snapshot && <span> &bull; {item.size_snapshot}</span>}
                  </td>
                  <td className="py-4 px-2 text-center font-mono text-gray-900">{item.quantity}</td>
                  <td className="py-4 px-2 text-right font-mono text-gray-900">
                    ৳{Number(item.unit_price_bdt).toLocaleString('en-BD')}
                  </td>
                  <td className="py-4 px-2 text-right font-mono font-semibold text-gray-950">
                    ৳{Number(item.line_total_bdt).toLocaleString('en-BD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row sm:justify-end">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            {items.some((i) => i.item_type === 'painting') && (
              <div className="flex justify-between text-gray-600">
                <span>Artwork Subtotal:</span>
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
                <span>Frame Subtotal:</span>
                <span className="font-mono">
                  ৳{items
                    .filter((i) => i.item_type === 'frame')
                    .reduce((sum, i) => sum + (Number(i.unit_price_bdt) || 0) * (Number(i.quantity) || 1), 0)
                    .toLocaleString('en-BD')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-700 font-medium">
              <span>Items Subtotal:</span>
              <span className="font-mono">৳{Number(invoice.subtotal_bdt).toLocaleString('en-BD')}</span>
            </div>
            {Number(invoice.delivery_charge_bdt) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge:</span>
                <span className="font-mono">+ ৳{Number(invoice.delivery_charge_bdt).toLocaleString('en-BD')}</span>
              </div>
            )}
            {Number(invoice.additional_charge_bdt) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Additional Fee:</span>
                <span className="font-mono">+ ৳{Number(invoice.additional_charge_bdt).toLocaleString('en-BD')}</span>
              </div>
            )}
            {Number(invoice.discount_bdt) > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount:</span>
                <span className="font-mono">- ৳{Number(invoice.discount_bdt).toLocaleString('en-BD')}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-3 text-base sm:text-lg font-bold text-gray-950">
              <span>Grand Total:</span>
              <span className="font-mono">৳{Number(invoice.grand_total_bdt).toLocaleString('en-BD')}</span>
            </div>

            {totalPaid > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold text-xs pt-1">
                <span>Total Paid:</span>
                <span className="font-mono">- ৳{totalPaid.toLocaleString('en-BD')}</span>
              </div>
            )}

            <div className={`flex justify-between border-t border-dashed border-gray-200 pt-2 text-sm font-bold ${
              remainingDue > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              <span>Remaining Due:</span>
              <span className="font-mono">৳{remainingDue.toLocaleString('en-BD')}</span>
            </div>
          </div>
        </div>

        {/* Notes / Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t border-gray-100 pt-6 text-xs text-gray-500 font-light space-y-2">
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

        {/* Invoice Footer with Creatiancy credit */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
          <span>Official Invoice &bull; Kazi Canvas Gallery</span>
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

      {/* ── Payments & Collections Manager (Instalments, partial payments, history) ── */}
      <PaymentManager
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        grandTotal={Number(invoice.grand_total_bdt)}
        initialPayments={payments}
        isVoid={isVoid}
        isCancelled={isCancelled}
      />

      {/* ── Live Customer–Admin Conversation Thread ── */}
      <AdminInvoiceConversation
        invoiceId={invoice.id}
        customerName={invoice.customer_name}
      />
    </div>
  )
}


