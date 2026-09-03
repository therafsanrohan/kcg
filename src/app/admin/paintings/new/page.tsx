import PaintingForm from '@/components/admin/PaintingForm'

export default function NewPaintingPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Add New Painting
          </h2>
        </div>
      </div>
      
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6 border border-gray-100">
        <PaintingForm />
      </div>
    </div>
  )
}
