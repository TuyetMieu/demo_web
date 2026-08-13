/**
 * Seed dữ liệu khoá học/bài học vào Neon — bảng courses/lessons đang trống
 * hoàn toàn nên mọi luồng đăng ký/học đều 404 "Không tìm thấy khoá học".
 *
 * Nguồn dữ liệu: frontend/src/lib/curricula.json (nội dung khoá học đã dùng để
 * hiển thị FE từ trước) + metadata card của 3 khoá db_design lấy nguyên văn từ
 * fallback trong frontend/public/static/js/main.js (_DB_DESIGN_CARDS — comment
 * gốc ghi rõ "khớp seed DB", tức bộ dữ liệu này vốn được thiết kế để làm seed).
 *
 * An toàn chạy lại nhiều lần: dùng upsert theo id cố định, không tạo trùng.
 * Chạy: node prisma/seed-courses.js
 */
const path = require('path');
const fs = require('fs');
const REPO = __dirname.replace(/\\prisma$/, '');

require(path.join(REPO, 'node_modules/dotenv')).config({ path: path.join(REPO, '.env'), quiet: true });
const { PrismaClient } = require(path.join(REPO, 'src/generated/prisma'));
const { PrismaNeon } = require(path.join(REPO, 'node_modules/@prisma/adapter-neon'));
const { scryptSync, randomBytes } = require('crypto');

const curricula = JSON.parse(
  fs.readFileSync(path.join(REPO, 'frontend/src/lib/curricula.json'), 'utf8'),
).CURRICULA;

