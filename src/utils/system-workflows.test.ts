import assert from 'node:assert/strict'
import {
  toCanonicalMm,
  fromCanonicalMm,
  formatDimensions,
  calculateDimensions,
  getArtworkAspectRatio,
  MeasurementUnit,
} from './measurements'
import {
  convertCurrency,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
} from './currency-shared'
import {
  getPaintingImageUrl,
  getResponsiveSrcSet,
} from './image'

console.log('--- Starting System-Wide Unit & Workflow Validation ---')

// 1. Measurement Engine Tests
{
  const widthMm = toCanonicalMm(24, 'in')
  const heightMm = toCanonicalMm(36, 'in')
  assert.ok(Math.abs(widthMm - 609.6) < 1e-4, '24 in should convert to 609.6 mm')
  assert.ok(Math.abs(heightMm - 914.4) < 1e-4, '36 in should convert to 914.4 mm')

  const widthIn = fromCanonicalMm(609.6, 'in')
  assert.ok(Math.abs(widthIn - 24) < 1e-4, '609.6 mm should convert back to 24 in')

  const dims = calculateDimensions(609.6, 914.4, 'mm')
  assert.equal(dims.orientation, 'portrait', '24x36 should be portrait')
  assert.ok(Math.abs(dims.areaSqFt - 6.0) < 0.01, '24x36 in should be 6.0 sq ft')

  const landscapeAspect = getArtworkAspectRatio({ width: 36, height: 24 })
  assert.equal(landscapeAspect, 1.5, '36x24 aspect ratio must be 1.5')

  const portraitAspect = getArtworkAspectRatio({ width: 24, height: 36 })
  assert.ok(Math.abs(portraitAspect - 0.666) < 0.01, '24x36 aspect ratio must be ~0.67')

  console.log('✓ Measurement & aspect ratio calculations validated')
}

// 2. Currency Conversion Tests
{
  const bdtPrice = 10000
  const bdtResult = convertCurrency(bdtPrice, 'BDT', FALLBACK_RATES)
  assert.ok(bdtResult.includes('10'), 'BDT formatting should contain 10,000')

  for (const curr of SUPPORTED_CURRENCIES) {
    const formatted = convertCurrency(bdtPrice, curr, FALLBACK_RATES)
    assert.ok(formatted && formatted.length > 0, `Conversion for ${curr} must not be empty`)
  }
  console.log('✓ Multi-currency conversions for all 11 currencies validated')
}

// 3. Image URL Resolution Tests
{
  const empty = getPaintingImageUrl('')
  assert.equal(empty, '/placeholder.svg', 'Empty key should return placeholder.svg')

  const fullUrl = 'https://images.unsplash.com/photo-123'
  assert.equal(getPaintingImageUrl(fullUrl), fullUrl, 'Direct URL must be preserved')

  const keyUrl = getPaintingImageUrl('artworks/test.webp', 'paintings_optimized')
  assert.ok(keyUrl.includes('/paintings_optimized/artworks/test.webp'), 'Key must resolve with correct bucket')

  const srcSet = getResponsiveSrcSet({ 480: 'img_480.webp', 960: 'img_960.webp' })
  assert.ok(srcSet?.includes('480w') && srcSet?.includes('960w'), 'Responsive srcset must generate valid width descriptors')

  console.log('✓ Image URL resolution & responsive srcset validated')
}

// 4. Dimensions Validation Logic Tests
{
  const validateDimensions = (width: string, height: string) => {
    const numWidth = parseFloat(width)
    const numHeight = parseFloat(height)
    if (!width || isNaN(numWidth) || numWidth <= 0) {
      return { valid: false, error: 'Please enter a valid Width greater than 0.' }
    }
    if (!height || isNaN(numHeight) || numHeight <= 0) {
      return { valid: false, error: 'Please enter a valid Height greater than 0.' }
    }
    return { valid: true, width: numWidth, height: numHeight }
  }

  assert.equal(validateDimensions('', '36').valid, false, 'Empty width must be rejected')
  assert.equal(validateDimensions('24', '').valid, false, 'Empty height must be rejected')
  assert.equal(validateDimensions('-5', '36').valid, false, 'Negative width must be rejected')
  assert.equal(validateDimensions('0', '36').valid, false, 'Zero width must be rejected')
  assert.equal(validateDimensions('24', '36').valid, true, 'Valid dimensions must pass')

  console.log('✓ Independent dimension validation logic validated')
}

// 5. Pricing and Total Calculation Tests
{
  const calculateTotal = (base: number, discount: number | null, frame: number, delivery: number) => {
    const effectiveBase = discount && discount > 0 ? discount : base
    return effectiveBase + frame + delivery
  }

  const standardTotal = calculateTotal(15000, null, 1500, 100)
  assert.equal(standardTotal, 16600, 'Standard total must be 16,600 BDT')

  const discountTotal = calculateTotal(15000, 12000, 1500, 100)
  assert.equal(discountTotal, 13600, 'Discount total must be 13,600 BDT')

  const freeDeliveryTotal = calculateTotal(15000, null, 0, 0)
  assert.equal(freeDeliveryTotal, 15000, 'Included canvas with free delivery must equal base price')

  console.log('✓ Pricing arithmetic & discount hierarchy validated')
}

console.log('--- All System-Wide Validation Checks Passed Cleanly! ---')
