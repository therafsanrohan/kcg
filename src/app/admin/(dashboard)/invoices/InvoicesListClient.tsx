'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Receipt
} from 'lucide-react'
import { recordInvoicePaymentAction } from '@/app/admin/(dashboard)/invoices/actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'

interface InvoicesListClientProps {
  initialInvoices: any[]
}

export default function InvoicesListClient({ initialInvoices }: InvoicesListClientProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices)
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'draft' | 'cancelled' | 'void'>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Quick Pay Modal State
  const [payModalInvoice, setPayModalInvoice] = useState<any | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('bkash')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payRef, setPayRef] = useState('')
  const [processingFee, setProcessingFee] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [payError, setPayError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { toast } = useAdminFeedback()

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      // Payment filter
      if (paymentFilter !== 'all' && inv.payment_status !== paymentFilter) return false
      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_phone?.toLowerCase().includes(q) ||
        inv.customer_email?.toLowerCase().includes(q)
      )
    })
  }, [invoices, statusFilter, paymentFilter, searchQuery])

  // Open modal for specific invoice
  const handleOpenPayModal = (inv: any) => {
    const total = Number(inv.grand_total_bdt) || 0
    const alreadyPaid = (inv.invoice_payments || []).reduce(
      (s: number, p: any) => s + (Number(p.amount_bdt) || 0),
      0
    )
    const due = Math.max(0, total - alreadyPaid)

    setPayModalInvoice(inv)
    setPayAmount(due > 0 ? String(due) : '')
    setProcessingFee('')
    setPayRef('')
    setInternalNotes('')
    setPayError(null)
    setPayDate(new Date().toISOString().split('T')[0])
  }

  // Handle Quick Payment Submission
  const handleSubmitQuickPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payModalInvoice) return
    setPayError(null)

    const amountNum = Number(payAmount)
    if (!amountNum || amountNum <= 0 || isNaN(amountNum)) {
      setPayError('Please enter a valid positive payment amount in BDT.')
      return
    }

    const total = Number(payModalInvoice.grand_total_bdt) || 0
    const alreadyPaid = (payModalInvoice.invoice_payments || []).reduce(
      (s: number, p: any) => s + (Number(p.amount_bdt) || 0),
      0
    )
    const remainingDue = Math.max(0, total - alreadyPaid)

    if (amountNum > remainingDue) {
      setPayError(`Payment cannot exceed remaining due of ৳${remainingDue.toLocaleString('en-BD')}.`)
      return
    }

    const feeNum = Math.max(0, Number(processingFee) || 0)
    if (feeNum >= amountNum) {
      setPayError('Fee cannot exceed or equal the payment amount.')
      return
    }

    startTransition(async () => {
      const res = await recordInvoicePaymentAction({
        invoiceId: payModalInvoice.id,
        amountBdt: amountNum,
        paymentMethod: payMethod,
        paymentDate: payDate,
        transactionRef: payRef,
        internalNotes,
        processingFeeBdt: feeNum,
      })

      if (res.success && res.payment) {
        // Update local invoice state
        setInvoices((prev) =>
          prev.map((item) => {
            if (item.id === payModalInvoice.id) {
              const updatedPayments = [res.payment, ...(item.invoice_payments || [])]
              const newPaidTotal = updatedPayments.reduce(
                (sum: number, p: any) => sum + (Number(p.amount_bdt) || 0),
                0
              )
              const newStatus = newPaidTotal >= total ? 'paid' : 'partially_paid'
              return {
                ...item,
                invoice_payments: updatedPayments,
                payment_status: newStatus,
              }
            }
            return item
          })
        )

        toast(`৳${amountNum.toLocaleString('en-BD')} payment recorded & synced to Cash Flow!`, 'success')
        setPayModalInvoice(null)
      } else {
        setPayError(res.error || 'Failed to record payment.')
        toast(res.error || 'Failed to record payment.', 'error')
      }
    })
  }

  // Active quick metrics from filtered
  const counts = useMemo(() => {
    return {
      all: invoices.length,
      unpaid: invoices.filter((i) => i.payment_status === 'unpaid').length,
      partially_paid: invoices.filter((i) => i.payment_status === 'partially_paid').length,
      paid: invoices.filter((i) => i.payment_status === 'paid').length,
    }
  }, [invoices])

  return (
    <div className="space-y-4">
      {/* ── SMART FILTER & SEARCH BAR ── */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Payment Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-medium">
            {[
              { key: 'all', label: `All (${counts.all})` },
              { key: 'unpaid', label: `Unpaid (${counts.unpaid})` },
              { key: 'partially_paid', label: `Partially Paid (${counts.partially_paid})` },
              { key: 'paid', label: `Paid (${counts.paid})` },
            ].map((tab) => {
              const isActive = paymentFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPaymentFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-white text-gray-950 font-bold shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search Input & Status Dropdown */}
          <div className="flex items-center gap-2 flex-1 md:max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice #, customer name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-hidden focus:border-black font-medium"
            >
              <option value="all">Status: All</option>
              <option value="issued">Issued</option>
              <option value="draft">Draft</option>
              <option value="cancelled">Cancelled</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── TABLE CONTAINER ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="font-sans font-bold text-base text-gray-900">No invoices found</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-0.5">
              No records match your selected filter criteria. Try resetting the search or filter.
            </p>
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
                {filteredInvoices.map((inv) => {
                  const grandTotal = Number(inv.grand_total_bdt) || 0
                  const paidSum = (inv.invoice_payments || []).reduce(
                    (acc: number, p: any) => acc + (Number(p.amount_bdt) || 0),
                    0
                  )
                  const remainingDue = Math.max(0, grandTotal - paidSum)
                  const canPay =
                    inv.payment_status !== 'paid' &&
                    inv.status !== 'cancelled' &&
                    inv.status !== 'void' &&
                    remainingDue > 0

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-gray-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{inv.customer_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{inv.customer_phone}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-mono text-xs">
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
                        {inv.payment_status === 'partially_paid' && remainingDue > 0 && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Due: ৳{remainingDue.toLocaleString('en-BD')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-gray-900">
                        ৳{grandTotal.toLocaleString('en-BD')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(inv)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-all shadow-2xs cursor-pointer"
                              title="Record payment directly here"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}
                          <Link
                            href={`/admin/invoices/${inv.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all shadow-xs"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── DIRECT RECORD CUSTOMER PAYMENT POPUP (IN-PAGE MODAL) ── */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-gray-950">
                    Record Customer Payment
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Invoice: {payModalInvoice.invoice_number} ({payModalInvoice.customer_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuickPayment} className="mt-5 space-y-4">
              {payError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Amount & Due summary */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Payment Amount (৳) *</label>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Total: ৳{Number(payModalInvoice.grand_total_bdt).toLocaleString('en-BD')}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 5000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-hidden focus:border-black"
                />
              </div>

              {/* Payment Channel */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Method / Account *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'bkash', label: 'bKash', icon: Smartphone },
                    { id: 'nagad', label: 'Nagad', icon: Smartphone },
                    { id: 'rocket', label: 'Rocket', icon: Smartphone },
                    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                    { id: 'card', label: 'Card Payment', icon: CreditCard },
                    { id: 'cash', label: 'Cash in Hand', icon: Banknote },
                  ].map((m) => {
                    const isSelected = payMethod === m.id
                    const Icon = m.icon
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Gateway Charge / Provider Fee Deduction */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Channel Fee / Gateway Charge (৳)
                  </label>
                  <span className="text-[11px] text-gray-400">Optional</span>
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 90 (deducted before crediting liquid cash)"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
                {Number(payAmount) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Net credited to cash flow: ৳
                    {Math.max(0, Number(payAmount) - (Number(processingFee) || 0)).toLocaleString('en-BD')}
                  </p>
                )}
              </div>

              {/* Date & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Transaction Ref / TrxID</label>
                  <input
                    type="text"
                    placeholder="e.g. 9J2184X"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:outline-hidden focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Internal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid 50% advance for canvas delivery"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalInvoice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPending ? 'Recording...' : 'Confirm & Save Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
