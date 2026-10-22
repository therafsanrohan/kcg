import React from 'react'

export default function RelatedArtworksSkeleton() {
  return (
    <section className="mt-24 pt-16 border-t border-gray-200/80" aria-label="Loading curated recommendations">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <div className="h-3 w-28 bg-gray-200 rounded-sm animate-pulse mb-2.5" />
          <div className="h-8 sm:h-10 w-48 sm:w-64 bg-gray-200 rounded-sm animate-pulse" />
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded-sm animate-pulse hidden sm:block" />
      </div>

      {/* Grid: 2 columns on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="flex flex-col">
            <div className="relative w-full rounded-xl sm:rounded-2xl bg-gray-200/70 border border-gray-200/60 shadow-2xs overflow-hidden animate-pulse aspect-[0.8]" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded-sm animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-100 rounded-sm animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded-sm animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
