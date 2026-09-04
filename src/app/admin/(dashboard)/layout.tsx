import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logout } from '../login/actions'
import Link from 'next/link'
import { ArrowLeft, LogOut, Settings } from 'lucide-react'

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
    // If not authorized as admin, redirect to login
    redirect('/admin/login')
  }

  const userEmail = adminRecord?.email || user.email || 'Administrator'

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-gray-900 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="h-11 w-11 rounded-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all shadow-sm"
              title="Back to Gallery Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-sans text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Kazi Canvas Gallery
              </h1>
              <p className="text-xs text-gray-500 font-light">Artwork manager</p>
            </div>
          </div>

          {/* Right: User Email, Settings & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline text-xs sm:text-sm text-gray-500 font-light">
              {userEmail}
            </span>
            <Link
              href="/admin/settings"
              className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all shadow-sm"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="h-10 px-4 rounded-lg border border-gray-200 flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-black hover:border-gray-400 hover:bg-gray-50 transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {children}
      </main>
    </div>
  )
}
