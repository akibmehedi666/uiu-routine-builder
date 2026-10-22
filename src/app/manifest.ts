import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UIU Routine Builder',
    short_name: 'Routine',
    description: 'Automated clash-free routine generator and section optimizer for United International University (UIU), Dhaka.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFBF7',
    theme_color: '#F26B21',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
