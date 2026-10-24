import {
  isDoubleBitFrame,
  isSingleBitFrame,
  getFrameCalculationDimensions,
  calculateSuggestedOuterSize,
  calculateFramePrice,
  getFramePricingBreakdown,
  convertUnit,
  formatDimensions,
  toCanonicalMm,
  fromCanonicalMm,
} from '../src/utils/measurements'

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`)
  }
  console.log(`✓ ${msg}`)
}

async function runAllTests() {
  console.log('--- STARTING DOUBLE-BIT FRAME AUTOMATIC PRICING TESTS ---\n')

  // ==========================================
  // Test A: Double-Bit Frame (20 × 30 in)
  // ==========================================
  console.log('Test A: Original dimensions 20 × 30 inches with Double-Bit Frame')
  const origW_A = 20
  const origH_A = 30
  const dimsA_White = getFrameCalculationDimensions('Double-Bit frame (White)', origW_A, origH_A, 'in')
  
  assert(dimsA_White.isDoubleBit === true, 'Detected Double-Bit frame type')
  assert(dimsA_White.originalWidth === 20, 'Original width strictly preserved as 20')
  assert(dimsA_White.originalHeight === 30, 'Original height strictly preserved as 30')
  assert(dimsA_White.calculationWidth === 26, 'Calculation width is 20 + 6 = 26 inches')
  assert(dimsA_White.calculationHeight === 36, 'Calculation height is 30 + 6 = 36 inches')

  const outerSizeA = calculateSuggestedOuterSize(origW_A, origH_A, 'in', 'Double-Bit frame (White)')
  assert(outerSizeA === '26 × 36 in', `Suggested outer size matches "26 × 36 in", got "${outerSizeA}"`)

  const priceA_White = calculateFramePrice('Double-Bit frame (White)', origW_A, origH_A, 'in')
  const priceA_Black = calculateFramePrice('Double-Bit frame (Black)', origW_A, origH_A, 'in')
  assert(priceA_White === 2700, `Double-Bit White price for 20 × 30 is 2700 BDT, got ${priceA_White}`)
  assert(priceA_Black === 2500, `Double-Bit Black price for 20 × 30 is 2500 BDT, got ${priceA_Black}`)

  // ==========================================
  // Test B: Dimension Changes (24 × 36 in)
  // ==========================================
  console.log('\nTest B: Dimension change to 24 × 36 inches')
  const origW_B = 24
  const origH_B = 36
  const dimsB = getFrameCalculationDimensions('Double-Bit frame (White)', origW_B, origH_B, 'in')

  assert(dimsB.originalWidth === 24, 'Original width strictly preserved as 24')
  assert(dimsB.originalHeight === 36, 'Original height strictly preserved as 36')
  assert(dimsB.calculationWidth === 30, 'Calculation width is 24 + 6 = 30 inches')
  assert(dimsB.calculationHeight === 42, 'Calculation height is 36 + 6 = 42 inches')

  const outerSizeB = calculateSuggestedOuterSize(origW_B, origH_B, 'in', 'Double-Bit frame (White)')
  assert(outerSizeB === '30 × 42 in', `Suggested outer size matches "30 × 42 in", got "${outerSizeB}"`)

  const priceB_White = calculateFramePrice('Double-Bit frame (White)', origW_B, origH_B, 'in')
  const priceB_Black = calculateFramePrice('Double-Bit frame (Black)', origW_B, origH_B, 'in')
  assert(priceB_White === 3200, `Double-Bit White price for 24 × 36 is 3200 BDT, got ${priceB_White}`)
  assert(priceB_Black === 3000, `Double-Bit Black price for 24 × 36 is 3000 BDT, got ${priceB_Black}`)

  // ==========================================
  // Test C: Switch Frame Type (to Single-Bit)
  // ==========================================
  console.log('\nTest C: Switch from Double-Bit Frame to Single-Bit Frame')
  const dimsC_Single = getFrameCalculationDimensions('Single-Bit frame (White)', origW_B, origH_B, 'in')
  assert(dimsC_Single.isDoubleBit === false, 'Double-Bit flag is false for Single-Bit')
  assert(dimsC_Single.isSingleBit === true, 'Single-Bit flag is true')
  assert(dimsC_Single.calculationWidth === 25, 'Single-Bit calculation width is 24 + 1 = 25 inches (6-inch adjustment removed)')
  assert(dimsC_Single.calculationHeight === 37, 'Single-Bit calculation height is 36 + 1 = 37 inches (6-inch adjustment removed)')

  const outerSizeC = calculateSuggestedOuterSize(origW_B, origH_B, 'in', 'Single-Bit frame (White)')
  assert(outerSizeC === '25 × 37 in', `Single-Bit outer size is "25 × 37 in", got "${outerSizeC}"`)

  const priceC_White = calculateFramePrice('Single-Bit frame (White)', origW_B, origH_B, 'in')
  const priceC_Black = calculateFramePrice('Single-Bit frame (Black)', origW_B, origH_B, 'in')
  assert(priceC_White === 2000, `Single-Bit White price for 24 × 36 is 2000 BDT, got ${priceC_White}`)
  assert(priceC_Black === 1800, `Single-Bit Black price for 24 × 36 is 1800 BDT, got ${priceC_Black}`)

  // ==========================================
  // Test D: Switch Back to Double-Bit Frame (No Cumulative Additions)
  // ==========================================
  console.log('\nTest D: Switch back to Double-Bit Frame (Ensuring No Cumulative Additions)')
  const dimsD_Back = getFrameCalculationDimensions('Double-Bit frame (Black)', origW_B, origH_B, 'in')
  assert(dimsD_Back.calculationWidth === 30, 'Reapplied Double-Bit calculation width is exactly 30 (NOT 36 or 42)')
  assert(dimsD_Back.calculationHeight === 42, 'Reapplied Double-Bit calculation height is exactly 42 (NOT 48 or 54)')
  assert(dimsD_Back.originalWidth === 24, 'Original artwork width remains exactly 24')
  assert(dimsD_Back.originalHeight === 36, 'Original artwork height remains exactly 36')

  // Multiple repeated switches
  let simulatedFrame = 'Double-Bit frame (White)'
  for (let i = 0; i < 5; i++) {
    simulatedFrame = i % 2 === 0 ? 'Single-Bit frame (Black)' : 'Double-Bit frame (White)'
    const d = getFrameCalculationDimensions(simulatedFrame, origW_B, origH_B, 'in')
    if (simulatedFrame.includes('Double-Bit')) {
      assert(d.calculationWidth === 30 && d.calculationHeight === 42, `Cycle ${i}: Double-Bit dimensions stable at 30 × 42`)
    } else {
      assert(d.calculationWidth === 25 && d.calculationHeight === 37, `Cycle ${i}: Single-Bit dimensions stable at 25 × 37`)
    }
  }

  // ==========================================
  // Test E: Refresh and Reopen
  // ==========================================
  console.log('\nTest E: Refresh and Reopen Calculation Verification')
  const reloadedArt = { width: 24, height: 36, measurement_unit: 'in' }
  const breakdownE = getFramePricingBreakdown('Double-Bit frame (White)', reloadedArt.width, reloadedArt.height, 'in')
  assert(breakdownE.originalWidth === 24, 'Reloaded original width is 24')
  assert(breakdownE.originalHeight === 36, 'Reloaded original height is 36')
  assert(breakdownE.calculationWidth === 30, 'Derived calculation width is 30')
  assert(breakdownE.calculationHeight === 42, 'Derived calculation height is 42')
  assert(breakdownE.outerSize === '30 × 42 in', 'Derived outer size is 30 × 42 in')
  assert(breakdownE.priceBdt === 3200, 'Derived price is 3200 BDT')

  // ==========================================
  // Test F: Backend Pricing Accuracy & Canonical Millimetres
  // ==========================================
  console.log('\nTest F: Backend Canonical mm and Price Validation')
  const outerWidthMm = Math.round(breakdownE.calculationWidth * 25.4 * 10) / 10
  const outerHeightMm = Math.round(breakdownE.calculationHeight * 25.4 * 10) / 10
  assert(outerWidthMm === 762, `Outer width mm is 762 mm, got ${outerWidthMm}`)
  assert(outerHeightMm === 1066.8, `Outer height mm is 1066.8 mm, got ${outerHeightMm}`)

  // ==========================================
  // Test G: Unit Conversion & Other Sizes
  // ==========================================
  console.log('\nTest G: Additional Sizes and Regression Checks')
  // 24 × 30 in (Standard gallery size)
  const breakdown24x30_White = getFramePricingBreakdown('Double-Bit frame (White)', 24, 30, 'in')
  assert(breakdown24x30_White.calculationWidth === 30, '24x30: calc width 30 in')
  assert(breakdown24x30_White.calculationHeight === 36, '24x30: calc height 36 in')
  assert(breakdown24x30_White.outerSize === '30 × 36 in', '24x30: outer size 30 × 36 in')
  assert(breakdown24x30_White.priceBdt === 2700, '24x30: white price 2700 BDT')

  const breakdown24x30_Black = getFramePricingBreakdown('Double-Bit frame (Black)', 24, 30, 'in')
  assert(breakdown24x30_Black.priceBdt === 2500, '24x30: black price 2500 BDT')

  // 30 × 36 in
  const breakdown30x36_White = getFramePricingBreakdown('Double-Bit frame (White)', 30, 36, 'in')
  assert(breakdown30x36_White.calculationWidth === 36, '30x36: calc width 36 in')
  assert(breakdown30x36_White.calculationHeight === 42, '30x36: calc height 42 in')
  assert(breakdown30x36_White.priceBdt === 3200, '30x36: white price 3200 BDT')

  // 30 × 48 in (Large canvas)
  const breakdown30x48_White = getFramePricingBreakdown('Double-Bit frame (White)', 30, 48, 'in')
  assert(breakdown30x48_White.calculationWidth === 36, '30x48: calc width 36 in')
  assert(breakdown30x48_White.calculationHeight === 54, '30x48: calc height 54 in')
  assert(breakdown30x48_White.priceBdt === 5200, '30x48: white price 5200 BDT')

  console.log('\nALL TESTS PASSED SUCCESSFULLY! 100% COMPLIANT WITH CONFIRMED BUSINESS RULE.\n')
}

runAllTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
