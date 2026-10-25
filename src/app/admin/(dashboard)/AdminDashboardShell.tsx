'use client'

import { useState } from 'react'
import AdminNavigation from './AdminNavigation'
import { AdminFeedbackProvider } from '@/components/admin/AdminFeedbackProvider'

interface AdminDashboardShellProps {
  userEmail: string
  isFinanceOnly?: boolean
  children: React.ReactNode
}

export default function AdminDashboardShell({
  userEmail,
  isFinanceOnly = false,
  children,
}: AdminDashboardShellProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-gray-900 flex flex-col font-sans">
      {/* Responsive Admin Navigation: Desktop hover sidebar + Mobile/Tablet dropdown */}
      <AdminNavigation
        userEmail={userEmail}
        isFinanceOnly={isFinanceOnly}
        onHoverChange={setIsSidebarExpanded}
      />

      {/* Main Content Area (Dynamically shifts right: lg:pl-20 collapsed, lg:pl-64 when hovered) */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <AdminFeedbackProvider>{children}</AdminFeedbackProvider>
        </main>
      </div>
    </div>
  )
}
