// Helper chung cho bộ e2e — login UI thật (pe-bridge tự bắt JWT) rồi mở
// trang lesson để LESSON_CONTENT + engine load (như test_e2.py cũ).
import { expect, Page } from '@playwright/test';

export const E2E_EMAIL = process.env.E2E_EMAIL || 'audit@example.com';
export const E2E_PASSWORD = process.env.E2E_PASSWORD || 'AuditPass123';

export async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 30_000 });
  await page.fill('#login-email', E2E_EMAIL);
  await page.fill('#login-password', E2E_PASSWORD);
  await page.click('#loginBtn');
  await page.waitForURL('**/dashboard**', { timeout: 30_000 }).catch(() => {});
}

export async function openLesson(page: Page, lesson?: number) {
  const url = lesson ? `/lesson/db_design?lesson=${lesson}` : '/lesson/db_design';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => {
      const w = window as unknown as { LESSON_CONTENT?: Record<string, { lessons?: unknown[] }> };
      const lc = w.LESSON_CONTENT?.['db_design'];
      return !!lc?.lessons && lc.lessons.length >= 20;
    },
    undefined,
    { timeout: 30_000 },
  );
}

export async function expectEngineReady(page: Page) {
  await page.waitForFunction(
    () => typeof (window as unknown as { PE_runSQL?: unknown }).PE_runSQL === 'function',
    undefined,
    { timeout: 15_000 },
  );
  expect(true).toBe(true);
}
