import { MetadataRoute } from 'next'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export const revalidate = 3600 // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch only published artworks (strict public filter)
  const { data: paintings } = await supabase
    .from('paintings')
    .select('slug, updated_at, created_at')
    .eq('is_published', true)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const artworkRoutes: MetadataRoute.Sitemap = (paintings || []).map((painting) => ({
    url: `${baseUrl}/gallery/${painting.slug}`,
    lastModified: painting.updated_at ? new Date(painting.updated_at) : new Date(painting.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  // Strictly return only public customer pages; NEVER include admin or api routes
  return [...staticRoutes, ...artworkRoutes]
}
