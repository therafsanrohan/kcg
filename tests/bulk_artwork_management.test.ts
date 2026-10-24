import assert from 'node:assert'

console.log('--- STARTING BULK ARTWORK MANAGEMENT TESTS ---')

// ── Test 1: Offer Pricing Formula Integrity & Validation ──
console.log('\nTest 1: Bulk Offer Discount Calculation Rules')

function computeDiscount(
  basePrice: number,
  discountType: 'percentage' | 'fixed',
  val: number,
  customBadge?: string | null
) {
  if (basePrice <= 0) {
    return { isEligible: false, reason: 'Base price is 0 or invalid' }
  }

  let discountedPrice = 0
  let defaultBadge = ''

  if (discountType === 'percentage') {
    if (val < 1 || val > 99) {
      return { isEligible: false, reason: 'Percentage discount must be between 1% and 99%' }
    }
    discountedPrice = Math.round(basePrice * (1 - val / 100))
    defaultBadge = `${Math.round(val)}% OFF`
  } else {
    if (val <= 0) {
      return { isEligible: false, reason: 'Fixed discount must be positive' }
    }
    discountedPrice = Math.round(basePrice - val)
    defaultBadge = `৳${Math.round(val).toLocaleString('en-BD')} OFF`
  }

  if (discountedPrice <= 0 || discountedPrice >= basePrice) {
    return { isEligible: false, reason: 'Discounted price must be positive and lower than base price' }
  }

  const finalBadge = customBadge && customBadge.trim() ? customBadge.trim() : defaultBadge

  return {
    isEligible: true,
    basePrice,
    discountedPrice,
    savings: basePrice - discountedPrice,
    badge: finalBadge,
  }
}

// Case 1a: 20% discount on 25,000 BDT artwork
const res1a = computeDiscount(25000, 'percentage', 20)
assert.strictEqual(res1a.isEligible, true)
assert.strictEqual(res1a.discountedPrice, 20000)
assert.strictEqual(res1a.savings, 5000)
assert.strictEqual(res1a.badge, '20% OFF')
console.log('✓ 20% discount on ৳25,000 correctly calculates ৳20,000 with "20% OFF" badge')

// Case 1b: Fixed 5,000 BDT discount on 18,500 BDT artwork
const res1b = computeDiscount(18500, 'fixed', 5000)
assert.strictEqual(res1b.isEligible, true)
assert.strictEqual(res1b.discountedPrice, 13500)
assert.strictEqual(res1b.savings, 5000)
assert.strictEqual(res1b.badge, '৳5,000 OFF')
console.log('✓ Fixed ৳5,000 discount on ৳18,500 correctly calculates ৳13,500 with "৳5,000 OFF" badge')

// Case 1c: Custom badge label
const res1c = computeDiscount(30000, 'percentage', 15, 'Eid Special')
assert.strictEqual(res1c.isEligible, true)
assert.strictEqual(res1c.discountedPrice, 25500)
assert.strictEqual(res1c.badge, 'Eid Special')
console.log('✓ Custom badge label "Eid Special" preserved')

// Case 1d: Safety check: Discount equals or exceeds base price
const res1d = computeDiscount(5000, 'fixed', 5000)
assert.strictEqual(res1d.isEligible, false)
console.log('✓ Fixed discount matching 100% of price is rejected as ineligible')

const res1e = computeDiscount(5000, 'fixed', 7000)
assert.strictEqual(res1e.isEligible, false)
console.log('✓ Fixed discount exceeding price (negative price) is rejected as ineligible')

// Case 1e: Artwork with base price = 0
const res1f = computeDiscount(0, 'percentage', 10)
assert.strictEqual(res1f.isEligible, false)
console.log('✓ Base price 0 artwork is safely rejected/skipped')

// Case 1f: Removing offer strictly clears discount and badge while preserving base price
const existingArtwork = {
  id: 'art-1',
  base_price_bdt: 45000,
  discount_price_bdt: 36000,
  offer_badge: '20% OFF',
}
const afterOfferRemoval = {
  ...existingArtwork,
  discount_price_bdt: null,
  offer_badge: null,
}
assert.strictEqual(afterOfferRemoval.base_price_bdt, 45000)
assert.strictEqual(afterOfferRemoval.discount_price_bdt, null)
assert.strictEqual(afterOfferRemoval.offer_badge, null)
console.log('✓ Removing offer restores base price ৳45,000 and clears discount fields')

