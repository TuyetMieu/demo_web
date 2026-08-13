/* ═══════════════════════════════════════════════════════
   edu-chrome.js — phần chung của thanh đầu trang: menu người dùng +
   chuông thông báo (+ badge poll).

   VÌ SAO TÁCH RA: markup này do component HeaderBar.tsx dựng và dùng
   CHUNG cho dashboard, trang chi tiết khóa học và 3 trang khóa CSDL.
   Trước đây mỗi trang có bản cài đặt riêng: dashboard.js nối API thật,
   còn course_detail.js / course_db_design.js chép lại một bản rút gọn
   với DANH SÁCH THÔNG BÁO VIẾT CỨNG. Hậu quả:

     1. Vào thẳng /courses/<id> luôn thấy 4 thông báo giả ("Streak 7
        ngày…", "huy hiệu Người mới bắt đầu…") thay vì thông báo thật.
     2. Từ khi điều hướng dashboard ↔ chi tiết khóa học đi client-side,
        file cũ vẫn nằm nguyên trên window sau khi rời trang: bản chép
        của course_detail.js ghi đè 10 hàm của dashboard.js, nên quay
        về dashboard là chuông vỡ hẳn — dữ liệu do dashboard.js nạp
        (title/body) bị bản chép đọc bằng n.text nên hiện "undefined".

   Một bản cài đặt duy nhất, nạp trên MỌI trang có HeaderBar, bỏ hẳn hai
   bản chép kia. Chỉ dựa vào các id do HeaderBar dựng nên chạy được ở mọi
   trang, không cần DOM riêng của dashboard.
   ═══════════════════════════════════════════════════════ */

/* ── Điều hướng trong app ───────────────────────────────────────────────
 * `window.location = url` nạp lại TOÀN BỘ trang (9 file CSS + 9 file JS + gọi
 * lại mọi API) nên thấy rõ một nhịp trắng màn hình. PeRouterBridge (React) gắn
 * window.__peRouterPush = router.push để đi bằng client-side routing.
 *
 * Định nghĩa ở ĐÂY (không phải main.js) vì trang chi tiết 3 khóa Thiết kế CSDL
 * không nạp main.js — thiếu peGo là nút Sidebar trên các trang đó rơi về nạp
 * lại cả trang. main.js có một bản rút gọn và chạy TRƯỚC file này ở dashboard;
 * bản dưới đây ghi đè lên (không đặt điều kiện) vì chỉ nó có ngoại lệ khóa CSDL.
 *
 * NGOẠI LỆ khóa Thiết kế CSDL: course_db_design.js đọc <body data-course> đúng
 * MỘT lần lúc nạp rồi dựng toàn bộ nội dung (tên khóa, lộ trình, yêu cầu, thành
 * tựu) từ đó. Nếu đã ghé một khóa CSDL rồi đi tiếp bằng client-side routing thì
 * React dựng markup rỗng mà script không chạy lại — trang sẽ trống hoặc hiện
 * nội dung của khóa trước. Với đích đó buộc phải nạp lại trang. */
window.peGo = function (url) {
  var dbTarget = /^\/courses\/db_design/.test(url);
  var dbScriptLoaded = typeof window.COURSE_PAGE_META !== 'undefined';
  if (typeof window.__peRouterPush === 'function' && !(dbTarget && dbScriptLoaded)) {
    window.__peRouterPush(url);
    return;
  }
  window.location = url;
};

/* Về dashboard rồi mở đúng tab (Khóa học/Lộ trình/…) — dùng cho mọi chỗ cần
 * "quay lại danh sách khóa học" hay nút Sidebar bấm từ trang ngoài SPA.
 *
 * KHÔNG dùng peGo('/dashboard#tab'): đã đo được router.push của Next GHÉP
 * hash cũ vào hash mới khi trang hiện tại đến từ một lượt điều hướng
 * client-side trước đó — bấm "Tất cả khóa học" → sang khóa khác → bấm "Tất cả
 * khóa học" lần nữa ra thẳng URL "/dashboard#courses#courses" và main.js đọc
 * hash đó không khớp trang hợp lệ nào, dừng ở tab Bảng điều khiển thay vì
 * Khóa học. Bỏ hẳn hash khỏi đường client-side, truyền tab qua biến toàn cục;
 * main.js (_peInitMain) đọc biến này TRƯỚC khi đọc location.hash. */
window.peGoTab = function (tab) {
  if (typeof window.__peRouterPush === 'function') {
    window.__pePendingTab = tab;
    window.__peRouterPush('/dashboard');
    return;
  }
  // Nạp lại cả trang (không có bridge) — hash trong URL vẫn đọc đúng vì đây
  // là điều hướng thật, không đi qua router.push.
  window.location = tab === 'dashboard' ? '/dashboard' : '/dashboard#' + tab;
};

