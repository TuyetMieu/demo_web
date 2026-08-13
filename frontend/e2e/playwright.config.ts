// Cấu hình Playwright cho bộ e2e regression engine chấm SQL (port từ
// test_e2.py + regression_b6.py của bản Flask — quyết định chủ dự án 2026-07-14).
//
// Yêu cầu chạy: backend Django (cổng 9000) + frontend Next (cổng 3000) đang
// chạy, DB có content_json + tài khoản test (E2E_EMAIL/E2E_PASSWORD).
//   cd backend  && .venv/Scripts/python manage.py runserver 9000
//   cd frontend && pnpm dev
//   cd frontend && pnpm exec playwright test --config e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  retries: 0,
  workers: 1, // các test dùng chung tài khoản — chạy tuần tự
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    viewport: { width: 1600, height: 1000 },
    headless: true,
  },
});
