/**
 * seed-pe-lessons.ts — nạp 92 bài PE_Python_v2 đã chuyển đổi vào khoá `python`.
 *
 * NGUỒN: scripts/pe-convert/out/lessons.json, sinh bởi
 *   python scripts/pe-convert/convert.py
 * Mỗi bài ghi vào `lessons.content_json` theo schema studio-lesson/v1 —
 * đúng thứ mà StudioLesson.tsx đọc để dựng 4 màn hình S1–S4.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ, không ghi gì. Thêm --apply mới thực sự ghi.
 *  · Mọi bài đều đi qua validateStudioLesson() của backend trước; còn lỗi thì
 *    KHÔNG ghi bài nào cả (thà không nạp còn hơn nạp nửa vời).
 *  · Chỉ đụng bảng `lessons` của khoá `python` (và `courses.lessons` với
 *    --set-count). Không xoá dòng nào: bài nào ngoài phạm vi 92 bài PE vẫn còn
 *    nguyên trong DB.
 *  · 92 bài PE chiếm đúng bài 1..92. Bài dựng tay (List & Mutability) được
 *    đẩy xuống cuối giáo trình (bài 93) và chỉ cập nhật tiêu đề/module —
 *    nó không đọc content_json. Hằng PYTHON_LESSON_NUMBER ở
 *    frontend/src/lib/python-studio.ts phải khớp số này.
 *
 * CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/seed-pe-lessons.ts              # xem trước
 *   npx ts-node scripts/seed-pe-lessons.ts --apply      # ghi thật
 *   npx ts-node scripts/seed-pe-lessons.ts --apply --set-count
 *
 * SAU KHI ghi thật, nhớ cập nhật giáo trình hiển thị ở trang khoá học:
 * frontend/src/lib/curricula.json (khối CURRICULA.python) lấy từ
 * scripts/pe-convert/out/curriculum-python.json.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import {
  validateStudioLesson,
  type StudioLesson,
} from '../src/course-admin/studio-lesson.schema';

type Row = {
  lesson_code: string;
  sort_order: number;
  module: string;
  title: string;
  subtitle: string;
  estimated_minutes: number | null;
  content_json: StudioLesson;
};

const COURSE_ID = 'python';
const APPLY = process.argv.includes('--apply');
const SET_COUNT = process.argv.includes('--set-count');
const BUNDLE = join(__dirname, 'pe-convert', 'out', 'lessons.json');

async function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf8')) as {
    course_id: string;
    hand_built: { sort_order: number; module: string; title: string };
    lessons: Row[];
  };
  const rows = bundle.lessons;
  const handBuilt = bundle.hand_built;
  console.log(
    `Nguồn: ${BUNDLE}
${rows.length} bài PE -> bài 1..${rows.length}, khoá ` +
      `"${bundle.course_id}". Bài dựng tay "${handBuilt.title}" giữ chỗ bài ` +
      `${handBuilt.sort_order}.
`,
  );

  // 1) Kiểm tra nội dung TRƯỚC khi chạm vào DB.
  const invalid: string[] = [];
  for (const row of rows) {
    const errors = validateStudioLesson(row.content_json);
    if (errors.length)
      invalid.push(`${row.lesson_code} (bài ${row.sort_order}): ${errors.join(' | ')}`);
    if (row.sort_order === handBuilt.sort_order)
      invalid.push(`${row.lesson_code}: đang chiếm chỗ của bài dựng tay.`);
  }
  if (invalid.length) {
    console.error(`${invalid.length} bài KHÔNG hợp lệ — không ghi gì:`);
    invalid.forEach((line) => console.error('  ' + line));
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${rows.length} bài hợp lệ theo validateStudioLesson().`);

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const existing = await prisma.lesson.findMany({
      where: { courseId: COURSE_ID },
      select: { id: true, sortOrder: true, lessonCode: true, title: true },
    });
    const bySort = new Map(existing.map((l) => [l.sortOrder, l]));
    console.log(`Khoá ${COURSE_ID} đang có ${existing.length} bài trong DB.`);

    let updated = 0;
    let created = 0;
    for (const row of rows) {
      const current = bySort.get(row.sort_order);
      const data = {
        lessonCode: row.lesson_code,
        module: row.module,
        title: row.title,
        subtitle: row.subtitle,
        estimatedMinutes: row.estimated_minutes ?? null,
        contentJson: row.content_json as object,
      };
      if (current) {
        updated += 1;
        if (!APPLY) {
          console.log(
            `  [sửa] ${row.sort_order}: "${current.title}" -> "${row.title}" (${row.lesson_code})`,
          );
          continue;
        }
        await prisma.lesson.update({ where: { id: current.id }, data });
      } else {
        created += 1;
        if (!APPLY) {
          console.log(`  [thêm] ${row.sort_order}: "${row.title}" (${row.lesson_code})`);
          continue;
        }
        // xpReward không có default ở DB: bài mới lấy bằng mức chung của khoá.
        await prisma.lesson.create({
          data: { courseId: COURSE_ID, sortOrder: row.sort_order, xpReward: 10, ...data },
        });
      }
    }

    // Bài dựng tay: chỉ đặt lại tiêu đề/module cho khớp giáo trình, KHÔNG ghi
    // content_json (PythonStudio.tsx tự dựng nội dung).
    const handRow = bySort.get(handBuilt.sort_order);
    const handData = {
      lessonCode: 'python-studio-list',
      module: handBuilt.module,
      title: handBuilt.title,
      subtitle: 'Bản dựng tay theo thiết kế Figma',
    };
    if (handRow) {
      if (APPLY) await prisma.lesson.update({ where: { id: handRow.id }, data: handData });
      else console.log(`  [sửa] ${handBuilt.sort_order}: "${handRow.title}" -> "${handBuilt.title}" (dựng tay)`);
    } else {
      if (APPLY)
        await prisma.lesson.create({
          data: { courseId: COURSE_ID, sortOrder: handBuilt.sort_order, xpReward: 10, ...handData },
        });
      else console.log(`  [thêm] ${handBuilt.sort_order}: "${handBuilt.title}" (dựng tay)`);
    }

    const highest = Math.max(handBuilt.sort_order, ...rows.map((r) => r.sort_order));
    if (SET_COUNT) {
      if (APPLY) await prisma.course.update({ where: { id: COURSE_ID }, data: { lessonCount: highest } });
      console.log(`  courses.lessons = ${highest}${APPLY ? '' : ' (chạy thử)'}`);
    }

    console.log(
      `\n${APPLY ? 'Đã ghi' : 'Sẽ ghi'}: ${updated} bài sửa, ${created} bài thêm.` +
        (APPLY ? '' : '\nThêm --apply để ghi thật.'),
    );
    if (existing.length > highest)
      console.log(
        `Lưu ý: khoá còn ${existing.length - highest} bài cũ ở sort_order > ${highest}; ` +
          'script không xoá. Dùng --set-count để giáo trình chỉ còn ' +
          `${highest} bài, hoặc tự dọn nếu muốn xoá hẳn.`,
      );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
