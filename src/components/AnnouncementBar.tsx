'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { AnnouncementBarSettings } from '@/types/contact'

interface AnnouncementBarProps {
  settings: AnnouncementBarSettings
}

export default function AnnouncementBar({ settings }: AnnouncementBarProps) {
  const pathname = usePathname()
  const router = useRouter()
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

    let hasTriggeredExpiry = false

    const calculateTimeLeft = () => {
      const targetTime = new Date(settings.timer_end_date).getTime()
      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        if (!hasTriggeredExpiry) {
          hasTriggeredExpiry = true
          // Seamlessly refresh page content so prices instantly revert to regular without manual reload
          router.refresh()
        }
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
  }, [settings.timer_enabled, settings.timer_end_date, router])

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/invoice')) {
    return null
  }

  if (!settings.enabled) {
    return null
  }

  // If timer is enabled and target date is reached/expired, automatically disappear
  if (settings.timer_enabled && timeLeft?.isExpired) {
    return null
  }

  const isTimerActive = settings.timer_enabled && timeLeft && !timeLeft.isExpired

  return (
    <aside
      aria-label="Announcement"
      className="bg-[#18181B] text-white border-b border-gray-800 relative z-50 text-xs shadow-2xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Main Announcement Message Container (Left-aligned on tablet and desktop) */}
          <div className="flex-1 flex items-center justify-center sm:justify-start gap-2 flex-wrap text-center sm:text-left min-w-0">
            {settings.highlight_badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#DC2626] text-white font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-2xs flex-shrink-0">
                {settings.highlight_badge}
              </span>
            )}
            <span className="text-gray-200 font-light tracking-wide text-xs">
              {settings.text}
            </span>
          </div>

          {/* Dedicated Right Timer Container (Fixed width & tabular numbers to prevent text shifting/jitter) */}
          {isTimerActive && timeLeft && (
            <div className="flex-shrink-0 flex items-center justify-center sm:justify-end">
              <div
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-white font-mono text-[11px] tabular-nums select-none whitespace-nowrap min-w-[155px] sm:min-w-[170px]"
                aria-label="Countdown timer"
              >
                <Clock className="h-3 w-3 text-red-400 flex-shrink-0" />
                <span className="font-semibold tracking-wider font-mono timer-digits">
                  {timeLeft.days > 0 && <span>{timeLeft.days}d </span>}
                  <span className="inline-block w-[2.2ch] text-center font-mono">{String(timeLeft.hours).padStart(2, '0')}h</span>
                  <span className="mx-0.5 text-gray-400">:</span>
                  <span className="inline-block w-[2.2ch] text-center font-mono">{String(timeLeft.minutes).padStart(2, '0')}m</span>
                  <span className="mx-0.5 text-gray-400">:</span>
                  <span className="inline-block w-[2.2ch] text-center font-mono">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
    </aside>
  )
}
