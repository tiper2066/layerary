import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // 홈 페이지는 항상 접근 가능
  if (pathname === '/') {
    return NextResponse.next()
  }

  // 로그인/회원가입 페이지는 항상 접근 가능
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next()
  }

  // API 라우트는 별도 처리
  if (pathname.startsWith('/api/auth/register')) {
    return NextResponse.next()
  }

  // API 라우트는 별도 처리 (인증 필요 시)
  if (pathname.startsWith('/api/')) {
    // 인증이 필요한 API는 각각에서 처리
    return NextResponse.next()
  }

  // 로그인하지 않은 사용자는 홈으로 리다이렉트
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 관리자 라우트는 관리자만 접근 가능
  if (pathname.startsWith('/admin')) {
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

