'use client'

import React from 'react'
import {
  MeasurementUnit,
  SUPPORTED_MEASUREMENT_UNITS,
  UNIT_LABELS,
  convertUnit,
  formatValueForDisplay,
  calculateDimensions,
  toCanonicalMm,
  ArtworkOrientation,
} from '@/utils/measurements'
import CustomSelect from '@/components/ui/CustomSelect'

interface DimensionInputGroupProps {
  width: string
  height: string
  unit: MeasurementUnit
  orientation?: ArtworkOrientation
  onWidthChange: (newWidth: string) => void
  onHeightChange: (newHeight: string) => void
  onDimensionsChange?: (newWidth: string, newHeight: string, newOrientation?: ArtworkOrientation) => void
  onUnitChange: (newUnit: MeasurementUnit) => void
  onOrientationChange?: (newOrientation: ArtworkOrientation) => void
  className?: string
}

export default function DimensionInputGroup({
  width,
  height,
  unit,
  orientation: explicitOrientation,
  onWidthChange,
  onHeightChange,
  onDimensionsChange,
  onUnitChange,
  onOrientationChange,
  className = '',
}: DimensionInputGroupProps) {
  const numW = parseFloat(width) || 0
  const numH = parseFloat(height) || 0
  const widthMm = toCanonicalMm(numW, unit)
  const heightMm = toCanonicalMm(numH, unit)
  const dims = calculateDimensions(widthMm, heightMm, 'mm', explicitOrientation)

  // Handle live bidirectional unit switching without data loss
  const handleUnitSwitch = (newUnit: MeasurementUnit) => {
    if (newUnit === unit) return

    if (numW > 0) {
      const convertedW = convertUnit(numW, unit, newUnit)
      onWidthChange(formatValueForDisplay(convertedW, newUnit))
    }
    if (numH > 0) {
      const convertedH = convertUnit(numH, unit, newUnit)
      onHeightChange(formatValueForDisplay(convertedH, newUnit))
    }
    onUnitChange(newUnit)
  }

  // Handle explicit orientation selection
  const handleOrientationSelect = (target: ArtworkOrientation) => {
    onOrientationChange?.(target)

    // Default dimensions by unit if inputs are empty
    const defaultShort = unit === 'cm' ? '60' : unit === 'ft' ? '2' : unit === 'mm' ? '600' : '24'
    const defaultLong = unit === 'cm' ? '90' : unit === 'ft' ? '3' : unit === 'mm' ? '900' : '36'

    if (numW === 0 && numH === 0) {
      if (target === 'portrait') {
        if (onDimensionsChange) onDimensionsChange(defaultShort, defaultLong, target)
        else { onWidthChange(defaultShort); onHeightChange(defaultLong); }
      } else if (target === 'landscape') {
        if (onDimensionsChange) onDimensionsChange(defaultLong, defaultShort, target)
        else { onWidthChange(defaultLong); onHeightChange(defaultShort); }
      } else if (target === 'square') {
        if (onDimensionsChange) onDimensionsChange(defaultShort, defaultShort, target)
        else { onWidthChange(defaultShort); onHeightChange(defaultShort); }
      }
      return
    }

    if (target === 'square') {
      const squareSide = numW > 0 ? width : height || defaultShort
      if (onDimensionsChange) {
        onDimensionsChange(squareSide, squareSide, target)
      } else {
        onWidthChange(squareSide)
        onHeightChange(squareSide)
      }
    } else if (target === 'portrait') {
      const currentMin = numW > 0 && numH > 0 ? (numW < numH ? width : height) : width || defaultShort
      const currentMax = numW > 0 && numH > 0 ? (numW > numH ? width : height) : height || defaultLong
      const targetW = currentMin === currentMax ? defaultShort : currentMin
      const targetH = currentMin === currentMax ? defaultLong : currentMax

      if (onDimensionsChange) {
        onDimensionsChange(targetW, targetH, target)
      } else {
        onWidthChange(targetW)
        onHeightChange(targetH)
      }
    } else if (target === 'landscape') {
      const currentMin = numW > 0 && numH > 0 ? (numW < numH ? width : height) : height || defaultShort
      const currentMax = numW > 0 && numH > 0 ? (numW > numH ? width : height) : width || defaultLong
      const targetW = currentMin === currentMax ? defaultLong : currentMax
      const targetH = currentMin === currentMax ? defaultShort : currentMin

      if (onDimensionsChange) {
        onDimensionsChange(targetW, targetH, target)
      } else {
        onWidthChange(targetW)
        onHeightChange(targetH)
      }
    }
  }

  const unitOptions = SUPPORTED_MEASUREMENT_UNITS.map((u) => ({
    value: u,
    label: UNIT_LABELS[u],
  }))

  const orientationPresets: { label: string; value: ArtworkOrientation }[] = [
    { label: 'Portrait', value: 'portrait' },
    { label: 'Landscape', value: 'landscape' },
    { label: 'Square', value: 'square' },
    { label: 'Custom', value: 'custom' },
  ]

  return (
    <div className={`bg-[#FAF9F6] border border-gray-200/90 rounded-2xl p-4 sm:p-5 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
        <div>
          <span className="block text-[11px] font-bold tracking-wider uppercase text-gray-900">
            ARTWORK PHYSICAL DIMENSIONS & ORIENTATION
          </span>
          <p className="text-[11px] text-gray-500 font-light mt-0.5">
            Auto-derives from measurements or select orientation preset
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-md">
          <span className="capitalize font-semibold text-gray-900">{dims.orientation}</span>
          <span>&bull;</span>
          <span>{dims.areaSqFt.toFixed(2)} sq ft ({dims.areaSqIn.toFixed(0)} in²)</span>
        </div>
      </div>

      {/* Orientation Selector Pills */}
      <div>
        <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1.5">
          ORIENTATION PRESET
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {orientationPresets.map((preset) => {
            const isSelected = (explicitOrientation || dims.orientation) === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleOrientationSelect(preset.value)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-black text-white border-black shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span>{preset.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Width */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1.5">
            WIDTH ({unit.toUpperCase()})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.1"
            value={width}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                onWidthChange(val)
              }
            }}
            placeholder="24"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-[10px] font-bold tracking-wider uppercase text-gray-600 mb-1.5">
            HEIGHT ({unit.toUpperCase()})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.1"
            value={height}
            onChange={(e) => {
              const val = e.target.value
              if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                onHeightChange(val)
              }
            }}
            placeholder="36"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
          />
        </div>

        {/* Unit Selector */}
        <div>
          <CustomSelect
            label="MEASUREMENT UNIT"
            value={unit}
            onChange={(e) => handleUnitSwitch(e.target.value as MeasurementUnit)}
            options={unitOptions}
          />
        </div>
      </div>

      {/* Quick Conversion Equivalents Strip */}
      {numW > 0 && numH > 0 && (
        <div className="pt-2 text-[11px] text-gray-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-gray-400 uppercase text-[10px] font-bold tracking-wider">Equivalent:</span>
          {SUPPORTED_MEASUREMENT_UNITS.filter((u) => u !== unit).map((targetUnit) => {
            const eqW = convertUnit(numW, unit, targetUnit)
            const eqH = convertUnit(numH, unit, targetUnit)
            return (
              <span key={targetUnit} className="bg-white border border-gray-200/80 px-2 py-0.5 rounded text-gray-700">
                {formatValueForDisplay(eqW, targetUnit)} × {formatValueForDisplay(eqH, targetUnit)} {targetUnit}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
