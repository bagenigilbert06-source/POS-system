/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dashboard pages are server-rendered, but short-lived client router caching
  // makes sidebar navigation feel immediate after a page has been visited or
  // prefetched. Server actions call revalidatePath after writes, which clears
  // this cache when a sale, product, or stock level changes.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
};

export default nextConfig;
