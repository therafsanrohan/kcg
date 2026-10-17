import assert from 'node:assert/strict'
import {
  toCanonicalMm,
  fromCanonicalMm,
  convertUnit,
  formatValueForDisplay,
  formatDimensions,
  calculateDimensions,
  calculateFramedDimensions,
  parseLegacyDisplaySize,
} from './measurements'

function runRegressionSuite() {
  console.log('--- Running Universal Measurement Engine Regression Tests ---')

  // 1. Exact linear unit conversion relationships
  assert.equal(Math.abs(convertUnit(12, 'in', 'ft') - 1) < 1e-4, true, '12 in = 1 ft')
  assert.equal(Math.abs(convertUnit(24, 'in', 'ft') - 2) < 1e-4, true, '24 in = 2 ft')
  assert.equal(Math.abs(convertUnit(36, 'in', 'ft') - 3) < 1e-4, true, '36 in = 3 ft')
  assert.equal(Math.abs(convertUnit(1, 'in', 'cm') - 2.54) < 1e-4, true, '1 in = 2.54 cm')
  assert.equal(Math.abs(convertUnit(1, 'in', 'mm') - 25.4) < 1e-4, true, '1 in = 25.4 mm')
  assert.equal(Math.abs(convertUnit(1, 'ft', 'cm') - 30.48) < 1e-4, true, '1 ft = 30.48 cm')
  assert.equal(Math.abs(convertUnit(1, 'ft', 'mm') - 304.8) < 1e-4, true, '1 ft = 304.8 mm')
  console.log('✓ Exact linear unit conversions pass')

  // 2. Bidirectional conversion prevents cumulative rounding drift
  const initialInches = 24.5
  const canonical = toCanonicalMm(initialInches, 'in')
  const inFeet = fromCanonicalMm(canonical, 'ft')
  const inCm = fromCanonicalMm(canonical, 'cm')
  const inMm = fromCanonicalMm(canonical, 'mm')
  const backToInches = fromCanonicalMm(toCanonicalMm(inFeet, 'ft'), 'in')
  assert.equal(Math.abs(initialInches - backToInches) < 1e-4, true, 'No drift on bidirectional conversion')
  console.log('✓ Bidirectional conversion without drift passes')

  // 3. Derived area calculations
  const dims = calculateDimensions(24, 36, 'in')
  assert.equal(Math.abs(dims.areaSqIn - 864) < 1e-4, true, '24x36 area in sq in is 864')
  assert.equal(Math.abs(dims.areaSqFt - 6) < 1e-4, true, '864 sq in is exactly 6 sq ft (144 sq in per sq ft)')
  assert.equal(dims.orientation, 'portrait', '24x36 is portrait orientation')
  assert.equal(Math.abs(dims.aspectRatio - 24 / 36) < 1e-4, true, 'Aspect ratio calculated correctly')
  console.log('✓ Derived area calculations pass')

  // 4. Framed dimensions calculation
  const framed = calculateFramedDimensions({
    artworkWidth: 24,
    artworkHeight: 36,
    unit: 'in',
    frameBorderThickness: 2,
    frameBorderUnit: 'in',
  })
  assert.equal(framed.finalFramedWidth, 28, '24 + 2*2 = 28 in framed width')
  assert.equal(framed.finalFramedHeight, 40, '36 + 2*2 = 40 in framed height')
  console.log('✓ Framed dimensions calculation passes')

  // 5. User input formatting and edge cases
  assert.equal(formatValueForDisplay(24.0, 'in'), '24')
  assert.equal(formatValueForDisplay(24.5, 'in'), '24.5')
  assert.equal(formatDimensions(toCanonicalMm(24, 'in'), toCanonicalMm(36, 'in'), 'in'), '24 × 36 in')
  assert.equal(formatDimensions(toCanonicalMm(2, 'ft'), toCanonicalMm(3, 'ft'), 'ft'), '2 × 3 ft')
  console.log('✓ Formatting and display policy pass')

  // 6. Legacy dimension string parsing
  const parsed1 = parseLegacyDisplaySize('24x36')
  assert.equal(parsed1?.width, 24)
  assert.equal(parsed1?.height, 36)
  assert.equal(parsed1?.unit, 'in')

  const parsed2 = parseLegacyDisplaySize('60 x 90 cm')
  assert.equal(parsed2?.width, 60)
  assert.equal(parsed2?.height, 90)
  assert.equal(parsed2?.unit, 'cm')
  console.log('✓ Legacy dimension string parsing passes')

  console.log('All regression test assertions completed successfully!')
}

runRegressionSuite()
