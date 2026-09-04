/**
 * Measurement conversion utilities for artwork and frame dimensions.
 * Canonical internal unit: millimetres (mm).
 */

export type MeasurementUnit = 'mm' | 'cm' | 'in' | 'ft'

// ── Conversion factors (to mm) ──
const MM_PER_UNIT: Record<MeasurementUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  ft: 304.8,
}/**
 * Convert a value from the given unit to millimetres.
 */
export function toMm(value: number, unit: MeasurementUnit): number {
  return value * MM_PER_UNIT[unit]
}

/**
 * Convert millimetres to the target unit.
 */
export function fromMm(mm: number, unit: MeasurementUnit): number {
  return mm / MM_PER_UNIT[unit]
}

/**
 * Format dimensions as a human-readable string.
 * Example: formatDimensions(609.6, 914.4, 'in') → "24 × 36 in"
 */
export function formatDimensions(
  widthMm: number,
  heightMm: number,
  unit: MeasurementUnit
): string {
  const w = fromMm(widthMm, unit)
  const h = fromMm(heightMm, unit)

  // Round to 1 decimal if needed, otherwise show integer
  const fmt = (v: number) => {
    const rounded = Math.round(v * 10) / 10
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
  }

  return `${fmt(w)} × ${fmt(h)} ${unit}`
}

/**
 * Parse a legacy display_size string like "24 × 36 in" or "60 x 90 cm"
 * Returns structured data or null if unparseable.
 */
export function parseLegacyDisplaySize(
  displaySize: string | null | undefined
): { width: number; height: number; unit: MeasurementUnit } | null {
  if (!displaySize) return null

  const match = displaySize.match(
    /(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(in|cm|mm|ft)?/i
  )
  if (!match) return null

  const width = parseFloat(match[1])
  const height = parseFloat(match[2])
  const rawUnit = (match[3] || 'cm').toLowerCase()

  // Normalize unit
  const unit: MeasurementUnit =
    rawUnit === 'in' ? 'in' : rawUnit === 'ft' ? 'ft' : rawUnit === 'mm' ? 'mm' : 'cm'

  return { width, height, unit }
}

/**
 * Given a painting record, compute display dimensions.
 * Prefers canonical mm fields, falls back to legacy display_size / width+height.
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
  // 1. Prefer canonical mm fields
  if (painting.width_mm && painting.height_mm) {
    return formatDimensions(painting.width_mm, painting.height_mm, displayUnit)
  }

  // 2. Try parsing display_size
  const parsed = parseLegacyDisplaySize(painting.display_size)
  if (parsed) {
    const widthMm = toMm(parsed.width, parsed.unit)
    const heightMm = toMm(parsed.height, parsed.unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  // 3. Fall back to legacy width/height + measurement_unit
  if (painting.width && painting.height) {
    const unit = (painting.measurement_unit as MeasurementUnit) || 'cm'
    const widthMm = toMm(painting.width, unit)
    const heightMm = toMm(painting.height, unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  return 'Dimensions unavailable'
}

/**
 * Get frame display dimensions. Prefers mm fields, falls back to outer_size text.
 */
export function getFrameDisplayDimensions(
  frame: {
    outer_width_mm?: number | null
    outer_height_mm?: number | null
    outer_size?: string | null
  },
  displayUnit: MeasurementUnit = 'in'
): string {
  if (frame.outer_width_mm && frame.outer_height_mm) {
    return formatDimensions(frame.outer_width_mm, frame.outer_height_mm, displayUnit)
  }

  // Parse legacy outer_size text
  const parsed = parseLegacyDisplaySize(frame.outer_size)
  if (parsed) {
    const widthMm = toMm(parsed.width, parsed.unit)
    const heightMm = toMm(parsed.height, parsed.unit)
    return formatDimensions(widthMm, heightMm, displayUnit)
  }

  return frame.outer_size || 'Custom Size'
}
