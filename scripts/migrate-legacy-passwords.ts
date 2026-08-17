/**
 * migrate-legacy-passwords.ts — nâng cấp MỘT LẦN mật khẩu legacy còn lưu plaintext.
 *
 * BỐI CẢNH (W1-01): dữ liệu chuyển từ bản Django cũ còn user lưu mật khẩu
 * plaintext trực tiếp trong cột users.password. Hiện chỉ được nâng cấp "dần"
 * khi user đăng nhập đúng (upgradeLegacyPasswordIfNeeded) — user không bao giờ
 * đăng nhập lại thì mật khẩu nằm trần trong DB vĩnh viễn. Script này quét và
 * hash toàn bộ số còn lại bằng đúng WerkzeugScryptHasher của backend.
 *
 * CHẠY KHI NÀO: một lần duy nhất trên từng môi trường (staging trước, xác nhận
 * đăng nhập vẫn hoạt động, rồi mới chạy production). Nên backup DB trước khi
 * chạy. An toàn chạy lại nhiều lần: dòng đã hash (prefix 'scrypt:'/'pbkdf2:')
 * bị loại khỏi phạm vi quét nên không bị hash chồng.
 *
 * CÁCH CHẠY (từ thư mục gốc repo, cần .env có DATABASE_URL):
 *   npx ts-node scripts/migrate-legacy-passwords.ts
 *
 * SAU KHI đã chạy trên production (và chỉ khi đó) mới được xoá nhánh fallback
 * plaintext trong src/common/security/check-password.ts.
 */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { WerkzeugScryptHasher } from '../src/common/security/werkzeug-scrypt-hasher';

// Prisma 7 bắt buộc driver adapter — dùng đúng cấu hình Neon như
// scripts/seed-leaderboard-demo.mjs và src/prisma/prisma.service.ts.
const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
    connectionTimeoutMillis: 30_000,
  }),
});

const BATCH_SIZE = 100;

// Password rỗng = tài khoản tạo qua OAuth (không có mật khẩu dùng được) — bỏ qua.
// Prefix 'scrypt:'/'pbkdf2:' = đã hash — bỏ qua.
const LEGACY_WHERE = {
  AND: [
    { password: { not: '' } },
    { NOT: { password: { startsWith: 'scrypt:' } } },
    { NOT: { password: { startsWith: 'pbkdf2:' } } },
  ],
};

async function main(): Promise<void> {
  const total = await prisma.user.count({ where: LEGACY_WHERE });
  console.log(`Tìm thấy ${total} user còn mật khẩu plaintext.`);
  if (total === 0) return;

  let migrated = 0;

  // Lặp cho tới khi hết: dòng đã cập nhật không còn khớp LEGACY_WHERE nữa nên
  // luôn lấy batch đầu (không cần cursor/skip).
  for (;;) {
    const batch = await prisma.user.findMany({
      where: LEGACY_WHERE,
      select: { id: true, password: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
    });
    if (batch.length === 0) break;

    for (const user of batch) {
      const hashed = await WerkzeugScryptHasher.encode(user.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      });
      migrated += 1;
    }

    console.log(`Đã nâng cấp ${migrated}/${total} user...`);
  }

  console.log(`HOÀN TẤT: đã hash mật khẩu cho ${migrated} user.`);
}

main()
  .catch((err) => {
    console.error('Lỗi khi migrate mật khẩu legacy:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
