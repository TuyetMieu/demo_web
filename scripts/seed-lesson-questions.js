/**
 * Nạp CÂU HỎI TRẮC NGHIỆM vào cột `lessons.content_json`.
 *
 * VÌ SAO CẦN: 451 bài học trong DB đều có `content_json` RỖNG (NULL). Bộ sinh
 * quiz ôn tập đọc `content_json.step_2` nên không bao giờ có gì để lấy — học
 * viên học đủ bài vẫn chỉ nhận "Chưa đủ câu hỏi để tạo quiz".
 *
 * Nội dung câu hỏi hiện chỉ tồn tại ở ba file phía TRÌNH DUYỆT
 * (frontend/public/static/js/lesson_content{,_tc,_nc}.js) — dùng để dựng bài
 * học, chưa từng được đưa vào cơ sở dữ liệu. Script này chuyển chúng sang.
 *
 * PHẠM VI: chỉ ba khoá Thiết kế CSDL có sẵn câu hỏi. Bốn khoá còn lại
 * (python/java/cpp/htmlcss) KHÔNG có nguồn câu hỏi nào trong repo — muốn quiz
 * chạy cho chúng thì phải soạn nội dung trước.
 *
 * AN TOÀN:
 *  · Mặc định CHẠY THỬ, không ghi gì. Thêm --apply mới thực sự ghi.
 *  · Chỉ ghi vào bài đang có content_json RỖNG; bài đã có nội dung được bỏ qua
 *    (in ra để biết), nên chạy lại nhiều lần không đè mất dữ liệu.
 *  · Chỉ đụng cột content_json. Không xoá, không sửa bảng nào khác.
 *
 * Chạy:
 *   node scripts/seed-lesson-questions.js            # xem trước
 *   node scripts/seed-lesson-questions.js --apply    # ghi thật
 */
require('dotenv/config');
const path = require('path');
const { PrismaClient } = require('../src/generated/prisma');
const { PrismaNeon } = require('@prisma/adapter-neon');

const APPLY = process.argv.includes('--apply');

const NGUON = [
  'lesson_content.js',
  'lesson_content_tc.js',
  'lesson_content_nc.js',
];

/**
 * Quy đổi câu hỏi từ dạng tác giả (cờ `correct` nằm ở TỪNG lựa chọn) sang dạng
 * bộ sinh quiz đọc được (`correct` là VỊ TRÍ lựa chọn đúng, `options` là mảng
 * chuỗi). Quan trọng: KHÔNG giữ lại object option — cờ correct của từng lựa
 * chọn mà lọt vào content_json thì sẽ bị gửi thẳng về trình duyệt.
 */
function quyDoiCau(q) {
  if (!q || typeof q.question !== 'string' || !Array.isArray(q.options)) return null;

  // Đã ở dạng chuẩn sẵn thì giữ nguyên.
  if (q.correct !== undefined) return q;

  const idx = q.options.findIndex((o) => o && typeof o === 'object' && o.correct === true);
  if (idx < 0) return null;

  return {
    question: q.question,
    options: q.options.map((o) =>
      o && typeof o === 'object' ? String(o.text ?? o.label ?? '') : String(o),
    ),
    correct: idx,
    explanation: q.options[idx]?.explanation ?? q.explanation ?? undefined,
  };
}

function docNguon() {
  const theoKhoa = new Map(); // courseId -> Map<sortOrder, mcq[]>

  for (const ten of NGUON) {
    global.window = global.window || {};
    require(path.join(__dirname, '..', 'frontend', 'public', 'static', 'js', ten));
  }

  const root = global.window.LESSON_CONTENT || {};
  for (const courseId of Object.keys(root)) {
    const lessons = root[courseId]?.lessons || {};
    const map = new Map();

    for (const key of Object.keys(lessons)) {
      const bai = lessons[key];
      const mcq = bai?.step_2?.mcq;
      if (!Array.isArray(mcq)) continue;

      const cau = mcq.map(quyDoiCau).filter(Boolean);
      if (!cau.length) continue;

      // `index` trong file khớp `sort_order` trong DB (đã đối chiếu tiêu đề).
      const sortOrder = Number(bai.index);
      if (!Number.isFinite(sortOrder)) continue;
      map.set(sortOrder, cau);
    }
    if (map.size) theoKhoa.set(courseId, map);
  }
  return theoKhoa;
}

(async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 30000,
    }),
  });

  try {
    const nguon = docNguon();
    console.log(APPLY ? '=== GHI THẬT (--apply) ===' : '=== CHẠY THỬ — không ghi gì ===');
    console.log();

    let tongGhi = 0;
    let tongCau = 0;
    let tongBoQua = 0;
    let tongKhongKhop = 0;

    for (const [courseId, map] of nguon) {
      const dbLessons = await prisma.lesson.findMany({
        where: { courseId },
        select: { id: true, sortOrder: true, title: true, contentJson: true },
        orderBy: { sortOrder: 'asc' },
      });
      const theoSort = new Map(dbLessons.map((l) => [l.sortOrder, l]));

      let ghi = 0;
      let cau = 0;
      let boQua = 0;
      let khongKhop = 0;

      for (const [sortOrder, mcq] of map) {
        const bai = theoSort.get(sortOrder);
        if (!bai) {
          khongKhop++;
          continue;
        }
        if (bai.contentJson) {
          boQua++;
          continue;
        }

        if (APPLY) {
          await prisma.lesson.update({
            where: { id: bai.id },
            data: { contentJson: { step_2: { mcq } } },
          });
        }
        ghi++;
        cau += mcq.length;
      }

      console.log(
        '  ' + courseId.padEnd(16) +
        String(ghi).padStart(3) + ' bài sẽ ghi | ' +
        String(cau).padStart(3) + ' câu | ' +
        'bỏ qua (đã có nội dung): ' + boQua +
        (khongKhop ? ' | KHÔNG khớp bài trong DB: ' + khongKhop : ''),
      );

      tongGhi += ghi;
      tongCau += cau;
      tongBoQua += boQua;
      tongKhongKhop += khongKhop;
    }

    console.log();
    console.log('  TỔNG: ' + tongGhi + ' bài, ' + tongCau + ' câu hỏi' +
      (tongBoQua ? ' | bỏ qua ' + tongBoQua : '') +
      (tongKhongKhop ? ' | không khớp ' + tongKhongKhop : ''));

    // Đủ câu để sinh đề chưa? Bộ sinh cần tối thiểu 5 câu trong pool.
    console.log();
    console.log('  Sau khi ghi, quiz sẽ chạy được cho: ' +
      [...nguon.keys()].join(', '));
    console.log('  Bốn khoá python/java/cpp/htmlcss KHÔNG có nguồn câu hỏi ' +
      'trong repo — vẫn chưa ôn được.');

    if (!APPLY) {
      console.log();
      console.log('  Chưa ghi gì. Chạy lại với --apply để thực hiện.');
    }
  } finally {
    await prisma.$disconnect();
  }
})();
