/* ══════════════════════════════════════════════════════════════
   edu-dashboard.js — đổ dữ liệu cho màn "dash" dựng theo
   "Programming EDU.dc.html" (Bài học gần đây / Bảng xếp hạng /
   ô thống kê) và cho khối tiêu đề H1 + phụ đề ở HeaderBar.

   Nạp SAU main.js và dashboard.js. Không sửa, không thay thế hàm nào
   của hai file đó — chỉ bọc thêm quanh window.navigate giống cách
   dashboard.js đang làm, và đọc lại window.enrolledCourses mà
   main.js đã nạp sẵn.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = (typeof API === 'string' && API) || '/api';

  /* Bảng tiêu đề đúng như `heads` trong file design. Tên người dùng được
     ghép vào lời chào của màn dashboard sau khi /user trả về. */
  var HEADS = {
    dashboard: ['Chào mừng trở lại', 'Hôm nay bạn sẽ học gì? Tiếp tục hành trình chinh phục kỹ năng lập trình của bạn.'],
    courses: ['Khóa học', 'Chọn khóa học và theo dõi tiến độ của bạn'],
    roadmap: ['Lộ trình', 'Các khóa nối tiếp nhau theo thứ tự'],
    forum: ['Diễn đàn', 'Chia sẻ kiến thức, đặt câu hỏi và thảo luận cùng mọi người'],
    leader: ['Bảng xếp hạng', 'XP tích lũy trong tuần này · cập nhật mỗi giờ'],
    skills: ['Kỹ năng', 'Những kỹ năng bạn đã tích lũy'],
    profile: ['Trang của tôi', 'Học viên · Programming EDU'],
    settings: ['Cài đặt', 'Tùy chỉnh tài khoản và giao diện']
  };

  var AVATARS = [
    'linear-gradient(140deg,#8fb8f0,#6f8ee0)',
    'linear-gradient(140deg,#c9a7f5,#a8d5f2)',
    'linear-gradient(140deg,#f0b48f,#e08f6f)',
    'linear-gradient(140deg,#9fe0c4,#6fc9a4)',
    'linear-gradient(140deg,#f0a7c4,#e07fa4)'
  ];
  var MEDALS = ['#d4a017', '#a8a8b8', '#c08552'];

  var userName = '';

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /* ── Tiêu đề trang ─────────────────────────────────────────── */
  function setHead(page) {
    var h = HEADS[page] || HEADS.dashboard;
    var t = $('edu-page-title'), s = $('edu-page-sub');
    if (!t) return;
    if (page === 'dashboard') {
      t.textContent = h[0] + (userName ? ', ' + userName : '') + ' 👋';
    } else {
      t.textContent = h[0];
    }
    // main.js đã tính sẵn "N khóa học · M đang học" cho mục Khóa học —
    // dùng lại thay vì viết cứng, và theo dõi vì nó cập nhật sau khi fetch.
    var live = page === 'courses' && $('courses-count-sub');
    if (s) s.textContent = (live && live.textContent.trim()) || h[1];
    if (live && !live.__eduWatched) {
      live.__eduWatched = true;
      new MutationObserver(function () {
        if (currentPage() === 'courses' && s) s.textContent = live.textContent.trim() || h[1];
      }).observe(live, { childList: true, characterData: true, subtree: true });
    }
  }

  function currentPage() {
    var active = document.querySelector('.page.active');
    if (!active || !active.id) return 'dashboard';
    return active.id.replace(/^page-/, '');
  }

  /* ── Bài học gần đây ───────────────────────────────────────── */
  // Design: 2 thẻ 290px, ảnh nền vân chéo tối, vòng tiến độ conic-gradient.
  // Hai mũi tên ‹ › trượt qua toàn bộ khóa học viên đã đăng ký, mỗi lần 1 thẻ.
  var PER_PAGE = 2;
  var _recent = [];   // toàn bộ khóa đã đăng ký, sắp theo tiến độ giảm dần
  var _offset = 0;    // vị trí thẻ đầu tiên đang hiển thị
  var _suggesting = false;  // true khi đang gợi ý khóa phổ biến (chưa đăng ký gì)

  function maxOffset() { return Math.max(0, _recent.length - PER_PAGE); }

  function syncArrows() {
    var wrap = document.querySelector('.edu-d-arrows');
    // ít hơn hoặc bằng 2 khóa thì không có gì để trượt
    if (wrap) wrap.style.display = _recent.length > PER_PAGE ? '' : 'none';
    var prev = $('edu-d-prev'), next = $('edu-d-next');
    if (prev) prev.disabled = _offset <= 0;
    if (next) next.disabled = _offset >= maxOffset();
  }

  // Trượt bằng transform trên ray: không vẽ lại DOM nên chuyển mượt.
  var GAP = 20;
  function applyTransform() {
    var box = $('edu-d-recent');
    var track = box && box.querySelector('.edu-d-track');
    if (!track) return;
    var step = (box.clientWidth + GAP) / PER_PAGE;   // bề ngang 1 thẻ + khoảng cách
    track.style.transform = 'translateX(' + (-_offset * step) + 'px)';
  }

  function shiftRecent(delta) {
    var next = Math.min(maxOffset(), Math.max(0, _offset + delta));
    if (next === _offset) return;
    _offset = next;
    applyTransform();
    syncArrows();
  }

  function renderRecent(courses) {
    _recent = (courses || []).slice()
      .sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); });
    _offset = 0;
    paintRecent();
  }

  function paintRecent() {
    var box = $('edu-d-recent');
    if (!box) return;

    if (!_recent.length) {
      box.innerHTML =
        '<div class="edu-d-recent-empty">Bạn chưa đăng ký khóa học nào — hãy bắt đầu từ mục Khóa học nhé.</div>';
      syncArrows();
      return;
    }

    // dựng TẤT CẢ thẻ một lần lên ray; chuyển thẻ chỉ là đổi transform
    box.innerHTML = '<div class="edu-d-track">' + _recent.map(function (c) {
      var pct = Math.max(0, Math.min(100, Math.round(c.progress || 0)));
      var deg = Math.round(pct * 3.6);
      // dưới 40% dùng đỏ như thẻ thứ hai trong design, còn lại xanh lá
      var ringColor = pct < 40 ? '#f0526b' : '#22c55e';
      var ring = 'conic-gradient(' + ringColor + ' ' + deg + 'deg, rgba(255,255,255,.22) ' + deg + 'deg 360deg)';
      var href = '/courses/' + encodeURIComponent(c.id);
      return (
        '<div class="edu-d-lesson" onclick="window.location.href=\'' + href + '\'">' +
        '<span class="edu-d-lesson-art">' + esc(c.subtitle || c.tag || 'Khóa học') + '</span>' +
        '<div class="edu-d-lesson-foot">' +
        '<div>' +
        '<div class="edu-d-lesson-name">' + esc(c.title || 'Khóa học') + '</div>' +
        '<div class="edu-d-lesson-btn">' + (_suggesting ? 'Bắt đầu' : 'Tiếp tục') + '</div>' +
        '</div>' +
        // đang gợi ý thì chưa có tiến độ — hiện số bài thay cho vòng 0%
        (_suggesting
          ? '<div class="edu-d-ring edu-d-ring--plain"><div class="edu-d-ring-in">' +
            esc(c.lessons || c.totalLessons || 0) + '<span>bài</span></div></div>'
          : '<div class="edu-d-ring" style="background:' + ring + '">' +
            '<div class="edu-d-ring-in">' + pct + '%</div>' +
            '</div>') +
        '</div>' +
        '</div>'
      );
    }).join('') + '</div>';

    // đặt vị trí ngay, không cho hiệu ứng chạy ở lần vẽ đầu
    var track = box.querySelector('.edu-d-track');
    if (track) {
      track.style.transition = 'none';
      applyTransform();
      void track.offsetWidth;          // ép reflow để bỏ qua transition lần đầu
      track.style.transition = '';
    }
    syncArrows();
  }

  function bindArrows() {
    var prev = $('edu-d-prev'), next = $('edu-d-next');
    if (prev) prev.addEventListener('click', function () { shiftRecent(-1); });
    if (next) next.addEventListener('click', function () { shiftRecent(1); });

    // đổi bề rộng cửa sổ → bước trượt đổi theo, phải tính lại
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var track = document.querySelector('.edu-d-track');
        if (!track) return;
        track.style.transition = 'none';
        applyTransform();
        void track.offsetWidth;
        track.style.transition = '';
      }, 120);
    });
  }

  // Backend bọc mảng trong {ok:true, enrolled:[…]} — nhận cả hai dạng
  function asList(data, key) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[key])) return data[key];
    return [];
  }

  // Số lượt đăng ký để xếp khóa phổ biến: ưu tiên `enrollments`, không có thì
  // bóc số từ chuỗi hiển thị `students` (vd "1.２k" → 1) — cùng cách sortCourses.
  function popularity(c) {
    var n = parseInt(c.enrollments, 10);
    if (!isNaN(n)) return n;
    return parseInt(String(c.students || '').replace(/[^\d]/g, ''), 10) || 0;
  }

  // Chưa đăng ký khóa nào → giới thiệu 2 khóa nhiều người học nhất,
  // và đổi tiêu đề mục vì đây không còn là "bài học gần đây" của user.
  function showPopular() {
    getJson('/courses').then(function (d) {
      var all = asList(d, 'courses');
      var top = all.slice().sort(function (a, b) { return popularity(b) - popularity(a); }).slice(0, 2);
      var title = $('edu-d-recent-title');
      if (title && top.length) title.textContent = 'Các khóa học';
      _suggesting = true;
      renderRecent(top);
    });
  }

  // Ưu tiên dữ liệu main.js đã nạp; nếu chưa có thì tự gọi /enrolled để
  // khối này không phụ thuộc thứ tự khởi động của main.js.
  function loadRecent() {
    if (window.enrolledCourses && window.enrolledCourses.length) {
      renderRecent(window.enrolledCourses);
      return;
    }
    getJson('/enrolled').then(function (d) {
      var list = asList(d, 'enrolled');
      if (!list.length && window.enrolledCourses) list = window.enrolledCourses;
      if (!list.length) { showPopular(); return; }
      renderRecent(list);
    });
  }

  /* ── Bảng xếp hạng (top 3) ─────────────────────────────────── */
  function renderLb(data) {
    var box = $('edu-d-lb');
    if (!box) return;
    var entries = (data && data.entries) || [];
    if (!entries.length) {
      box.innerHTML = '<div class="edu-d-lb-empty">Chưa có dữ liệu xếp hạng.</div>';
      return;
    }
    box.innerHTML = entries.slice(0, 3).map(function (e, i) {
      return (
        '<div class="edu-d-lb-row">' +
        '<div class="edu-d-lb-av" style="background:' + AVATARS[i % AVATARS.length] + '">' +
        esc(initials(e.name)) + '</div>' +
        '<div class="edu-d-lb-main">' +
        '<div class="edu-d-lb-name">' + esc(e.name) + '</div>' +
        '<div class="edu-d-lb-league">Học viên · Programming EDU</div>' +
        '</div>' +
        '<div class="edu-d-lb-pos" style="color:' + MEDALS[i] + '">' + (e.rank || i + 1) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  /* ── Ô thống kê ────────────────────────────────────────────── */
  var ICONS = {
    flame: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/></svg>',
    check: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b8def" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
    award: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>',
    brain: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>',
    zap: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>'
  };

  function renderStats(s) {
    s = s || {};
    // GET /stats trả `streak` + `coursesEnrolled` (xem stats.service.ts). Đọc
    // `streakDays`/`enrolledCount` như trước là hai trường KHÔNG tồn tại nên
    // chuỗi ngày học và số khóa đang học luôn hiện 0. Nhận cả tên cũ để phòng.
    var streakVal = s.streak != null ? s.streak : (s.streakDays || 0);
    var enrolledVal = s.coursesEnrolled != null ? s.coursesEnrolled : (s.enrolledCount || 0);
    var big = $('edu-d-bigstats');
    if (big) {
      big.innerHTML = [
        { icon: 'flame', bg: 'rgba(249,115,22,.12)', val: streakVal, lbl: 'Chuỗi ngày học' },
        { icon: 'check', bg: 'rgba(34,197,94,.12)', val: s.lessonsDone != null ? s.lessonsDone : (s.certificates || 0), lbl: 'Bài học hoàn thành' }
      ].map(function (x) {
        return (
          '<div class="edu-d-bigstat">' +
          '<div class="edu-d-bigstat-icon" style="background:' + x.bg + '">' + ICONS[x.icon] + '</div>' +
          '<div><div class="edu-d-bigstat-val">' + esc(x.val) + '</div>' +
          '<div class="edu-d-bigstat-lbl">' + x.lbl + '</div></div>' +
          '</div>'
        );
      }).join('');
    }

    var mini = $('edu-d-ministats');
    if (mini) {
      mini.innerHTML = [
        { icon: 'book', bg: 'rgba(91,141,239,.12)', val: enrolledVal, lbl: 'Khóa học đang học' },
        { icon: 'award', bg: 'rgba(245,158,11,.16)', val: s.achievements || 0, lbl: 'Thành tích đạt được' },
        { icon: 'brain', bg: 'rgba(167,139,250,.16)', val: s.skills || 0, lbl: 'Kỹ năng' },
        { icon: 'zap', bg: 'rgba(34,197,94,.14)', val: s.xp || 0, lbl: 'Điểm XP' }
      ].map(function (x) {
        return (
          '<div class="edu-d-ministat">' +
          '<div class="edu-d-ministat-icon" style="background:' + x.bg + '">' + ICONS[x.icon] + '</div>' +
          '<div><div class="edu-d-ministat-val">' + esc(x.val) + '</div>' +
          '<div class="edu-d-ministat-lbl">' + x.lbl + '</div></div>' +
          '</div>'
        );
      }).join('');
    }

    var streak = $('edu-streak-num');
    if (streak) streak.textContent = streakVal;
  }

  /* ── Ôn tập hôm nay ────────────────────────────────────────
     /streak/review-quiz-status trả { streak, is_unlocked, days_remaining };
     bài ôn mở khoá khi học liên tiếp đủ 5 ngày (hằng số phía backend).
     Số "cần ôn" đếm từ /skills theo đúng luật của dashboard.js:
     progress === 0 → chưa học, >= 70 → đạt, còn lại → cần ôn. */
  function countNeedReview(skillsRes) {
    // /skills trả MẢNG PHẲNG `skills`, không phải `skill_sets` lồng nhau —
    // đọc sai nên số cần ôn luôn 0 và thẻ này luôn báo "Bạn đã ôn hết".
    // peAdaptSkills do dashboard.js đặt lên window (cùng luật gom nhóm).
    var sets = typeof window.peAdaptSkills === 'function'
      ? window.peAdaptSkills(skillsRes)
      : ((skillsRes && skillsRes.skill_sets) || []);
    var n = 0;
    sets.forEach(function (s) {
      (s.skills || []).forEach(function (sk) {
        if (sk.progress > 0 && sk.progress < 70) n++;
      });
    });
    return n;
  }

  function renderReview(status, skillsRes) {
    var card = $('edu-d-review');
    if (!card) return;
    // không có dữ liệu thật thì ẩn hẳn, không bịa nội dung
    if (!status) { card.hidden = true; return; }

    var title = $('edu-d-review-title'), cap = $('edu-d-review-cap'),
        num = $('edu-d-review-num'), sub = $('edu-d-review-sub'), cta = $('edu-d-review-cta');

    if (status.is_unlocked) {
      var need = countNeedReview(skillsRes);
      title.textContent = 'Ôn tập hôm nay';
      cap.textContent = need ? 'KỸ NĂNG' : 'XONG';
      num.textContent = need ? need : '✓';
      sub.textContent = need
        ? need + ' kỹ năng cần ôn lại'
        : 'Bạn đã ôn hết — quay lại sau nhé';
      cta.textContent = need ? 'Ôn ngay' : 'Xem kỹ năng';
      cta.onclick = function () {
        if (typeof window.navigateToSkills === 'function') window.navigateToSkills();
        else if (typeof window.navigate === 'function') window.navigate('skills');
        if (need && typeof window.skSetFilter === 'function') window.skSetFilter('review');
      };
    } else {
      var left = status.days_remaining || 0;
      var goal = (status.streak || 0) + left;
      title.textContent = 'Mở khoá bài ôn tập';
      cap.textContent = 'CÒN';
      num.textContent = left;
      sub.textContent = 'Học liên tiếp ' + goal + ' ngày để mở khoá · đang ' +
        (status.streak || 0) + '/' + goal;
      cta.textContent = 'Học một bài';
      cta.onclick = function () { if (typeof window.navigate === 'function') window.navigate('courses'); };
    }
    card.classList.toggle('edu-d-review--locked', !status.is_unlocked);
    card.hidden = false;
  }

  /* ── Thẻ phụ trang Xếp hạng ────────────────────────────────
     Cả tiêu đề, câu mô tả và 3 dòng số đều nói về xếp hạng tuần, lấy trọn
     từ /leaderboard — không phụ thuộc field nào backend chưa có, nên thẻ
     không bao giờ kẹt ở trạng thái "đang tải".
     Câu mô tả đổi theo tình huống: đang đuổi ai, hay đang dẫn đầu. */
  function renderLeaderSide(lb) {
    var rankEl = $('edu-l-rank'), xpEl = $('edu-l-xp'), gapEl = $('edu-l-gap'), subEl = $('edu-l-hours-sub');
    if (!rankEl) return;

    var entries = (lb && lb.entries) || [];
    var me = lb && lb.me;
    // `me` có thể null khi user đã nằm trong top — tìm lại trong danh sách
    if (!me && entries.length) {
      me = entries.filter(function (e) { return e.isMe || e.is_me; })[0] || null;
    }
    var unit = (lb && lb.unit) || 'XP';
    var top = entries[0];

    rankEl.textContent = me && me.rank ? '#' + me.rank : '—';
    xpEl.textContent = me && me.value != null ? fmtNum(me.value) + ' ' + unit : '—';

    var gap = null;
    if (me && top && top.value != null && me.value != null) {
      gap = Math.max(0, top.value - me.value);
      gapEl.textContent = gap === 0 ? 'Bạn đang dẫn đầu' : fmtNum(gap) + ' ' + unit;
    } else {
      gapEl.textContent = '—';
    }

    if (!subEl) return;
    if (gap === null) {
      subEl.textContent = 'Thứ hạng cập nhật mỗi khi bạn hoàn thành bài học.';
    } else if (gap === 0) {
      subEl.textContent = 'Bạn đang dẫn đầu tuần này — giữ vững nhé!';
    } else {
      // người ngay trên bạn thường sát hơn hạng nhất → nêu mốc gần nhất trước
      var above = null;
      for (var i = 0; i < entries.length; i++) {
        if (me.rank && entries[i].rank === me.rank - 1) { above = entries[i]; break; }
      }
      if (above && above.value != null) {
        var d = Math.max(0, above.value - me.value);
        subEl.textContent = 'Còn ' + fmtNum(d) + ' ' + unit + ' nữa để vượt ' + above.name + '.';
      } else {
        subEl.textContent = 'Còn ' + fmtNum(gap) + ' ' + unit + ' nữa để lên hạng nhất.';
      }
    }
  }

  function fmtNum(v) {
    var n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('vi-VN');
  }

  function loadLeaderSide() {
    getJson('/leaderboard?type=weekly').then(renderLeaderSide);
  }

  function loadReview() {
    Promise.all([getJson('/streak/review-quiz-status'), getJson('/skills')])
      .then(function (res) { renderReview(res[0], res[1]); });
  }

  function getJson(path) {
    return fetch(API_BASE + path)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function loadAllStats() {
    Promise.all([
      getJson('/stats'),
      getJson('/achievements'),
      getJson('/skills')
    ]).then(function (res) {
      var s = res[0] || {};
      var ach = res[1], sk = res[2];
      var achList = (ach && (ach.achievements || ach)) || [];
      var skList = (sk && (sk.skills || sk)) || [];
      s.achievements = Array.isArray(achList)
        ? achList.filter(function (a) { return a.earned || a.unlocked || a.achieved; }).length
        : 0;
      s.skills = Array.isArray(skList) ? skList.length : 0;
      renderStats(s);
    });
  }

  /* ── Khởi động ─────────────────────────────────────────────── */
  function init() {
    getJson('/user').then(function (u) {
      var name = u && (u.name || (u.user && u.user.name));
      if (name) userName = String(name).trim().split(/\s+/).slice(-1)[0];
      setHead(currentPage());
    });
    setHead(currentPage());

    bindArrows();
    loadRecent();
    loadReview();
    loadLeaderSide();
    loadAllStats();
    getJson('/leaderboard?type=weekly').then(renderLb);

    // giữ tiêu đề đồng bộ khi chuyển trang trong SPA
    // Cờ __eduHeadHooked: init() còn được gọi lại khi quay về dashboard bằng
    // client-side routing; không có cờ thì mỗi lần quay lại lại bọc thêm một
    // lớp quanh navigate, chồng vô hạn (setHead chạy n lần mỗi lần đổi tab).
    if (typeof window.navigate === 'function' && !window.navigate.__eduHeadHooked) {
      var orig = window.navigate;
      var wrapped = function (page) {
        orig.apply(this, arguments);
        setHead(page);
      };
      wrapped.__eduHeadHooked = true;
      window.navigate = wrapped;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Quay lại dashboard bằng client-side routing — xem chú thích ở main.js
  // (_peInitMain). File này không được nạp lại nên phải tự đăng ký lại.
  document.addEventListener('pe:page-remount', init);
})();
