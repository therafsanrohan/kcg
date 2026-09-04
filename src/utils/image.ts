/**
 * Helper to resolve the correct image URL for paintings.
 * Supports:
 * - Direct external URLs (http://, https://, Unsplash, Cloudinary, etc.)
 * - Supabase Storage keys (prepends the public storage URL)
 * - Safe fallback to a local vector placeholder
 */
export function getPaintingImageUrl(storageKey?: string | null, bucket: 'paintings' | 'paintings_optimized' | 'paintings_master' = 'paintings'): string {
  if (!storageKey || storageKey.trim() === '') {
    return '/placeholder.svg'
  }

  // If already a full URL, return directly
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jndcunflcastmtqmqyvx.supabase.co'
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${storageKey.replace(/^\/+/, '')}`
}

export function getResponsiveSrcSet(urls: any, bucket: 'paintings' | 'paintings_optimized' = 'paintings_optimized'): string | undefined {
  if (!urls) return undefined
  try {
    const parsedUrls = typeof urls === 'string' ? JSON.parse(urls) : urls
    const parts = []
    for (const [width, key] of Object.entries(parsedUrls)) {
      if (key && typeof key === 'string') {
        const url = getPaintingImageUrl(key, bucket)
        parts.push(`${url} ${width}w`)
      }
    }
    return parts.length > 0 ? parts.join(', ') : undefined
  } catch (e) {
    return undefined
  }
}
