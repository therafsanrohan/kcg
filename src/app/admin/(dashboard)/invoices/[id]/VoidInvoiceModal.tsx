'use client'

import { useState, useTransition } from 'react'
import { Ban, X } from 'lucide-react'
import { voidInvoice } from '../actions'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'

interface VoidInvoiceModalProps {
  invoiceId: string
  invoiceNumber: string
}

export default function VoidInvoiceModal({ invoiceId, invoiceNumber }: VoidInvoiceModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useAdminFeedback()

  const handleVoid = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast('Please provide a legitimate reason for voiding this invoice.', 'error')
      return
    }

    startTransition(async () => {
      const res = await voidInvoice(invoiceId, reason)
      if (res.success) {
        toast('Invoice marked as VOID.', 'info')
        setIsOpen(false)
      } else {
        toast(res.error || 'Failed to void invoice', 'error')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-10 px-4 rounded-xl border border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-100/70 text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer print:hidden"
        title="Void this invoice permanently"
      >
        <Ban className="w-4 h-4 text-rose-600" />
        <span>Void Invoice</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full p-6 animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Ban className="w-5 h-5" />
                <h3 className="font-sans text-lg font-bold text-gray-950">
                  Void Invoice {invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <p className="font-bold">Important Audit Warning:</p>
              <p>
                Voiding permanently cancels this invoice for accounting and audit compliance. The invoice number and line-item history will be retained, but the status will clearly display VOID across all views, downloads, and share links.
              </p>
            </div>

            <form onSubmit={handleVoid} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Void Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Order cancelled by client; incorrect pricing entered; replaced by KCG-2026-0005"
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-900 focus:border-black outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-10 px-5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isPending ? 'Voiding...' : 'Confirm Void'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
