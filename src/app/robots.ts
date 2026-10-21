import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kazicanvasgallery.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/gallery', '/gallery/*'],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/invoice/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