// Mật khẩu ngẫu nhiên không dùng để đăng nhập — tài khoản giảng viên chỉ tồn
// tại để làm chủ sở hữu khoá học (courses.instructor_id NOT NULL, có FK).
function placeholderHash() {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(randomBytes(24).toString('hex'), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt:32768:8:1$${salt}$${key.toString('hex')}`;
}

const INSTRUCTORS = {
  python: { email: 'nguyenvanan@programmingedu.local', name: 'Nguyễn Văn An' },
  cpp: { email: 'tranminhkhoa@programmingedu.local', name: 'Trần Minh Khoa' },
  java: { email: 'lethihuong@programmingedu.local', name: 'Lê Thị Hương' },
  htmlcss: { email: 'phamthilan@programmingedu.local', name: 'Phạm Thị Lan' },
  db_design: { email: 'leminhtuan@programmingedu.local', name: 'Lê Minh Tuấn' },
};

// Metadata card — 4 khoá lập trình suy ra từ curricula.json; 3 khoá DB Design
// lấy nguyên văn từ _DB_DESIGN_CARDS trong main.js (đã ghi chú "khớp seed DB").
const COURSES = [
  {
    id: 'python', instructorKey: 'python', language: 'python', level: 'beginner',
    title: 'Lập trình Python từ Zero đến Hero',
    subtitle: 'Từ cú pháp cơ bản đến AI/Machine Learning',
    tag: 'NGÔN NGỮ LẬP TRÌNH', color: '#3776AB', accentColor: '#FFD43B',
    duration: '~40 giờ',
  },
  {
    id: 'cpp', instructorKey: 'cpp', language: 'c++', level: 'beginner',
    title: 'Lập trình C/C++ nền tảng',
    subtitle: 'Con trỏ, cấu trúc dữ liệu và OOP từ gốc',
    tag: 'NGÔN NGỮ LẬP TRÌNH', color: '#00599C', accentColor: '#004482',
    duration: '~35 giờ',
  },
  {
    id: 'java', instructorKey: 'java', language: 'java', level: 'intermediate',
    title: 'Java & Spring Boot chuyên nghiệp',
    subtitle: 'OOP, Spring Boot và kiến trúc Microservices',
    tag: 'NGÔN NGỮ LẬP TRÌNH', color: '#E76F00', accentColor: '#5382A1',
    duration: '~45 giờ',
  },
  {
    id: 'htmlcss', instructorKey: 'htmlcss', language: 'html/css', level: 'beginner',
    title: 'HTML & CSS — Nền tảng Web',
    subtitle: 'Xây giao diện web responsive từ con số 0',
    tag: 'FRONTEND', color: '#E44D26', accentColor: '#264DE4',
    duration: '~30 giờ',
  },
  {
    id: 'db_design', instructorKey: 'db_design', language: 'sql', level: 'beginner',
    title: 'Thiết kế CSDL: Từ ý tưởng đến hệ dữ liệu hoàn chỉnh',
    subtitle: 'Phần 1 — Xây nền tảng GameHub',
    description: 'Từ thực thể đầu tiên đến hệ CSDL hoàn chỉnh: ER Diagram, khóa chính/ngoại, chuẩn hóa 1NF→4NF và SQL ứng dụng thực tế.',
    tag: 'DATABASE & BACKEND', color: '#06B6D4', accentColor: '#0E7490',
    duration: '~6 giờ', fixedLessonCount: 20,
  },
  {
    id: 'db_design_tc', instructorKey: 'db_design', language: 'sql', level: 'intermediate',
    title: 'SQL nâng cao, Dữ liệu lớn & Hiệu năng',
    subtitle: 'GameHub Community — mạng xã hội của gamers',
    description: 'Advanced SQL (Trigger, Procedure, Recursive CTE), Big Data & Analytics, Storage & Indexing — xây mạng cộng đồng gamers của GameHub.',
    tag: 'DATABASE & BACKEND', color: '#0C4A6E', accentColor: '#38BDF8',
    duration: '~7 giờ', fixedLessonCount: 21,
  },
  {
    id: 'db_design_nc', instructorKey: 'db_design', language: 'sql', level: 'advanced',
    title: 'Bên trong Database Engine: Tối ưu, Giao dịch & Phục hồi',
    subtitle: 'GameHub Marketplace — sàn giao dịch vật phẩm',
    description: 'Query Processing & Optimization, Concurrency Control, Crash Recovery — vận hành chợ giao dịch triệu người dùng của GameHub.',
    tag: 'DATABASE & BACKEND', color: '#7C2D12', accentColor: '#FB923C',
    duration: '~9 giờ', fixedLessonCount: 25,
  },
];

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const report = { instructors: 0, courses: 0, lessons: 0 };

  // Bước 1: đảm bảo mỗi giảng viên có 1 user (upsert theo email cố định).
  const instructorIds = {};
  for (const [key, info] of Object.entries(INSTRUCTORS)) {
    const user = await prisma.user.upsert({
      where: { email: info.email },
      update: {},
      create: {
        name: info.name,
        email: info.email,
        role: 'instructor',
        password: placeholderHash(),
        isVerified: true,
      },
      select: { id: true },
    });
    instructorIds[key] = user.id;
    report.instructors++;
  }

  // Bước 2: upsert từng khoá học + bài học tương ứng.
  for (const def of COURSES) {
    const curriculum = curricula[def.id === 'db_design_tc' || def.id === 'db_design_nc' ? 'db_design' : def.id];
    const modules = curriculum?.modules ?? [];

    // db_design/db_design_tc/db_design_nc chỉ có 1 bộ curriculum dùng chung
    // (module ER/FD/Application Design) — dùng đúng số bài thật cho db_design
    // gốc; 2 khoá còn lại (tc/nc) chưa có nội dung chi tiết theo từng bài nên
    // sinh placeholder đúng SỐ LƯỢNG đã công bố (21/25), admin sửa nội dung sau
    // qua /api/admin/lessons.
    const lessonRows = [];
    if (def.fixedLessonCount && def.id !== 'db_design') {
      for (let i = 1; i <= def.fixedLessonCount; i++) {
        lessonRows.push({
          module: `Bài ${i}`, title: `Bài ${i}`, lessonCode: `${def.id}-${i}`,
          sortOrder: i, xpReward: 10,
        });
      }
    } else {
      let sortOrder = 1;
      for (const mod of modules) {
        for (const lessonTitle of mod.lessons) {
          lessonRows.push({
            module: mod.title, title: lessonTitle, lessonCode: `${def.id}-${sortOrder}`,
            sortOrder: sortOrder, xpReward: 10,
          });
          sortOrder++;
        }
      }
    }

    const lessonCount = def.fixedLessonCount ?? lessonRows.length;
    const contentMeta = {
      subtitle: def.subtitle ?? '',
      description: def.description ?? (curriculum?.skills ?? []).join('. '),
      duration: def.duration ?? '',
      tag: def.tag ?? '',
      image: `static/images/${def.id}.svg`,
      color: def.color ?? '#3B82F6',
    };

    await prisma.course.upsert({
      where: { id: def.id },
      update: {
        title: def.title,
        level: def.level,
        language: def.language,
        accentColor: def.accentColor,
        lessonCount,
        contentMeta,
        isPublished: true,
      },
      create: {
        id: def.id,
        title: def.title,
        level: def.level,
        language: def.language,
        accentColor: def.accentColor,
        rating: 4.8,
        lessonCount,
        instructorId: instructorIds[def.instructorKey],
        xp_reward: 100,
        isPublished: true,
        contentMeta,
      },
    });
    report.courses++;

    for (const row of lessonRows) {
      await prisma.lesson.upsert({
        where: { courseId_lessonCode: { courseId: def.id, lessonCode: row.lessonCode } },
        update: {
          title: row.title, module: row.module, sortOrder: row.sortOrder,
          xpReward: row.xpReward,
        },
        create: {
          courseId: def.id, title: row.title, module: row.module,
          lessonCode: row.lessonCode, sortOrder: row.sortOrder, xpReward: row.xpReward,
        },
      });
      report.lessons++;
    }
  }

  console.log('SEED OK ' + JSON.stringify(report));
  await prisma.$disconnect();
}

main().catch((e) => { console.error('SEED ERR', e); process.exit(1); });
