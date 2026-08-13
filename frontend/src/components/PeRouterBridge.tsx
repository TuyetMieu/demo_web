'use client';

/**
 * Cầu nối router của Next cho JS legacy.
 *
 * JS legacy điều hướng bằng `window.location = url` — cách đó nạp lại TOÀN BỘ
 * trang (9 file CSS + 9 file JS + gọi lại mọi API), thấy rõ một nhịp trắng
 * màn hình. Component này gắn `window.__peRouterPush` để `peGo()` trong
 * main.js đi bằng client-side routing thay thế; khi component chưa mount
 * (trang legacy thuần) peGo tự rơi về cách cũ.
 */
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PeRouterBridge({ remountKey }: { remountKey?: string }) {
  const router = useRouter();

  useEffect(() => {
    const w = window as unknown as { __peRouterPush?: (url: string) => void };
    w.__peRouterPush = (url: string) => router.push(url);
    return () => { delete w.__peRouterPush; };
  }, [router]);

  useEffect(() => {
    if (!remountKey) return;
    // LegacyScripts lọc trùng theo src nên khi quay lại một route đã ghé,
    // file JS cũ KHÔNG chạy lại và DOMContentLoaded không bắn lần hai — React
    // dựng lại markup rỗng mà không ai đổ dữ liệu vào. Bỏ qua lần mount đầu
    // (lúc đó DOMContentLoaded lo rồi, chạy cả hai sẽ fetch gấp đôi).
    const w = window as unknown as Record<string, boolean>;
    const flag = `__peMounted_${remountKey}`;
    if (w[flag]) document.dispatchEvent(new Event('pe:page-remount'));
    w[flag] = true;
  }, [remountKey]);

  return null;
}
