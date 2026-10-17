/**
 * Universal Measurement & Dimension Engine for Kazi Canvas Gallery (KCG)
 * 
 * Supports:
 * - Inches (in)
 * - Feet (ft)
 * - Centimetres (cm)
 * - Millimetres (mm)
 *
 * Canonical representation:
 * Millimetres (mm) as high-precision float / integer micrometres for calculations.
 * 
 * Standard Conversion Factors (Exact):
 * 1 ft = 12 in
 * 1 in = 25.4 mm = 2.54 cm
 * 1 ft = 304.8 mm = 30.48 cm
 * 1 cm = 10 mm
 * 
 * Area Relationships:
 * 1 sq ft = 144 sq in
 * 1 sq m = 10,000 sq cm
 * 1 sq ft = 0.09290304 sq m
 */

export type MeasurementUnit = 'in' | 'ft' | 'cm' | 'mm'

export const SUPPORTED_MEASUREMENT_UNITS: readonly MeasurementUnit[] = ['in', 'ft', 'cm', 'mm'] as const

export const UNIT_LABELS: Record<MeasurementUnit, string> = {
  in: 'Inches (in)',
  ft: 'Feet (ft)',
  cm: 'Centimeters (cm)',
  mm: 'Millimeters (mm)',
}

export const MM_PER_UNIT: Record<MeasurementUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  ft: 304.8,
}

/**
 * Convert value from given unit to canonical millimetres.
 * Handles validation and rejects non-positive/NaN values safely.
 */
export function toCanonicalMm(value: number, unit: MeasurementUnit): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value) || value < 0) {
    return 0
  }
  const factor = MM_PER_UNIT[unit] || 10
  return value * factor
}

/**
 * Convert canonical millimetres to target unit.
 */
export function fromCanonicalMm(mm: number, targetUnit: MeasurementUnit): number {
  if (typeof mm !== 'number' || isNaN(mm) || !isFinite(mm) || mm < 0) {
    return 0
  }
  const factor = MM_PER_UNIT[targetUnit] || 10
  return mm / factor
}

/**
 * Convert directly between any two measurement units via canonical millimetres.
 * Prevents cumulative rounding drift.
 */
export function convertUnit(
  value: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): number {
  if (fromUnit === toUnit) return value
  const mm = toCanonicalMm(value, fromUnit)
  return fromCanonicalMm(mm, toUnit)
}

/**
 * Round a dimension for display according to a clean precision policy:
 * - Inches & cm: 1 decimal place if fractional, otherwise integer.
 * - Feet: 2 decimal places if fractional, otherwise integer (e.g. 2.5 ft or 2 ft).
 * - Millimetres: integer.
 */
export function formatValueForDisplay(val: number, unit: MeasurementUnit): string {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) return '0'
  
  if (unit === 'mm') {
    return Math.round(val).toString()
  }

  if (unit === 'ft') {
    const rounded = Math.round(val * 100) / 100
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)
  }

  // in and cm
  const rounded = Math.round(val * 10) / 10
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
}

/**
 * Format dimensions as human-readable string.
 * Example: formatDimensions(609.6, 914.4, 'in') → "24 × 36 in"
 */
export function formatDimensions(
  widthMm: number,
  heightMm: number,
  unit: MeasurementUnit
): string {
  const w = fromCanonicalMm(widthMm, unit)
  const h = fromCanonicalMm(heightMm, unit)
  return `${formatValueForDisplay(w, unit)} × ${formatValueForDisplay(h, unit)} ${unit}`
}

/**
 * Calculate area in all standard units from canonical millimetres.
 */
export type ArtworkOrientation = 'portrait' | 'landscape' | 'square' | 'custom'

export interface DimensionCalculations {
  widthMm: number
  heightMm: number
  orientation: ArtworkOrientation
  aspectRatio: number
  areaSqIn: number
  areaSqFt: number
  areaSqCm: number
  areaSqM: number
  perimeterMm: number
}

