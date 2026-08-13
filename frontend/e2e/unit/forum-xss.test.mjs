/**
 * Unit test (Node thuần, không cần runner) — chống hồi quy XSS ở forum feed.
 *
 * Bug gốc: dashboard.js render TÊN TÁC GIẢ bài viết (`p.author`, nguồn là
 * users.name — do người dùng tự đặt) bằng cách nối chuỗi THÔ vào innerHTML,
 * KHÔNG escape → stored XSS: đặt tên = <img src=x onerror=...> là chạy JS trong
 * feed của mọi người xem. (Tên tác giả bình luận thì đã escHtml — chỉ post sót.)
 *
 * Test gồm 2 phần:
 *  1) Trích hàm escHtml THẬT trong dashboard.js và chứng minh nó trung hòa payload.
 *  2) Khẳng định dòng render `fpc-author` có bọc escHtml quanh author.
 *
 * Chạy: node e2e/unit/forum-xss.test.mjs   (exit 0 = pass, 1 = fail)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', '..', 'public', 'static', 'js', 'dashboard.js');
const code = readFileSync(SRC, 'utf8');

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('  ✓', name); }
  else { console.error('  ✗', name); failures++; }
}

// ── 1) MỌI escHtml trong file phải trung hòa payload + null-safe ──────────
// dashboard.js có nhiều IIFE, mỗi IIFE có escHtml riêng. Bài viết forum dùng
// bản trong IIFE của nó, nên ta kiểm TẤT CẢ để không phụ thuộc bản nào đang scope.
const escBodies = [...code.matchAll(/function\s+escHtml\s*\(s\)\s*\{([\s\S]*?)\n\s{2}\}/g)];
if (escBodies.length === 0) throw new Error('Không tìm thấy escHtml trong dashboard.js');
const payload = '<img src=x onerror=alert(1)>';
escBodies.forEach((m, i) => {
  // eslint-disable-next-line no-new-func
  const escHtml = new Function('s', m[1]);
  const escaped = escHtml(payload);
  check(`escHtml#${i + 1} chuyển < thành &lt;`, !escaped.includes('<img'));
  check(`escHtml#${i + 1} chuyển > thành &gt;`, !escaped.includes('>'));
  check(`escHtml#${i + 1} giữ nguyên chuỗi thường`, escHtml('An') === 'An');
  check(`escHtml#${i + 1} null-safe (không ném lỗi với null/undefined)`, (() => {
    try { escHtml(null); escHtml(undefined); return true; } catch { return false; }
  })());
});

// ── 2) Dòng render tên tác giả bài viết PHẢI escape ──────────────────────
// Tìm dòng gán class "fpc-author" — phải bọc escHtml quanh author, không nối thô.
const authorLine = code.split('\n').find((l) => l.includes('class="fpc-author"'));
check('tìm thấy dòng render fpc-author', !!authorLine);
check(
  'tên tác giả bài viết được escape (escHtml(p.author))',
  !!authorLine && /escHtml\(\s*p\.author\s*\)/.test(authorLine),
);
check(
  'KHÔNG còn nối thô "+ p.author +" chưa escape ở dòng author',
  !!authorLine && !/\+\s*p\.author\s*\+/.test(authorLine),
);

console.log(failures === 0 ? '\nPASS forum-xss' : `\nFAIL forum-xss (${failures})`);
process.exit(failures === 0 ? 0 : 1);
