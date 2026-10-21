import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export interface AdminUserRecord {
  id: string
  email: string
  role: 'superadmin' | 'admin'
  username?: string | null
  full_name?: string | null
  phone?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
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

  // Attempt query with extended profile columns, fallback to base columns if columns not yet added
  let adminRecord: any = null
  let adminErr: any = null

  const res = await supabase
    .from('admin_users')
    .select('id, email, role, username, full_name, phone, avatar_url, updated_at, created_at')
    .eq('id', user.id)
    .single()

  if (res.error) {
    const fallbackRes = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    adminRecord = fallbackRes.data
    adminErr = fallbackRes.error
  } else {
    adminRecord = res.data
  }

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

    const fallbackRecord: AdminUserRecord = {
      id: user.id,
      email: user.email || '',
      role: 'superadmin',
      username: null,
      full_name: null,
      phone: null,
      avatar_url: null,
    }

    currentAdminRecord = (upserted as AdminUserRecord) || fallbackRecord
  } else if (!isOwner && (adminErr || !adminRecord)) {
    throw new Error('Forbidden: Your account does not have administrator privileges.')
  }

  const finalRecord: AdminUserRecord = currentAdminRecord || {
    id: user.id,
    email: user.email || '',
    role: 'superadmin',
    username: null,
    full_name: null,
    phone: null,
    avatar_url: null,
  }

  return {
    supabase,
    user,
    adminRecord: finalRecord,
  }
}
