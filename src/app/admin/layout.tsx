import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logout } from './login/actions'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full px-3 py-4 flex flex-col">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-semibold text-gray-900">Gallery Admin</h2>
          </div>
          <ul className="space-y-2 font-medium flex-1">
            <li>
              <Link
                href="/admin"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <span className="ml-3">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/paintings"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <span className="ml-3">Paintings</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <span className="ml-3">Settings</span>
              </Link>
            </li>
          </ul>
          <div className="pt-4 mt-4 border-t border-gray-200">
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <span className="ml-3">Log Out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
