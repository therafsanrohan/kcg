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

  const insideDhaka = getZone('inside_dhaka')
  const outsideDhaka = getZone('outside_dhaka')
  const international = getZone('international')

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

      {/* ── 1. Inside Dhaka ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-700" />
            <h3 className="font-sans font-bold text-lg text-gray-900">Inside Dhaka City Corporation</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              name="inside_dhaka_active"
              value="true"
              defaultChecked={insideDhaka?.is_active ?? true}
              className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
            />
            Zone Active
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Pricing Mode
            </label>
            <select
              name="inside_dhaka_pricing_mode"
              defaultValue={insideDhaka?.pricing_mode ?? 'free'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
            >
              <option value="free">Free Delivery</option>
              <option value="fixed">Fixed Charge (BDT)</option>
              <option value="courier_quotation">Courier Quotation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Delivery Charge (BDT)
            </label>
            <input
              type="number"
              name="inside_dhaka_charge_bdt"
              min="0"
              defaultValue={insideDhaka?.charge_bdt ?? 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Estimated Time
            </label>
            <input
              type="text"
              name="inside_dhaka_estimated_time"
              defaultValue={insideDhaka?.estimated_delivery_time ?? '24–48 Hours'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="24–48 Hours"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Outside Dhaka ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-700" />
            <h3 className="font-sans font-bold text-lg text-gray-900">Outside Dhaka City Corporation</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              name="outside_dhaka_active"
              value="true"
              defaultChecked={outsideDhaka?.is_active ?? true}
              className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
            />
            Zone Active
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Pricing Mode
            </label>
            <select
              name="outside_dhaka_pricing_mode"
              defaultValue={outsideDhaka?.pricing_mode ?? 'fixed'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
            >
              <option value="free">Free Delivery</option>
              <option value="fixed">Fixed Charge (BDT)</option>
              <option value="courier_quotation">Courier Quotation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Delivery Charge (BDT)
            </label>
            <input
              type="number"
              name="outside_dhaka_charge_bdt"
              min="0"
              defaultValue={outsideDhaka?.charge_bdt ?? 150}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="150"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Estimated Time
            </label>
            <input
              type="text"
              name="outside_dhaka_estimated_time"
              defaultValue={outsideDhaka?.estimated_delivery_time ?? '2–4 Business Days'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="2–4 Business Days"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Outside Bangladesh ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-700" />
            <h3 className="font-sans font-bold text-lg text-gray-900">Outside Bangladesh (Worldwide)</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              name="international_active"
              value="true"
              defaultChecked={international?.is_active ?? true}
              className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
            />
            Zone Active
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Pricing Mode
            </label>
            <select
              name="international_pricing_mode"
              defaultValue={international?.pricing_mode ?? 'destination_quotation'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none bg-white"
            >
              <option value="free">Free Delivery</option>
              <option value="fixed">Fixed Charge (BDT)</option>
              <option value="destination_quotation">Destination Quotation</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Delivery Charge (BDT)
            </label>
            <input
              type="number"
              name="international_charge_bdt"
              min="0"
              defaultValue={international?.charge_bdt ?? 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
              Estimated Time
            </label>
            <input
              type="text"
              name="international_estimated_time"
              defaultValue={international?.estimated_delivery_time ?? '5–10 Business Days'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-black outline-none"
              placeholder="5–10 Business Days"
            />
          </div>
        </div>
      </div>

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