/* ── Menu avatar người dùng ── */
function toggleUserMenu() {
  var btn = document.getElementById('user-chip-btn');
  var menu = document.getElementById('user-dropdown');
  if (!btn || !menu) return;
  // Đồng bộ tên trong đầu dropdown mỗi lần mở
  var n = document.getElementById('chip-name');
  var d = document.getElementById('udh-name');
  if (n && d) d.textContent = n.textContent;
  closeBellPanel();

  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  } else {
    menu.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

function closeUserMenu() {
  var btn = document.getElementById('user-chip-btn');
  var menu = document.getElementById('user-dropdown');
  if (!btn || !menu) return;
  menu.classList.remove('open');
  btn.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', function (e) {
  var wrap = document.getElementById('user-chip-wrap');
  if (wrap && !wrap.contains(e.target)) closeUserMenu();
  var bell = document.getElementById('bell-wrap');
  if (bell && !bell.contains(e.target)) closeBellPanel();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeUserMenu(); closeBellPanel(); }
});

/* ── Chuông thông báo — nối với /api/notifications/feed (DB thật) ── */
var _bellNotifs = [];
var _bellServerUnread = 0; // badge count từ server (COUNT(*) WHERE is_read=false)
var _BELL_ICON = { mention: '💬', comment_reply: '↩️', post_comment: '📝', system: '🔔' };

function _bellTimeAgo(iso) {
  if (!iso) return '';
  var s = /[Zz]|[+][0-9]/.test(iso) ? iso : String(iso).replace(' ', 'T') + 'Z';
  var diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (isNaN(diff)) return '';
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return Math.floor(diff / 60) + ' phút trước';
  if (diff < 86400) return Math.floor(diff / 3600) + ' giờ trước';
  return Math.floor(diff / 86400) + ' ngày trước';
}

function _escBell(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loadBellNotifs() {
  return fetch('/api/notifications/feed')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      // /notifications/feed trả THẲNG bản ghi Prisma nên field là camelCase
      // (refType/refId/isRead/createdAt) — `@map("ref_type")` chỉ đổi tên cột DB.
      // Đọc snake_case như trước làm cả ba field undefined: mất mốc thời gian,
      // mọi thông báo luôn tính là chưa đọc, và bấm vào không nhảy tới bài viết.
      // Nhận cả hai dạng để không phụ thuộc backend đổi cách trả về.
      _bellNotifs = (d.items || []).map(function (n) {
        var created = n.createdAt != null ? n.createdAt : n.created_at;
        var isRead = n.isRead != null ? n.isRead : n.is_read;
        var refType = n.refType != null ? n.refType : n.ref_type;
        var refId = n.refId != null ? n.refId : n.ref_id;
        return {
          id: n.id, icon: _BELL_ICON[n.type] || '🔔',
          title: n.title || '', body: n.body || '',
          time: _bellTimeAgo(created), unread: !isRead,
          refType: refType || null, refId: refId || null
        };
      });
      _bellServerUnread = d.unread || 0;
      _renderBellItems();
      _updateBellDot();
    })
    .catch(function () {});
}

function _renderBellItems() {
  var body = document.getElementById('bell-panel-body');
  if (!body) return;
  if (!_bellNotifs.length) {
    body.innerHTML = '<div class="bell-empty"><div class="bell-empty-icon">🔕</div><div>Chưa có thông báo nào</div></div>';
    return;
  }
  body.innerHTML = _bellNotifs.map(function (n, i) {
    return '<div class="bell-item' + (n.unread ? ' unread' : '') + '" onclick="readBellItem(' + i + ')" role="menuitem" tabindex="0">'
      + '<div class="bell-item-icon">' + n.icon + '</div>'
      + '<div class="bell-item-body">'
      + '<div class="bell-item-text">' + _escBell(n.title) + (n.body ? ': ' + _escBell(n.body) : '') + '</div>'
      + '<div class="bell-item-time">' + _escBell(n.time) + '</div>'
      + '</div>'
      + (n.unread ? '<div class="bell-unread-dot"></div>' : '')
      + '</div>';
  }).join('');
}

function _updateBellDot() {
  var dot = document.getElementById('bell-dot');
  if (!dot) return;
  var count = _bellServerUnread;
  if (!count) count = _bellNotifs.filter(function (n) { return n.unread; }).length;
  if (count > 0) {
    dot.style.display = '';
    dot.classList.add('bell-dot-count');
    dot.textContent = count > 9 ? '9+' : String(count);
  } else {
    dot.style.display = 'none';
    dot.textContent = '';
  }
}

