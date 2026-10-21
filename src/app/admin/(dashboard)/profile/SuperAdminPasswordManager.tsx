'use client'

import { useState } from 'react'
import { sendAdminPasswordReset } from './actions'
import { KeyRound, ShieldAlert, Check, AlertCircle } from 'lucide-react'

interface SuperAdminPasswordManagerProps {
  admins: Array<{
    id: string
    email: string
    role: string
    full_name?: string | null
    username?: string | null
  }>
  currentUserId: string
}

export default function SuperAdminPasswordManager({
  admins,
  currentUserId,
}: SuperAdminPasswordManagerProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleResetTrigger = async () => {
    if (!selectedAdminId) return

    const target = admins.find((a) => a.id === selectedAdminId)
    if (!target) return

    const confirmReset = window.confirm(
      `Are you sure you want to trigger a password reset email for ${target.email}?`
    )
    if (!confirmReset) return

    setIsLoading(true)
    setStatusMessage(null)

    try {
      const res = await sendAdminPasswordReset(selectedAdminId)
      if (res.success) {
        setStatusMessage({ text: res.message || 'Password reset email sent.', isError: false })
      } else {
        setStatusMessage({ text: res.error || 'Failed to send reset email.', isError: true })
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'An unexpected error occurred.', isError: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-amber-200/80 shadow-xs space-y-6 max-w-3xl">
      <div className="flex items-start justify-between border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-100 text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h4 className="font-sans font-bold text-base text-gray-950">
              Super Admin Password Management
            </h4>
          </div>
          <p className="text-xs text-gray-500 font-light mt-1">
            Super Admins can trigger official, cryptographically secure Supabase password reset workflows for administrators.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
            statusMessage.isError
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          {statusMessage.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
            Select Administrator
          </label>
          <select
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
          >
            <option value="">-- Choose an administrator --</option>
            {admins.map((adm) => (
              <option key={adm.id} value={adm.id}>
                {adm.full_name ? `${adm.full_name} (${adm.email})` : adm.email}{' '}
                {adm.id === currentUserId ? '— [Your Account]' : ''} [{adm.role.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>

        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-gray-500" /> Security Notice:
          </p>
          <p className="font-light leading-relaxed">
            Passwords are encrypted and stored exclusively within Supabase Auth. Plaintext passwords can never be viewed or retrieved. Triggering this action dispatches an authorized reset token directly to the recipient&rsquo;s email.
          </p>
        </div>

        <button
          type="button"
          disabled={!selectedAdminId || isLoading}
          onClick={handleResetTrigger}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
        >
          <KeyRound className="w-4 h-4" />
          {isLoading ? 'Initiating Reset...' : 'Send Password Reset Email'}
        </button>
      </div>
    </div>
  )
}
