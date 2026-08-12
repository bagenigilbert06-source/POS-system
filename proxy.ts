import { NextRequest, NextResponse } from 'next/server'

const POS_AUTH_COOKIE = 'pesaby_pos_auth'

/** Keep a shared-terminal PIN session inside the cashier workspace. */
export function proxy(request: NextRequest) {
  if (request.cookies.has(POS_AUTH_COOKIE) && !request.nextUrl.pathname.startsWith('/dashboard/pos')) {
    return NextResponse.redirect(new URL('/dashboard/pos', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
