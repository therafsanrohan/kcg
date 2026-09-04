'use client'

import { useActionState, useTransition } from 'react'
import { saveDeliveryZonesAction } from '@/app/admin/(dashboard)/settings/delivery-actions'
import { DeliveryZone } from '@/types'
import { Truck, Check, AlertCircle } from 'lucide-react'

interface DeliverySettingsFormProps {
  zones: DeliveryZone[]
}

export default function DeliverySettingsForm({ zones }: DeliverySettingsFormProps) {
  const [state, formAction] = useActionState(saveDeliveryZonesAction, null)
  const [isPending, startTransition] = useTransition()

  const getZone = (code: string) => zones.find((z) => z.code === code)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  const renderZoneFields = (
    title: string,
    prefix: string,
    zone?: DeliveryZone,
    defaultCharge = 0,
    defaultMode = 'fixed',
    defaultTime = '2-4 Business Days'
  ) => {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-700" />
            <h3 className="font-sans font-bold text-lg text-gray-900">{title}</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              name={`${prefix}_active`}
              value="true"
              defaultChecked={zone?.is_active ?? true}
              className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
            />
            Zone Active
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Basic Pricing */}
          <div className="space-y-4 md:col-span-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Pricing Mode
              </label>
              <select
                name={`${prefix}_pricing_mode`}
                defaultValue={zone?.pricing_mode ?? defaultMode}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
              >
                <option value="free">Free Delivery</option>
                <option value="fixed">Fixed Charge (BDT)</option>
                <option value="courier_quotation">Courier Quotation</option>
                <option value="destination_quotation">Destination Quotation</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Standard Charge (BDT)
              </label>
              <input
                type="number"
                name={`${prefix}_charge_bdt`}
                min="0"
                defaultValue={zone?.charge_bdt ?? defaultCharge}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
                placeholder={defaultCharge.toString()}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                Estimated Time
              </label>
              <input
                type="text"
                name={`${prefix}_estimated_time`}
                defaultValue={zone?.estimated_delivery_time ?? defaultTime}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
                placeholder={defaultTime}
              />
            </div>
          </div>

          {/* Promotional / Advanced Fields */}
          <div className="md:col-span-2 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-200 pb-2">
              Free Delivery Campaign (Optional)
            </h4>
            
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-800">
                <input
                  type="checkbox"
                  name={`${prefix}_free_delivery`}
                  value="true"
                  defaultChecked={zone?.free_delivery ?? false}
                  className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
                />
                Enable Free Delivery Override
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Campaign Label (e.g. "Eid Special")
                </label>
                <input
                  type="text"
                  name={`${prefix}_free_delivery_label`}
                  defaultValue={zone?.free_delivery_label ?? ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
                  placeholder="Free Delivery"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  name={`${prefix}_offer_starts_at`}
                  defaultValue={zone?.offer_starts_at ? new Date(zone.offer_starts_at).toISOString().slice(0, 16) : ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  name={`${prefix}_offer_ends_at`}
                  defaultValue={zone?.offer_ends_at ? new Date(zone.offer_ends_at).toISOString().slice(0, 16) : ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              If enabled, this will override the standard charge. If dates are provided, the free delivery will automatically expire after the end date.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {state && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
            state.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {state.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {state.message}
        </div>
      )}

      {renderZoneFields('Inside Dhaka City Corporation', 'inside_dhaka', getZone('inside_dhaka'), 0, 'free', '24–48 Hours')}
      {renderZoneFields('Outside Dhaka City Corporation', 'outside_dhaka', getZone('outside_dhaka'), 150, 'fixed', '2–4 Business Days')}
      {renderZoneFields('Outside Bangladesh (Worldwide)', 'international', getZone('international'), 0, 'destination_quotation', '5–10 Business Days')}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-black text-white text-xs font-bold rounded-xl shadow-md hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          {isPending ? 'Saving Delivery Zones...' : 'Save Delivery Configuration'}
        </button>
      </div>
    </form>
  )
}
