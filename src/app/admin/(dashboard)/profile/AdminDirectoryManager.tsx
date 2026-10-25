'use client'

import { useState, useMemo } from 'react'
import { useActionState } from 'react'
import {
  updateAdminProfileBySuperAdmin,
  setAdminPasswordBySuperAdmin,
  deleteAdminAccount,
  sendAdminPasswordReset,
} from './actions'
import CreateAdminAccountModal from './CreateAdminAccountModal'
import {
  Shield,
  ShieldAlert,
  Users,
  Search,
  KeyRound,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  Mail,
  User,
  Phone,
  AtSign,
  Lock,
  UserCheck,
  Sliders,
  X,
} from 'lucide-react'
import { ALL_PERMISSIONS, PermissionCode } from '@/types/finance'
import { updateAdminPermissionsAction, getFinancialAuditLogsAction } from '../finance/actions'

export interface AdminUserItem {
  id: string
  email: string
  role: 'superadmin' | 'admin'
  full_name?: string | null
  username?: string | null
  phone?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

interface AdminDirectoryManagerProps {
  admins: AdminUserItem[]
  currentUserId: string
}

export default function AdminDirectoryManager({
  admins,
  currentUserId,
}: AdminDirectoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [editingAdmin, setEditingAdmin] = useState<AdminUserItem | null>(null)
  const [passwordAdmin, setPasswordAdmin] = useState<AdminUserItem | null>(null)
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUserItem | null>(null)
  const [permissionAdmin, setPermissionAdmin] = useState<AdminUserItem | null>(null)

  // Direct password reset email state
  const [resetEmailStatus, setResetEmailStatus] = useState<{
    adminId: string
    success: boolean
    message: string
  } | null>(null)
  const [isResettingEmail, setIsResettingEmail] = useState(false)

  // Filtered admins list
  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return admins
    const q = searchQuery.toLowerCase()
    return admins.filter(
      (a) =>
        a.email?.toLowerCase().includes(q) ||
        a.full_name?.toLowerCase().includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q)
    )
  }, [admins, searchQuery])

  const superAdminCount = admins.filter((a) => a.role === 'superadmin').length
  const standardAdminCount = admins.length - superAdminCount

  const handleSendResetEmail = async (admin: AdminUserItem) => {
    if (
      !window.confirm(
        `Are you sure you want to dispatch a password reset email to ${admin.email}?`
      )
    ) {
      return
    }

    setIsResettingEmail(true)
    setResetEmailStatus(null)

    try {
      const res = await sendAdminPasswordReset(admin.id)
      setResetEmailStatus({
        adminId: admin.id,
        success: res.success,
        message: res.success ? (res.message || 'Reset email dispatched.') : (res.error || 'Failed to dispatch reset email.'),
      })
    } catch (err: any) {
      setResetEmailStatus({
        adminId: admin.id,
        success: false,
        message: err.message || 'An error occurred.',
      })
    } finally {
      setIsResettingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-black text-white">
              <Users className="w-4 h-4" />
            </span>
            <h3 className="font-sans font-bold text-lg text-gray-950">
              Administrator Directory & Team Access
            </h3>
          </div>
          <p className="text-xs text-gray-500 font-light mt-1">
            Super Admin Access: Inspect administrator profiles, update permissions, assign passwords, or revoke access.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {admins.length} Total Admins
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              {superAdminCount} Super Admin{superAdminCount !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/60">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              {standardAdminCount} Standard Admin{standardAdminCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          <CreateAdminAccountModal />
        </div>
      </div>

      {/* Search & Feedback Banner */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search administrators by name, email, or username..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all shadow-2xs"
          />
        </div>

        {resetEmailStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-3 ${
              resetEmailStatus.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {resetEmailStatus.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{resetEmailStatus.message}</span>
            </div>
            <button
              onClick={() => setResetEmailStatus(null)}
              className="text-gray-400 hover:text-gray-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Directory Table / Cards */}
      <div className="rounded-3xl bg-white border border-gray-200/80 shadow-xs overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">No administrators found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search terms or provision a new administrator above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-6">Administrator</th>
                  <th className="py-3.5 px-6">Email & Phone</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredAdmins.map((adm) => {
                  const isCurrentUser = adm.id === currentUserId
                  const isSuper = adm.role === 'superadmin'

                  // Initials for avatar
                  const initials = (adm.full_name || adm.email)
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr
                      key={adm.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      {/* Name & Username */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuper
                                ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                              {adm.full_name || 'No Name Set'}
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black text-white">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-xs font-mono">
                              {adm.username ? `@${adm.username}` : '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-6 space-y-0.5">
                        <div className="text-gray-900 font-medium">{adm.email}</div>
                        <div className="text-gray-400 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {adm.phone || 'No phone number'}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Shield className="w-3 h-3 text-amber-600" />
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                            <UserCheck className="w-3 h-3 text-gray-500" />
                            ADMIN
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Edit / View Profile */}
                          <button
                            type="button"
                            onClick={() => setEditingAdmin(adm)}
                            className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                            title="View & Edit Administrator Profile"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Permissions & Finance Access */}
                          <button
                            type="button"
                            onClick={() => setPermissionAdmin(adm)}
                            className="p-2 rounded-xl text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 transition-colors"
                            title="Manage Permissions & Role Limits"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          {/* Set / Reset Password */}
                          <button
                            type="button"
                            onClick={() => setPasswordAdmin(adm)}
                            className="p-2 rounded-xl text-amber-700 hover:text-amber-900 hover:bg-amber-50 transition-colors"
                            title="Manage Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            disabled={isCurrentUser}
                            onClick={() => setDeletingAdmin(adm)}
                            className="p-2 rounded-xl text-rose-600 hover:text-rose-800 hover:bg-rose-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title={
                              isCurrentUser
                                ? 'You cannot remove your own account'
                                : 'Remove Administrator Account'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* 1. Modal: Edit Administrator Profile */}
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          currentUserId={currentUserId}
          onClose={() => setEditingAdmin(null)}
        />
      )}

      {/* 2. Modal: Manage Administrator Password */}
      {passwordAdmin && (
        <ManagePasswordModal
          admin={passwordAdmin}
          onSendResetEmail={() => {
            const target = passwordAdmin
            setPasswordAdmin(null)
            handleSendResetEmail(target)
          }}
          isResettingEmail={isResettingEmail}
          onClose={() => setPasswordAdmin(null)}
        />
      )}

      {/* 3. Modal: Delete Administrator Account */}
      {deletingAdmin && (
        <DeleteAdminModal
          admin={deletingAdmin}
          onClose={() => setDeletingAdmin(null)}
        />
      )}

      {/* 4. Modal: Manage Administrator Permissions & Role Constraints */}
      {permissionAdmin && (
        <ManagePermissionsModal
          admin={permissionAdmin}
          onClose={() => setPermissionAdmin(null)}
        />
      )}
    </div>
  )
}

/**
 * Super Admin Controlled Permissions Modal
 */
function ManagePermissionsModal({
  admin,
  onClose,
}: {
  admin: AdminUserItem
  onClose: () => void
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionCode[]>(
    ALL_PERMISSIONS.map((p) => p.code)
  )
  const [isFinanceOnly, setIsFinanceOnly] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const togglePermission = (code: PermissionCode) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    )
  }

  const handleSelectAll = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.code))
  }

  const handleClearAll = () => {
    setSelectedPermissions([])
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setSaveSuccess(false)
    try {
      const res = await updateAdminPermissionsAction(
        admin.id,
        selectedPermissions,
        isFinanceOnly
      )
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update permissions.')
      } else {
        setSaveSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-gray-950">
                Granular Permissions & Role Controls
              </h3>
              <p className="text-xs text-gray-500 font-light">
                Configure access for <strong>{admin.full_name || admin.email}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-black"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Permissions successfully updated and saved to database!</span>
            </div>
          )}

          {/* Special Finance Team Role Switch */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider block">
                  Finance Team Role Isolation
                </span>
                <p className="text-xs text-indigo-900/80 mt-0.5 font-light">
                  When enabled, this administrator will <strong>ONLY</strong> be able to see and access <strong>Finance & Cash Flow</strong> and <strong>Invoices</strong>. All other modules (Artworks, Settings, Reviews, Conversations, Profile) will remain completely blocked.
                </p>
              </div>
              <input
                type="checkbox"
                id="isFinanceOnlyToggle"
                checked={isFinanceOnly}
                onChange={(e) => setIsFinanceOnly(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Granular Permissions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Granular Permissions ({selectedPermissions.length} / {ALL_PERMISSIONS.length})
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-gray-500 font-semibold hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = selectedPermissions.includes(perm.code)
                return (
                  <label
                    key={perm.code}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                      checked
                        ? 'bg-white border-indigo-300 shadow-2xs'
                        : 'bg-gray-50/50 border-gray-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(perm.code)}
                      className="w-4 h-4 accent-indigo-600 rounded-sm mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{perm.label}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{perm.code}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Apply Permissions'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal to view and update another administrator's profile & role.
 */
function EditAdminModal({
  admin,
  currentUserId,
  onClose,
}: {
  admin: AdminUserItem
  currentUserId: string
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(
    updateAdminProfileBySuperAdmin,
    null
  )

  const isSelf = admin.id === currentUserId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-black text-white">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-base text-gray-950">
                Administrator Profile & Access
              </h3>
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                {admin.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form action={formAction} className="p-6 space-y-4 overflow-y-auto">
          <input type="hidden" name="target_admin_id" value={admin.id} />

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

          {/* Readonly UUID & Email */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Email Address
              </span>
              <span className="font-mono text-gray-900">{admin.email}</span>
            </div>
            <div className="flex items-center justify-between text-gray-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                User ID (UUID)
              </span>
              <span className="font-mono text-[11px] text-gray-700">{admin.id}</span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit_full_name"
              className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-gray-400" />
              Full Name
            </label>
            <input
              id="edit_full_name"
              name="full_name"
              type="text"
              defaultValue={admin.full_name || ''}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="edit_username"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
              >
                <AtSign className="w-3.5 h-3.5 text-gray-400" />
                Username
              </label>
              <input
                id="edit_username"
                name="username"
                type="text"
                defaultValue={admin.username || ''}
                placeholder="e.g. jane_kcg"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit_phone"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Contact Number
              </label>
              <input
                id="edit_phone"
                name="phone"
                type="tel"
                defaultValue={admin.phone || ''}
                placeholder="+880 1..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit_role"
              className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-gray-400" />
              Role Privilege
            </label>
            <select
              id="edit_role"
              name="role"
              defaultValue={admin.role}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
            >
              <option value="admin">Admin (Operational Access)</option>
              <option value="superadmin">Super Admin (Full Management Access)</option>
            </select>
            {isSelf && (
              <p className="text-[11px] text-amber-700 font-light">
                Note: This is your account. Demoting yourself will remove your Super Admin capabilities.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {isPending ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal to either set a new password directly or trigger a reset link.
 */
function ManagePasswordModal({
  admin,
  onSendResetEmail,
  isResettingEmail,
  onClose,
}: {
  admin: AdminUserItem
  onSendResetEmail: () => void
  isResettingEmail: boolean
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'direct' | 'email'>('direct')
  const [state, formAction, isPending] = useActionState(
    setAdminPasswordBySuperAdmin,
    null
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-600 text-white">
              <KeyRound className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-base text-gray-950">
                Manage Administrator Password
              </h3>
              <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                {admin.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 border-b border-gray-100 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Directly Set Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Dispatch Reset Email
          </button>
        </div>

        {/* Tab 1: Directly Set Password */}
        {activeTab === 'direct' && (
          <form action={formAction} className="p-6 space-y-4 overflow-y-auto">
            <input type="hidden" name="target_admin_id" value={admin.id} />

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

            <div className="space-y-1.5">
              <label
                htmlFor="new_pwd"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                New Password *
              </label>
              <input
                id="new_pwd"
                name="new_password"
                type="password"
                required
                minLength={6}
                placeholder="Enter minimum 6 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm_pwd"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                Confirm New Password *
              </label>
              <input
                id="confirm_pwd"
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="Re-type new password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
              />
            </div>

            {/* Super Admin Reauth */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
              <label
                htmlFor="super_pwd"
                className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Authorize With Super Admin Password *
              </label>
              <input
                id="super_pwd"
                name="super_admin_password"
                type="password"
                required
                placeholder="Your current password"
                className="w-full px-4 py-2 rounded-xl border border-amber-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {isPending ? 'Updating...' : 'Set Password'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Dispatch Email */}
        {activeTab === 'email' && (
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed font-light">
              Dispatches an official, cryptographically secure Supabase password reset link directly to{' '}
              <strong className="text-gray-900">{admin.email}</strong>. The administrator will be able to set their own new password upon clicking the link.
            </p>

            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Link will redirect the user to Kazi Canvas Gallery login reset portal.</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSendResetEmail}
                disabled={isResettingEmail}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                <Mail className="w-4 h-4" />
                {isResettingEmail ? 'Dispatching...' : 'Dispatch Reset Email'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Modal to permanently remove an administrator account.
 */
function DeleteAdminModal({
  admin,
  onClose,
}: {
  admin: AdminUserItem
  onClose: () => void
}) {
  const [state, formAction, isPending] = useActionState(deleteAdminAccount, null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-rose-600 text-white">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-base text-rose-950">
                Revoke Administrator Access
              </h3>
              <p className="text-[11px] text-rose-700 font-light">
                Permanent Account Removal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form action={formAction} className="p-6 space-y-4 overflow-y-auto">
          <input type="hidden" name="target_admin_id" value={admin.id} />

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

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <p className="font-bold">
              Are you sure you want to permanently revoke administrative access for:
            </p>
            <p className="font-mono text-xs bg-white/80 p-2 rounded-lg border border-rose-200">
              {admin.email} {admin.full_name ? `(${admin.full_name})` : ''}
            </p>
            <p className="font-light text-[11px] leading-relaxed">
              This action immediately invalidates their session, revokes all dashboard access, and purges their administrative privileges.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="super_del_pwd"
              className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              Super Admin Password Confirmation *
            </label>
            <input
              id="super_del_pwd"
              name="super_admin_password"
              type="password"
              required
              placeholder="Enter your Super Admin password"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              {isPending ? 'Removing...' : 'Permanently Remove Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
