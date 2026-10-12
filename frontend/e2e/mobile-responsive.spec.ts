// Spec mobile responsive (memory-plan/08) — viewport 375×812.
//
// TIÊU CHÍ (DoD): không tràn ngang + nội dung chính hiển thị ở mọi trang.
//
// Chỉ còn các trang KHÔNG cần đăng nhập: trang chủ (lưới khóa học) và trang chi
// tiết từng khóa. Bản trước đo thêm login/register/dashboard/questionaire — các
// trang đó đã gỡ khỏi frontend nên spec đi theo, và nhờ không còn gọi
// `helpers.login()` nên chạy được trong CI mà không cần backend.
import { test, expect, Page } from '@playwright/test';

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

// ── Trang chủ + chi tiết khóa học ───────────────────────────────────────────
// Một đại diện cho mỗi nhánh render: khóa React thuần (python), khóa dùng JS
// legacy (db_design), khóa có giáo trình dài nhất (java — 110 bài, dễ tràn nhất).
for (const path of ['/', '/courses/python', '/courses/java', '/courses/db_design']) {
  test(`không tràn ngang: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500); // chờ font/script legacy dựng xong nội dung
    await expectNoHorizontalOverflow(page, path);
  });
}

test('trang chủ liệt kê đủ khóa và mỗi ô dẫn tới đúng trang chi tiết', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tiles = page.locator('a[href^="/courses/"]');
  await expect(tiles).toHaveCount(8);
  const hrefs = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(hrefs).toContain('/courses/python');
  expect(hrefs).toContain('/courses/db_design_nc');

  await page.locator('a[href="/courses/python"]').click();
  await expect(page).toHaveURL(/\/courses\/python$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Python');
});
