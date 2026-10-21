'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { createAdminAccount } from './actions'
import { UserPlus, Shield, Lock, Mail, User, Phone, AtSign, Check, AlertCircle } from 'lucide-react'

export default function CreateAdminAccountModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [state, formAction, isPending] = useActionState(createAdminAccount, null)

  const handleOpen = () => {
    setIsOpen(true)
    setConfirmed(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setConfirmed(false)
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Create Administrator Account
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-black text-white">
                  <Shield className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-sans font-bold text-base text-gray-950">
                    Provision Administrator Account
                  </h3>
                  <p className="text-[11px] text-gray-400 font-light">
                    Super Admin Identity Reauthentication Required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body & Form */}
            <form action={formAction} className="p-6 space-y-5 overflow-y-auto">
              {state?.error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              {state?.success && state?.message && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {/* 1. New Account Credentials & Contact Info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new_email"
                    className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    Admin Email Address *
                  </label>
                  <input
                    id="new_email"
                    name="email"
                    type="email"
                    required
                    placeholder="admin@kazicanvasgallery.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new_full_name"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      Full Name
                    </label>
                    <input
                      id="new_full_name"
                      name="full_name"
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="new_username"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                    >
                      <AtSign className="w-3.5 h-3.5 text-gray-400" />
                      Username
                    </label>
                    <input
                      id="new_username"
                      name="username"
                      type="text"
                      placeholder="e.g. john_kcg"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new_phone"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      Contact Number
                    </label>
                    <input
                      id="new_phone"
                      name="phone"
                      type="tel"
                      placeholder="+880 1..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="new_role"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Role Privilege
                    </label>
                    <select
                      id="new_role"
                      name="role"
                      defaultValue="admin"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
                    >
                      <option value="admin">Admin (Operational Access)</option>
                      <option value="superadmin">Super Admin (Full Access)</option>
                    </select>
                  </div>
                </div>

                {/* Password & Confirm Password for the new Administrator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new_password"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      Login Password *
                    </label>
                    <input
                      id="new_password"
                      name="new_password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Min 6 characters"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirm_password"
                      className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      Confirm Password *
                    </label>
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="Re-type password"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 font-light">
                  The new administrator will use this password to log in directly at /admin/login.
                </p>
              </div>

              {/* 2. Reauthentication Barrier: Current Super Admin Password */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="super_admin_password"
                    className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Verify Super Admin Password *
                  </label>
                  <p className="text-[11px] text-amber-800 font-light">
                    For security, re-enter your current password to authorize this administrator account creation.
                  </p>
                </div>

                <input
                  id="super_admin_password"
                  name="super_admin_password"
                  type="password"
                  required
                  placeholder="Your Super Admin password"
                  className="w-full px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
                />

                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-[11px] text-gray-700">
                    I confirm that I want to provision this administrator account.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!confirmed || isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                >
                  {isPending ? 'Provisioning...' : 'Confirm & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
