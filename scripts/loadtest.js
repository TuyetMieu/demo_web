/**
 * Bộ đo tải đăng nhập đồng thời — thuần Node, không phụ thuộc thư viện ngoài.
 *
 * Mục tiêu trả lời 3 câu hỏi:
 *  1. Ở mức N người đăng nhập cùng lúc, server có SẬP / treo / mất phản hồi không?
 *  2. Trong lúc bị dồn tải, người dùng KHÁC (chỉ xem trang) có bị đơ theo không?
 *     -> đo bằng cách ping /health song song trong suốt bài test. Đây chính là
 *        thước đo độ trễ event loop mà người dùng thật cảm nhận được.
 *  3. Lỗi đến từ SERVER hay từ giới hạn của MÁY CHẠY TEST? (Windows chỉ có
 *     ~16.000 cổng ephemeral; nhầm hai loại này là kết luận sai hoàn toàn.)
 *
 * Cách dùng:
 *   node scripts/loadtest.js --concurrency 1000 --total 1000 --label "1000 đồng thời"
 *   node scripts/loadtest.js --mode health --concurrency 500 --total 500
 *
 * KHÔNG xoá bất kỳ dữ liệu nào. Chỉ gửi request đăng nhập bằng các tài khoản
 * đã tạo sẵn trong pool (xem scripts/loadtest-prepare.js).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const HOST = arg('host', '127.0.0.1');
const PORT = Number(arg('port', 5000));
const CONCURRENCY = Number(arg('concurrency', 100));
const TOTAL = Number(arg('total', CONCURRENCY));
const MODE = arg('mode', 'login'); // login | health
const LABEL = arg('label', `${CONCURRENCY} đồng thời`);
// Timeout phía client. Với hàng vạn request xếp hàng, timeout ngắn sẽ khiến ta
// nhầm "client bỏ cuộc" thành "server chết" -> luôn nới rộng ở bài test lớn.
const TIMEOUT_MS = Number(arg('timeout', 120000));
// Số lần thử lại khi bị chối tải (503) hoặc bị giới hạn tần suất (429).
// Client thật (trình duyệt, app) đều thử lại chứ không bỏ cuộc ngay, nên nếu
// không mô phỏng retry thì kết luận "chỉ 2,5% đăng nhập được" là SAI lệch.
const RETRIES = Number(arg('retries', 0));
const POOL_FILE = path.join(__dirname, 'loadtest-accounts.json');

let POOL = [];
if (MODE === 'login') {
  if (!fs.existsSync(POOL_FILE)) {
    console.error('Chưa có pool tài khoản. Chạy: node scripts/loadtest-prepare.js');
    process.exit(1);
  }
  POOL = JSON.parse(fs.readFileSync(POOL_FILE, 'utf8'));
}

// maxSockets: Infinity để KHÔNG tự giới hạn phía client — muốn đo giới hạn của
// server, không phải của agent.
//
// keepAlive: mặc định TẮT (mỗi request là một kết nối mới, mô phỏng "N người lạ
// cùng vào"). Nhưng khi bắn hàng vạn request kèm thử lại, Windows chỉ có ~16.000
// cổng ephemeral và cổng vừa đóng còn kẹt ở trạng thái TIME_WAIT -> máy CHẠY
// TEST hết cổng (EADDRINUSE) và ta sẽ nhầm tưởng server hỏng.
// Bật --keepalive để tái sử dụng kết nối, đúng như trình duyệt thật vẫn làm.
const KEEPALIVE = args.includes('--keepalive');
const agent = new http.Agent({
  keepAlive: KEEPALIVE,
  maxSockets: Infinity,
  maxFreeSockets: Infinity,
});

const stats = {
  status: {},          // mã HTTP -> số lượng
  clientErrors: {},    // lỗi phía máy test (ECONNRESET, EADDRINUSE...)
  latencies: [],
  retryCount: 0,       // tổng số lượt thử lại
  retried: 0,          // số request phải thử lại ít nhất 1 lần
  startedAt: 0,
  finishedAt: 0,
};

function request(pathname, body, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const t0 = process.hrtime.bigint();
    const req = http.request(
      {
        host: HOST, port: PORT, path: pathname,
        method: body ? 'POST' : 'GET',
        agent,
        headers: body
          ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
          : {},
      },
      (res) => {
        let n = 0;
        res.on('data', (c) => { n += c.length; });
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - t0) / 1e6;
          resolve({ ok: true, status: res.statusCode, ms, bytes: n });
        });
      },
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('CLIENT_TIMEOUT'));
    });
    req.on('error', (e) => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      resolve({ ok: false, error: e.code || e.message, ms });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/** Ping /health đều đặn trong lúc dồn tải — đo trải nghiệm của người dùng khác. */
