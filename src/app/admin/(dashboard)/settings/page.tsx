import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .single()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Site Settings
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Manage your gallery's global settings, contact information, and business details here.
          </p>
        </div>
      </div>
      
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border border-gray-100">
        <SettingsForm settings={settings} />
      </div>
    </div>
  )
}
