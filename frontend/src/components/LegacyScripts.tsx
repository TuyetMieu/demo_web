'use client';

/**
 * Nạp tuần tự các file JS legacy (copy nguyên trong /public/static/js) SAU khi
 * markup của trang đã mount — đúng vị trí <script> cuối <body> của template
 * Flask cũ. KHÔNG rewrite logic legacy; thứ tự mảng src = thứ tự <script> gốc.
 *
 * pe-bridge.js luôn được chèn đầu tiên (fetch/JWT/DOMContentLoaded bridge).
 * CDN script (mermaid, codemirror, confetti...) truyền qua cùng mảng src.
 */
import { useEffect } from 'react';

import { withAssetVersion } from '@/lib/assetVersion';

const BRIDGE = '/static/js/pe-bridge.js';

function loadOrdered(srcs: string[]): void {
  // Chèn TẤT CẢ thẻ script một lượt: async=false đảm bảo THỰC THI theo thứ tự
  // chèn nhưng trình duyệt TẢI song song — đúng ngữ nghĩa <script> cuối <body>
  // của template Flask cũ (bản await-từng-file trước đây tải tuần tự, chậm
  // hơn hẳn trên trang nhiều script/CDN).
  const pending: Promise<void>[] = [];
  for (const rawSrc of srcs) {
    // Gắn ?v= như PageStyles: file trong public/ không qua bundler nên khi sửa
    // JS legacy, trình duyệt vẫn dùng bản cache và markup mới chạy với hàm cũ.
    const src = withAssetVersion(rawSrc);
    // Script đã có (điều hướng client-side quay lại trang) → không nạp lại;
    // file legacy khai báo hàm/biến global, nạp 2 lần sẽ lỗi redeclare.
    if (document.querySelector(`script[data-pe-legacy="${src}"]`)) continue;
    pending.push(new Promise<void>((resolve) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = false;
      el.dataset.peLegacy = src;
      el.onload = () => resolve();
      el.onerror = () => {
        console.error('[LegacyScripts] không nạp được', src);
        resolve();
      };
      document.body.appendChild(el);
    }));
  }
  Promise.all(pending).then(() => document.dispatchEvent(new Event('pe:legacy-ready')));
}

export default function LegacyScripts({
  srcs,
  globals,
  prepare,
}: {
  srcs: string[];
  /** Globals script legacy cần (thay inline <script> Jinja gốc — React không
   *  thực thi <script> trong JSX). Được gán vào window TRƯỚC khi nạp script. */
  globals?: Record<string, unknown>;
  /** Setup DOM script legacy cần (vd: body data-attr) — chạy TRƯỚC khi nạp script. */
  prepare?: () => void;
}) {
  useEffect(() => {
    // KHÔNG dùng guard useRef "chạy 1 lần": StrictMode dev mount→unmount→remount
    // cùng instance nên ref giữ true → script không bao giờ được nạp lại
    // (bug enroll undefined). Dedup thật sự nằm ở querySelector[data-pe-legacy]
    // trong loadOrdered; chạy 2 lần an toàn vì script async=false thực thi
    // theo thứ tự chèn.
    if (globals) Object.assign(window, globals);
    if (prepare) prepare();
    loadOrdered([BRIDGE, ...srcs]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
