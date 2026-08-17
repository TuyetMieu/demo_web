/**
 * add-streak.mjs — cộng (hoặc trừ) streak cho một tài khoản để test thủ công
 * (vd. lời chào "Kỷ luật thép đó nha..." trên dashboard chỉ hiện khi streak > 3).
 *
 * Hỏi tương tác qua dòng lệnh: tài khoản nào, cộng thêm bao nhiêu — không cần
 * nhớ cú pháp tham số. Cũng nhận tham số dòng lệnh để chạy nhanh, bỏ qua hỏi:
 *
 *   node scripts/add-streak.mjs                  # hỏi tương tác
 *   node scripts/add-streak.mjs a@gmail.com 5     # cộng thẳng 5, không hỏi lại
 *   node scripts/add-streak.mjs 142 -3            # trừ 3 (test streak thấp)
 *
 * Tài khoản có thể nhập bằng EMAIL hoặc ID số.
 *
 * Đồng thời set lastStudyDate = HÔM NAY (theo múi giờ nghiệp vụ Asia/Ho_Chi_Minh,
 * xem StreakService.toStudyDate) — nếu không set, lần hoàn thành bài học tiếp
 * theo của tài khoản test sẽ thấy gap > 1 ngày so với lastStudyDate cũ và RESET
 * streak về 1, làm streak vừa cộng tay biến mất ngay khi thử học thử.
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaNeon } from '@prisma/adapter-neon';

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// Khớp đúng StreakService.toStudyDate: "hôm nay" tính theo giờ Việt Nam, ghi
// xuống cột @db.Date dưới dạng UTC midnight — lệch chỗ này thì gap tính sai.
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE ?? 'Asia/Ho_Chi_Minh';
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
function todayStudyDate() {
  const [y, m, d] = dayFormatter.format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => rl.question(q);

function findUser(identifier) {
  const asId = Number(identifier);
  const where = Number.isInteger(asId) && String(asId) === identifier.trim()
    ? { id: asId }
    : { email: identifier.trim().toLowerCase() };
  return prisma.user.findUnique({
    where,
    select: { id: true, name: true, email: true, streak: true, lastStudyDate: true },
  });
}

async function run() {
  const [argAccount, argAmount] = process.argv.slice(2);

  const accountInput = argAccount || await ask('Tài khoản (email hoặc id): ');
  const user = await findUser(accountInput);
  if (!user) {
    console.error(`Không tìm thấy tài khoản "${accountInput}".`);
    return;
  }

  console.log(
    `\n→ #${user.id} ${user.name ?? '(chưa đặt tên)'} <${user.email}> ` +
    `— streak hiện tại: ${user.streak}` +
    (user.lastStudyDate ? `, học gần nhất: ${user.lastStudyDate.toISOString().slice(0, 10)}` : ', chưa học buổi nào'),
  );

  const amountInput = argAmount ?? await ask('Cộng thêm bao nhiêu streak (số âm để trừ): ');
  const delta = Number(amountInput);
  if (!Number.isInteger(delta) || delta === 0) {
    console.error(`Giá trị không hợp lệ: "${amountInput}" — phải là số nguyên khác 0.`);
    return;
  }

  const newStreak = Math.max(0, user.streak + delta);
  console.log(`\nStreak: ${user.streak} → ${newStreak} (lastStudyDate → ${todayStudyDate().toISOString().slice(0, 10)})`);

  const confirm = argAmount
    ? 'y' // đã truyền sẵn tham số dòng lệnh = tự tin, không hỏi lại
    : (await ask('Ghi vào DB? (y/N): ')).trim().toLowerCase();
  if (confirm !== 'y' && confirm !== 'yes') {
    console.log('Đã huỷ, không ghi gì.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { streak: newStreak, lastStudyDate: todayStudyDate() },
  });
  console.log(`✓ Đã cập nhật streak cho #${user.id} <${user.email}>.`);
}

run()
  .catch((e) => { console.error('ERR', e.message); process.exitCode = 1; })
  .finally(async () => { rl.close(); await prisma.$disconnect(); });
