'use client'

import { useActionState } from 'react'
import { updateAdminProfile } from './actions'
import { AdminUserRecord } from '@/utils/supabase/admin-auth'
import { User, ShieldCheck, Mail, Phone, AtSign, Check, AlertCircle } from 'lucide-react'

interface AdminProfileFormProps {
  admin: AdminUserRecord
}

export default function AdminProfileForm({ admin }: AdminProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateAdminProfile, null)

  const isSuperAdmin = admin.role === 'superadmin'

  return (
    <form action={formAction} className="space-y-8 max-w-3xl">
      {/* Status Feedback */}
      {state?.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && state?.message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {/* Account Identity Card (Read-Only Authentication Info) */}
      <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
              {admin.full_name ? admin.full_name[0] : admin.email[0]}
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-gray-950">
                {admin.full_name || 'Administrator'}
              </h3>
              <p className="text-xs text-gray-400 font-mono">@{admin.username || 'admin'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
        </div>

        {/* Read-Only Auth Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Authentication Email
          </label>
          <div className="relative">
            <input
              type="email"
              value={admin.email}
              readOnly
              disabled
              className="w-full px-4 py-3 rounded-xl bg-gray-50/80 border border-gray-200 text-gray-600 text-sm font-mono cursor-not-allowed select-all"
            />
          </div>
          <p className="text-[11px] text-gray-400 font-light">
            Authentication email is managed exclusively through Supabase Auth for security.
          </p>
        </div>
      </div>

      {/* Permitted Profile Information Form */}
      <div className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs space-y-6">
        <div>
          <h4 className="font-sans font-bold text-base text-gray-950">Profile Details</h4>
          <p className="text-xs text-gray-500 font-light mt-0.5">
            Update your public administrative contact and display information.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="full_name"
              className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-gray-400" />
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={admin.full_name || ''}
              placeholder="e.g. Kazi Rafsan"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <AtSign className="w-3.5 h-3.5 text-gray-400" />
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              defaultValue={admin.username || ''}
              placeholder="e.g. rafsan_admin"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono"
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="phone"
              className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              Contact Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={admin.phone || ''}
              placeholder="e.g. +880 1824-951514"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {isPending ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
