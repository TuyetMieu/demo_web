/**
 * seed-leaderboard-demo.mjs — bơm dữ liệu demo cho bảng xếp hạng.
 *
 * VÌ SAO CẦN: bảng xếp hạng mặc định là type=weekly, và LeaderboardService
 * tính SUM(xp_earned) từ bảng `user_daily_xp_logs` kể từ date_trunc('week').
 * Sửa mỗi `users.xp` KHÔNG làm đổi bảng tuần — cột đó chỉ dùng cho tab
 * "Streak"/"Bạn bè" (fetchTopBy). Nên script ghi cả hai chỗ.
 *
 * CHẠY:
 *   node scripts/seed-leaderboard-demo.mjs            # xem trước, không ghi
 *   node scripts/seed-leaderboard-demo.mjs --apply    # thực hiện
 *
 * PHẠM VI GHI (chỉ đúng 8 tài khoản liệt kê trong PLAN):
 *   - XOÁ các dòng user_daily_xp_logs của 8 tài khoản đó TRONG TUẦN NÀY
 *     (để không cộng dồn với dữ liệu test cũ), rồi ghi lại chuỗi ngày mới.
 *   - CẬP NHẬT users.xp / users.streak / users.last_study_date.
 *   - ĐỔI TÊN 5 tài khoản loadtest-00x (email giữ nguyên nên script load test
 *     vẫn chạy bình thường) để bảng xếp hạng không hiện "Load Test 1".
 * Không tạo, không xoá tài khoản nào. Toàn bộ nằm trong một transaction.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaNeon } from '@prisma/adapter-neon';

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30_000,
  }),
});

// Đầu tuần ISO (thứ 2) — khớp date_trunc('week') của Postgres.
const now = new Date();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

const days = [];
for (const d = new Date(monday); d <= now; d.setUTCDate(d.getUTCDate() + 1)) days.push(new Date(d));

/**
 * `week` = tổng XP tuần này (quyết định thứ hạng).
 * `rename` chỉ đặt cho tài khoản loadtest — tài khoản thật giữ nguyên tên.
 * Thứ tự này cho 'a' hạng 2, kém hạng nhất đúng 240 XP → thẻ phụ hiện
 * "Còn 240 XP nữa để vượt Minh Anh."
 */
const PLAN = [
  { id: 162, week: 1480, streak: 12, rename: 'Minh Anh' },
  { id: 142, week: 1240, streak: 7 },                       // a@gmail.com
  { id: 163, week: 1190, streak: 9, rename: 'Đức Huy' },
  { id: 164, week: 980, streak: 5, rename: 'Ngọc Lan' },
  { id: 186, week: 870, streak: 4 },                        // b@gmail.com
  { id: 165, week: 760, streak: 6, rename: 'Quang Vinh' },
  { id: 166, week: 640, streak: 3, rename: 'Bảo Trâm' },
  { id: 187, week: 520, streak: 2 },                        // c@gmail.com
];
const ids = PLAN.map((x) => x.id);

/** Chia tổng XP tuần thành từng ngày cho giống hoạt động thật. */
function splitByDay(total, n) {
  const base = Math.floor(total / n / 5) * 5;
  const out = Array(n).fill(base);
  out[n - 1] = total - base * (n - 1);
  return out;
}

const willDelete = await prisma.userDailyXpLog.findMany({
  where: { userId: { in: ids }, logDate: { gte: monday } },
});
const users = await prisma.user.findMany({
  where: { id: { in: ids } },
  select: { id: true, name: true, email: true, xp: true, streak: true },
});
const byId = Object.fromEntries(users.map((u) => [u.id, u]));

const missing = ids.filter((id) => !byId[id]);
if (missing.length) {
  console.error('Không tìm thấy user id:', missing.join(', '), '— sửa PLAN rồi chạy lại.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log('Đầu tuần:', monday.toISOString().slice(0, 10), '| số ngày seed:', days.length);
console.log(`\n— SẼ XOÁ ${willDelete.length} dòng user_daily_xp_logs (chỉ của ${ids.length} tài khoản dưới) —`);
console.table(
  willDelete.map((r) => ({ id: r.id, userId: r.userId, ngày: r.logDate.toISOString().slice(0, 10), xp: r.xpEarned })),
);
console.log('— SẼ GHI —');
console.table(
  PLAN.map((x) => ({
    id: x.id,
    email: byId[x.id].email,
    tên_cũ: byId[x.id].name,
    tên_mới: x.rename ?? '(giữ nguyên)',
    xp_cũ: byId[x.id].xp,
    xp_mới: x.week,
    streak_cũ: byId[x.id].streak,
    streak_mới: x.streak,
    chia_theo_ngày: splitByDay(x.week, days.length).join(' + '),
  })),
);

if (!APPLY) {
  console.log('\n[XEM TRƯỚC] chưa ghi gì. Chạy lại kèm --apply để thực hiện.');
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$transaction(async (tx) => {
  await tx.userDailyXpLog.deleteMany({ where: { userId: { in: ids }, logDate: { gte: monday } } });
  for (const x of PLAN) {
    const parts = splitByDay(x.week, days.length);
    await tx.userDailyXpLog.createMany({
      data: days.map((d, i) => ({ userId: x.id, logDate: d, xpEarned: parts[i] })),
    });
    await tx.user.update({
      where: { id: x.id },
      data: {
        xp: x.week,
        streak: x.streak,
        lastStudyDate: days[days.length - 1],
        ...(x.rename ? { name: x.rename } : {}),
      },
    });
  }
});

console.log('\n✓ Đã ghi xong. Mở lại trang Xếp hạng để xem.');
await prisma.$disconnect();
