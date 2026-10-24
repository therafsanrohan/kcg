'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FrameOption } from '@/types'
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider'
import { MeasurementUnit, convertUnit, formatValueForDisplay, toCanonicalMm } from '@/utils/measurements'

export default function FrameManager({ paintingId, existingFrames = [] }: { paintingId: string, existingFrames?: FrameOption[] }) {
  const [frames, setFrames] = useState<FrameOption[]>(existingFrames)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const supabase = createClient()

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  async function handleSaveFrame(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    
    let frameName = (formData.get('frame_name') as string || '').trim()
    frameName = frameName.replace(/^Double\s*-\s*Bit\s+frame/i, 'Double-Bit frame')
    frameName = frameName.replace(/^Single\s*-\s*Bit\s+frame/i, 'Single-Bit frame')
    frameName = frameName.replace(/\(white\)/i, '(White)')
    frameName = frameName.replace(/\(black\)/i, '(Black)')

    const isDup = frames.some(
      (f) => f.frame_name.toLowerCase().replace(/[^a-z0-9]/g, '') === frameName.toLowerCase().replace(/[^a-z0-9]/g, '')
    )
    if (isDup) {
      showMessage('This frame option already exists on this artwork.', 'error')
      setSaving(false)
      return
    }

    const newFrame = {
      painting_id: paintingId,
      frame_name: frameName,
      outer_size: formData.get('outer_size') as string,
      price_bdt: Number(formData.get('price_bdt')),
      is_active: formData.get('is_active') === 'on',
    }

    try {
      const { data, error } = await supabase
        .from('frame_options')
        .insert(newFrame)
        .select()
        .single()

      if (error) throw error
      
      setFrames([...frames, data])
      showMessage('Frame added successfully!', 'success')
      ;(e.target as HTMLFormElement).reset()
    } catch (error: any) {
      showMessage(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const { toast, confirm: confirmModal } = useAdminFeedback()

  async function handleDeleteFrame(id: string) {
    confirmModal({
      title: 'Delete Frame Option',
      message: 'Are you sure you want to delete this frame option? It will no longer be available for collectors.',
      confirmText: 'Delete Frame',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('frame_options').delete().eq('id', id)
          if (error) throw error
          
          setFrames(frames.filter(f => f.id !== id))
          toast('Frame deleted successfully!', 'success')
        } catch (error: any) {
          toast(error.message, 'error')
        }
      },
    })
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Frame Options</h3>
      
      {message.text && (
        <div className={`mb-4 p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Existing Frames List */}
      {frames.length > 0 && (
        <div className="mb-6 space-y-4">
          {frames.map((frame) => (
            <div key={frame.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div>
                <p className="font-semibold text-gray-900">{frame.frame_name}</p>
                <p className="text-sm text-gray-500">
                  Size: {frame.outer_size || 'N/A'} | Price: {frame.price_bdt} BDT | Status: {frame.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => handleDeleteFrame(frame.id)}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Frame Form */}
      <FrameManagerNewForm
        paintingId={paintingId}
        existingFrames={frames}
        saving={saving}
        setSaving={setSaving}
        onFrameAdded={(newFrame) => {
          setFrames([...frames, newFrame])
          showMessage('Frame added successfully!', 'success')
        }}
        onError={(err) => showMessage(err, 'error')}
      />
    </div>
  )
}

function FrameManagerNewForm({
  paintingId,
  existingFrames = [],
  saving,
  setSaving,
  onFrameAdded,
  onError,
}: {
  paintingId: string
  existingFrames?: FrameOption[]
  saving: boolean
  setSaving: (v: boolean) => void
  onFrameAdded: (frame: FrameOption) => void
  onError: (err: string) => void
}) {
  const [frameName, setFrameName] = useState('')
  const [width, setWidth] = useState<number | ''>('')
  const [height, setHeight] = useState<number | ''>('')
  const [unit, setUnit] = useState<MeasurementUnit>('in')
  const [priceBdt, setPriceBdt] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const supabase = createClient()

  // Dynamic unit conversion preserving physical dimensions
  const handleUnitChange = (newUnit: MeasurementUnit) => {
    if (newUnit === unit) return
    if (typeof width === 'number' && width > 0) {
      const convertedWidth = convertUnit(width, unit, newUnit)
      const roundedW = formatValueForDisplay(convertedWidth, newUnit)
      setWidth(parseFloat(roundedW))
    }
    if (typeof height === 'number' && height > 0) {
      const convertedHeight = convertUnit(height, unit, newUnit)
      const roundedH = formatValueForDisplay(convertedHeight, newUnit)
      setHeight(parseFloat(roundedH))
    }
    setUnit(newUnit)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    let cleanName = frameName.trim()
    cleanName = cleanName.replace(/^Double\s*-\s*Bit\s+frame/i, 'Double-Bit frame')
    cleanName = cleanName.replace(/^Single\s*-\s*Bit\s+frame/i, 'Single-Bit frame')
    cleanName = cleanName.replace(/\(white\)/i, '(White)')
    cleanName = cleanName.replace(/\(black\)/i, '(Black)')

    if (!cleanName) {
      onError('Frame name is required')
      return
    }

    const isDup = existingFrames.some(
      (f) => f.frame_name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')
    )
    if (isDup) {
      onError('This frame option already exists on this artwork.')
      return
    }

    setSaving(true)
    try {
      const numW = typeof width === 'number' ? width : 0
      const numH = typeof height === 'number' ? height : 0
      const outer_width_mm = numW > 0 ? toCanonicalMm(numW, unit) : null
      const outer_height_mm = numH > 0 ? toCanonicalMm(numH, unit) : null

      const outer_size = numW > 0 && numH > 0
        ? `${width} × ${height} ${unit}`
        : ''

      const newFrame = {
        painting_id: paintingId,
        frame_name: cleanName,
        outer_size,
        outer_width_mm,
        outer_height_mm,
        price_bdt: Number(priceBdt) || 0,
        is_active: isActive,
      }

      const { data, error } = await supabase
        .from('frame_options')
        .insert(newFrame)
        .select()
        .single()

      if (error) throw error

      onFrameAdded(data)
      setFrameName('')
      setWidth('')
      setHeight('')
      setPriceBdt('')
    } catch (err: any) {
      onError(err.message || 'Failed to add frame')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white p-5 border border-gray-200 rounded-xl space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h4 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Add New Frame Option</h4>
        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => handleUnitChange('in')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              unit === 'in' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
            }`}
          >
            Inches (in)
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('ft')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              unit === 'ft' ? 'bg-white text-black shadow-xs' : 'text-gray-500 hover:text-black'
            }`}
          >
            Feet (ft)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Frame Finish / Name
          </label>
          <input
            required
            type="text"
            value={frameName}
            onChange={(e) => setFrameName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-black outline-none"
            placeholder="e.g. Italian Black Oak"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Outer Width ({unit})
          </label>
          <input
            type="number"
            step="any"
            value={width}
            onChange={(e) => setWidth(e.target.value === '' ? '' : parseFloat(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-black outline-none font-mono"
            placeholder={unit === 'ft' ? '2.5' : '30'}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Outer Height ({unit})
          </label>
          <input
            type="number"
            step="any"
            value={height}
            onChange={(e) => setHeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-black outline-none font-mono"
            placeholder={unit === 'ft' ? '3.3' : '40'}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Price (BDT)
          </label>
          <input
            required
            type="number"
            value={priceBdt}
            onChange={(e) => setPriceBdt(e.target.value === '' ? '' : parseFloat(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-black outline-none font-mono"
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <span className="text-xs font-medium text-gray-700">Active for collectors</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Adding...' : 'Add Frame Option'}
        </button>
      </div>
    </form>
  )
}
