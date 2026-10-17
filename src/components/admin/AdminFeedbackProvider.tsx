'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title?: string
  message: string
  type: ToastType
  duration?: number
}

interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

interface AdminFeedbackContextType {
  toast: (message: string, type?: ToastType, title?: string, duration?: number) => void
  confirm: (options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    isDestructive?: boolean
    onConfirm: () => void
  }) => void
}

const AdminFeedbackContext = createContext<AdminFeedbackContextType | null>(null)

export function AdminFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'success', title?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast: ToastItem = { id, message, type, title, duration }
      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const confirm = useCallback(
    (options: {
      title: string
      message: string
      confirmText?: string
      cancelText?: string
      isDestructive?: boolean
      onConfirm: () => void
    }) => {
      setDialog({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDestructive: options.isDestructive !== false,
        onConfirm: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }))
          options.onConfirm()
        },
        onCancel: () => {
          setDialog((prev) => ({ ...prev, isOpen: false }))
        },
      })
    },
    []
  )

  return (
    <AdminFeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Container (Top Right) ── */}
      <div className="fixed top-5 right-5 z-[100000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-white transition-all transform animate-fade-in ${
              t.type === 'success'
                ? 'border-emerald-200 text-emerald-950'
                : t.type === 'error'
                ? 'border-rose-200 text-rose-950'
                : t.type === 'warning'
                ? 'border-amber-200 text-amber-950'
                : 'border-gray-200 text-gray-950'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 text-xs">
              {t.title && <div className="font-semibold text-sm mb-0.5">{t.title}</div>}
              <div className="text-gray-700 font-light leading-relaxed">{t.message}</div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-black transition-colors p-1"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ── Luxury Confirmation Dialog ── */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl flex-shrink-0 ${
                  dialog.isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {dialog.isDestructive ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-950">{dialog.title}</h3>
                <p className="text-xs sm:text-sm text-gray-600 font-light mt-1.5 leading-relaxed">
                  {dialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={dialog.onCancel}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={dialog.onConfirm}
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer shadow-xs ${
                  dialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-black hover:bg-gray-800'
                }`}
              >
                {dialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminFeedbackContext.Provider>
  )
}

export function useAdminFeedback() {
  const context = useContext(AdminFeedbackContext)
  if (!context) {
    throw new Error('useAdminFeedback must be used within an AdminFeedbackProvider')
  }
  return context
}
