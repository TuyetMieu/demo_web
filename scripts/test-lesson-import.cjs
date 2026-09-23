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
    // UI mới (LessonChrome): mỗi phần của bài là MỘT màn, thanh tiến độ trên
    // đầu đếm theo số màn chứ không phải 4 bước S.
    const cta = () => page.locator('footer button').last();
    const eyebrow = () => page.locator('main [class*="eyebrow"]').first();
    await cta().waitFor({ timeout: 30000 });
    await eyebrow().getByText(/NGỮ CẢNH/i).waitFor({ timeout: 30000 });
    assert(
      await page.getByText('Định dạng chuỗi với f-string').first().isVisible(),
      'phải hiện tiêu đề bài vừa nhập',
    );
    const totalScreens = await page.locator('header [class*="track"] > *').count();
    assert(totalScreens >= 8, `bài mẫu phải trải ra nhiều màn, đang có ${totalScreens}`);
    await snap('import-step-1');
    console.log(`Học viên mở được bài vừa nhập, ${totalScreens} màn: PASS`);

    // ---------- 6. Đi hết các màn trước sandbox ----------
    // Đáp án lấy thẳng từ content_json của chính bài vừa nhập, nên bộ test
    // không phải chép cứng lời giải.
    const options = () => page.locator('main [class*="optionsList"] > button');
    const answerMcq = async (index) => {
      await options().nth(index).click();
      await cta().click(); // Kiểm tra
      await page.getByText('Chính xác!').first().waitFor({ timeout: 10000 });
      await cta().click(); // Tiếp tục
    };

    for (let guard = 0; guard < 24; guard += 1) {
      const label = (await eyebrow().textContent()) || '';
      if (/THỬ THÁCH ĐỘC LẬP/i.test(label)) break;

      if (/DỰ ĐOÁN KẾT QUẢ/i.test(label)) {
        await answerMcq(lesson.step_1.predict.options.findIndex((o) => o.correct));
      } else if (/TRẮC NGHIỆM/i.test(label)) {
        const q = lesson.step_2.mcq[0];
        await answerMcq(q.correct ?? q.options.findIndex((o) => o.correct));
      } else if (/TÁI DỰ ĐOÁN/i.test(label)) {
        await answerMcq(lesson.step_3.counter.options.indexOf(lesson.step_3.counter.correct));
      } else if (/PHÂN LOẠI/i.test(label)) {
        for (const token of lesson.step_2.classify.tokens) {
          await page.getByRole('button', { name: token.label, exact: true }).first().click();
          const bin = lesson.step_2.classify.bins.find((b) => b.key === token.bin);
          await page.getByRole('button', { name: new RegExp(bin.title) }).first().click();
        }
        await cta().click();
        await page.getByText('Chính xác!').first().waitFor({ timeout: 10000 });
        await snap('import-step-2');
        await cta().click();
      } else if (/TỰ GIẢI THÍCH/i.test(label)) {
        await page
          .locator('main textarea')
          .first()
          .fill('f-string gọi format của đối tượng nên nhận được format spec :.2f khi định dạng.');
        await cta().click();
        await cta().click();
      } else if (/LẮP GHÉP/i.test(label)) {
        for (const slot of lesson.step_3.scaffold.slots) {
          await page.getByRole('button', { name: slot.answer, exact: true }).first().click();
          await page.locator('main [class*="codeBody"] button').nth(slot.n - 1).click();
        }
        await cta().click();
        await page.getByText('Chính xác!').first().waitFor({ timeout: 10000 });
        await snap('import-step-3');
        await cta().click();
      } else {
        await cta().click(); // màn chỉ để đọc
      }
      await page.waitForTimeout(400);
    }
    console.log('Đi hết các màn hỏi–đáp, chấm đúng từng màn: PASS');

    // ---------- 7. Sandbox chạy Python thật ----------
    const editor = page.locator('textarea[aria-label="Trình soạn mã Python"]');
    await editor.waitFor();
    await editor.fill('def format_scores(rows):\n    return ["sai"]');
    await page.getByRole('button', { name: /Nộp & Chấm điểm/ }).click();
    await page.getByText('✕ Chưa đạt').first().waitFor({ timeout: 90000 });
    console.log('Bộ chấm theo test của bài từ chối lời giải sai: PASS');

    await editor.fill(SOLUTION);
    await page.getByRole('button', { name: /Nộp & Chấm điểm/ }).click();
    await page.getByText('Đã lưu hoàn thành bài học.').waitFor({ timeout: 90000 });
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
      await page.getByText('Đang biên soạn').first().waitFor({ timeout: 20000 });
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
