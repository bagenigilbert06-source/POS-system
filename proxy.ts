import { NextRequest, NextResponse } from 'next/server';

const POS_AUTH_COOKIE = 'pesaby_pos_auth';

/** Keep a shared-terminal PIN session inside the cashier workspace. */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cashierWorkspaceRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/pos') ||
    pathname.startsWith('/dashboard/receipts') ||
    pathname.startsWith('/dashboard/attendance') ||
    pathname.startsWith('/dashboard/customers');
  if (request.cookies.has(POS_AUTH_COOKIE) && !cashierWorkspaceRoute) {
    return NextResponse.redirect(new URL('/dashboard/pos', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
