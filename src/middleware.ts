// HRD Survey Pro - Middleware
// Firebase는 클라이언트 사이드 인증을 사용하므로
// 인증 체크는 각 페이지 컴포넌트에서 처리합니다.
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 회원가입 페이지로 접근 시 로그인 페이지로 리다이렉트
  if (request.nextUrl.pathname === "/signup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
