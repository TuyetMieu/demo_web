// Spec mobile responsive (memory-plan/08) — viewport 375×812.
//
// TIÊU CHÍ (DoD): không tràn ngang + nội dung chính hiển thị ở mọi trang/tab.
// DỰ ĐOÁN TRƯỚC KHI SỬA (TDD đỏ): các tab dashboard (skills/forum/leaderboard)
// và trang standalone (courses/[id], interface) tràn ngang do grid cột cứng
// (sk-grid repeat(4,1fr), dash-row minmax(0,1fr) 280px, bảng leaderboard);
// login/register dự kiến pass (đã có breakpoint auth.css).
import { test, expect, Page } from '@playwright/test';
import { login } from './helpers';

test.use({ viewport: { width: 375, height: 812 } });

type Offender = { sel: string; left: number; right: number };
type Audit = { vw: number; scrollW: number; offenders: Offender[] };

/** Đo tràn ngang: scrollWidth + phần tử visible vượt mép phải/trái viewport
 *  (bỏ qua phần tử nằm trong container tự cuộn ngang hoặc bị ancestor clip). */
async function auditMobile(page: Page): Promise<Audit> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: { sel: string; left: number; right: number }[] = [];
    const isClippedOrScrollable = (el: Element): boolean => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const cs = getComputedStyle(node);
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true;
        node = node.parentElement;
      }
      return false;
    };
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      if (r.right <= vw + 2 && r.left >= -2) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
      if (isClippedOrScrollable(el)) return;
      offenders.push({
        sel:
          el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : ''),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    });
    return { vw, scrollW: document.documentElement.scrollWidth, offenders: offenders.slice(0, 10) };
  });
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const a = await auditMobile(page);
  expect
    .soft(a.scrollW, `${label}: scrollWidth ${a.scrollW} > viewport ${a.vw}`)
    .toBeLessThanOrEqual(a.vw + 1);
  expect
    .soft(a.offenders, `${label}: phần tử tràn viewport → ${JSON.stringify(a.offenders)}`)
    .toHaveLength(0);
}

// ── Trang public (không cần đăng nhập) ──────────────────────────────────────
for (const path of ['/', '/login', '/register']) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200); // chờ font/anim ổn định
    await expectNoHorizontalOverflow(page, path);
  });
}

// ── App chính sau đăng nhập: từng tab SPA của dashboard ─────────────────────
test('dashboard + các tab SPA hiển thị đủ, không tràn ngang', async ({ page }) => {
  await login(page);
  await page.waitForSelector('.topbar', { timeout: 30_000 });

  // Topbar phải hiện và dùng được (nội dung "đầy đủ": nav/search/bell còn đó)
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('#topbar-nav .nav-btn[data-page="courses"]')).toBeVisible();

  // main.js (legacy) nạp async sau khi React mount — chờ navigate() sẵn sàng
  await page.waitForFunction(() => typeof (window as unknown as { navigate?: unknown }).navigate === 'function', undefined, { timeout: 30_000 });

  // Liệt kê mọi tab .page[id^=page-] rồi đi từng tab
  const tabs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.page[id^="page-"]')).map((el) =>
      el.id.replace(/^page-/, ''),
    ),
  );
  expect(tabs.length, 'phải có ít nhất 4 tab SPA').toBeGreaterThanOrEqual(4);

  for (const tab of tabs) {
    await page.evaluate((t) => (window as unknown as { navigate: (p: string) => void }).navigate(t), tab);
    await page.waitForTimeout(1500); // chờ fetch + render tab
    // Tab đang active phải có nội dung nhìn thấy được
    const visibleArea = await page.evaluate(() => {
      const active = document.querySelector('.page.active');
      if (!active) return 0;
      const r = active.getBoundingClientRect();
      return r.width * r.height;
    });
    expect.soft(visibleArea, `tab ${tab}: page.active phải có kích thước`).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page, `tab ${tab}`);
  }
});

// ── Trang standalone nặng nội dung ──────────────────────────────────────────
test('trang course detail (db_design) không tràn ngang', async ({ page }) => {
  await login(page);
  await page.goto('/courses/db_design', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await expectNoHorizontalOverflow(page, '/courses/db_design');
});

test('trang questionaire không tràn ngang', async ({ page }) => {
  await login(page);
  await page.goto('/questionaire', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expectNoHorizontalOverflow(page, '/questionaire');
});
