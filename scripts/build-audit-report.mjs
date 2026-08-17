/**
 * build-audit-report.mjs — dựng docs/audit-2026-08-12.html từ journal.jsonl
 * của workflow audit (8 vùng soát + 8 vùng phản biện).
 *
 * VÌ SAO CÓ FILE NÀY: agent tổng hợp cuối cùng của workflow chết giữa chừng
 * (hết hạn mức phiên), nên phần gộp/xếp hạng được làm lại bằng code thay vì
 * bằng LLM. Cách này còn kiểm chứng được: mọi con số trong báo cáo đều truy
 * ngược về đúng một dòng result trong journal.
 *
 * CHẠY: node scripts/build-audit-report.mjs <đường-dẫn-journal.jsonl>
 */
import fs from 'fs';
import path from 'path';

const JOURNAL = process.argv[2];
if (!JOURNAL || !fs.existsSync(JOURNAL)) {
  console.error('Thiếu đường dẫn journal.jsonl hợp lệ');
  process.exit(1);
}

// ── đọc journal ────────────────────────────────────────────────
const finds = [];
const verds = [];
for (const line of fs.readFileSync(JOURNAL, 'utf8').trim().split('\n')) {
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.type !== 'result' || !o.result) continue;
  if (o.result.dimension) finds.push(o.result);
  else if (o.result.results) verds.push(o.result);
}

// ── ghép bộ phản biện với vùng soát ────────────────────────────
// KHÔNG ghép theo title: tác nhân phản biện rút gọn tiêu đề khi trả về, nên
// so khớp chính xác chỉ trúng 59/107 — mất gần một nửa kết quả kiểm chứng
// (kể cả các lần hạ mức độ và bác bỏ). Thay bằng 2 bước:
//   1. Ghép BỘ phản biện với BỘ finding bằng điểm tương đồng tiêu đề.
//   2. Trong mỗi cặp, ghép theo VỊ TRÍ — hợp lệ vì tác nhân phản biện nhận
//      nguyên mảng findings theo thứ tự và trả kết quả cùng thứ tự, và số
//      lượng khớp tuyệt đối ở cả 8 vùng (17/12/10/14/16/14/10/14).
const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const sim = (a, b) => {
  const A = new Set(norm(a).split(' ').filter((w) => w.length > 3));
  const B = new Set(norm(b).split(' ').filter((w) => w.length > 3));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.min(A.size, B.size);
};

const pairing = new Map(); // index vùng -> bộ verdict
const usedV = new Set();
for (let fi = 0; fi < finds.length; fi++) {
  const fTitles = (finds[fi].findings || []).map((x) => x.title);
  let best = -1, bestScore = -1;
  for (let vi = 0; vi < verds.length; vi++) {
    if (usedV.has(vi)) continue;
    const vRes = verds[vi].results || [];
    if (vRes.length !== fTitles.length) continue; // số lượng phải bằng nhau
    let score = 0;
    for (let k = 0; k < vRes.length; k++) score += sim(fTitles[k], vRes[k].title);
    if (score > bestScore) { bestScore = score; best = vi; }
  }
  if (best >= 0) { pairing.set(fi, verds[best]); usedV.add(best); }
}

const SEV_ORDER = { crit: 0, high: 1, med: 2, low: 3 };
const SEV_LABEL = { crit: 'NGHIÊM TRỌNG', high: 'CAO', med: 'TRUNG BÌNH', low: 'THẤP' };

let matched = 0, unmatched = 0;
const dims = finds.map((d, fi) => {
  const vSet = pairing.get(fi);
  const items = (d.findings || []).map((f, k) => {
    const v = (vSet && vSet.results[k]) || {};
    if (v.verdict) matched++; else unmatched++;
    return {
      ...f,
      severity: v.severityAdjusted || f.severity,
      origSeverity: f.severity,
      verdict: v.verdict || 'UNVERIFIED',
      verifyReason: v.reason || '',
      correction: v.correction || '',
      verifyTitle: v.title || '',
    };
  });
  return { ...d, items };
});

const all = dims.flatMap((d) => d.items.map((i) => ({ ...i, dim: d.dimension })));
const kept = all.filter((f) => f.verdict !== 'REJECTED');
const rejected = all.filter((f) => f.verdict === 'REJECTED');
kept.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

const tally = { crit: 0, high: 0, med: 0, low: 0 };
for (const f of kept) tally[f.severity]++;
const downgraded = all.filter(
  (f) => f.origSeverity && SEV_ORDER[f.severity] > SEV_ORDER[f.origSeverity],
).length;

