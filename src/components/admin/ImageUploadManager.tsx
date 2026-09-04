'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Cropper from 'react-easy-crop'
import { UploadCloud, X, Crop, Check, Image as ImageIcon, Star, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// Interface representing a single image's state during upload/cropping
export interface ManagedImage {
  id: string // local temporary ID
  file: File | null // The raw file
  previewUrl: string // Object URL for display
  storageKey?: string // Set after successful upload to master bucket
  isPrimary: boolean
  sortOrder: number
  // Crop data
  crop: { x: number; y: number }
  zoom: number
  croppedAreaPixels: any
  // Status
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  errorMessage?: string
}

interface ImageUploadManagerProps {
  paintingId: string
  existingImages?: any[]
  onUploadSuccess: (images: ManagedImage[]) => void
}

const MAX_IMAGES = 5
const MAX_FILE_SIZE_MB = 25
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function ImageUploadManager({ paintingId, existingImages = [], onUploadSuccess }: ImageUploadManagerProps) {
  const [images, setImages] = useState<ManagedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [cropModalImageId, setCropModalImageId] = useState<string | null>(null)
  
  // For the active cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Generate a safe local ID
  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files)
    
    // Check limits
    if (images.length + newFiles.length > MAX_IMAGES) {
      alert(`You can only upload a maximum of ${MAX_IMAGES} images.`)
      return
    }

    const newManagedImages: ManagedImage[] = newFiles.map(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        alert(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`)
      }
      return {
        id: generateId(),
        file: file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: images.length === 0, // First image is primary by default
        sortOrder: images.length,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
        status: 'idle' as const
      }
    }).filter(img => img.file && img.file.size <= MAX_FILE_SIZE_BYTES)

    if (newManagedImages.length > 0) {
      setImages(prev => {
        // If there are no previous images, make the first new one primary
        const updated = [...prev, ...newManagedImages]
        if (updated.length > 0 && !updated.find(img => img.isPrimary)) {
          updated[0].isPrimary = true
        }
        return updated
      })
    }
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      // Ensure one is always primary if any remain
      if (filtered.length > 0 && !filtered.find(img => img.isPrimary)) {
        filtered[0].isPrimary = true
      }
      return filtered
    })
  }

  const setPrimary = (id: string) => {
    setImages(prev => prev.map(img => ({
      ...img,
      isPrimary: img.id === id
    })))
  }

  const openCropper = (id: string) => {
    const img = images.find(i => i.id === id)
    if (img) {
      setCrop(img.crop)
      setZoom(img.zoom)
      setCropModalImageId(id)
    }
  }

  const saveCrop = () => {
    if (cropModalImageId) {
      setImages(prev => prev.map(img => {
        if (img.id === cropModalImageId) {
          return {
            ...img,
            crop,
            zoom,
            croppedAreaPixels
          }
        }
        return img
      }))
      setCropModalImageId(null)
    }
  }

  const handleUploadAndProcess = async () => {
    if (images.length === 0) return

    const updatedImages = [...images]
    
    // 1. Upload original files to Supabase (Client-Side bypasses Vercel 4.5MB limit)
    for (let i = 0; i < updatedImages.length; i++) {
      const img = updatedImages[i]
      if (img.status === 'idle' && img.file) {
        // Mark uploading
        updatedImages[i].status = 'uploading'
        setImages([...updatedImages])

        try {
          const fileExt = img.file.name.split('.').pop()
          const fileName = `${paintingId}/${Date.now()}_${img.id}.${fileExt}`

          const { data, error } = await supabase
            .storage
            .from('paintings_master')
            .upload(fileName, img.file, {
              cacheControl: '3600',
              upsert: false
            })

          if (error) throw error

          updatedImages[i].storageKey = data.path
          updatedImages[i].status = 'processing' // Move to processing stage
          setImages([...updatedImages])
          
        } catch (err: any) {
          updatedImages[i].status = 'error'
          updatedImages[i].errorMessage = err.message
          setImages([...updatedImages])
        }
      }
    }

    // 2. Call Server API to generate responsive variants for successfully uploaded master files
    try {
      const imagesToProcess = updatedImages.filter(img => img.status === 'processing' && img.storageKey)
      if (imagesToProcess.length > 0) {
        
        const response = await fetch('/api/images/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paintingId,
            images: imagesToProcess.map(img => ({
              id: img.id,
              storageKey: img.storageKey,
              cropData: img.croppedAreaPixels,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder
            }))
          })
        })

        if (!response.ok) {
          throw new Error('Failed to process images on server.')
        }

        const result = await response.json()
        
        // Update statuses to done
        for (let i = 0; i < updatedImages.length; i++) {
          if (updatedImages[i].status === 'processing') {
            updatedImages[i].status = 'done'
          }
        }
        setImages([...updatedImages])

        // Pass success back to parent to save to Database
        onUploadSuccess(updatedImages)
      }
    } catch (err: any) {
      alert('Error during image processing: ' + err.message)
    }
  }

  // Active Cropper Image
  const activeCropImage = images.find(i => i.id === cropModalImageId)

  return (
    <div className="space-y-6">
      
      {/* Upload Dropzone */}
      {images.length < MAX_IMAGES && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragging ? 'border-black bg-gray-50' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/webp"
            multiple
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
          />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <UploadCloud className="h-6 w-6 text-gray-600" />
          </div>
          <h4 className="mt-4 text-sm font-semibold text-gray-900">Upload Artwork Images</h4>
          <p className="mt-1 text-xs text-gray-500">
            Drag and drop up to {MAX_IMAGES - images.length} more images, or <button type="button" onClick={() => fileInputRef.current?.click()} className="text-black font-bold underline">browse</button>.
          </p>
          <p className="mt-2 text-[10px] text-gray-400">
            Max 25MB per file. High-resolution JPEG/PNG recommended.
          </p>
        </div>
      )}

      {/* Uploaded Images List */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b pb-2">
            Selected Images ({images.length}/{MAX_IMAGES})
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div key={img.id} className={`relative bg-white border rounded-xl p-3 flex flex-col gap-3 transition-all ${img.isPrimary ? 'border-black shadow-sm ring-1 ring-black' : 'border-gray-200'}`}>
                
                {/* Image Preview */}
                <div className="relative aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden group">
                  <Image 
                    src={img.previewUrl} 
                    alt="Preview" 
                    fill 
                    className={`object-cover ${img.croppedAreaPixels ? 'scale-110' : ''}`} // Simple visual cue that it's cropped
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => openCropper(img.id)}
                      className="bg-white text-black p-2 rounded-full hover:scale-110 transition-transform shadow-md"
                      title="Crop 4:5"
                    >
                      <Crop className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => removeImage(img.id)}
                      className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-md"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Overlay */}
                  {img.status !== 'idle' && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      {img.status === 'uploading' && <span className="text-xs font-bold text-blue-600 animate-pulse">Uploading...</span>}
                      {img.status === 'processing' && <span className="text-xs font-bold text-purple-600 animate-pulse">Processing...</span>}
                      {img.status === 'done' && <Check className="w-6 h-6 text-green-500" />}
                      {img.status === 'error' && <span className="text-xs font-bold text-red-600 text-center px-2">{img.errorMessage}</span>}
                    </div>
                  )}
                </div>

                {/* Details & Primary Toggle */}
                <div className="flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setPrimary(img.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                      img.isPrimary 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-white' : ''}`} />
                    {img.isPrimary ? 'Primary Image' : 'Set Primary'}
                  </button>

                  {img.croppedAreaPixels && (
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                      Cropped
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
             <button
              type="button"
              onClick={handleUploadAndProcess}
              className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-gray-800 transition-colors"
            >
              Upload & Process Images
            </button>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {cropModalImageId && activeCropImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-4xl h-[70vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <Cropper
              image={activeCropImage.previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5} // Standardized 4:5 ratio for all gallery primary images
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
            />
          </div>
          
          {/* Cropper Controls */}
          <div className="mt-6 w-full max-w-xl bg-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full sm:w-48 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCropModalImageId(null)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCrop}
                className="px-6 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-lg shadow-md transition-colors"
              >
                Save Crop (4:5)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