export function calculateDimensions(
  width: number,
  height: number,
  unit: MeasurementUnit = 'mm',
  forcedOrientation?: ArtworkOrientation
): DimensionCalculations {
  const wMm = toCanonicalMm(Math.max(0, width), unit)
  const hMm = toCanonicalMm(Math.max(0, height), unit)
  
  let orientation: ArtworkOrientation = 'custom'
  if (forcedOrientation === 'custom') {
    orientation = 'custom'
  } else if (wMm > 0 && hMm > 0) {
    if (Math.abs(wMm - hMm) < 0.5) {
      orientation = 'square'
    } else if (wMm > hMm) {
      orientation = 'landscape'
    } else {
      orientation = 'portrait'
    }
  } else {
    orientation = forcedOrientation || 'portrait'
  }

  const aspectRatio = hMm > 0 ? wMm / hMm : 1

  // 1 sq mm = (1 / 25.4)^2 sq in = 1 / 645.16 sq in
  const areaSqMm = wMm * hMm
  const areaSqIn = areaSqMm / (25.4 * 25.4)
  const areaSqFt = areaSqIn / 144
  const areaSqCm = areaSqMm / 100
  const areaSqM = areaSqMm / 1_000_000
  const perimeterMm = 2 * (wMm + hMm)

  return {
    widthMm: wMm,
    heightMm: hMm,
    orientation,
    aspectRatio,
    areaSqIn,
    areaSqFt,
    areaSqCm,
    areaSqM,
    perimeterMm,
  }
}

/**
 * Parse legacy display_size strings such as:
 * - "24 × 36 in"
 * - "24x36 in"
 * - "2 x 3 ft"
 * - "60 × 90 cm"
 * - "600 x 900 mm"
 */
