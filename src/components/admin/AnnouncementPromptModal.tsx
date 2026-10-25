'use client'

import React, { useState } from 'react'
import { Sparkles, Clock, X, Check, Loader2, Tag } from 'lucide-react'
import { updateAnnouncementBarAction } from '@/app/admin/(dashboard)/settings/actions'

interface AnnouncementPromptModalProps {
  isOpen: boolean
  onClose: () => void
  offerCount?: number
  defaultBadge?: string
  onSuccess?: () => void
}

export default function AnnouncementPromptModal({
  isOpen,
  onClose,
  offerCount = 1,
  defaultBadge = 'Special Offer',
  onSuccess,
}: AnnouncementPromptModalProps) {
  const [enabled, setEnabled] = useState(true)
  const [text, setText] = useState(
    `Special Offer Going On! Save on exclusive original canvas pieces for a limited time.`
  )
  const [badge, setBadge] = useState(defaultBadge || 'Special Offer')
  const [timerEnabled, setTimerEnabled] = useState(true)
  
  // Default end date: 5 days from now
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 16)
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await updateAnnouncementBarAction({
        enabled,
        text,
        highlight_badge: badge,
        timer_enabled: timerEnabled,
        timer_end_date: timerEnabled ? endDate : '',
      })

      if (res.success) {
        onSuccess?.()
        onClose()
      } else {
        setErrorMsg(res.error || 'Failed to update announcement bar.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50/50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold text-gray-900 leading-tight">
                Activate Top Announcement Bar?
              </h3>
              <p className="text-xs text-gray-500 font-light mt-0.5">
                Offer applied to {offerCount} artwork{offerCount !== 1 ? 's' : ''}. Display a header announcement + countdown on the website.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Master Enable Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
            <div>
              <span className="text-xs font-bold text-gray-900 block">
                Top Announcement Bar
              </span>
              <span className="text-[11px] text-gray-500 block">
                Visible at the very top of all customer pages
              </span>
            </div>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
              />
              <span className={`text-xs font-bold uppercase tracking-wider ${enabled ? 'text-red-700' : 'text-gray-400'}`}>
                {enabled ? 'Active' : 'Disabled'}
              </span>
            </label>
          </div>

          {enabled && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              {/* Badge & Text */}
              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1">
                  Badge Title
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Special Offer / Flash Sale"
                    className="w-full rounded-xl border border-gray-300 pl-9 pr-3.5 py-2 text-xs text-gray-900 focus:border-black outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1">
                  Announcement Text
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Special Offer Going On! Save on exclusive original canvas pieces."
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-gray-900 focus:border-black outline-none font-medium"
                  required
                />
              </div>

              {/* Countdown Timer */}
              <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-bold text-gray-900">
                      Live Countdown Timer
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={timerEnabled}
                      onChange={(e) => setTimerEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
                    />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${timerEnabled ? 'text-red-700' : 'text-gray-400'}`}>
                      {timerEnabled ? 'Timer On' : 'Timer Off'}
                    </span>
                  </label>
                </div>

                {timerEnabled && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-600 mb-1">
                      Offer End Date & Time (Target)
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-red-600 outline-none"
                      required={timerEnabled}
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      When this time arrives, the banner hides and all offer pieces return to regular price automatically.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-black hover:bg-gray-100 transition-all cursor-pointer"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-xs uppercase tracking-wider font-semibold hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Activating…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Update & Activate Bar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
