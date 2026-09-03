'use client'

import { useState, useTransition } from 'react'
import { updateSettings } from '@/app/admin/(dashboard)/settings/actions'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SettingsForm({ settings }: { settings?: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ message: string; type: string } | null>(null)

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

      {/* ── Section: Gallery Info ── */}
      <section>
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            GALLERY SETTINGS
          </span>
          <h3 className="font-serif text-2xl font-normal text-gray-950 mt-1">
            Business Details
          </h3>
          <p className="text-sm text-gray-500 font-light mt-1">
            Basic information about your gallery — shown across the website.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
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
            />
          </div>

          <div>
            <label htmlFor="gallery_address" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              Gallery Address
            </label>
            <textarea
              id="gallery_address"
              name="gallery_address"
              rows={2}
              defaultValue={settings?.gallery_address ?? ''}
              placeholder="Dhaka, Bangladesh"
              className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </section>

      {/* ── Section: Contact & Ordering ── */}
      <section>
        <div className="mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            CONTACT
          </span>
          <h3 className="font-serif text-2xl font-normal text-gray-950 mt-1">
            Contact & Ordering
          </h3>
          <p className="text-sm text-gray-500 font-light mt-1">
            The WhatsApp number is used for artwork ordering on the customer site.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
          <div>
            <label htmlFor="whatsapp_number" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              WhatsApp Number
              <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                Used for &ldquo;Order via WhatsApp&rdquo; button
              </span>
            </label>
            <div className="flex items-center gap-2 sm:max-w-md">
              <span className="h-11 px-3.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 flex items-center flex-shrink-0 font-mono">
                +
              </span>
              <input
                type="text"
                name="whatsapp_number"
                id="whatsapp_number"
                defaultValue={settings?.whatsapp_number ?? '8801824951514'}
                placeholder="8801XXXXXXXXX"
                className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all font-mono"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400 font-light">
              Enter number without &lsquo;+&rsquo; — e.g. 8801824951514 for Bangladesh
            </p>
          </div>

          <div>
            <label htmlFor="contact_info" className="block text-[11px] font-bold tracking-widest uppercase text-gray-700 mb-1.5">
              Contact Email / Extra Info
            </label>
            <input
              type="text"
              name="contact_info"
              id="contact_info"
              defaultValue={settings?.contact_info ?? ''}
              placeholder="email@example.com"
              className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
            />
          </div>
        </div>
      </section>

      {/* Result message */}
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
          className="h-11 px-7 rounded-xl bg-black text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm hover:shadow-md min-w-[140px] flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving…
            </>
          ) : (
            'Save settings'
          )}
        </button>
      </div>
    </form>
  )
}
