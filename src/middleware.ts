import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/pin', '/verify']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and Next internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Check for Firebase session cookie (Desactivado temporalmente para permitir acceso inicial)
  // const session = request.cookies.get('session')?.value
  // if (!session) {
  //   const loginUrl = new URL('/pin', request.url)
  //   loginUrl.searchParams.set('redirect', pathname)
  //   return NextResponse.redirect(loginUrl)
  // }

  // Protect /admin routes — role check is enforced in the layout too
  if (pathname.startsWith('/admin')) {
    // Role is validated in admin/layout.tsx via AuthContext
    // Middleware only blocks unauthenticated users
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
