/**
 * Launcher đặt biến môi trường runtime TRƯỚC khi tiến trình ứng dụng khởi động.
 *
 * Vì sao cần: UV_THREADPOOL_SIZE được libuv đọc MỘT LẦN vào lúc threadpool được
 * khởi tạo lần đầu. Đặt trong main.ts là quá muộn/không chắc chắn (các import ở
 * đầu file chạy trước mọi câu lệnh, và chỉ cần một thao tác DNS/crypto/fs bất
 * đồng bộ nào đó chạm vào pool là giá trị bị chốt ở mặc định 4).
 *
 * Đây là nút thắt lớn nhất khi nhiều người đăng nhập cùng lúc: mỗi lần kiểm tra
 * mật khẩu scrypt (N=32768) chiếm 1 thread của pool trong ~50-100ms. Pool 4
 * thread nghĩa là dù máy có 8 nhân, chỉ 4 lượt đăng nhập được xử lý song song.
 *
 *   node scripts/with-env.js node dist/main.js
 *   node scripts/with-env.js nest start --watch
 */
const os = require('os');
const { spawn } = require('child_process');

// scrypt là tác vụ nặng CPU -> số thread tối ưu ≈ số nhân. Đặt cao hơn nhân chỉ
// làm hàng đợi sâu thêm chứ không tăng thông lượng.
if (!process.env.UV_THREADPOOL_SIZE) {
  const cores = os.cpus().length || 4;
  process.env.UV_THREADPOOL_SIZE = String(Math.max(4, Math.min(16, cores)));
}

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) {
  console.error('Cách dùng: node scripts/with-env.js <lệnh> [tham số...]');
  process.exit(1);
}

console.log(`[with-env] UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE} (máy có ${os.cpus().length} nhân)`);

// `node` chạy trực tiếp được, không cần shell (tránh cảnh báo DEP0190 và tránh
// phải tự thoát chuỗi). Các lệnh khác trên Windows là file .cmd (nest, npx...)
// nên bắt buộc qua shell — khi đó shell nối tham số bằng chuỗi nên đường dẫn có
// dấu cách ("C:\Users\Tuyet mieu\...") sẽ bị cắt đôi, phải tự bọc nháy kép.
const needsShell = process.platform === 'win32' && !/^node(\.exe)?$/i.test(cmd);
const argv = needsShell
  ? rest.map((a) => (/[\s&|<>^]/.test(a) && !/^".*"$/.test(a) ? `"${a}"` : a))
  : rest;

const child = spawn(cmd, argv, { stdio: 'inherit', shell: needsShell, env: process.env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
