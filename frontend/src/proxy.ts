/**
 * proxy.ts (Next 16 — tên mới của middleware.ts): chặn người chưa đăng nhập
 * TRƯỚC khi trang render, thay vì render nguyên trang rồi mới bị client đá đi.
 *
 * Token nằm trong localStorage nên server không đọc được — pe-bridge.js ghi
 * kèm cookie cờ `pe_has_session=1` (không chứa token) mỗi lần login/refresh.
 * Đây là optimistic check đúng nghĩa của Next docs: cookie giả mạo chỉ cho
 * xem khung trang, mọi dữ liệu vẫn bị API chặn 401 và client guard đá về
 * /login như trước.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (!request.cookies.has('pe_has_session')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/lesson/:path*',
    '/practice/:path*',
    '/admin/:path*',
    '/questionaire/:path*',
  ],
};
