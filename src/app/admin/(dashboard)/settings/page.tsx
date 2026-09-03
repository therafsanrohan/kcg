import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SettingsForm from '@/components/admin/SettingsForm'
import Link from 'next/link'

export const revalidate = 0

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: settings } = await supabase.from('site_settings').select('*').single()

  return (
    <div>
      {/* Page header */}
      <div className="pb-8 mb-8 border-b border-gray-200/70">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          CONFIGURATION
        </span>
        <h2 className="font-serif text-4xl sm:text-5xl font-normal text-gray-950 mt-1 leading-tight">
          Site settings
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
          Manage your gallery&rsquo;s business name, WhatsApp number and contact info.
        </p>
      </div>

      {/* Navigation back to paintings */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-black transition-colors font-medium flex items-center gap-1.5"
        >
          ← Back to Manage Artworks
        </Link>
      </div>

      <SettingsForm settings={settings} />
    </div>
  )
}
