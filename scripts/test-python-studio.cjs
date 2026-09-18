const { chromium } = require('../frontend/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const origin = 'http://localhost:3000';
const backend = 'http://localhost:5000';
const credentials = {
  name: 'Python Studio Test',
  email: 'python.studio.20260918@example.com',
  password: 'PythonStudio!2026',
};
const solution =
  'def clean_and_boost_scores(raw_scores, bonus):\n    return [round(x + bonus, 2) for x in raw_scores if x >= 0]';
async function api(route, method = 'GET', body, access) {
  const response = await fetch(backend + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(`${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
(async () => {
  await fs.mkdir('python-studio-qa', { recursive: true });
  let auth;
  try {
    await api('/auth/register', 'POST', credentials);
  } catch (e) {
    if (!e.message.includes('sử dụng') && !e.message.includes('tồn tại'))
      throw e;
  }
  auth = await api('/auth/login', 'POST', {
    email: credentials.email,
    password: credentials.password,
  });
  assert(auth.access, 'login must return access token');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  await context.addCookies([
    { name: 'pe_has_session', value: '1', url: origin },
  ]);
  await context.addInitScript(({ access, refresh }) => {
    localStorage.setItem('pe_access', access);
    localStorage.setItem('pe_refresh', refresh);
    if (!sessionStorage.getItem('studio-test-initialized')) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('pe-python-studio-v1:'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.setItem('studio-test-initialized', '1');
    }
  }, auth);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const snap = async (name) => {
    await page.evaluate(async () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
      await new Promise(requestAnimationFrame);
    });
    const broken = await page
      .locator('img')
      .evaluateAll((imgs) =>
        imgs
          .filter(
            (i) =>
              !i.complete ||
              i.naturalWidth === 0 ||
              // Only images that actually get a layout box can be "collapsed".
              // Icons inside a breadcrumb or action hidden at mobile widths
              // have no client rects at all; those are intentional, not broken.
              (i.getClientRects().length > 0 &&
                i.getBoundingClientRect().width === 0),
          )
          .map((i) => i.src),
      );
    assert.deepEqual(broken, []);
    await page.screenshot({
      path: path.resolve('python-studio-qa', name + '.png'),
      fullPage: true,
    });
  };
  await page.goto(origin + '/lesson/python');
  await page
    .getByRole('heading', { name: /List & Mutability|Ngữ cảnh/ })
    .first()
    .waitFor();
  const enroll = page.getByRole('button', {
    name: 'Đăng ký khóa Python & bắt đầu',
  });
  if (await enroll.isVisible()) await enroll.click();
  await page.getByRole('heading', { name: /Ngữ cảnh/ }).waitFor();
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pe-python-studio-v1:'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  await page.getByRole('heading', { name: /Ngữ cảnh/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await snap('step-1');
  const next = () =>
    page.getByRole('button', { name: 'Tiếp tục bước tiếp theo' });
  assert(await next().isDisabled(), 'prediction gate');
  await page.getByRole('radio', { name: /B. Gốc: 4/ }).check();
  await page.getByRole('button', { name: /Xác nhận dự đoán/ }).click();
  await next().click();
  await snap('step-2');
  assert(await next().isDisabled(), 'stage 2 gate');
  await page.getByRole('radio', { name: /A. Biến b/ }).check();
  await page.getByRole('button', { name: 'Xác nhận phân tích' }).click();
  assert(await next().isDisabled());
  await page.getByRole('radio', { name: /B. Python tạo/ }).check();
  await page.getByRole('button', { name: 'Xác nhận phân tích' }).click();
  for (const op of ['.append(x)', '.extend(y)', '.sort()', '.pop()']) {
    await page.getByRole('button', { name: op, exact: true }).click();
    await page
      .getByRole('button', { name: 'Thả vào nhóm In-place', exact: true })
      .click();
  }
  for (const op of ['lst + [x]', 'sorted(lst)', 'lst[:]']) {
    await page.getByRole('button', { name: op, exact: true }).click();
    await page
      .getByRole('button', { name: 'Thả vào nhóm Pure', exact: true })
      .click();
  }
  await page.getByRole('button', { name: 'Kiểm tra phân loại' }).click();
  await page
    .getByLabel('Lời giải thích của bạn')
    .fill(
      'Hai biến giữ tham chiếu đến cùng một đối tượng list. List là đối tượng mutable nên thay đổi bên trong hàm được nhìn thấy bên ngoài.',
    );
  await page.getByRole('button', { name: 'Gửi lời giải thích' }).click();
  await next().click();
  await snap('step-3');
  await page
    .getByRole('button', { name: 'result = [] Slot 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'if val >= threshold: Slot 2', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'result.append(val) Slot 3', exact: true })
    .click();
  await page.getByRole('button', { name: 'Chạy hết', exact: true }).click();
  await page.getByRole('radio', { name: '2 phần tử' }).check();
  await next().click();
  await snap('step-4');
  const editor = page.getByRole('textbox', { name: 'Mã Python' });
  await editor.fill(
    'def clean_and_boost_scores(raw_scores, bonus):\n    return raw_scores',
  );
  await page.getByRole('button', { name: 'Chạy thử', exact: true }).click();
  await page
    .getByText('FAIL', { exact: true })
    .first()
    .waitFor({ timeout: 90000 });
  console.log('Real Python rejects incorrect solution: PASS');
  await editor.fill(solution);
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes('/api/lessons/11/complete') &&
      r.request().method() === 'POST',
    { timeout: 90000 },
  );
  await page
    .getByRole('button', { name: 'Nộp & Chấm điểm', exact: true })
    .click();
  const response = await saved;
  assert.equal(response.status(), 200);
  const completion = await response.json();
  console.log('Completion response:', JSON.stringify(completion));
  await page
    .getByText('Bài này đã hoàn thành và được lưu trên hệ thống.', {
      exact: false,
    })
    .waitFor();
  await snap('step-4-passed');
  const after = await api('/api/user', 'GET', undefined, auth.access);
  const savedAgain = page.waitForResponse(
    (r) =>
      r.url().includes('/api/lessons/11/complete') &&
      r.request().method() === 'POST',
    { timeout: 90000 },
  );
  await page
    .getByRole('button', { name: 'Nộp & Chấm điểm', exact: true })
    .click();
  const repeat = await (await savedAgain).json();
  assert.equal(repeat.xpGained, 0);
  assert.equal(repeat.alreadyCompleted, true);
  const afterAgain = await api('/api/user', 'GET', undefined, auth.access);
  assert.equal(afterAgain.xp, after.xp);
  console.log('Repeated submission does not grant XP twice: PASS');
  await editor.fill(
    'def clean_and_boost_scores(raw_scores, bonus):\n    original = raw_scores[:]\n    raw_scores.clear()\n    raw_scores.extend(original)\n    return [round(x + bonus, 2) for x in raw_scores if x >= 0]',
  );
  await page.getByRole('button', { name: 'Chạy thử', exact: true }).click();
  await page
    .getByText('FAIL', { exact: true })
    .first()
    .waitFor({ timeout: 90000 });
  console.log('Mutation followed by restoration is rejected: PASS');
  await editor.fill('while True:\n    pass');
  await page.getByRole('button', { name: 'Chạy thử', exact: true }).click();
  await page
    .getByText('Chương trình vượt giới hạn 5 giây.', { exact: false })
    .waitFor({ timeout: 90000 });
  assert(await editor.isEnabled());
  console.log('Infinite loop terminates and editor remains usable: PASS');
  await editor.fill(solution);
  await page.getByText('Đã lưu bản nháp trên máy', { exact: false }).waitFor();
  await page.waitForFunction(
    (code) =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith('pe-python-studio-v1:'))
        .some((k) => JSON.parse(localStorage.getItem(k)).code === code),
    solution,
  );
  const enrollments = await api('/api/enrolled', 'GET', undefined, auth.access);
  assert(
    enrollments.enrolled
      .find((e) => e.id === 'python' || e.courseId === 'python')
      .completedLessonNumbers.includes(11),
  );
  await page.reload();
  await editor.waitFor();
  assert.equal(await editor.inputValue(), solution);
  console.log('Reload restores code and backend completion: PASS');
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await snap('mobile-' + width);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert(
      geometry.scroll <= width + 1,
      `horizontal overflow ${JSON.stringify(geometry)}`,
    );
  }
  console.log('Responsive viewports 390px and 768px: PASS');
  const broken = await page
    .locator('img')
    .evaluateAll((imgs) =>
      imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src),
    );
  assert.deepEqual(broken, []);
  assert.deepEqual(errors, []);
  console.log('Browser errors and broken icons: NONE');
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(origin + '/courses/python');
  // Lesson rows live inside module accordions that start collapsed, so expand
  // every module first and assert against what a learner actually sees.
  const moduleHeads = page.locator('.edu-cd-module-hd');
  await moduleHeads.first().waitFor();
  for (let i = 0, total = await moduleHeads.count(); i < total; i += 1) {
    const head = moduleHeads.nth(i);
    const cls = (await head.getAttribute('class')) || '';
    if (!cls.includes('open')) await head.click();
  }
  const listLesson = page
    .locator('.edu-cd-lesson')
    .filter({ hasText: 'Danh sách (List)' });
  await listLesson.waitFor();
  assert((await listLesson.getAttribute('class')).includes('done'));
  const firstLesson = page
    .locator('.edu-cd-lesson')
    .filter({ hasText: 'Python là gì và tại sao cần học?' });
  assert(!(await firstLesson.getAttribute('class')).includes('done'));
  console.log('Course page marks lesson 11, not lesson 1: PASS');
  await browser.close();
  console.log('ALL LIVE CHECKS PASSED');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
