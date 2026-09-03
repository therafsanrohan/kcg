'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { savePainting } from '@/app/admin/(dashboard)/paintings/actions'
import { Painting } from '@/types'
import Link from 'next/link'

const initialState: { message: string, errors?: any } = {
  message: '',
  errors: {},
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Painting'}
    </button>
  )
}

export default function PaintingForm({ painting }: { painting?: Painting }) {
  const [state, formAction] = useFormState(savePainting, initialState)

  return (
    <form action={formAction} className="space-y-6">
      {painting && <input type="hidden" name="id" value={painting.id} />}
      
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label htmlFor="title" className="block text-sm font-medium leading-6 text-gray-900">
            Title
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="title"
              id="title"
              defaultValue={painting?.title}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
          {state?.errors?.title && (
            <p className="mt-2 text-sm text-red-600">{state.errors.title}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="slug" className="block text-sm font-medium leading-6 text-gray-900">
            URL Slug
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="slug"
              id="slug"
              defaultValue={painting?.slug}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
          {state?.errors?.slug && (
            <p className="mt-2 text-sm text-red-600">{state.errors.slug}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="painting_type" className="block text-sm font-medium leading-6 text-gray-900">
            Painting Type
          </label>
          <div className="mt-2">
            <select
              id="painting_type"
              name="painting_type"
              defaultValue={painting?.painting_type || 'oil'}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            >
              <option value="oil">Oil</option>
              <option value="acrylic">Acrylic</option>
              <option value="mixed">Mixed Media</option>
            </select>
          </div>
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="exact_medium" className="block text-sm font-medium leading-6 text-gray-900">
            Exact Medium
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="exact_medium"
              id="exact_medium"
              defaultValue={painting?.exact_medium}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
              placeholder="e.g. Oil on Canvas"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="width" className="block text-sm font-medium leading-6 text-gray-900">
            Width (cm)
          </label>
          <div className="mt-2">
            <input
              type="number"
              step="any"
              name="width"
              id="width"
              defaultValue={painting?.width}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="height" className="block text-sm font-medium leading-6 text-gray-900">
            Height (cm)
          </label>
          <div className="mt-2">
            <input
              type="number"
              step="any"
              name="height"
              id="height"
              defaultValue={painting?.height}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="base_price_bdt" className="block text-sm font-medium leading-6 text-gray-900">
            Base Price (BDT)
          </label>
          <div className="mt-2">
            <input
              type="number"
              name="base_price_bdt"
              id="base_price_bdt"
              defaultValue={painting?.base_price_bdt}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
        </div>

        <div className="col-span-full">
          <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
            Description
          </label>
          <div className="mt-2">
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={painting?.description || ''}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            />
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="availability_status" className="block text-sm font-medium leading-6 text-gray-900">
            Status
          </label>
          <div className="mt-2">
            <select
              id="availability_status"
              name="availability_status"
              defaultValue={painting?.availability_status || 'available'}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6 px-3"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        <div className="sm:col-span-2 flex items-center mt-8">
          <input
            id="is_published"
            name="is_published"
            type="checkbox"
            value="true"
            defaultChecked={painting?.is_published}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="is_published" className="ml-2 block text-sm font-medium leading-6 text-gray-900">
            Publish on Website
          </label>
        </div>
        
        <div className="sm:col-span-2 flex items-center mt-8">
          <input
            id="is_featured"
            name="is_featured"
            type="checkbox"
            value="true"
            defaultChecked={painting?.is_featured}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="is_featured" className="ml-2 block text-sm font-medium leading-6 text-gray-900">
            Featured (Home Page)
          </label>
        </div>
      </div>

      {state?.message && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{state.message}</div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <Link href="/admin/paintings" className="text-sm font-semibold leading-6 text-gray-900">
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  )
}