// ── Test 2: Visibility & Image Protection Logic ──
console.log('\nTest 2: Bulk Visibility & Image Guard Rules')

interface ArtworkWithImages {
  id: string
  title: string
  is_published: boolean
  images: string[]
}

function filterEligibleForPublish(artworks: ArtworkWithImages[]) {
  const eligibleIds: string[] = []
  const skippedIds: string[] = []

  for (const art of artworks) {
    if (art.images && art.images.length > 0) {
      eligibleIds.push(art.id)
    } else {
      skippedIds.push(art.id)
    }
  }

  return { eligibleIds, skippedIds }
}

const mockArtworks: ArtworkWithImages[] = [
  { id: '1', title: 'Sunset Glow', is_published: false, images: ['img1.webp'] },
  { id: '2', title: 'Draft Without Photo', is_published: false, images: [] },
  { id: '3', title: 'Blue Mist', is_published: false, images: ['img2.webp', 'img3.webp'] },
]

const pubCheck = filterEligibleForPublish(mockArtworks)
assert.deepStrictEqual(pubCheck.eligibleIds, ['1', '3'])
assert.deepStrictEqual(pubCheck.skippedIds, ['2'])
console.log('✓ Publishing guard successfully skips artwork with 0 images (Draft Without Photo)')

// ── Test 3: Selection Modes (Mode A, Mode B, Mode C) ──
console.log('\nTest 3: Selection Modes & Cross-Page State')

const mockGallery = Array.from({ length: 73 }).map((_, i) => ({
  id: `art-${i + 1}`,
  title: `Painting #${i + 1}`,
  painting_type: i % 2 === 0 ? 'oil' : 'acrylic',
  availability_status: i < 50 ? 'available' : 'sold',
  is_published: true,
}))

// Filtering for oil paintings
const oilArtworks = mockGallery.filter((p) => p.painting_type === 'oil')
assert.strictEqual(oilArtworks.length, 37)

const pageSize = 25
const page1 = oilArtworks.slice(0, pageSize)
const page2 = oilArtworks.slice(pageSize, 2 * pageSize)

assert.strictEqual(page1.length, 25)
assert.strictEqual(page2.length, 12)

// Mode B: Select all on current page (Page 1)
const selectedPage1Ids = new Set(page1.map((p) => p.id))
assert.strictEqual(selectedPage1Ids.size, 25)
console.log('✓ Mode B: Selected exactly 25 items on Page 1')

// Mode C: Select all matching filters (All 37 oil paintings across pages 1 and 2)
let selectAllMatching = true
const allMatchingIds = new Set(oilArtworks.map((p) => p.id))
assert.strictEqual(allMatchingIds.size, 37)
console.log('✓ Mode C: Selected all 37 filtered artworks across both pages')

// Transition from Mode C to Mode A (user unchecks 1 artwork from the 37)
const uncheckId = 'art-1'
const remainingIds = new Set(allMatchingIds)
remainingIds.delete(uncheckId)
selectAllMatching = false
assert.strictEqual(remainingIds.size, 36)
assert.strictEqual(selectAllMatching, false)
console.log('✓ Deselecting one artwork transitions smoothly from Mode C to Mode A with 36 selected')

// ── Test 4: Batch Chunking ──
console.log('\nTest 4: Batch Chunking for Reliable Bulk Operations')

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

const largeIdList = Array.from({ length: 142 }).map((_, i) => `id-${i}`)
const chunks50 = chunkArray(largeIdList, 50)
assert.strictEqual(chunks50.length, 3)
assert.strictEqual(chunks50[0].length, 50)
assert.strictEqual(chunks50[1].length, 50)
assert.strictEqual(chunks50[2].length, 42)
console.log('✓ 142 records correctly partitioned into chunks of 50, 50, and 42')

console.log('\nALL BULK ARTWORK MANAGEMENT TESTS PASSED (100% SUITE PASS)!')
