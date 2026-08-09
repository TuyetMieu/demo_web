/**
 * Unit test (Node thuần, không cần runner) — site tĩnh không có bundler nên
 * không ai bắt lỗi đường dẫn hộ: một `src="/static/js/typo.js"` chỉ im lặng 404
 * trên trình duyệt. Test này thay vai trò đó của build step cũ.
 *
 * Kiểm tra:
 *  1) Mọi href/src nội bộ trong file HTML trỏ tới file có thật.
 *  2) Mọi route được JS legacy điều hướng tới đều có trang tương ứng.
 *  3) Mọi trang nạp pe-config.js TRƯỚC pe-bridge.js (bridge đọc origin lúc load).
 *
 * Chạy: node e2e/unit/static-assets.test.mjs   (exit 0 = pass, 1 = fail)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log('  ✓', name);
  else { console.log('  ✗', name, detail ? '→ ' + detail : ''); failures++; }
}

/** Tất cả file .html của site (bỏ e2e/, static/). */
function htmlFiles(dir = ROOT, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (['e2e', 'static', 'node_modules', '.git'].includes(e.name)) continue;
      htmlFiles(join(dir, e.name), out);
    } else if (e.name.endsWith('.html')) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

const pages = htmlFiles();
check('tìm thấy file HTML', pages.length > 20, pages.length + ' trang');

// ── 1. href/src nội bộ tồn tại ──
const broken = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)) {
    const url = m[1];
    if (url.startsWith('//')) continue; // //cdn... (protocol-relative)
    const target = join(ROOT, url);
    const ok = existsSync(target) &&
      (statSync(target).isFile() || existsSync(join(target, 'index.html')));
    if (!ok) broken.push(`${file.slice(ROOT.length + 1)} → ${url}`);
  }
}
check('mọi href/src nội bộ trỏ tới file có thật', broken.length === 0,
  broken.slice(0, 8).join(' | '));

// ── 2. route mà JS legacy điều hướng tới đều có trang ──
const JS_DIR = join(ROOT, 'static', 'js');
function jsFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) jsFiles(join(dir, e.name), out);
    else if (e.name.endsWith('.js')) out.push(join(dir, e.name));
  }
  return out;
}
const ROUTE_RE = /['"`](\/(?:courses|lesson|card)\/[a-z0-9_]+)(?:[?'"`])/gi;
const missingRoutes = new Set();
for (const file of jsFiles(JS_DIR)) {
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(ROUTE_RE)) {
    const route = m[1];
    if (!existsSync(join(ROOT, route, 'index.html'))) missingRoutes.add(route);
  }
}
check('mọi route JS legacy điều hướng tới đều có trang', missingRoutes.size === 0,
  [...missingRoutes].join(', '));

// ── 3. thứ tự pe-config trước pe-bridge ──
const badOrder = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  // Khớp thẻ <script src=...>, KHÔNG khớp tên file nhắc trong comment
  const bridge = html.indexOf('<script src="/static/js/pe-bridge.js">');
  if (bridge < 0) continue; // trang không dùng bridge (404, auth/callback)
  const config = html.indexOf('<script src="/static/js/pe-config.js">');
  if (config < 0 || config > bridge) badOrder.push(file.slice(ROOT.length + 1));
}
check('pe-config.js luôn nạp trước pe-bridge.js', badOrder.length === 0,
  badOrder.slice(0, 5).join(', '));

// ── 4. trang bắt buộc phải có ──
const REQUIRED = [
  'index.html', '404.html', 'login/index.html', 'register/index.html',
  'dashboard/index.html', 'questionaire/index.html', 'admin/index.html',
  'interface/index.html', 'auth/callback/index.html', 'auth/logout/index.html',
  'courses/python/index.html', 'courses/db_design/index.html',
  'lesson/python/index.html', 'lesson/db_design/index.html',
];
const missingPages = REQUIRED.filter((p) => !existsSync(join(ROOT, p)));
check('đủ các trang bắt buộc', missingPages.length === 0, missingPages.join(', '));

console.log(failures === 0 ? '\nPASS static-assets' : `\nFAIL static-assets (${failures})`);
process.exit(failures === 0 ? 0 : 1);
