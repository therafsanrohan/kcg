'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Palette,
  FileText,
  MessageSquare,
  Users,
  Settings,
  User,
  Star,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react'
import { logout } from '../login/actions'

interface AdminNavigationProps {
  userEmail: string
  onHoverChange?: (hovered: boolean) => void
}

export default function AdminNavigation({ userEmail, onHoverChange }: AdminNavigationProps) {
  const pathname = usePathname()
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMouseEnter = () => {
    setIsSidebarHovered(true)
    onHoverChange?.(true)
  }

  const handleMouseLeave = () => {
    setIsSidebarHovered(false)
    onHoverChange?.(false)
  }

  const navItems = [
    {
      name: 'Artworks',
      href: '/admin/paintings',
      icon: Palette,
      active: pathname.startsWith('/admin/paintings') || pathname === '/admin',
    },
    {
      name: 'Invoices',
      href: '/admin/invoices',
      icon: FileText,
      active: pathname.startsWith('/admin/invoices'),
    },
    {
      name: 'Messages',
      href: '/admin/conversations',
      icon: MessageSquare,
      active: pathname.startsWith('/admin/conversations'),
    },
    {
      name: 'Clients',
      href: '/admin/clients',
      icon: Users,
      active: pathname.startsWith('/admin/clients'),
    },
    {
      name: 'Reviews',
      href: '/admin/reviews',
      icon: Star,
      active: pathname.startsWith('/admin/reviews'),
    },
    {
      name: 'Delivery & Settings',
      href: '/admin/settings',
      icon: Settings,
      active: pathname.startsWith('/admin/settings'),
    },
    {
      name: 'Admin Profile',
      href: '/admin/profile',
      icon: User,
      active: pathname.startsWith('/admin/profile'),
    },
  ]

  const activeItem = navItems.find((i) => i.active) || navItems[0]

  return (
    <>
      {/* ── 1. DESKTOP HOVER-EXPANDING COLLAPSIBLE SIDEBAR (Hidden on mobile & tablet: hidden lg:flex) ── */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-gray-200/80 shadow-lg transition-all duration-300 ease-in-out hidden lg:flex flex-col justify-between ${
          isSidebarHovered ? 'w-64' : 'w-20'
        }`}
      >
        {/* Top: Brand Logo / Mark */}
        <div>
          <div className="h-20 flex items-center px-5 border-b border-gray-100 overflow-hidden">
            <Link href="/admin/paintings" className="flex items-center gap-3.5 group min-w-0">
              <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-base flex-shrink-0 group-hover:scale-105 transition-transform">
                K
              </div>
              <div
                className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                  isSidebarHovered ? 'opacity-100' : 'opacity-0 w-0'
                }`}
              >
                <h1 className="font-sans text-sm font-bold text-gray-950 tracking-tight leading-none">
                  Kazi Canvas
                </h1>
                <p className="text-[10px] text-gray-400 font-light mt-1 uppercase tracking-wider">
                  Admin Studio
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                    item.active
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100/80'
                  }`}
                  title={!isSidebarHovered ? item.name : undefined}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 transition-transform ${
                      item.active ? 'text-white' : 'text-gray-500 group-hover:text-black'
                    }`}
                  />
                  <span
                    className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                      isSidebarHovered ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom: Public Gallery Link, User Info & Sign Out */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {/* View Website Link */}
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
            title={!isSidebarHovered ? 'View Live Gallery' : undefined}
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isSidebarHovered ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
              }`}
            >
              Live Website
            </span>
          </Link>

          {/* User Profile Card - Clickable link to Profile */}
          <Link
            href="/admin/profile"
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 transition-all ${
              isSidebarHovered ? 'opacity-100' : 'opacity-0 w-0 p-0 overflow-hidden'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700 flex-shrink-0 uppercase">
              {userEmail[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-800 truncate" title={userEmail}>
                {userEmail}
              </p>
              <p className="text-[9px] text-gray-400">View Profile</p>
            </div>
          </Link>

          {/* Sign Out Button */}
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title={!isSidebarHovered ? 'Sign Out' : undefined}
            >
              <LogOut className="h-4 w-4 flex-shrink-0 text-rose-500" />
              <span
                className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                  isSidebarHovered ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'
                }`}
              >
                Sign out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* ── 2. MOBILE & TABLET TOP HEADER BAR (Visible below lg: block lg:hidden) ── */}
      <header className="lg:hidden bg-white border-b border-gray-200/80 sticky top-0 z-40">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/admin/paintings" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-sm">
              K
            </div>
            <div>
              <h1 className="font-sans text-sm font-bold text-gray-950 tracking-tight">
                Kazi Canvas
              </h1>
              <p className="text-[9px] text-gray-400 font-light">Admin Studio</p>
            </div>
          </Link>

          {/* Dropdown Menu Toggle Button for Mobile and Tablet */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-800 hover:border-black transition-all cursor-pointer"
              aria-expanded={mobileMenuOpen}
            >
              <span>{activeItem.name}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
                  mobileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Dropdown Menu Container */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 shadow-xl space-y-1 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    item.active
                      ? 'bg-black text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs px-2">
              <span className="text-gray-400 truncate max-w-[180px]">{userEmail}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-rose-600 font-medium hover:underline cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
