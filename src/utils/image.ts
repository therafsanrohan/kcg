/**
 * Helper to resolve the correct image URL for paintings.
 * Supports:
 * - Direct external URLs (http://, https://, Unsplash, Cloudinary, etc.)
 * - Supabase Storage keys (prepends the public storage URL)
 * - Safe fallback to a local vector placeholder
 */
export function getPaintingImageUrl(storageKey?: string | null): string {
  if (!storageKey || storageKey.trim() === '') {
    return '/placeholder.svg'
  }

  // If already a full URL, return directly
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jndcunflcastmtqmqyvx.supabase.co'
  return `${supabaseUrl}/storage/v1/object/public/paintings/${storageKey.replace(/^\/+/, '')}`
}
