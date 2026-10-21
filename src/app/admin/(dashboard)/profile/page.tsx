import { requireAdmin } from '@/utils/supabase/admin-auth'
import AdminProfileForm from './AdminProfileForm'
import AdminDirectoryManager from './AdminDirectoryManager'
import CreateAdminAccountModal from './CreateAdminAccountModal'

export const revalidate = 0

export default async function AdminProfilePage() {
  const { supabase, user, adminRecord } = await requireAdmin()

  const isSuperAdmin = adminRecord.role === 'superadmin'

  // If Super Admin, fetch complete list of administrators for Directory & Management
  let adminList: any[] = []
  if (isSuperAdmin) {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('*')
      .order('email', { ascending: true })

    adminList = admins && admins.length > 0 ? admins : [
      {
        id: user.id,
        email: user.email,
        role: adminRecord.role,
        full_name: adminRecord.full_name,
        username: adminRecord.username,
        phone: adminRecord.phone,
      },
    ]
  }

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="pb-8 border-b border-gray-200/70 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            ACCOUNT MANAGEMENT
          </span>
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
            Admin Profile
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
            Manage your administrator profile details and personal account settings.
          </p>
        </div>

        {isSuperAdmin && <CreateAdminAccountModal />}
      </div>

      {/* Admin's Own Profile Form */}
      <section>
        <AdminProfileForm admin={adminRecord} />
      </section>

      {/* Super Admin Privilege: Administrator Directory & Management Hub */}
      {isSuperAdmin && (
        <section className="pt-8 border-t border-gray-200/80">
          <AdminDirectoryManager
            admins={adminList}
            currentUserId={user.id}
          />
        </section>
      )}
    </div>
  )
}
