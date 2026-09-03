'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateSettings } from '@/app/admin/(dashboard)/settings/actions'

const initialState = {
  message: '',
  type: ''
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Settings'}
    </button>
  )
}

export default function SettingsForm({ settings }: { settings?: any }) {
  const [state, formAction] = useFormState(updateSettings, initialState)

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
        
        <div className="sm:col-span-3">
          <label htmlFor="business_name" className="block text-sm font-medium leading-6 text-gray-900">
            Business Name
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="business_name"
              id="business_name"
              defaultValue={settings?.business_name || ''}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="whatsapp_number" className="block text-sm font-medium leading-6 text-gray-900">
            WhatsApp Number
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="whatsapp_number"
              id="whatsapp_number"
              placeholder="+8801XXXXXXXXX"
              defaultValue={settings?.whatsapp_number || ''}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="contact_info" className="block text-sm font-medium leading-6 text-gray-900">
            Contact Email / Extra Info
          </label>
          <div className="mt-2">
            <input
              type="text"
              name="contact_info"
              id="contact_info"
              defaultValue={settings?.contact_info || ''}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="gallery_address" className="block text-sm font-medium leading-6 text-gray-900">
            Gallery Address
          </label>
          <div className="mt-2">
            <textarea
              id="gallery_address"
              name="gallery_address"
              rows={3}
              defaultValue={settings?.gallery_address || ''}
              className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
            />
          </div>
        </div>

      </div>

      {state?.message && (
        <div className={`rounded-md p-4 mt-6 ${state.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <div className="text-sm font-medium">{state.message}</div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-x-6 border-t border-gray-200 pt-6">
        <SubmitButton />
      </div>
    </form>
  )
}