function toggleBellPanel() {
  var panel = document.getElementById('bell-panel');
  var btn = document.getElementById('bell-btn');
  if (!panel || !btn) return;
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  } else {
    closeUserMenu();
    loadBellNotifs();   // tải mới mỗi lần mở
    _renderBellItems();
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

function closeBellPanel() {
  var panel = document.getElementById('bell-panel');
  var btn = document.getElementById('bell-btn');
  if (panel) panel.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Điều hướng tới bài viết của thông báo và mở khung bình luận chứa @mention.
function _focusForumPost(postId) {
  closeBellPanel();
  // Ngoài dashboard thì không có div #page-forum để navigate() bật lên — và
  // navigate() vẫn còn trên window sau khi đi client-side routing, gọi thẳng
  // sẽ ném lỗi null.classList. Không có đích thì đi hẳn sang dashboard.
  if (!document.getElementById('page-forum')) {
    if (typeof window.peGoTab === 'function') window.peGoTab('forum');
    else window.location.href = '/dashboard#forum';
    return;
  }
  if (typeof window.navigate === 'function') window.navigate('forum');
  // renderPosts chạy async (chờ API) -> thử tìm card nhiều lần rồi scroll + mở comment.
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    var card = document.getElementById('fpc-' + postId);
    if (card) {
      clearInterval(timer);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Nhấp nháy nhẹ để user nhận ra bài
      card.style.transition = 'box-shadow .3s';
      card.style.boxShadow = '0 0 0 2px var(--blue, #3B82F6)';
      setTimeout(function () { card.style.boxShadow = ''; }, 1600);
      // Mở khung bình luận để thấy @mention
      if (typeof window.forumToggleComments === 'function') {
        var section = document.getElementById('fpc-cmt-' + postId);
        if (section && !section.classList.contains('open')) window.forumToggleComments(postId);
      }
    } else if (tries > 40) {  // ~10s (Neon cold-start) rồi bỏ cuộc
      clearInterval(timer);
    }
  }, 250);
}

function readBellItem(idx) {
  var n = _bellNotifs[idx];
  if (!n) return;
  if (n.unread) {
    n.unread = false;
    if (_bellServerUnread > 0) _bellServerUnread--;
    _renderBellItems();
    _updateBellDot();
    if (n.id) fetch('/api/notifications/feed/' + n.id + '/read', { method: 'POST' }).catch(function () {});
  }
  // Di chuyển tới bài viết có @mention
  if (n.refType === 'post' && n.refId) _focusForumPost(n.refId);
}

function markAllBellRead() {
  _bellNotifs.forEach(function (n) { n.unread = false; });
  _bellServerUnread = 0;
  _renderBellItems();
  _updateBellDot();
  fetch('/api/notifications/feed/read-all', { method: 'POST' }).catch(function () {});
}

/* ── Badge chuông: client poll /api/notifications/badge mỗi 45s ──
 * PERF 2026-07-19: thay SSE (/api/notifications/stream đã gỡ). SSE giữ 1
 * thread/user suốt ~1h phía server + poll DB 3s/kết nối → nhiều user online
 * là cạn worker. Poll 45s: trễ badge tối đa 45s (chấp nhận được cho chuông),
 * chỉ poll khi tab đang hiển thị. fetch('/api/...') đi qua pe-bridge nên tự
 * có Authorization + refresh token — không cần trò token-qua-query của SSE. */
var _badgeTimer = null;
var _badgeLastLatest = null;
var BADGE_POLL_MS = 45000;

function _pollBadge() {
  if (document.visibilityState !== 'visible') return;
  fetch('/api/notifications/badge')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      _bellServerUnread = d.unread || 0;
      _updateBellDot();
      // Có notification mới (latest tăng) → nạp lại danh sách nếu panel đang mở
      var panel = document.getElementById('bell-panel');
      if (_badgeLastLatest !== null && d.latest > _badgeLastLatest &&
          panel && panel.classList.contains('open')) {
        loadBellNotifs();
      }
      _badgeLastLatest = d.latest;
    })
    .catch(function () {}); // mạng lỗi → thử lại ở lần poll sau
}

function _startBadgePolling() {
  if (_badgeTimer) return;
  _badgeTimer = setInterval(_pollBadge, BADGE_POLL_MS);
}

// Quay lại tab sau khi máy ngủ/đổi tab lâu: đồng bộ badge ngay.
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') {
    loadBellNotifs();
    _pollBadge();
  }
});

// Tải thông báo lúc vào trang để cập nhật badge trên chuông + bắt đầu poll
function _initBell() { loadBellNotifs(); _startBadgePolling(); }
if (document.readyState !== 'loading') _initBell();
else document.addEventListener('DOMContentLoaded', _initBell);
// Quay lại trang bằng client-side routing — xem chú thích ở main.js
// (_peInitMain). Chạy lại an toàn: _startBadgePolling đã tự chặn hẹn giờ trùng.
document.addEventListener('pe:page-remount', _initBell);
