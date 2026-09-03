'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FrameOption } from '@/types'

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
    
    const newFrame = {
      painting_id: paintingId,
      frame_name: formData.get('frame_name') as string,
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

  async function handleDeleteFrame(id: string) {
    if (!confirm('Are you sure you want to delete this frame option?')) return
    
    try {
      const { error } = await supabase.from('frame_options').delete().eq('id', id)
      if (error) throw error
      
      setFrames(frames.filter(f => f.id !== id))
      showMessage('Frame deleted!', 'success')
    } catch (error: any) {
      showMessage(error.message, 'error')
    }
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
      <form onSubmit={handleSaveFrame} className="bg-white p-4 border border-gray-200 rounded-md space-y-4 shadow-sm">
        <h4 className="text-md font-medium text-gray-900">Add New Option</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Frame Name/Finish</label>
            <input required type="text" name="frame_name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-1.5 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Outer Size</label>
            <input type="text" name="outer_size" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-1.5 border" placeholder="e.g. 40x50 cm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Price (BDT)</label>
            <input required type="number" name="price_bdt" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-1.5 border" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center">
              <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Frame'}
        </button>
      </form>
    </div>
  )
}
