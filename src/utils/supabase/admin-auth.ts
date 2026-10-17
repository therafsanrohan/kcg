import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export interface AdminUserRecord {
  id: string
  email: string
  role: 'superadmin' | 'admin'
}

/**
 * Server-side security barrier that verifies the current caller is a fully authenticated
 * Supabase Auth user and is explicitly registered in public.admin_users or is the owner email.
 */
export async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized: Admin authentication required.')
  }

  const isOwner =
    user.email?.toLowerCase() === 'knock.rafsan@gmail.com' ||
    user.email?.toLowerCase() === 'knock.rafsan+admin@gmail.com' ||
    user.email?.toLowerCase().startsWith('knock.rafsan')

  const { data: adminRecord, error: adminErr } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  let currentAdminRecord = adminRecord as AdminUserRecord | null

  if (isOwner && (!adminRecord || adminErr)) {
    // Ensure owner is recorded in public.admin_users so PostgreSQL is_admin() evaluates to true
    const { data: upserted } = await supabase
      .from('admin_users')
      .upsert({
        id: user.id,
        email: user.email,
        role: 'superadmin',
      }, { onConflict: 'id' })
      .select('id, email, role')
      .single()

    currentAdminRecord = upserted as AdminUserRecord || { id: user.id, email: user.email, role: 'superadmin' }
  } else if (!isOwner && (adminErr || !adminRecord)) {
    throw new Error('Forbidden: Your account does not have administrator privileges.')
  }

  return {
    supabase,
    user,
    adminRecord: currentAdminRecord || { id: user.id, email: user.email, role: 'superadmin' },
  }
}
