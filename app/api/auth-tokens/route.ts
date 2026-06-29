import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const requestHeaders = request.headers
  const cookieHeader = requestHeaders.get('cookie') ?? ''
  const authorizationHeader = requestHeaders.get('authorization') ?? ''
  const originHeader = requestHeaders.get('origin') ?? request.nextUrl.origin

  const session = await auth.api.getSession({
    headers: {
      cookie: cookieHeader,
      authorization: authorizationHeader,
      origin: originHeader,
      host: requestHeaders.get('host') ?? request.nextUrl.host,
    },
  })

  if (!session?.user || !session.session?.token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const tokenResponse = await fetch(new URL('/api/auth/token', request.nextUrl.origin), {
    method: 'GET',
    headers: {
      cookie: cookieHeader,
      authorization: authorizationHeader,
      origin: originHeader,
    },
    cache: 'no-store',
  })

  if (!tokenResponse.ok) {
    return NextResponse.json({ message: 'Unable to issue access token' }, { status: 502 })
  }

  const { token } = await tokenResponse.json()

  return NextResponse.json({
    accessToken: token,
    refreshToken: session.session.token,
    tokenType: 'Bearer',
    expiresIn: 60 * 15,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  })
}
