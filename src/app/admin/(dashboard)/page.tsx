import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch totals in parallel
  const [
    { count: totalPaintings },
    { count: availablePaintings },
    { count: soldPaintings }
  ] = await Promise.all([
    supabase.from('paintings').select('*', { count: 'exact', head: true }),
    supabase.from('paintings').select('*', { count: 'exact', head: true }).eq('availability_status', 'available'),
    supabase.from('paintings').select('*', { count: 'exact', head: true }).eq('availability_status', 'sold')
  ])

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Paintings</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{totalPaintings || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Available</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">{availablePaintings || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Sold</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{soldPaintings || 0}</p>
        </div>
      </div>
    </div>
  )
}
