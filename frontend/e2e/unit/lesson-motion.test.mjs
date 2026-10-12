/**
 * Unit test cho hoạt hình "code chạy từng bước" ở phần lý thuyết:
 *   scripts/pe-v3/motion.py  ->  public/static/motion/<khoá>.json  ->  src/lib/lesson-motion.ts
 *
 * Vì sao cần: file JSON là thứ SINH RA và được commit. Nếu giáo trình đổi mà quên chạy lại
 * `py scripts/pe-v3/motion.py`, màn hoạt hình sẽ chiếu vết của đoạn code cũ. Frontend đã tự
 * chặn bằng cách so `code`, nhưng test này làm CI báo sớm để người sửa bài biết mà sinh lại.
 *
 * Fixture là JSON bài THẬT (scripts/pe-v3/out{,-advanced}/lessons) — bẫy đã ghi ở AGENTS.md:
 * test trên dữ liệu tự bịa thì không chứng minh được gì.
 *
 * Chạy: cd frontend && npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { motionFor, recallFor } from '../../src/lib/lesson-motion.ts';
import { buildScreens } from '../../src/lib/studio-lesson.ts';

const FRONTEND = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PE = join(FRONTEND, '..', 'scripts', 'pe-v3');
const BUNDLES = { python: 'out', python_advanced: 'out-advanced' };

const motionFile = (course) =>
  JSON.parse(readFileSync(join(FRONTEND, 'public', 'static', 'motion', `${course}.json`), 'utf8'));
const lessons = (course) =>
  readdirSync(join(PE, BUNDLES[course], 'lessons'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(PE, BUNDLES[course], 'lessons', f), 'utf8')));

for (const course of Object.keys(BUNDLES)) {
  test(`${course}: motion.json khớp ví dụ minh hoạ hiện tại của từng bài (chưa cũ)`, () => {
    const file = motionFile(course);
    for (const row of lessons(course)) {
      const live = row.content_json.step_1.code?.source;
      const entry = file.lessons[String(row.sort_order)];
      assert.ok(entry, `thiếu mục cho bài ${row.lesson_code}`);
      if (entry.steps) {
        assert.equal(
          entry.code.trim(),
          live.trim(),
          `${row.lesson_code}: code trong motion.json lệch bài — chạy lại py scripts/pe-v3/motion.py`,
        );
        assert.ok(motionFor(file, row.sort_order, live), `${row.lesson_code}: motionFor phải nhận`);
      }
    }
  });

  test(`${course}: mỗi vết có bước đầu "Bắt đầu", dòng nằm trong code, cờ ch là boolean`, () => {
    const file = motionFile(course);
    let animated = 0;
    for (const [no, entry] of Object.entries(file.lessons)) {
      if (!entry.steps) continue;
      animated++;
      const lineCount = entry.code.replace(/\s+$/, '').split('\n').length;
      assert.equal(entry.steps[0].kind, 'start', `bài ${no}`);
      assert.ok(entry.steps.length >= 3 && entry.steps.length <= 16, `bài ${no}: ${entry.steps.length} bước`);
      for (const st of entry.steps.slice(1)) {
        assert.ok(st.line >= 1 && st.line <= lineCount, `bài ${no}: dòng ${st.line} ngoài code`);
        assert.ok(st.cap.length > 0 && st.cap.length <= 60, `bài ${no}: chú thích "${st.cap}"`);
        for (const fr of st.frames) for (const v of fr.vars) assert.equal(typeof v.ch, 'boolean');
      }
    }
    // 21/40 bài có ví dụ chạy được; bài thread/fork/file không có hoạt hình là chủ ý.
    assert.ok(animated >= 20, `chỉ ${animated} bài có hoạt hình`);
  });
}

test('motionFor: lệch code thì bỏ hoạt hình thay vì chiếu vết sai', () => {
  const file = motionFile('python');
  const live = file.lessons['1'].code;
  assert.ok(motionFor(file, 1, live));
  assert.equal(motionFor(file, 1, live + '\nprint("them")'), null);
  assert.equal(motionFor(file, 1, undefined), null);
  assert.equal(motionFor(null, 1, live), null);
});

test('recallFor: bài đầu không có gì để nhắc; số thứ tự có chỗ trống thì lấy bài gần nhất phía trước', () => {
  const file = motionFile('python');
  assert.equal(recallFor(file, 1), null);
  assert.equal(recallFor(file, 2).no, 1);
  // Khoá thật hiện liền số 1..40, nhưng bộ nhập PDF có thể bỏ số: nhắc bài gần nhất phía trước chứ
  // không phải "n-1" không tồn tại.
  const gappy = { course: 'x', lessons: { 19: { goal: 'a', title: 'A' }, 21: { goal: 'b', title: 'B' } } };
  assert.equal(recallFor(gappy, 21).no, 19);
  assert.equal(recallFor(gappy, 19), null);
  assert.equal(recallFor(null, 5), null);
});

test('buildScreens: mặc định giữ nguyên luồng cũ; bật extras thì thêm recall đầu và motion trước explain', () => {
  const b01 = JSON.parse(readFileSync(join(PE, 'out', 'lessons', '001-B01.json'), 'utf8')).content_json;
  const base = buildScreens(b01).map((s) => s.key);
  assert.ok(!base.includes('s0-recall') && !base.includes('s1-motion'));

  const withExtras = buildScreens(b01, { motion: true, recall: true }).map((s) => s.key);
  assert.equal(withExtras[0], 's0-recall');
  assert.equal(withExtras.indexOf('s1-motion') + 1, withExtras.indexOf('s1-explain'));
  // Ngoài hai màn thêm, thứ tự các màn còn lại không đổi — bản nháp lưu theo khoá màn nên không lệch.
  assert.deepEqual(
    withExtras.filter((k) => k !== 's0-recall' && k !== 's1-motion'),
    base,
  );
});

test('buildScreens: luồng game (Advanced) cũng nhận recall/motion, riêng boss thì không có motion', () => {
  const adv = allAdvanced();
  const normal = adv.find((c) => c.play && !c.play.boss && c.step_1.explain?.length);
  const keys = buildScreens(normal, { motion: true, recall: true }).map((s) => s.key);
  assert.equal(keys[0], 's0-recall');
  assert.ok(keys.includes('s1-motion'));
  const boss = adv.find((c) => c.play?.boss);
  if (boss) assert.ok(!buildScreens(boss, { motion: true }).some((s) => s.kind === 'motion'));
});

function allAdvanced() {
  return lessons('python_advanced').map((r) => r.content_json);
}