export function parseLegacyDisplaySize(
  displaySize: string | null | undefined
): { width: number; height: number; unit: MeasurementUnit } | null {
  if (!displaySize || typeof displaySize !== 'string') return null

  const match = displaySize.match(
    /(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(in|cm|mm|ft)?/i
  )
  if (!match) return null

  const width = parseFloat(match[1])
  const height = parseFloat(match[2])
  if (isNaN(width) || isNaN(height)) return null

  const rawUnit = (match[3] || 'in').toLowerCase()
  const unit: MeasurementUnit =
    rawUnit === 'cm' ? 'cm' : rawUnit === 'mm' ? 'mm' : rawUnit === 'ft' ? 'ft' : 'in'

  return { width, height, unit }
}

/**
 * Get comprehensive display dimension string for an artwork in any given unit.
 */
export function getDisplayDimensions(
  painting: {
    width_mm?: number | null
    height_mm?: number | null
    width?: number | null
    height?: number | null
    display_size?: string | null
    measurement_unit?: string | null
  },
  displayUnit: MeasurementUnit = 'in'
): string {
  // 1. Prefer canonical width_mm & height_mm
  if (
    typeof painting.width_mm === 'number' &&
    typeof painting.height_mm === 'number' &&
    painting.width_mm > 0 &&
    painting.height_mm > 0
  ) {
    return formatDimensions(painting.width_mm, painting.height_mm, displayUnit)
  }

  // 2. Try parsing display_size
  const parsed = parseLegacyDisplaySize(painting.display_size)
  if (parsed) {
    const widthMm = toCanonicalMm(parsed.width, parsed.unit)
    const heightMm = toCanonicalMm(parsed.height, parsed.unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  // 3. Fall back to legacy width/height + measurement_unit
  if (typeof painting.width === 'number' && typeof painting.height === 'number' && painting.width > 0) {
    const unit = (painting.measurement_unit as MeasurementUnit) || 'cm'
    const widthMm = toCanonicalMm(painting.width, unit)
    const heightMm = toCanonicalMm(painting.height, unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  return 'Dimensions unavailable'
}

/**
 * Format frame dimensions in a selected unit.
 */
export function getFrameDisplayDimensions(
  frame: {
    outer_width_mm?: number | null
    outer_height_mm?: number | null
    outer_size?: string | null
  },
  displayUnit: MeasurementUnit = 'in'
): string {
  if (
    typeof frame.outer_width_mm === 'number' &&
    typeof frame.outer_height_mm === 'number' &&
    frame.outer_width_mm > 0 &&
    frame.outer_height_mm > 0
  ) {
    return formatDimensions(frame.outer_width_mm, frame.outer_height_mm, displayUnit)
  }

  const parsed = parseLegacyDisplaySize(frame.outer_size)
  if (parsed) {
    const widthMm = toCanonicalMm(parsed.width, parsed.unit)
    const heightMm = toCanonicalMm(parsed.height, parsed.unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  return frame.outer_size || 'Custom Size'
}

export interface FramedDimensionInput {
  artworkWidth: number
  artworkHeight: number
  unit: MeasurementUnit
  frameBorderThickness: number
  frameBorderUnit?: MeasurementUnit
}

export interface FramedDimensionResult {
  framedWidthMm: number
  framedHeightMm: number
  finalFramedWidth: number
  finalFramedHeight: number
  unit: MeasurementUnit
}

export function calculateFramedDimensions(
  inputOrArtworkWidthMm: number | FramedDimensionInput,
  artworkHeightMm?: number,
  borderWidthMm?: number
): FramedDimensionResult {
  if (typeof inputOrArtworkWidthMm === 'object') {
    const input = inputOrArtworkWidthMm
    const artWidthMm = toCanonicalMm(input.artworkWidth, input.unit)
    const artHeightMm = toCanonicalMm(input.artworkHeight, input.unit)
    const borderUnit = input.frameBorderUnit || input.unit
    const borderMm = toCanonicalMm(input.frameBorderThickness, borderUnit)

    const framedWidthMm = artWidthMm + 2 * borderMm
    const framedHeightMm = artHeightMm + 2 * borderMm

    return {
      framedWidthMm,
      framedHeightMm,
      finalFramedWidth: fromCanonicalMm(framedWidthMm, input.unit),
      finalFramedHeight: fromCanonicalMm(framedHeightMm, input.unit),
      unit: input.unit,
    }
  }

  const artWidthMm = inputOrArtworkWidthMm
  const artHeightMm = artworkHeightMm ?? 0
  const borderMm = borderWidthMm ?? 0

  const framedWidthMm = artWidthMm + 2 * borderMm
  const framedHeightMm = artHeightMm + 2 * borderMm

  return {
    framedWidthMm,
    framedHeightMm,
    finalFramedWidth: framedWidthMm,
    finalFramedHeight: framedHeightMm,
    unit: 'mm',
  }
}

/**
 * Get natural aspect ratio (width / height) from painting dimensions or image metadata.
 * Returns 0.8 (4:5) as default portrait fallback for legacy records.
 */
export function getArtworkAspectRatio(painting: {
  width_mm?: number | null
  height_mm?: number | null
  width?: number | null
  height?: number | null
  display_size?: string | null
  measurement_unit?: string | null
}): number {
  if (
    typeof painting.width_mm === 'number' &&
    typeof painting.height_mm === 'number' &&
    painting.width_mm > 0 &&
    painting.height_mm > 0
  ) {
    return painting.width_mm / painting.height_mm
  }

  const parsed = parseLegacyDisplaySize(painting.display_size)
  if (parsed && parsed.width > 0 && parsed.height > 0) {
    return parsed.width / parsed.height
  }

  if (
    typeof painting.width === 'number' &&
    typeof painting.height === 'number' &&
    painting.width > 0 &&
    painting.height > 0
  ) {
    return painting.width / painting.height
  }

  return 0.8 // 4:5 portrait fallback
}
