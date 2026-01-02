import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // 미들웨어는 나중에 구현
  // 현재는 기본적으로 통과
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/posts/:path*",
    "/api/upload/:path*",
  ],
}

