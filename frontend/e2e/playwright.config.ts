// Cấu hình Playwright cho bộ e2e regression engine chấm SQL (port từ
// test_e2.py + regression_b6.py của bản Flask — quyết định chủ dự án 2026-07-14).
//
// Frontend là site tĩnh (HTML/CSS/JS thuần, không build step) nên Playwright tự
// khởi động serve.py; chỉ cần backend Django chạy sẵn ở cổng 9000 với DB có
// content_json + tài khoản test (E2E_EMAIL/E2E_PASSWORD):
//   cd backend  && .venv/Scripts/python manage.py runserver 9000
//   cd frontend/e2e && npm install && npx playwright install chromium
//   cd frontend/e2e && npm test
//
// Đặt E2E_BASE_URL nếu muốn trỏ sang server tĩnh khác (khi đó webServer bị bỏ qua).
import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  // unit/*.test.mjs là test Node độc lập (chạy bằng `npm run test:unit`), KHÔNG
  // phải spec Playwright: tên khớp testMatch mặc định nên runner sẽ nạp nó, và
  // process.exit() ở cuối file giết luôn tiến trình trước khi spec thật kịp chạy.
  testIgnore: ['unit/**'],
  timeout: 120_000,
  retries: 0,
  workers: 1, // các test dùng chung tài khoản — chạy tuần tự
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 1000 },
    headless: true,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'python ../serve.py 3000',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
