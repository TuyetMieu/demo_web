/**
 * content-tools/sync-lesson-content.mjs
 * ─────────────────────────────────────────────────────────────
 * Port Node của db/seed_lesson_content.py (Flask) — Giai đoạn 4 migration.
 *
 * Đồng bộ nội dung bài học từ frontend/static/js/lesson_content*.js
 * vào DB (lessons.content_json + lesson_code/subtitle/estimated_minutes).
 * Nguồn chân lý vẫn là file JS (FE render trực tiếp); DB giữ bản sao cho
 * backend (quiz ôn tập đọc step_2, trang Kỹ năng, thống kê...).
 *
 * Giữ nguyên cơ chế bản Python:
 *  - idempotent, sync theo SHA-256: so hash JSON từng khóa với
 *    courses.content_meta->>'content_hash', trùng thì bỏ qua.
 *  - upsert theo (course_id, sort_order) — giữ nguyên lessons.id để không
 *    gãy FK lesson_progress.
 * Khác: eval JS bằng node:vm (V8 thật) — không cần engine giả lập nữa.
 *
 * Chạy:  node content-tools/sync-lesson-content.mjs
 *        (DATABASE_URL đọc từ backend/.env hoặc biến môi trường)
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import pg from 'pg';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // Programming_EDU_next/

const JS_FILES = [
  'frontend/static/js/lesson_content.js',
  'frontend/static/js/lesson_content_tc.js',
  'frontend/static/js/lesson_content_nc.js',
];

function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = join(ROOT, 'backend', '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  throw new Error('DATABASE_URL chưa được cấu hình (env hoặc backend/.env)');
}

function loadLessonContent() {
  // Sandbox y hệt MiniRacer cũ: chỉ có `window = {}` — file content là data
  // thuần gán vào window.LESSON_CONTENT, không cần DOM.
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const rel of JS_FILES) {
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    vm.runInContext(readFileSync(p, 'utf8'), sandbox, { filename: rel });
  }
  return sandbox.window.LESSON_CONTENT || {};
}

// JSON.stringify với key sort đệ quy — tương đương json.dumps(sort_keys=True)
// để hash ổn định giữa 2 bản Python/Node.
function stableStringify(v) {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(', ') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(
      (k) => JSON.stringify(k) + ': ' + stableStringify(v[k])
    ).join(', ') + '}';
  }
  return JSON.stringify(v);
}

async function main() {
  const data = loadLessonContent();
  const client = new pg.Client({ connectionString: loadEnv() });
  await client.connect();
  const synced = {};

  try {
    await client.query('BEGIN');
    for (const [courseId, course] of Object.entries(data)) {
      const lessons = course.lessons || [];
      if (!lessons.length) continue;

      const payload = stableStringify(lessons);
      const contentHash = createHash('sha256').update(payload, 'utf8').digest('hex');

      const { rows } = await client.query(
        "SELECT content_meta->>'content_hash' AS h FROM courses WHERE id=$1", [courseId]);
      if (!rows.length) continue; // khóa chưa có trong DB — không tự tạo
      if (rows[0].h === contentHash) continue;

      let n = 0;
      for (const lesson of lessons) {
        const code = lesson.id;
        const order = lesson.index;
        if (!code || !Number.isInteger(order)) continue;
        const upd = await client.query(
          `UPDATE lessons SET
               lesson_code       = $1,
               title             = COALESCE($2, title),
               subtitle          = $3,
               estimated_minutes = $4,
               xp_reward         = COALESCE($5, xp_reward),
               content_json      = $6::jsonb,
               updated_at        = now()
           WHERE course_id = $7 AND sort_order = $8`,
          [code, lesson.title ?? null, lesson.subtitle ?? null,
           lesson.estimated_minutes ?? null, lesson.xp_reward ?? null,
           JSON.stringify(lesson), courseId, order]);
        if (upd.rowCount === 0) {
          await client.query(
            `INSERT INTO lessons
                 (course_id, sort_order, lesson_code, title, subtitle,
                  estimated_minutes, xp_reward, content_json, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb, now())`,
            [courseId, order, code, lesson.title || `Bài ${order}`,
             lesson.subtitle ?? null, lesson.estimated_minutes ?? null,
             lesson.xp_reward || 0, JSON.stringify(lesson)]);
        }
        n += 1;
      }

      await client.query(
        `UPDATE courses SET content_meta =
             COALESCE(content_meta, '{}'::jsonb) || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify({
          content_hash: contentHash,
          total_lessons: lessons.length,
          accent_color: course.accent_color ?? null,
          synced_at: null,
        }), courseId]);
      await client.query(
        `UPDATE courses SET content_meta =
             jsonb_set(content_meta, '{synced_at}', to_jsonb(now()::text))
         WHERE id = $1`, [courseId]);
      synced[courseId] = n;
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }

  if (Object.keys(synced).length) {
    for (const [cid, n] of Object.entries(synced)) {
      console.log(`[SEED] ${cid}: ${n} bài đã sync content_json`);
    }
  } else {
    console.log('[SEED] Không có gì để sync (hash trùng)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
