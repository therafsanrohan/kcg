import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { logout } from '../login/actions'
import Link from 'next/link'
import { LogOut, Settings } from 'lucide-react'

import { AdminFeedbackProvider } from '@/components/admin/AdminFeedbackProvider'

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
          
          {/* Left: Brand / Title */}
          <div className="flex items-center gap-4">
            <div>
              <Link href="/admin/paintings" className="hover:opacity-85 transition-opacity">
                <h1 className="font-sans text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Kazi Canvas Gallery
                </h1>
              </Link>
              <p className="text-xs text-gray-500 font-light">Artwork manager</p>
            </div>
          </div>

          {/* Center: Admin Navigation Links (Desktop) */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/admin/paintings"
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Artworks
            </Link>
            <Link
              href="/admin/invoices"
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Invoices
            </Link>
            <Link
              href="/admin/conversations"
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Messages
            </Link>
            <Link
              href="/admin/clients"
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Clients
            </Link>
            <Link
              href="/admin/settings"
              className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
            >
              Delivery & Settings
            </Link>
          </nav>

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

        {/* Mobile Navigation Bar (visible only below sm) */}
        <div className="sm:hidden flex items-center justify-around border-t border-gray-100 py-2.5 px-4 bg-white/80 backdrop-blur-xs">
          <Link
            href="/admin/paintings"
            className="text-xs font-semibold text-gray-700 hover:text-black"
          >
            Artworks
          </Link>
          <span className="text-gray-300">&bull;</span>
          <Link
            href="/admin/invoices"
            className="text-xs font-semibold text-gray-700 hover:text-black"
          >
            Invoices
          </Link>
          <span className="text-gray-300">&bull;</span>
          <Link
            href="/admin/conversations"
            className="text-xs font-semibold text-gray-700 hover:text-black"
          >
            Messages
          </Link>
          <span className="text-gray-300">&bull;</span>
          <Link
            href="/admin/settings"
            className="text-xs font-semibold text-gray-700 hover:text-black"
          >
            Settings
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <AdminFeedbackProvider>
          {children}
        </AdminFeedbackProvider>
      </main>
    </div>
  )
}
