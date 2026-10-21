import { requireAdmin } from '@/utils/supabase/admin-auth'
import AdminProfileForm from './AdminProfileForm'
import SuperAdminPasswordManager from './SuperAdminPasswordManager'

export const revalidate = 0

export default async function AdminProfilePage() {
  const { supabase, user, adminRecord } = await requireAdmin()

  const isSuperAdmin = adminRecord.role === 'superadmin'

  // If Super Admin, fetch list of admins for password management
  let adminList: any[] = []
  if (isSuperAdmin) {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('*')
      .order('email', { ascending: true })

    adminList = admins || [
      {
        id: user.id,
        email: user.email,
        role: adminRecord.role,
        full_name: adminRecord.full_name,
        username: adminRecord.username,
      },
    ]
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200/70">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          ACCOUNT MANAGEMENT
        </span>
        <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
          Admin Profile
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
          Manage your administrator profile details and account settings.
        </p>
      </div>

      {/* Admin Profile Form */}
      <AdminProfileForm admin={adminRecord} />

      {/* Super Admin Privileged Password Management Section */}
      {isSuperAdmin && (
        <section className="pt-8 border-t border-gray-200">
          <SuperAdminPasswordManager
            admins={adminList}
            currentUserId={user.id}
          />
        </section>
      )}
    </div>
  )
}
