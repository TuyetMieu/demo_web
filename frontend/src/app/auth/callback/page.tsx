'use client';

// Trang MỚI (bắt buộc với kiến trúc cross-origin — MIGRATION_NOTES §OAuth):
// nhận JWT từ backend sau OAuth qua URL fragment, lưu token rồi về /dashboard.
import { useEffect } from 'react';

export default function OAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access = params.get('access');
    const refresh = params.get('refresh');
    if (access) {
      try {
        localStorage.setItem('pe_access', access);
        if (refresh) localStorage.setItem('pe_refresh', refresh);
      } catch {
        /* private mode */
      }
      // Cookie cờ phiên cho proxy.ts (trang này lưu token trực tiếp,
      // không đi qua setTokens của pe-bridge)
      try {
        document.cookie = 'pe_has_session=1; path=/; max-age=28800; SameSite=Lax';
      } catch {
        /* private mode */
      }
      window.location.replace('/dashboard');
    } else {
      window.location.replace('/login?error=google_failed');
    }
  }, []);

  return null;
}
