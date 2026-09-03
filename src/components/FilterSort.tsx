'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function FilterSort({ defaultType = 'all', defaultSort = 'newest' }: { defaultType?: string, defaultSort?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value !== 'all') {
      params.set('type', e.target.value)
    } else {
      params.delete('type')
    }
    router.push(`/gallery?${params.toString()}`)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value !== 'newest') {
      params.set('sort', e.target.value)
    } else {
      params.delete('sort')
    }
    router.push(`/gallery?${params.toString()}`)
  }

  return (
    <div className="flex gap-2">
      <select
        value={defaultType}
        onChange={handleFilterChange}
        className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
      >
        <option value="all">All Types</option>
        <option value="oil">Oil</option>
        <option value="acrylic">Acrylic</option>
        <option value="mixed">Mixed Media</option>
      </select>

      <select
        value={defaultSort}
        onChange={handleSortChange}
        className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
      >
        <option value="newest">Newest First</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
      </select>
    </div>
  )
}
