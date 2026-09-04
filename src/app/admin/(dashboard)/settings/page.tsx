import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import SettingsForm from '@/components/admin/SettingsForm'
import DeliverySettingsForm from '@/components/admin/DeliverySettingsForm'
import Link from 'next/link'

export const revalidate = 0

export default async function AdminSettingsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: settings } = await supabase.from('site_settings').select('*').single()
  const { data: deliveryZones } = await supabase.from('delivery_zones').select('*').order('sort_order', { ascending: true })

  return (
    <div className="space-y-12">
      {/* Page header */}
      <div className="pb-8 border-b border-gray-200/70">
        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          CONFIGURATION
        </span>
        <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
          Site & Delivery Settings
        </h2>
        <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
          Manage your gallery&rsquo;s business details, WhatsApp ordering number, and delivery zones.
        </p>
      </div>

      {/* Navigation back to paintings */}
      <div>
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-black transition-colors font-medium flex items-center gap-1.5"
        >
          ← Back to Manage Artworks
        </Link>
      </div>

      {/* General Settings Section */}
      <SettingsForm settings={settings} />

      {/* Delivery Zones Section */}
      <section className="pt-8 border-t border-gray-200">
        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            SHIPPING & DELIVERY ZONES
          </span>
          <h3 className="font-sans text-2xl font-bold text-gray-950 mt-1">
            Delivery Charge Management
          </h3>
          <p className="text-sm text-gray-500 font-light mt-1">
            Configure delivery fees, pricing modes (Free, Fixed, Courier / Destination Quotation), and delivery timelines.
          </p>
        </div>

        <DeliverySettingsForm zones={deliveryZones || []} />
      </section>
    </div>
  )
}
