import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vibro',
    short_name: 'Vibro',
    description: 'Premium social discovery and professional networking platform.',
    start_url: '/discover',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0B',
    theme_color: '#C9A84C',
    categories: ['social', 'lifestyle', 'networking'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
