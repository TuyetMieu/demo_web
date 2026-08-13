'use client';

// base.html có nút "Đăng xuất" điều hướng thẳng tới /auth/logout (main.js giữ
// nguyên nên URL này phải tồn tại trên frontend): thu hồi refresh token ở
// backend (best-effort), xóa token local rồi về '/' — đúng hành vi Flask cũ
// (session.clear() + redirect '/').
import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    const origin = (window as unknown as { __PE_API_ORIGIN?: string }).__PE_API_ORIGIN || '';
    let refresh: string | null = null;
    try {
      refresh = localStorage.getItem('pe_refresh');
      localStorage.removeItem('pe_access');
      localStorage.removeItem('pe_refresh');
    } catch {
      /* private mode */
    }
    const done = () => window.location.replace('/');
    if (refresh) {
      fetch(`${origin}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      }).then(done, done);
    } else {
      done();
    }
  }, []);

  return null;
}
