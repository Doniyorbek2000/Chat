import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Protect dashboard routes
    if (path.startsWith('/') && !path.startsWith('/login') && !token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Super admin only routes
    const superAdminRoutes = ['/settings', '/admins']
    if (superAdminRoutes.some((r) => path.startsWith(r)) && token?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path.startsWith('/login')) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
