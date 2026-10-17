import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Users, Plus, Phone, Mail, MapPin, Building, FileText } from 'lucide-react'
import { Client } from '@/types/invoice'
import ClientManagerClient from './ClientManagerClient'

export const revalidate = 0

export default async function ClientsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*, invoices:invoices(count)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clients:', error)
  }

  const clientList: (Client & { invoices?: { count: number }[] })[] = clients || []

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            RELATIONSHIP MANAGEMENT
          </span>
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-gray-950 mt-1 leading-tight">
            Client Directory
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-500 font-light">
            Centralized, secure customer database linked seamlessly to gallery invoices.
          </p>

          <div className="flex items-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-xs">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              {clientList.length} Registered Clients
            </span>
          </div>
        </div>
      </div>

      <ClientManagerClient initialClients={clientList} />
    </div>
  )
}
