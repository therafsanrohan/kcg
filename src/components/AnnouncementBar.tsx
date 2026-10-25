'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Clock } from 'lucide-react'
import { AnnouncementBarSettings } from '@/types/contact'

interface AnnouncementBarProps {
  settings: AnnouncementBarSettings
}

export default function AnnouncementBar({ settings }: AnnouncementBarProps) {
  const pathname = usePathname()
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  } | null>(null)

  useEffect(() => {
    if (!settings.timer_enabled || !settings.timer_end_date) {
      return
    }

    const calculateTimeLeft = () => {
      const targetTime = new Date(settings.timer_end_date).getTime()
      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [settings.timer_enabled, settings.timer_end_date])

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')) {
    return null
  }

  if (!settings.enabled) {
    return null
  }

  const isTimerActive = settings.timer_enabled && timeLeft && !timeLeft.isExpired

  return (
    <aside
      aria-label="Announcement"
      className="bg-[#18181B] text-white border-b border-gray-800 relative z-50 text-xs shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
        
        {/* Badge & Text */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {settings.highlight_badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#DC2626] text-white font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-2xs">
              {settings.highlight_badge}
            </span>
          )}
          <span className="text-gray-200 font-light tracking-wide text-xs">
            {settings.text}
          </span>
        </div>

        {/* Live Timer (if enabled and not expired) */}
        {isTimerActive && timeLeft && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px]">
            <Clock className="h-3 w-3 text-red-400" />
            <span className="font-semibold">
              {timeLeft.days > 0 && `${timeLeft.days}d `}
              {String(timeLeft.hours).padStart(2, '0')}h : {String(timeLeft.minutes).padStart(2, '0')}m : {String(timeLeft.seconds).padStart(2, '0')}s
            </span>
          </div>
        )}

        {/* CTA Link */}
        {settings.link_label && (
          <Link
            href={settings.link_url || '/#available-works?category=offers'}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-200 hover:text-white transition-colors underline underline-offset-4 ml-1"
          >
            <span>{settings.link_label}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}

      </div>
    </aside>
  )
}
