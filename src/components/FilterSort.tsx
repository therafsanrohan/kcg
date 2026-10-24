'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import CustomSelect from '@/components/ui/CustomSelect'

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
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="w-36 sm:w-40">
        <CustomSelect
          value={defaultType}
          onChange={handleFilterChange}
          className="text-xs py-2 pl-3 pr-8 rounded-full border-gray-200 bg-white shadow-2xs font-medium"
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'oil', label: 'Oil on Canvas' },
            { value: 'acrylic', label: 'Acrylic' },
            { value: 'mixed', label: 'Mixed Media' },
          ]}
        />
      </div>

      <div className="w-40 sm:w-44">
        <CustomSelect
          value={defaultSort}
          onChange={handleSortChange}
          className="text-xs py-2 pl-3 pr-8 rounded-full border-gray-200 bg-white shadow-2xs font-medium"
          options={[
            { value: 'newest', label: 'Newest First' },
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'price_desc', label: 'Price: High to Low' },
          ]}
        />
      </div>
    </div>
  )
}
