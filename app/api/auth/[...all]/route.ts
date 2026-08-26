import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// Pass the Better Auth instance to the Next.js adapter. This keeps the route
// compatible with the adapter's current object API and guarantees that every
// auth endpoint is resolved below /api/auth by this catch-all route.
export const { GET, POST } = toNextJsHandler(auth)
