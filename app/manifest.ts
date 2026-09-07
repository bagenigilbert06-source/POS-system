import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pesaby POS',
    short_name: 'Pesaby',
    start_url: '/dashboard/pos',
    display: 'standalone',
    icons: [
      {
        src: '/icons/pesaby-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/pesaby-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
