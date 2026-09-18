/*
 * Kiểm thử luồng: admin nhập bài từ .md/.pdf -> lưu vào content_json ->
 * học viên học bài đó trong Studio -> hoàn thành ghi đúng sort_order.
 *
 * Chạy khi cả hai server đang bật:
 *   node scripts/test-lesson-import.cjs
 * Ảnh chụp lưu vào python-studio-qa/.
 */
const { chromium } = require('../frontend/node_modules/@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const origin = 'http://localhost:3000';
const backend = 'http://localhost:5000';
const admin = {
  email: 'admin.import.test@example.com',
  password: 'AdminImport!2026',
};
const student = {
  name: 'Python Studio Test',
  email: 'python.studio.20260918@example.com',
  password: 'PythonStudio!2026',
};
const SOLUTION =
  'def format_scores(rows):\n    return [f"{name}: {score:.2f}" for name, score in rows]';

async function api(route, method = 'GET', body, access) {
  const res = await fetch(backend + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`${route}: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

async function upload(file, name, access) {
  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(file)]), name);
  const res = await fetch(backend + '/api/admin/lessons/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: form,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  await fs.mkdir('python-studio-qa', { recursive: true });

  // ---------- 1. Nhập từ Markdown ----------
  const adminAuth = await api('/auth/login', 'POST', admin);
  assert(adminAuth.access, 'admin phải đăng nhập được');

  const md = await upload('samples/lesson-fstring.md', 'lesson-fstring.md', adminAuth.access);
  assert.equal(md.status, 200, `import .md: ${JSON.stringify(md.body).slice(0, 300)}`);
  assert.equal(md.body.parser, 'template', 'file đúng mẫu phải dùng parser template');
  const lesson = md.body.lesson;
  assert.equal(lesson.schema, 'studio-lesson/v1');
  assert.equal(lesson.title, 'Định dạng chuỗi với f-string');
  for (const key of ['step_1', 'step_2', 'step_3', 'step_4'])
    assert(lesson[key], `thiếu ${key}`);
  assert.equal(lesson.step_1.predict.options.length, 4);
  assert.equal(lesson.step_2.mcq.length, 1);
  assert.equal(lesson.step_2.classify.tokens.length, 6);
  assert.equal(lesson.step_3.scaffold.slots.length, 1);
  assert.equal(lesson.step_4.tests.length, 3);
  console.log('Nhập Markdown theo mẫu template: PASS');

  // ---------- 2. Nhập từ PDF ----------
  const pdf = await upload('samples/lesson-fstring.pdf', 'lesson-fstring.pdf', adminAuth.access);
  assert.equal(pdf.status, 200, `import .pdf: ${JSON.stringify(pdf.body).slice(0, 300)}`);
  assert.equal(pdf.body.parser, 'template', 'PDF xuất từ cùng nội dung vẫn khớp template');
  assert.equal(pdf.body.lesson.step_4.tests.length, 3);
  assert.equal(pdf.body.lesson.source.kind, 'pdf');
  console.log('Nhập PDF (bóc lớp text + parse): PASS');

  // ---------- 3. File lệch mẫu: lỗi rõ ràng, không 500 ----------
  const junk = path.join('python-studio-qa', 'tmp-junk.md');
  await fs.writeFile(junk, 'Chỉ là vài dòng văn xuôi, không có heading S1..S4.\n');
  const odd = await upload(junk, 'tmp-junk.md', adminAuth.access);
  await fs.rm(junk, { force: true });
  assert(odd.status !== 500, `file lệch mẫu không được trả 500 (nhận ${odd.status})`);
  assert(
    odd.status === 200 || odd.status === 400 || odd.status === 502,
    `trạng thái bất ngờ: ${odd.status}`,
  );
  if (odd.status !== 200) {
    const text = JSON.stringify(odd.body);
    assert(text.length > 10, 'lỗi phải kèm thông điệp cho admin');
  }
  console.log(`File lệch mẫu xử lý gọn (HTTP ${odd.status}): PASS`);

  // ---------- 4. Lưu vào khoá học ----------
  const { lessons } = await api(
    '/api/admin/courses/python/lessons',
    'GET',
    undefined,
    adminAuth.access,
  );
  // completeLesson chặn lessonNo > course.lessons, mà lessons = COUNT(*) sau khi
  // thêm -> dùng ngay vị trí kế tiếp để số thứ tự luôn hợp lệ.
  const sortOrder = lessons.length + 1;
  const created = await api(
    '/api/admin/lessons',
    'POST',
    {
      course_id: 'python',
      sort_order: sortOrder,
      title: lesson.title,
      module: 'Kiểm thử nhập bài',
      lesson_code: `import-test-${Date.now()}`,
      xp_reward: 40,
      content: JSON.stringify(lesson),
    },
    adminAuth.access,
  );
  const lessonId = created.lesson.id;
  console.log(`Lưu bài vào khoá python ở sort_order ${sortOrder}: PASS`);

  let browser;
  try {
    const studentAuth = await api('/auth/login', 'POST', {
      email: student.email,
      password: student.password,
    });

    // ---------- 5. Học viên mở bài ----------
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addCookies([{ name: 'pe_has_session', value: '1', url: origin }]);
    await context.addInitScript(({ access, refresh }) => {
      localStorage.setItem('pe_access', access);
      localStorage.setItem('pe_refresh', refresh);
      Object.keys(localStorage)
        .filter((k) => k.startsWith('pe-studio-lesson-v1:'))
        .forEach((k) => localStorage.removeItem(k));
    }, studentAuth);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));

    const snap = async (name) => {
      const broken = await page.locator('img').evaluateAll((imgs) =>
        imgs
          .filter(
            (i) =>
              !i.complete ||
              i.naturalWidth === 0 ||
              (i.getClientRects().length > 0 &&
                i.getBoundingClientRect().width === 0),
          )
          .map((i) => i.src),
      );
      assert.deepEqual(broken, [], `ảnh hỏng ở ${name}`);
      await page.screenshot({
        path: path.resolve('python-studio-qa', name + '.png'),
        fullPage: true,
      });
    };

    await page.goto(`${origin}/lesson/python?lesson=${sortOrder - 1}`);
    await page.getByRole('heading', { name: /Ngữ cảnh/ }).waitFor({ timeout: 30000 });
    assert(
      await page.getByText('Định dạng chuỗi với f-string').first().isVisible(),
      'phải hiện tiêu đề bài vừa nhập',
    );
    assert.equal(await page.locator('[class*="stepper"] [class*="stepMark"]').count(), 4);
    await snap('import-step-1');
    console.log('Học viên mở được bài vừa nhập, đủ 4 bước: PASS');

    // ---------- 6. Đi hết 4 bước ----------
    await page.getByRole('radio').nth(1).check(); // đáp án B
    await page.getByRole('button', { name: /Xác nhận dự đoán/ }).click();
    await page.getByRole('button', { name: /Tiếp tục bước tiếp theo/ }).click();

    await page.getByRole('heading', { name: /Phân loại thao tác/ }).waitFor();
    await page.getByRole('radio').nth(1).check(); // trắc nghiệm đáp án B
    await page.getByRole('button', { name: /Xác nhận phân tích/ }).click();
    const bins = page.locator('[class*="binGrid"] > div');
    for (const token of lesson.step_2.classify.tokens) {
      const target = lesson.step_2.classify.bins.findIndex((b) => b.key === token.bin);
      const chip = page
        .locator('[class*="tokenQueue"] [class*="tokens"] button')
        .filter({ hasText: token.label })
        .first();
      await chip.dragTo(bins.nth(target));
    }
    await page.getByRole('button', { name: /Kiểm tra phân loại/ }).click();
    await page
      .locator('textarea')
      .first()
      .fill('f-string gọi format của đối tượng nên nhận được format spec :.2f khi định dạng.');
    await page.getByRole('button', { name: /Gửi lời giải thích/ }).click();
    await snap('import-step-2');
    await page.getByRole('button', { name: /Tiếp tục bước tiếp theo/ }).click();

    await page.getByRole('heading', { name: /Khung lắp ghép/ }).waitFor();
    await page
      .locator('[class*="tokenBank"] button')
      .filter({ hasText: lesson.step_3.scaffold.slots[0].answer })
      .first()
      .click();
    await page.getByRole('button', { name: /Kiểm tra khung mã/ }).click();
    await page
      .getByRole('radio', { name: lesson.step_3.counter.correct })
      .check();
    await snap('import-step-3');
    await page.getByRole('button', { name: /Tiếp tục bước tiếp theo/ }).click();

    // ---------- 7. Sandbox chạy Python thật ----------
    const editor = page.locator('textarea[aria-label="Trình soạn mã Python"]');
    await editor.waitFor();
    await editor.fill('def format_scores(rows):\n    return ["sai"]');
    await page.getByRole('button', { name: /Nộp & Chấm điểm/ }).click();
    await page.getByText(/đạt$/).first().waitFor({ timeout: 90000 });
    const failing = await page.locator('[class*="testResult"]').count();
    assert(failing > 0, 'phải hiện kết quả từng test case');
    assert(
      (await page.getByText('✕').count()) > 0,
      'lời giải sai phải có test trượt',
    );
    console.log('Bộ chấm theo test của bài từ chối lời giải sai: PASS');

    await editor.fill(SOLUTION);
    await page.getByRole('button', { name: /Nộp & Chấm điểm/ }).click();
    await page
      .getByText('Đã lưu hoàn thành bài học.')
      .waitFor({ timeout: 90000 });
    await snap('import-step-4');
    console.log('Lời giải đúng chạy qua Pyodide và lưu hoàn thành: PASS');

    // ---------- 8. Hoàn thành ghi đúng sort_order ----------
    const progress = await api(
      `/api/courses/python/lessons/${sortOrder}/content`,
      'GET',
      undefined,
      studentAuth.access,
    );
    assert.equal(progress.completed, true, 'backend phải ghi nhận hoàn thành bài này');
    const enrolled = await api('/api/enrolled', 'GET', undefined, studentAuth.access);
    const python = enrolled.enrolled.find((e) => e.id === 'python' || e.courseId === 'python');
    assert(
      python.completedLessonNumbers.includes(sortOrder),
      `bài ${sortOrder} phải nằm trong danh sách hoàn thành`,
    );
    console.log(`Hoàn thành ghi đúng bài ${sortOrder} (không phải bài 11): PASS`);

    // ---------- 9. Responsive + không lỗi ----------
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await snap('import-mobile-' + width);
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert(
        geometry.scroll <= width + 1,
        `tràn ngang ở ${width}px: ${JSON.stringify(geometry)}`,
      );
    }
    assert.deepEqual(errors, [], 'không được có lỗi JS');
    console.log('Responsive 390/768 và không lỗi trình duyệt: PASS');

    // ---------- 10. Bài chưa có nội dung ----------
    const blank = lessons.find((l) => !l.contentJson || !l.contentJson.step_1);
    if (blank) {
      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.goto(`${origin}/lesson/python?lesson=${blank.sortOrder - 1}`);
      await page.getByText('ĐANG BIÊN SOẠN').waitFor({ timeout: 20000 });
      console.log('Bài chưa có nội dung hiện trạng thái rỗng tử tế: PASS');
    }
  } finally {
    if (browser) await browser.close();
    // Dọn bài test để không đụng vào giáo trình thật.
    await api(`/api/admin/lessons/${lessonId}`, 'DELETE', undefined, adminAuth.access);
    console.log('Đã xoá bài kiểm thử khỏi khoá học.');
  }

  console.log('ALL IMPORT CHECKS PASSED');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
