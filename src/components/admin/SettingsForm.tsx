'use client'

import { useState, useTransition } from 'react'
import { updateSettings } from '@/app/admin/(dashboard)/settings/actions'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Phone, Mail, MapPin, Clock, Eye, Sparkles, Tag, Timer } from 'lucide-react'
import WhatsAppIcon from '@/components/ui/WhatsAppIcon'
import { FacebookIcon, InstagramIcon } from '@/components/ui/SocialIcons'
import { parseContactSettings, parseAnnouncementSettings } from '@/types/contact'

export default function SettingsForm({ settings }: { settings?: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ message: string; type: string } | null>(null)

  const parsed = parseContactSettings(settings)
  const announcementParsed = parseAnnouncementSettings(settings)

  // Local state for active toggle states
  const [phoneEnabled, setPhoneEnabled] = useState(parsed.phone_enabled)
  const [whatsappEnabled, setWhatsappEnabled] = useState(parsed.whatsapp_enabled)
  const [emailEnabled, setEmailEnabled] = useState(parsed.email_enabled)
  const [addressEnabled, setAddressEnabled] = useState(parsed.address_enabled)
  const [facebookEnabled, setFacebookEnabled] = useState(parsed.facebook_enabled)
  const [instagramEnabled, setInstagramEnabled] = useState(parsed.instagram_enabled)
  const [hoursEnabled, setHoursEnabled] = useState(parsed.business_hours_enabled)

  // Announcement Bar State
  const [announcementEnabled, setAnnouncementEnabled] = useState(announcementParsed.enabled)
  const [announcementTimerEnabled, setAnnouncementTimerEnabled] = useState(announcementParsed.timer_enabled)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setResult(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await updateSettings(null, formData)
      setResult(res)
      if (res.type === 'success') {
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* ── Section 1: Gallery & Business Identity ── */}
      <section>
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            BUSINESS IDENTITY
          </span>
          <h3 className="font-sans text-2xl font-bold text-gray-950 mt-1">
            Gallery Details
          </h3>
          <p className="text-sm text-gray-500 font-light mt-1">
            Basic information about your gallery — shown in the website header, metadata, and invoices.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-xs">
          <div>
            <label htmlFor="business_name" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              Gallery / Business Name
            </label>
            <input
              type="text"
              name="business_name"
              id="business_name"
              defaultValue={settings?.business_name ?? 'Kazi Canvas Gallery'}
              className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              placeholder="Kazi Canvas Gallery"
              required
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Contact Information & Channels Management ── */}
      <section>
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              OFFICIAL CHANNELS
            </span>
            <h3 className="font-sans text-2xl font-bold text-gray-950 mt-1">
              Contact Information Management
            </h3>
            <p className="text-sm text-gray-500 font-light mt-1">
              Configure communication channels shown on the public Contact section. Enable or disable individual methods anytime.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            <span>Public changes update instantly without redeployment</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
          
          {/* 1. WhatsApp Number */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center">
                  <WhatsAppIcon className="h-4 w-4 fill-[#128C7E]" />
                </div>
                <div>
                  <label htmlFor="whatsapp_number" className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    Official WhatsApp Number
                  </label>
                  <p className="text-[11px] text-gray-400 font-light">
                    Used for primary artwork inquiry and order consultation buttons
                  </p>
                </div>
              </div>

              {/* Enable / Disable Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="whatsapp_enabled"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className={`text-xs font-semibold uppercase tracking-wider ${whatsappEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {whatsappEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 sm:max-w-md pt-1">
              <span className="h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center flex-shrink-0 font-mono">
                +
              </span>
              <input
                type="text"
                name="whatsapp_number"
                id="whatsapp_number"
                defaultValue={parsed.whatsapp}
                placeholder="8801824951514"
                className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* 2. Direct Phone Call */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-100 text-gray-800 flex items-center justify-center">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    Direct Phone Number
                  </label>
                  <p className="text-[11px] text-gray-400 font-light">
                    Displays with direct click-to-call link for customers
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="phone_enabled"
                  checked={phoneEnabled}
                  onChange={(e) => setPhoneEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className={`text-xs font-semibold uppercase tracking-wider ${phoneEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {phoneEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="sm:max-w-md pt-1">
              <input
                type="text"
                name="phone"
                id="phone"
                defaultValue={parsed.phone}
                placeholder="+880 1824 951 514"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* 3. Official Email Address */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-100 text-gray-800 flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    Official Email Address
                  </label>
                  <p className="text-[11px] text-gray-400 font-light">
                    Displays with direct mailto link for collectors and corporate inquiries
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="email_enabled"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className={`text-xs font-semibold uppercase tracking-wider ${emailEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {emailEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="sm:max-w-md pt-1">
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={parsed.email}
                placeholder="contact@kazicanvasgallery.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              />
            </div>
          </div>

          {/* 4. Physical Business Address */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-100 text-gray-800 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <label htmlFor="address" className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    Studio / Business Address
                  </label>
                  <p className="text-[11px] text-gray-400 font-light">
                    Physical location or studio city shown to visitors
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="address_enabled"
                  checked={addressEnabled}
                  onChange={(e) => setAddressEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className={`text-xs font-semibold uppercase tracking-wider ${addressEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {addressEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="sm:max-w-md pt-1">
              <textarea
                name="address"
                id="address"
                rows={2}
                defaultValue={parsed.address}
                placeholder="Dhaka, Bangladesh"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* 5. Business Operating Hours */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-100 text-gray-800 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <label htmlFor="business_hours" className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                    Business Hours
                  </label>
                  <p className="text-[11px] text-gray-400 font-light">
                    Optional studio schedule (e.g. Saturday – Thursday: 10:00 AM – 8:00 PM)
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="business_hours_enabled"
                  checked={hoursEnabled}
                  onChange={(e) => setHoursEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span className={`text-xs font-semibold uppercase tracking-wider ${hoursEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                  {hoursEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            <div className="sm:max-w-md pt-1">
              <input
                type="text"
                name="business_hours"
                id="business_hours"
                defaultValue={parsed.business_hours}
                placeholder="Saturday – Thursday: 10:00 AM – 8:00 PM"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              />
            </div>
          </div>

          {/* 6. Social Links: Facebook & Instagram */}
          <div className="p-6 space-y-5">
            <div className="mb-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                Official Social Media Profiles
              </span>
              <p className="text-[11px] text-gray-400 font-light">
                Direct external links to your gallery pages
              </p>
            </div>

            {/* Facebook */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FacebookIcon className="h-4 w-4 text-blue-600" />
                  <label htmlFor="facebook_url" className="text-xs font-medium text-gray-700">
                    Facebook Page URL
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="facebook_enabled"
                    checked={facebookEnabled}
                    onChange={(e) => setFacebookEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${facebookEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                    {facebookEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <input
                type="url"
                name="facebook_url"
                id="facebook_url"
                defaultValue={parsed.facebook_url}
                placeholder="https://www.facebook.com/kazicanvasgallery"
                className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all font-mono text-xs"
              />
            </div>

            {/* Instagram */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <InstagramIcon className="h-4 w-4 text-pink-600" />
                  <label htmlFor="instagram_url" className="text-xs font-medium text-gray-700">
                    Instagram Profile URL
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="instagram_enabled"
                    checked={instagramEnabled}
                    onChange={(e) => setInstagramEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${instagramEnabled ? 'text-green-700' : 'text-gray-400'}`}>
                    {instagramEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <input
                type="url"
                name="instagram_url"
                id="instagram_url"
                defaultValue={parsed.instagram_url}
                placeholder="https://www.instagram.com/kazicanvasgallery"
                className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all font-mono text-xs"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── Section 3: Header Announcement & Special Offer Bar ── */}
      <section>
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 font-mono">
              PROMOTIONS & NOTICES
            </span>
            <h3 className="font-sans text-2xl font-bold text-gray-950 mt-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-red-600" />
              <span>Top Announcement & Special Offer Bar</span>
            </h3>
            <p className="text-sm text-gray-500 font-light mt-1">
              Display an eye-catching banner above the navigation bar with an optional countdown timer, custom offer title, and direct link.
            </p>
          </div>

          {/* Master Enable/Disable Switch */}
          <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-200 bg-white cursor-pointer hover:border-gray-300 transition-colors shadow-2xs self-start sm:self-auto">
            <input
              type="checkbox"
              name="announcement_enabled"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
            />
            <span className={`text-xs font-bold uppercase tracking-wider ${announcementEnabled ? 'text-red-700' : 'text-gray-400'}`}>
              {announcementEnabled ? 'Banner Active' : 'Banner Inactive'}
            </span>
          </label>
        </div>

        <div className={`bg-white rounded-2xl border transition-all duration-300 p-6 space-y-6 shadow-xs ${
          announcementEnabled ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200 opacity-70'
        }`}>
          
          {/* Announcement Message */}
          <div>
            <label htmlFor="announcement_text" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              Announcement / Offer Text
            </label>
            <input
              type="text"
              name="announcement_text"
              id="announcement_text"
              defaultValue={announcementParsed.text}
              placeholder="e.g. Special Offer Going On! Save up to 20% on selected original canvas artworks."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Clear message that appears prominently at the very top of all customer pages.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
            {/* Highlight Tag/Badge */}
            <div>
              <label htmlFor="announcement_badge" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                Badge Label
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  name="announcement_badge"
                  id="announcement_badge"
                  defaultValue={announcementParsed.highlight_badge}
                  placeholder="Special Offer / Eid Special / Flash Sale"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Action Button Label */}
            <div>
              <label htmlFor="announcement_link_label" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
                Button / Link Label
              </label>
              <input
                type="text"
                name="announcement_link_label"
                id="announcement_link_label"
                defaultValue={announcementParsed.link_label}
                placeholder="Explore Pieces / Shop Now / View Offers"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Destination URL */}
          <div className="pt-2 border-t border-gray-100">
            <label htmlFor="announcement_link_url" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              Click Destination URL
            </label>
            <input
              type="text"
              name="announcement_link_url"
              id="announcement_link_url"
              defaultValue={announcementParsed.link_url}
              placeholder="/#available-works?category=offers"
              className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 font-mono text-xs placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Default is <code className="text-gray-700 font-mono">/#available-works?category=offers</code> to jump directly to offers.
            </span>
          </div>

          {/* Countdown Timer Settings */}
          <div className="pt-4 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                  Live Countdown Timer
                </span>
              </div>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="announcement_timer_enabled"
                  checked={announcementTimerEnabled}
                  onChange={(e) => setAnnouncementTimerEnabled(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
                />
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${announcementTimerEnabled ? 'text-red-700' : 'text-gray-400'}`}>
                  {announcementTimerEnabled ? 'Timer Enabled' : 'Timer Disabled'}
                </span>
              </label>
            </div>

            {announcementTimerEnabled && (
              <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 space-y-2 animate-in fade-in duration-200">
                <label htmlFor="announcement_timer_end_date" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700">
                  Offer End Date & Time (Countdown Target)
                </label>
                <input
                  type="datetime-local"
                  name="announcement_timer_end_date"
                  id="announcement_timer_end_date"
                  defaultValue={announcementParsed.timer_end_date}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-red-600 focus:ring-2 focus:ring-red-600/10 outline-none"
                />
                <p className="text-[11px] text-gray-500">
                  The banner will show a ticking countdown: <code>[Days]d : [Hours]h : [Mins]m : [Secs]s</code> until this target date and time.
                </p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Result notification */}
      {result && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
            result.type === 'success'
              ? 'bg-[#EBF5EE] border-[#c3e6cb] text-[#2D7A4D]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {result.message}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end border-t border-gray-200/60 pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-8 rounded-xl bg-black text-xs uppercase tracking-widest font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm hover:shadow-md min-w-[160px] flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Saving Changes…</span>
            </>
          ) : (
            <span>Save All Settings</span>
          )}
        </button>
      </div>
    </form>
  )
}