function startHealthProbe() {
  const samples = [];
  let stop = false;
  (async () => {
    while (!stop) {
      const r = await request('/health', null, 30000);
      samples.push(r.ok ? { ms: r.ms, status: r.status } : { ms: r.ms, error: r.error });
      await new Promise((s) => setTimeout(s, 200));
    }
  })();
  return { samples, stop: () => { stop = true; } };
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`BÀI TEST: ${LABEL}`);
  console.log(`Chế độ: ${MODE} | đồng thời: ${CONCURRENCY} | tổng request: ${TOTAL}`);
  console.log(`Đích: http://${HOST}:${PORT}`);
  console.log('='.repeat(70));

  const probe = startHealthProbe();
  stats.startedAt = Date.now();

  let sent = 0;
  const inFlight = new Set();

  async function fire(i) {
    const acc = POOL.length ? POOL[i % POOL.length] : null;
    let attempt = 0;
    let totalMs = 0;

    for (;;) {
      const r = MODE === 'login'
        ? await request('/auth/login', { email: acc.email, password: acc.password })
        : await request('/health', null);
      totalMs += r.ms;

      const shouldRetry = r.ok && (r.status === 503 || r.status === 429) && attempt < RETRIES;
      if (!shouldRetry) {
        if (r.ok) {
          stats.status[r.status] = (stats.status[r.status] || 0) + 1;
          // Ghi độ trễ TỔNG (gồm cả thời gian chờ giữa các lần thử) — đó mới là
          // thời gian người dùng thực sự phải chờ để đăng nhập được.
          stats.latencies.push(totalMs);
          if (attempt > 0) stats.retried++;
        } else {
          stats.clientErrors[r.error] = (stats.clientErrors[r.error] || 0) + 1;
        }
        return;
      }

      attempt++;
      stats.retryCount++;
      // Backoff có nhiễu ngẫu nhiên: nếu mọi client thử lại cùng thời điểm sẽ
      // tạo sóng dồn mới đúng bằng lúc trước (thundering herd).
      const waitMs = Math.min(8000, 500 * 2 ** (attempt - 1)) * (0.5 + Math.random());
      totalMs += waitMs;
      await new Promise((s) => setTimeout(s, waitMs));
    }
  }

  // Bơm request giữ đúng mức đồng thời mong muốn.
  while (sent < TOTAL) {
    while (inFlight.size < CONCURRENCY && sent < TOTAL) {
      const p = fire(sent++).finally(() => inFlight.delete(p));
      inFlight.add(p);
    }
    await Promise.race(inFlight);
  }
  await Promise.all(inFlight);

  stats.finishedAt = Date.now();
  probe.stop();
  await new Promise((s) => setTimeout(s, 300));

  const dur = (stats.finishedAt - stats.startedAt) / 1000;
  const sorted = stats.latencies.slice().sort((a, b) => a - b);
  const okCount = Object.entries(stats.status)
    .filter(([s]) => Number(s) < 400).reduce((a, [, c]) => a + c, 0);
  const clientErrCount = Object.values(stats.clientErrors).reduce((a, c) => a + c, 0);

  console.log(`\n--- KẾT QUẢ (${dur.toFixed(1)}s) ---`);
  console.log(`Thông lượng: ${(TOTAL / dur).toFixed(0)} req/s`);
  console.log(`\nMã trạng thái từ SERVER (server còn sống và trả lời):`);
  Object.entries(stats.status).sort().forEach(([s, c]) => {
    const note = s === '200' ? 'thành công'
      : s === '429' ? 'bị chặn bởi rate limit (CÓ CHỦ ĐÍCH, không phải sập)'
      : s === '401' ? 'sai thông tin đăng nhập'
      : s === '500' ? '*** LỖI SERVER ***' : '';
    console.log(`  ${s}: ${c}  ${note}`);
  });

  if (clientErrCount) {
    console.log(`\nLỗi phía MÁY CHẠY TEST (không phải server sập):`);
    Object.entries(stats.clientErrors).forEach(([e, c]) => {
      const note = e === 'EADDRINUSE' || e === 'EADDRNOTAVAIL' ? 'hết cổng ephemeral trên Windows'
        : e === 'ECONNRESET' ? 'server đóng kết nối / hàng đợi accept đầy'
        : e === 'ECONNREFUSED' ? '*** SERVER TỪ CHỐI - có thể đã chết ***'
        : e === 'CLIENT_TIMEOUT' ? 'quá 120s không có phản hồi' : '';
      console.log(`  ${e}: ${c}  ${note}`);
    });
  }

  console.log(`\nĐộ trễ request đăng nhập (ms):`);
  console.log(`  p50=${pct(sorted, 50).toFixed(0)}  p95=${pct(sorted, 95).toFixed(0)}  p99=${pct(sorted, 99).toFixed(0)}  max=${(sorted[sorted.length - 1] || 0).toFixed(0)}`);

  const hs = probe.samples;
  const hOk = hs.filter((s) => !s.error).map((s) => s.ms).sort((a, b) => a - b);
  const hErr = hs.filter((s) => s.error).length;
  console.log(`\n>>> TRẢI NGHIỆM NGƯỜI DÙNG KHÁC trong lúc dồn tải (/health, ${hs.length} mẫu):`);
  console.log(`    p50=${pct(hOk, 50).toFixed(0)}ms  p95=${pct(hOk, 95).toFixed(0)}ms  max=${(hOk[hOk.length - 1] || 0).toFixed(0)}ms  lỗi=${hErr}`);
  if (pct(hOk, 95) > 1000) {
    console.log(`    *** CẢNH BÁO: trang bị ĐƠ với người dùng khác (p95 > 1s) ***`);
  }

  if (RETRIES > 0) {
    console.log(`\nThử lại (mô phỏng client thật gặp 503/429):`);
    console.log(`  ${stats.retried}/${TOTAL} request phải thử lại, tổng ${stats.retryCount} lượt`);
  }

  console.log(`\nTóm tắt: ${okCount}/${TOTAL} thành công, ${clientErrCount} lỗi phía client`);
  console.log(`Server còn sống: ${(await request('/health', null, 10000)).status === 200 ? 'CÓ' : '*** KHÔNG ***'}`);
}

main().catch((e) => { console.error('LỖI HARNESS:', e); process.exit(1); });
