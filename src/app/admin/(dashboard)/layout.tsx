import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AdminDashboardShell from './AdminDashboardShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. Verify Supabase authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/admin/login')
  }

  // 2. Verify admin authorization against public.admin_users or owner email fallback
  const isOwner =
    user.email?.toLowerCase() === 'knock.rafsan@gmail.com' ||
    user.email?.toLowerCase() === 'knock.rafsan+admin@gmail.com' ||
    user.email?.toLowerCase().startsWith('knock.rafsan')

  const { data: adminRecord, error: adminErr } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  if (!isOwner && (adminErr || !adminRecord)) {
    redirect('/admin/login')
  }

  const userEmail = adminRecord?.email || user.email || 'Administrator'

  // 3. Permission profile check
  let isFinanceOnly = false
  try {
    const { getAdminPermissionProfile } = await import('@/utils/finance-permissions')
    const profile = await getAdminPermissionProfile()
    isFinanceOnly = !!profile.isFinanceOnly && !profile.isSuperAdmin
  } catch (err) {
    console.warn('[AdminLayout] Could not load permissions profile:', err)
  }

  return (
    <AdminDashboardShell userEmail={userEmail} isFinanceOnly={isFinanceOnly}>
      {children}
    </AdminDashboardShell>
  )
}