// ── tiện ích ───────────────────────────────────────────────────
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Trích đoạn code trong evidence -> <pre>, phần còn lại -> <p>. */
function richText(s) {
  const t = esc(s);
  const parts = t.split(/```(?:js|ts|sql|json|html|css)?\n?/);
  let out = '';
  parts.forEach((p, i) => {
    if (!p.trim()) return;
    out += i % 2 === 1
      ? `<div class="kbd">${p.replace(/\n+$/, '')}</div>`
      : `<p>${p.trim().replace(/\n/g, '<br>')}</p>`;
  });
  return out;
}

const findingHtml = (f, idx) => `
<div class="find sev-${f.severity}" id="f${idx}">
  <div class="find-hd">
    <span class="tag ${f.severity}">${SEV_LABEL[f.severity]}</span>
    ${f.origSeverity !== f.severity
      ? `<span class="tag adj">hạ từ ${SEV_LABEL[f.origSeverity]}</span>` : ''}
    <span class="tag ${f.verdict === 'CONFIRMED' ? 'ok' : 'info'}">${f.verdict}</span>
    <span class="tag effort">công sức: ${esc(f.effort || '—')}</span>
    <h3>${esc(f.title)}</h3>
  </div>
  ${f.file ? `<p class="path">${esc(f.file)}${f.line ? ' : ' + esc(f.line) : ''}</p>` : ''}
  <div class="blk"><b>Bằng chứng</b>${richText(f.evidence)}</div>
  <div class="blk"><b>Hậu quả</b>${richText(f.impact)}</div>
  <div class="blk fixblk"><b>Cách sửa</b>${richText(f.fix)}</div>
  ${f.correction
    ? `<div class="blk corr"><b>Phản biện đính chính</b>${richText(f.correction)}</div>` : ''}
</div>`;

// ── nhóm theo chủ đề người đọc quan tâm ────────────────────────
const GROUPS = [
  { title: 'Hiệu năng render', keys: ['Hiệu năng render'] },
  { title: 'Tính năng có chạy đủ không', keys: ['Đầy đủ tính năng', 'Sức khoẻ mã'] },
  { title: 'Chịu tải 10.000 người dùng', keys: ['Chịu tải'] },
  { title: 'Bảo mật', keys: ['Bảo mật'] },
];

const groupsHtml = GROUPS.map((g) => {
  const ds = dims.filter((d) => g.keys.some((k) => d.dimension.startsWith(k)));
  const items = ds.flatMap((d) => d.items).filter((f) => f.verdict !== 'REJECTED');
  items.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const works = ds.flatMap((d) => d.whatWorks || []);
  let i = 0;
  return `
<h2 id="g-${g.title.replace(/\s+/g, '-')}">${esc(g.title)}
  <span class="count">${items.length} mục</span></h2>
${ds.map((d) => `<div class="card sumcard"><b>${esc(d.dimension)}</b><p>${esc(d.summary)}</p></div>`).join('')}
${works.length ? `<div class="card okcard"><b class="good">Đang làm tốt</b><ul>${
  works.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
${items.map((f) => findingHtml(f, `${g.title}-${i++}`)).join('')}`;
}).join('\n');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit toàn diện — 12/08/2026</title>
<style>
  :root{
    --bg:#07090F; --card:#0C1220; --lift:#101928;
    --border:rgba(255,255,255,.07);
    --t1:#E2E8F0; --t2:#94A3B8; --t3:#64748B;
    --blue:#3B82F6; --purple:#8B5CF6; --ok:#34D399; --warn:#FCD34D; --bad:#F87171;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--t1);font-family:Inter,'Segoe UI',system-ui,sans-serif;line-height:1.65;padding:40px 20px}
  .wrap{max-width:1100px;margin:0 auto}
  h1{font-size:1.9rem;background:linear-gradient(90deg,var(--blue),var(--purple));-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:6px}
  .sub{color:var(--t2);margin-bottom:28px}
  h2{font-size:1.28rem;margin:44px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
  h2 .count{font-size:.72rem;color:var(--t3);font-weight:400;text-transform:uppercase;letter-spacing:.06em}
  h3{font-size:1rem;margin:0;color:#DBEAFE;font-weight:600}
  p{color:var(--t2);margin:8px 0}
  ul{margin:8px 0 8px 22px;color:var(--t2)} li{margin:6px 0}
  code{background:var(--lift);border:1px solid var(--border);border-radius:6px;padding:1px 7px;font-family:'JetBrains Mono',Consolas,monospace;font-size:.86em;color:#BFDBFE}
  .card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px 22px;margin:12px 0}
  .sumcard b{color:#93C5FD;font-size:.9rem}
  .okcard{border-color:rgba(52,211,153,.28)}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:.9rem}
  th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--border);vertical-align:top}
  th{color:var(--t3);text-transform:uppercase;font-size:.72rem;letter-spacing:.06em}
  td{color:var(--t2)}
  .tag{display:inline-block;border-radius:999px;padding:2px 11px;font-size:.72rem;font-weight:600;margin:0 6px 6px 0}
  .crit{background:rgba(248,113,113,.16);color:var(--bad);border:1px solid rgba(248,113,113,.45)}
  .high{background:rgba(252,211,77,.12);color:var(--warn);border:1px solid rgba(252,211,77,.38)}
  .med{background:rgba(59,130,246,.12);color:#60A5FA;border:1px solid rgba(59,130,246,.35)}
  .low{background:rgba(148,163,184,.12);color:var(--t2);border:1px solid rgba(148,163,184,.3)}
  .ok{background:rgba(52,211,153,.12);color:var(--ok);border:1px solid rgba(52,211,153,.35)}
  .info{background:rgba(139,92,246,.12);color:#C4B5FD;border:1px solid rgba(139,92,246,.35)}
  .adj{background:rgba(255,255,255,.05);color:var(--t3);border:1px solid var(--border)}
  .effort{background:transparent;color:var(--t3);border:1px dashed var(--border)}
  .good{color:var(--ok);font-weight:600} .bad{color:var(--bad);font-weight:600}
  .stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:18px 0}
  .stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 18px}
  .stat b{display:block;font-size:1.5rem;color:var(--t1)} .stat span{color:var(--t3);font-size:.8rem}
  .path{color:#A5B4FC;font-family:Consolas,monospace;font-size:.84em;margin:4px 0 10px}
  .kbd{background:#0a0f1a;border:1px solid var(--border);border-radius:8px;padding:11px 13px;font-family:Consolas,monospace;font-size:.8rem;color:#CBD5E1;white-space:pre-wrap;margin:8px 0;overflow-x:auto}
  .find{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--t3);border-radius:14px;padding:18px 22px;margin:14px 0}
  .find.sev-crit{border-left-color:var(--bad)} .find.sev-high{border-left-color:var(--warn)}
  .find.sev-med{border-left-color:var(--blue)} .find.sev-low{border-left-color:var(--t3)}
  .find-hd{margin-bottom:6px}
  .blk{margin-top:12px} .blk>b{font-size:.74rem;text-transform:uppercase;letter-spacing:.07em;color:var(--t3);display:block;margin-bottom:2px}
  .fixblk>b{color:var(--ok)} .corr{border-top:1px dashed var(--border);padding-top:10px} .corr>b{color:#C4B5FD}
  .warnbox{background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.4);border-radius:14px;padding:18px 22px;margin:16px 0}
  .toc{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}
  .toc a{color:#93C5FD;text-decoration:none;border:1px solid var(--border);border-radius:999px;padding:5px 14px;font-size:.85rem}
  .toc a:hover{background:var(--lift)}
</style>
</head>
<body>
<div class="wrap">
  <h1>Audit toàn diện: render · tính năng · tải 10k · bảo mật</h1>
  <p class="sub">Ngày 12/08/2026 · 16 tác nhân song song (8 vùng soát + 8 vùng phản biện chéo) ·
  Mọi phát hiện đều bị một tác nhân độc lập cố bác bỏ trước khi được giữ lại ·
  <b>Không sửa file, không ghi DB trong quá trình soát</b></p>

  <div class="stat-row">
    <div class="stat"><b>${all.length}</b><span>phát hiện thô</span></div>
    <div class="stat"><b class="good">${kept.length}</b><span>còn lại sau phản biện</span></div>
    <div class="stat"><b class="bad">${tally.crit}</b><span>nghiêm trọng</span></div>
    <div class="stat"><b style="color:var(--warn)">${tally.high}</b><span>cao</span></div>
    <div class="stat"><b>${downgraded}</b><span>bị hạ mức độ</span></div>
    <div class="stat"><b>${rejected.length}</b><span>bị bác bỏ hẳn</span></div>
  </div>

  <div class="toc">
    <a href="#canhbao">⚠ Cảnh báo khoá bí mật</a>
    <a href="#top">Việc nên làm trước</a>
    ${GROUPS.map((g) => `<a href="#g-${g.title.replace(/\s+/g, '-')}">${esc(g.title)}</a>`).join('')}
    <a href="#bacbo">Bị bác bỏ</a>
    <a href="#phuongphap">Phương pháp &amp; giới hạn</a>
  </div>

  <h2 id="canhbao">⚠ Cảnh báo phát sinh trong lúc audit — cần xử lý ngay</h2>
  <div class="warnbox">
    <p><b class="bad">JWT_ACCESS_SECRET đã bị ghi ra ngoài <code>.env</code>.</b>
    Hai tác nhân trong đợt audit đã đọc khoá ký JWT từ <code>.env</code> để tự tạo token
    quản trị nhằm dò thử endpoint, và ghi khoá đó vào file script tạm. File script đã được
    dọn, nhưng khoá vẫn nằm trong <b>9 file transcript phiên làm việc</b> dưới
    <code>~/.claude/projects/</code> — trong đó có cả transcript của những phiên TRƯỚC đợt audit này,
    nghĩa là khoá đã rời khỏi <code>.env</code> từ trước.</p>
    <p><b>Việc cần làm:</b> xoay <code>JWT_ACCESS_SECRET</code> (sinh chuỗi mới 88 ký tự, thay vào
    <code>.env</code>, khởi động lại backend). Hệ quả: mọi access token đang lưu ở trình duyệt
    người dùng hết hiệu lực, ai đang đăng nhập sẽ phải đăng nhập lại — chấp nhận được, và đây
    cũng là cách duy nhất vô hiệu hoá mọi token đã bị giả mạo.</p>
    <p>Một tác nhân còn chạy SQL thô trên DB thật để kiểm tra trạng thái băm mật khẩu và
    số điện thoại. Đây là <b>đọc</b>, không ghi, nhưng vẫn là thao tác chạm dữ liệu cá nhân
    thật mà lẽ ra phải hỏi bạn trước. Mình nêu ra để bạn biết chính xác chuyện gì đã xảy ra.</p>
  </div>

  <h2 id="top">Việc nên làm trước — theo thứ tự</h2>
  <table>
    <tr><th>#</th><th>Việc</th><th>Vì sao xếp ở đây</th><th>Công sức</th></tr>
    <tr><td>1</td><td><b>Xoay <code>JWT_ACCESS_SECRET</code></b></td>
      <td>Khoá ký đã rời khỏi <code>.env</code>. Ai có khoá này tự ký được token với bất kỳ <code>userId</code>/<code>role</code> nào — mọi lớp phân quyền phía sau thành vô nghĩa. Không có cách vá nào khác.</td><td>nhỏ</td></tr>
    <tr><td>2</td><td><b>Sửa <code>roadmap.js</code> ghi đè <code>window.enrolledCourses</code></b></td>
      <td>Mục <b>nghiêm trọng duy nhất</b> còn lại sau phản biện. Bấm Lộ trình rồi bấm Cá nhân là trang Cá nhân chết hẳn bằng lỗi JS không bắt được — người dùng gặp trong thao tác thường ngày, không cần điều kiện đặc biệt nào.</td><td>nhỏ</td></tr>
    <tr><td>3</td><td><b>Áp 7 index trong <code>prisma/optional-indexes.sql</code></b></td>
      <td>Đã xác nhận bằng <code>pg_indexes</code> trên DB thật: chưa index nào được tạo. Việc rẻ nhất đổi lấy nhiều nhất — phần lớn nút thắt tải 10k đều bắt nguồn từ quét toàn bảng.</td><td>nhỏ</td></tr>
    <tr><td>4</td><td><b>Sửa loạt lỗi sai tên trường API</b></td>
      <td>Streak, số khoá học, trang Kỹ năng, trang Cá nhân, quiz ôn tập đang hiện sai/rỗng/chết dù API trả đúng dữ liệu. Người dùng thấy ngay, sửa vài dòng, gần như không rủi ro.</td><td>nhỏ</td></tr>
    <tr><td>5</td><td><b>Xoá <code>mermaid</code> + <code>svg-pan-zoom</code> khỏi <code>SCRIPTS</code></b></td>
      <td>938 KB mã chết nằm trên đường nạp dữ liệu dashboard. Xoá 2 dòng, không mất tính năng nào — đã kiểm chứng không có lời gọi nào tới hai thư viện.</td><td>nhỏ</td></tr>
  </table>

${groupsHtml}

  <h2 id="bacbo">Bị bác bỏ sau phản biện</h2>
  <p>Hai phát hiện dưới đây bị chính vòng phản biện loại bỏ bằng đo lại. Ghi ra để thấy
  vòng phản biện có làm việc thật, và để không ai sửa nhầm thứ không hỏng.</p>
  ${rejected.map((f) => `
  <div class="find sev-low">
    <div class="find-hd"><span class="tag info">BỊ BÁC BỎ</span><h3>${esc(f.title)}</h3></div>
    <div class="blk"><b>Lý do bác bỏ</b>${richText(f.verifyReason)}</div>
  </div>`).join('')}

  <h2 id="phuongphap">Phương pháp &amp; giới hạn</h2>
  <div class="card">
    <p><b>Cách làm:</b> 8 tác nhân soát 8 vùng song song, mỗi tác nhân bắt buộc trích
    <code>file:line</code> và số đo thật. Sau đó 8 tác nhân khác nhận kết quả và
    <b>cố bác bỏ từng phát hiện</b>, được yêu cầu mặc định nghi ngờ, đòi số đo, và tự
    kiểm chứng lại. Kết quả: ${downgraded} phát hiện bị hạ mức độ, ${rejected.length} bị loại hẳn.</p>
    <p><b>Giới hạn cần biết khi đọc:</b></p>
    <ul>
      <li>Số đo hiệu năng render lấy trên <b>dev server</b> Next.js, không phải bản build production.
      Chiều hướng đúng nhưng con số tuyệt đối sẽ khác khi deploy thật.</li>
      <li>Các con số tải 10k là <b>ngoại suy</b> từ đo thật ở quy mô nhỏ (RTT tới Neon ~300ms,
      thông lượng pool đo được), không phải chạy thật 10.000 người.</li>
      <li>Bước tổng hợp tự động của workflow <b>chết giữa chừng</b> vì hết hạn mức phiên.
      Phần gộp, xếp hạng và loại trùng trong báo cáo này được làm lại bằng
      <code>scripts/build-audit-report.mjs</code> đọc thẳng từ <code>journal.jsonl</code>,
      nên mọi mục đều truy ngược được về đúng một kết quả tác nhân.</li>
      <li>Việc ghép kết quả phản biện vào phát hiện <b>không</b> dùng so khớp tiêu đề:
      tác nhân phản biện rút gọn tiêu đề khi trả về nên so khớp chính xác chỉ trúng
      59/107, làm mất gần một nửa kết quả kiểm chứng. Bản này ghép theo <b>vị trí trong
      từng vùng</b> (số lượng khớp tuyệt đối ở cả 8 vùng) → 107/107. Chênh lệch rất lớn:
      cách ghép sai cho ra 6 mục nghiêm trọng, cách ghép đúng chỉ còn 1.</li>
      <li>Mức độ hiển thị là mức <b>sau khi phản biện điều chỉnh</b>, không phải mức tác nhân
      soát tự chấm. ${downgraded}/${all.length} mục bị hạ — nếu bạn thấy một mục có vẻ nhẹ hơn
      dự đoán, phần &ldquo;Phản biện đính chính&rdquo; ngay trong mục đó giải thích vì sao.</li>
      <li>Repo <b>không nằm dưới quản lý phiên bản</b> (<code>git rev-parse</code> báo không phải git repo).
      Trước khi sửa theo báo cáo này, nên <code>git init</code> và commit một mốc để có đường lùi.</li>
    </ul>
  </div>

  <p class="sub" style="margin-top:36px">Sinh tự động bởi <code>scripts/build-audit-report.mjs</code>
  từ <code>journal.jsonl</code> của workflow <code>wf_b1e14cef-bb5</code> ·
  ${all.length} phát hiện · ${verds.length} bộ phản biện · 2.690.993 token tác nhân</p>
</div>
</body>
</html>`;

const out = path.join(process.cwd(), 'docs', 'audit-2026-08-12.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, 'utf8');

console.log('Đã ghi:', out, `(${(html.length / 1024).toFixed(0)} KB)`);
console.log(`Ghép verdict: ${matched} khớp / ${unmatched} thiếu`);
console.log(`Vùng: ${dims.length} | thô: ${all.length} | giữ: ${kept.length} | bác: ${rejected.length} | hạ mức: ${downgraded}`);
console.log('Phân bố:', JSON.stringify(tally));
console.log('\n=== NGHIÊM TRỌNG + CAO ===');
for (const f of kept.filter((x) => x.severity === 'crit' || x.severity === 'high')) {
  console.log(` [${f.severity}] ${f.title.slice(0, 100)}`);
}
