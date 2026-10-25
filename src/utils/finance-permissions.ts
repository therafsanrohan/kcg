import { requireAdmin, AdminUserRecord } from '@/utils/supabase/admin-auth'
import { PermissionCode, ALL_PERMISSIONS } from '@/types/finance'

export interface UserPermissionProfile {
  admin: AdminUserRecord
  isSuperAdmin: boolean
  isFinanceOnly: boolean
  permissions: Set<string>
}

/**
 * Server-side evaluation of administrator permissions.
 * Super Admin accounts have full permissions across every domain.
 * Non-superadmin accounts have only explicitly granted permissions from public.admin_user_permissions.
 */
export async function getAdminPermissionProfile(): Promise<UserPermissionProfile> {
  const { supabase, user, adminRecord } = await requireAdmin()

  const isSuperAdmin = adminRecord.role === 'superadmin'

  // If superadmin, grant all permission codes unconditionally
  if (isSuperAdmin) {
    const allSet = new Set<string>(ALL_PERMISSIONS.map((p) => p.code))
    return {
      admin: adminRecord,
      isSuperAdmin: true,
      isFinanceOnly: false,
      permissions: allSet,
    }
  }

  // Fetch granular permission row from database
  try {
    const { data: permRow } = await supabase
      .from('admin_user_permissions')
      .select('permissions, is_finance_only')
      .eq('admin_id', user.id)
      .maybeSingle()

    const grantedList: string[] = Array.isArray(permRow?.permissions) ? permRow.permissions : []
    const isFinanceOnly = Boolean(permRow?.is_finance_only)

    return {
      admin: adminRecord,
      isSuperAdmin: false,
      isFinanceOnly,
      permissions: new Set<string>(grantedList),
    }
  } catch (err) {
    console.warn('Could not read admin_user_permissions table:', err)
    // Default safe fallback: no permissions
    return {
      admin: adminRecord,
      isSuperAdmin: false,
      isFinanceOnly: false,
      permissions: new Set<string>(),
    }
  }
}

/**
 * Server action / route barrier: throws an error if user does not have the specified permission.
 */
export async function requirePermission(permission: PermissionCode) {
  const profile = await getAdminPermissionProfile()
  if (profile.isSuperAdmin) return profile

  if (!profile.permissions.has(permission)) {
    throw new Error(`Forbidden: You do not have permission for '${permission}'. Contact your Super Admin.`)
  }

  return profile
}
