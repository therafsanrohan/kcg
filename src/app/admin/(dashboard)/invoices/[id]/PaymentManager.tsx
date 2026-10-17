'use client'

import { useState, useTransition } from 'react'
import {
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Shield,
  X,
} from 'lucide-react'
import {
  recordInvoicePaymentAction,
  deleteInvoicePaymentAction,
} from '@/app/admin/(dashboard)/invoices/actions'
import { InvoicePayment } from '@/types/invoice'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'

interface PaymentManagerProps {
  invoiceId: string
  invoiceNumber: string
  grandTotal: number
  initialPayments: InvoicePayment[]
  isVoid: boolean
  isCancelled: boolean
}

export default function PaymentManager({
  invoiceId,
  invoiceNumber,
  grandTotal,
  initialPayments,
  isVoid,
  isCancelled,
}: PaymentManagerProps) {
  const [payments, setPayments] = useState<InvoicePayment[]>(initialPayments)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [transactionRef, setTransactionRef] = useState<string>('')
  const [internalNotes, setInternalNotes] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { toast, confirm: confirmModal } = useAdminFeedback()

  const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount_bdt) || 0), 0)
  const remainingDue = Math.max(0, grandTotal - totalPaid)
  const isFullyPaid = totalPaid >= grandTotal && grandTotal > 0

  const handleOpenRecordPayment = () => {
    setAmount(remainingDue > 0 ? String(remainingDue) : '')
    setErrorMessage(null)
    setIsOpenModal(true)
  }

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0 || isNaN(numAmount)) {
      setErrorMessage('Please enter a valid payment amount greater than zero.')
      return
    }

    if (numAmount > remainingDue) {
      setErrorMessage(
        `Payment cannot exceed remaining due of ৳${remainingDue.toLocaleString('en-BD')}.`
      )
      return
    }

    startTransition(async () => {
      const res = await recordInvoicePaymentAction({
        invoiceId,
        amountBdt: numAmount,
        paymentMethod,
        paymentDate,
        transactionRef,
        internalNotes,
      })

      if (res.success && res.payment) {
        setPayments((prev) => [res.payment, ...prev])
        setIsOpenModal(false)
        setAmount('')
        setTransactionRef('')
        setInternalNotes('')
        toast(`Payment of ৳${numAmount.toLocaleString('en-BD')} recorded successfully!`, 'success')
      } else {
        setErrorMessage(res.error || 'Failed to record payment.')
        toast(res.error || 'Failed to record payment.', 'error')
      }
    })
  }

  const handleDeletePayment = (payment: InvoicePayment) => {
    confirmModal({
      title: 'Reverse Payment Record',
      message: `Are you sure you want to reverse this payment of ৳${Number(payment.amount_bdt).toLocaleString('en-BD')} recorded on ${payment.payment_date}? The invoice due will increase accordingly.`,
      confirmText: 'Reverse Payment',
      isDestructive: true,
      onConfirm: async () => {
        const res = await deleteInvoicePaymentAction(payment.id, invoiceId)
        if (res.success) {
          setPayments((prev) => prev.filter((p) => p.id !== payment.id))
          toast('Payment reversed successfully.', 'success')
        } else {
          toast(res.error || 'Failed to reverse payment.', 'error')
        }
      },
    })
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 shadow-xs space-y-6 print:hidden">
      {/* ── Top Header & Metrics ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-gray-700" />
            <h3 className="font-sans text-base font-bold text-gray-950 uppercase tracking-wider">
              Payments & Collections
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Track partial instalments, advances, bank transfers, and mobile payments.
          </p>
        </div>

        {!isVoid && !isCancelled && !isFullyPaid && (
          <button
            type="button"
            onClick={handleOpenRecordPayment}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* ── Financial Summary Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Invoice Grand Total
          </span>
          <div className="text-xl font-bold font-mono text-gray-950">
            ৳{grandTotal.toLocaleString('en-BD')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Total Collected
          </span>
          <div className="text-xl font-bold font-mono text-emerald-900">
            ৳{totalPaid.toLocaleString('en-BD')}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border space-y-1 ${
            remainingDue > 0
              ? 'bg-rose-50/70 border-rose-100'
              : 'bg-emerald-50/30 border-emerald-100'
          }`}
        >
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              remainingDue > 0 ? 'text-rose-800' : 'text-emerald-700'
            }`}
          >
            Outstanding Due
          </span>
          <div
            className={`text-xl font-bold font-mono ${
              remainingDue > 0 ? 'text-rose-900' : 'text-emerald-700'
            }`}
          >
            ৳{remainingDue.toLocaleString('en-BD')}
          </div>
        </div>
      </div>

      {/* ── Payment History Table ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
          <span>Payment Ledger History ({payments.length})</span>
          {isFullyPaid && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Paid in Full
            </span>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400 space-y-1">
            <Clock className="w-6 h-6 mx-auto stroke-1" />
            <p className="text-xs font-semibold text-gray-600">No payments recorded yet</p>
            <p className="text-[11px] text-gray-400">
              Click &ldquo;Record Payment&rdquo; to add customer deposits or instalment payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Ref / Note</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-900">{p.payment_date}</td>
                    <td className="py-3 px-4 capitalize font-medium text-gray-800">
                      {p.payment_method.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {p.transaction_ref && (
                        <div className="font-mono text-[11px] text-gray-900 font-semibold">
                          Ref: {p.transaction_ref}
                        </div>
                      )}
                      {p.internal_notes && (
                        <div className="text-[11px] text-gray-500 italic">
                          {p.internal_notes}
                        </div>
                      )}
                      {!p.transaction_ref && !p.internal_notes && <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{p.recorded_by_name || 'Staff'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-950">
                      ৳{Number(p.amount_bdt).toLocaleString('en-BD')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isVoid && (
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p)}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Reverse this payment entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Payment Modal ── */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-950">
                  Record Customer Payment
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ref: {invoiceNumber} &bull; Due: ৳{remainingDue.toLocaleString('en-BD')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Payment Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingDue}
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Max: ${remainingDue}`}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-sm text-gray-900 focus:bg-white focus:border-black outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:border-black outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card / POS</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs text-gray-900 focus:bg-white focus:border-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Transaction / TrxID / Cheque #
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. 9J47K2L8 or Bank Cheque #402"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs text-gray-900 focus:bg-white focus:border-black outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="e.g. Received 50% advance for custom framing"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:border-black outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !amount || Number(amount) <= 0}
                  className="px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-2"
                >
                  {isPending ? 'Recording...' : 'Confirm & Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
