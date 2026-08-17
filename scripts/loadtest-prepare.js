/**
 * Tạo pool tài khoản dùng cho bài đo tải.
 *
 * TUYỆT ĐỐI KHÔNG XOÁ dữ liệu nào. Chỉ upsert thêm N tài khoản có tiền tố rõ
 * ràng (`loadtest-…@pe-loadtest.local`) để dễ nhận diện và tự xoá về sau nếu
 * muốn. Chạy lại nhiều lần cũng không tạo trùng.
 *
 * Dùng pool nhỏ (mặc định 20) rồi xoay vòng khi bắn hàng nghìn request: mục
 * tiêu là đo sức chịu tải của server, không phải nhồi hàng vạn user vào DB.
 *
 *   node scripts/loadtest-prepare.js [số_lượng]
 */
const path = require('path');
const fs = require('fs');
const REPO = path.resolve(__dirname, '..');

require(path.join(REPO, 'node_modules/dotenv')).config({ path: path.join(REPO, '.env'), quiet: true });
const { PrismaClient } = require(path.join(REPO, 'src/generated/prisma'));
const { PrismaNeon } = require(path.join(REPO, 'node_modules/@prisma/adapter-neon'));
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);

const COUNT = Number(process.argv[2] || 20);
const PASSWORD = 'LoadTest#2026';
const DOMAIN = 'pe-loadtest.local';

// Phải khớp ĐÚNG định dạng WerkzeugScryptHasher.encode của backend, nếu không
// login sẽ luôn sai mật khẩu và bài test đo nhầm nhánh lỗi.
async function encode(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scryptAsync(password, salt, 64, {
    N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  });
  return `scrypt:32768:8:1$${salt}$${key.toString('hex')}`;
}

(async () => {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const hash = await encode(PASSWORD); // dùng chung 1 hash cho cả pool
  const accounts = [];

  for (let i = 1; i <= COUNT; i++) {
    const email = `loadtest-${String(i).padStart(3, '0')}@${DOMAIN}`;
    await prisma.user.upsert({
      where: { email },
      update: {},                       // đã có thì GIỮ NGUYÊN, không đụng vào
      create: {
        name: `Load Test ${i}`,
        email,
        role: 'Học viên',
        password: hash,
        isVerified: true,
      },
    });
    accounts.push({ email, password: PASSWORD });
  }

  fs.writeFileSync(
    path.join(__dirname, 'loadtest-accounts.json'),
    JSON.stringify(accounts, null, 2),
  );

  const total = await prisma.user.count();
  console.log(`Pool sẵn sàng: ${COUNT} tài khoản @${DOMAIN}`);
  console.log(`Tổng user trong DB hiện tại: ${total} (không xoá bất kỳ ai)`);
  await prisma.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
