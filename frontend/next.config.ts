import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// CSP cho các trang frontend (CSP của NestJS chỉ áp lên response API, không
// bảo vệ được trang nơi JS thực sự chạy).
//
// script-src còn 'unsafe-inline' vì JS legacy dùng ~70 handler nội tuyến
// (onclick=...) trong chuỗi innerHTML — nonce không áp được cho thuộc tính
// handler. Dù vậy policy này vẫn chặn: nạp script từ domain lạ, gửi dữ liệu
// (fetch/XHR) tới domain lạ, <base> injection, plugin, và bị nhúng iframe.
// Khi JS legacy đã chuyển hết sang React thì bỏ 'unsafe-inline' và dùng nonce.
//
// 'wasm-unsafe-eval': Pyodide (Python Studio) biên dịch WebAssembly.
//
// connect-src KHÔNG còn cdn.jsdelivr.net: runtime Pyodide đã nằm trong repo
// (frontend/public/pyodide/v0.27.7/) nên hai worker Python nạp .wasm +
// python_stdlib.zip bằng fetch CÙNG ORIGIN. Domain này vẫn phải ở lại
// script-src và style-src vì lớp legacy còn nạp mermaid, svg-pan-zoom,
// canvas-confetti và CodeMirror 5 (js + css) từ đó — xem dashboard/page.tsx,
// LessonDbDesign.tsx.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'inline-speculation-rules' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  // Avatar OAuth (Google/Facebook) là URL https bất kỳ.
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${API_ORIGIN}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    // Ghim gốc dự án vào chính thư mục frontend/.
    // Turbopack tự dò gốc bằng cách đi ngược lên tìm lockfile; ở repo này thư
    // mục cha (backend NestJS) có package-lock.json nên nó có thể chọn nhầm
    // D:\EDU\PE_nest_next_js làm gốc. Khi đó id module thành
    // "[project]/frontend/src/app/..." lệch với React Client Manifest →
    // /dashboard trả 500 "Could not find the module ... in the React Client
    // Manifest". Ghim cứng ở đây thì id luôn là "[project]/src/app/...".
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
