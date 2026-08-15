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

  /* Bảng tiêu đề đúng như `heads` trong file design. Riêng dashboard không
     dùng entry này — xem dashboardHead(), tiêu đề LẪN phụ đề đều đổi theo
     trạng thái user (vừa tạo tài khoản / streak / bình thường). */
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
  var userStreak = 0;
  var userIsNew = false;

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

  /* ── Lời chào + phụ đề đầu trang dashboard ─────────────────────
     Ưu tiên: vừa tạo tài khoản > streak > 3 > đăng nhập bình thường.
     Phụ đề PHẢI đi theo đúng ngữ cảnh của tiêu đề — không dùng chung
     một câu "Hôm nay bạn sẽ học gì?" cho cả 3 trường hợp, vì nó lặp lại
     ý "chào mừng"/"streak" đã nói ở tiêu đề mà không thêm thông tin gì.
     userIsNew/userStreak được init() đổ vào sau khi /user trả về —
     trước đó dùng giá trị mặc định (false/0) nên hiện cặp câu bình
     thường trong nhịp chờ, không nhấp nháy sang "vừa tạo tài khoản". */
  function dashboardHead() {
    if (userIsNew) {
      return {
        title: 'Chào mừng đến với PE' + (userName ? ', ' + userName : '') + ' 🎉',
        sub: 'Khám phá lộ trình học và bắt đầu bài học đầu tiên của bạn nhé!'
      };
    }
    if (userStreak > 3) {
      return {
        title: 'Kỷ luật thép đó nha, ' + userStreak + ' ngày rồi không đứt streak 🔥',
        sub: 'Học một bài hôm nay để giữ chuỗi ngày này tiếp tục nhé.'
      };
    }
    return {
      title: 'Hôm nay bắt đầu học nào' + (userName ? ', ' + userName : '') + ' 👋',
      sub: 'Tiếp tục hành trình chinh phục kỹ năng lập trình của bạn.'
    };
  }

  /* ── Tiêu đề trang ─────────────────────────────────────────── */
  function setHead(page) {
    var h = HEADS[page] || HEADS.dashboard;
    var t = $('edu-page-title'), s = $('edu-page-sub');
    if (!t) return;
    var dash = page === 'dashboard' ? dashboardHead() : null;
    if (dash) {
      t.textContent = dash.title;
    } else {
      t.textContent = h[0];
    }
    // main.js đã tính sẵn "N khóa học · M đang học" cho mục Khóa học —
    // dùng lại thay vì viết cứng, và theo dõi vì nó cập nhật sau khi fetch.
    var live = page === 'courses' && $('courses-count-sub');
    if (s) s.textContent = (live && live.textContent.trim()) || (dash ? dash.sub : h[1]);
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
  // Hai mũi tên ‹ › cuộn qua toàn bộ khóa học viên đã đăng ký, mỗi lần 1 thẻ.
  // `.edu-d-track` tự cuộn (overflow-x + scroll-snap, xem edu-dashboard.css) —
  // JS chỉ đo bề rộng MỘT thẻ thật để biết cuộn bao xa, không tự bịa số thẻ
  // mỗi khung như bản cũ (PER_PAGE cố định từng làm bấm mũi tên chỉ trượt
  // nửa thẻ ở khổ điện thoại, nơi CSS đổi sang 1 thẻ/khung).
  var GAP = 20;   // phải khớp `.edu-d-track { gap }` trong edu-dashboard.css
  var _recent = [];   // toàn bộ khóa đã đăng ký, sắp theo tiến độ giảm dần
  var _suggesting = false;  // true khi đang gợi ý khóa phổ biến (chưa đăng ký gì)

  function recentTrack() {
    var box = $('edu-d-recent');
    return box && box.querySelector('.edu-d-track');
  }

  /** Bề rộng một thẻ + khoảng cách — đo THẬT từ DOM, đúng ở mọi khổ màn hình. */
  function cardStep(track) {
    var card = track.querySelector('.edu-d-lesson');
    return card ? card.getBoundingClientRect().width + GAP : track.clientWidth;
  }

  function syncArrows() {
    var track = recentTrack();
    var wrap = document.querySelector('.edu-d-arrows');
    if (!track) { if (wrap) wrap.style.display = 'none'; return; }
    var scrollable = track.scrollWidth > track.clientWidth + 1;
    if (wrap) wrap.style.display = scrollable ? '' : 'none';
    var prev = $('edu-d-prev'), next = $('edu-d-next');
    if (prev) prev.disabled = track.scrollLeft <= 1;
    if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
  }

  function shiftRecent(delta) {
    var track = recentTrack();
    if (!track) return;
    track.scrollBy({ left: delta * cardStep(track), behavior: 'smooth' });
    // scrollBy không đổi scrollLeft NGAY (còn đang cuộn mượt) — cập nhật
    // trạng thái nút sau khi trình duyệt bắt kịp, tránh nút bị lệch một nhịp.
    setTimeout(syncArrows, 260);
  }

  function renderRecent(courses) {
    _recent = (courses || []).slice()
      .sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); });
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

    // dựng TẤT CẢ thẻ một lần vào khung cuộn — trình duyệt tự lo việc cuộn
    box.innerHTML = '<div class="edu-d-track">' + _recent.map(function (c) {
      var pct = Math.max(0, Math.min(100, Math.round(c.progress || 0)));
      var deg = Math.round(pct * 3.6);
      // dưới 40% dùng đỏ như thẻ thứ hai trong design, còn lại xanh lá
      var ringColor = pct < 40 ? '#f0526b' : '#22c55e';
      var ring = 'conic-gradient(' + ringColor + ' ' + deg + 'deg, rgba(255,255,255,.22) ' + deg + 'deg 360deg)';
      var href = '/courses/' + encodeURIComponent(c.id);
      // Ảnh bìa thật. CỐ Ý dùng ảnh GỐC, KHÔNG dùng _courseCardArt()/-card.webp:
      // bản -card.webp được cắt tay riêng cho khối 365×150 rất ngang của lưới
      // "Khóa học" (main.js). Thẻ ở đây ~274×290 — gần vuông — nhét crop ngang
      // đó vào background-size:cover sẽ zoom cực mạnh vì phải khớp theo chiều
      // cao, cắt gần hết bề ngang và lệch tâm (chữ SQL/logo C++ bị cắt cụt như
      // ảnh lỗi báo). Trang chi tiết khóa học gặp đúng vấn đề này và đã chọn
      // dùng ảnh gốc cho khung "gần vuông" (xem courses/[courseId]/page.tsx) —
      // .edu-d-lesson vuông hơn thế nữa nên theo cùng lựa chọn.
      var cardStyle = c.image
        ? ' style="background-image:url(\'' + esc('/' + String(c.image).replace(/^\/+/, '')) + '\')"'
        : '';
      return (
        '<div class="edu-d-lesson' + (c.image ? ' has-img' : '') + '" onclick="window.location.href=\'' + href + '\'"' + cardStyle + '>' +
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

    // vẽ lại từ đầu mỗi lần (đổi khóa/khi loadRecent chạy lại) -> về đầu khung
    var track = box.querySelector('.edu-d-track');
    if (track) track.scrollLeft = 0;
    syncArrows();
  }

  function bindArrows() {
    var prev = $('edu-d-prev'), next = $('edu-d-next');
    if (prev) prev.addEventListener('click', function () { shiftRecent(-1); });
    if (next) next.addEventListener('click', function () { shiftRecent(1); });

    // Vuốt tay/kéo trackpad đổi scrollLeft mà không qua shiftRecent() — lắng
    // nghe sự kiện scroll của chính track để 2 nút mũi tên luôn khớp trạng
    // thái thật, không chỉ khớp lần bấm cuối. Gắn qua delegation trên box cha
    // vì track bị dựng lại (innerHTML) mỗi lần loadRecent chạy lại.
    var box = $('edu-d-recent');
    var t;
    if (box) {
      box.addEventListener('scroll', function (e) {
        if (!e.target.classList || !e.target.classList.contains('edu-d-track')) return;
        clearTimeout(t);
        t = setTimeout(syncArrows, 80);
      }, true);
    }

    // đổi bề rộng cửa sổ (xoay máy, kéo cửa sổ) → bề rộng thẻ đổi theo,
    // trạng thái nút phải tính lại; bản thân việc cuộn do trình duyệt lo.
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(syncArrows, 120);
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
     /streak/review-quiz-status trả
       { streak, is_unlocked, lessons_completed, lessons_required,
         lessons_remaining, done_today }.

     Mở khoá theo SỐ BÀI ĐÃ HỌC TRONG NGÀY (lessons_completed đếm lại từ 0 mỗi
     ngày mới, không cộng dồn) — học đủ 5 bài HÔM NAY mới mở. Mở rồi thì MỖI
     NGÀY một đề: nộp xong, thẻ chuyển sang trạng thái "đã ôn hôm nay" tới
     sáng mai, và số bài lại đếm lại từ 0 khi sang ngày mới.

     Ba trạng thái của thẻ:
       1. chưa đủ bài   -> "Mở khoá bài ôn tập", còn N bài nữa
       2. sẵn sàng      -> "Ôn tập hôm nay", nút Ôn ngay
       3. đã ôn hôm nay -> "Đã ôn hôm nay", nút Xem kỹ năng

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

    var goToSkills = function () {
      if (typeof window.navigateToSkills === 'function') window.navigateToSkills();
      else if (typeof window.navigate === 'function') window.navigate('skills');
    };

    if (!status.is_unlocked) {
      // ── 1. Chưa đủ bài ──
      var required = status.lessons_required || 5;
      var doneN = status.lessons_completed || 0;
      var left = status.lessons_remaining != null
        ? status.lessons_remaining
        : Math.max(0, required - doneN);
      title.textContent = 'Mở khoá bài ôn tập';
      cap.textContent = 'CÒN';
      num.textContent = left;
      sub.textContent = 'Học ' + required + ' bài để mở khoá · đang ' +
        doneN + '/' + required;
      cta.textContent = 'Học một bài';
      cta.onclick = function () { if (typeof window.navigate === 'function') window.navigate('courses'); };
    } else if (status.done_today) {
      // ── 2. Đã ôn hôm nay: mỗi ngày một đề, chờ sang ngày mới ──
      title.textContent = 'Đã ôn hôm nay';
      cap.textContent = 'XONG';
      num.textContent = '✓';
      sub.textContent = 'Hẹn gặp lại vào ngày mai nhé';
      cta.textContent = 'Xem kỹ năng';
      cta.onclick = goToSkills;
    } else {
      // ── 3. Sẵn sàng ──
      var need = countNeedReview(skillsRes);
      title.textContent = 'Ôn tập hôm nay';
      cap.textContent = need ? 'KỸ NĂNG' : 'SẴN SÀNG';
      num.textContent = need ? need : '★';
      sub.textContent = need
        ? need + ' kỹ năng cần ôn lại'
        : 'Đề hôm nay trộn câu từ các bài bạn đã học';
      cta.textContent = 'Ôn ngay';
      cta.onclick = function () {
        // Mở thẳng bài ôn tự sinh (edu-review-quiz.js). Kể cả khi không kỹ năng
        // nào "cần ôn", vẫn cho làm — đề hằng ngày lấy câu từ mọi bài đã học
        // chứ không chỉ từ kỹ năng đang yếu.
        if (typeof window.peOpenReviewQuiz === 'function') {
          window.peOpenReviewQuiz();
          return;
        }
        goToSkills();
        if (need && typeof window.skSetFilter === 'function') window.skSetFilter('review');
      };
    }
    // Tô kiểu "khoá" cho cả trạng thái chưa đủ bài lẫn đã ôn xong hôm nay —
    // cả hai đều là "chưa bấm được để ôn ngay bây giờ".
    card.classList.toggle(
      'edu-d-review--locked',
      !status.is_unlocked || !!status.done_today,
    );
    card.hidden = false;
  }

  /* ── Hôm nay bạn đã học ────────────────────────────────────
     /quiz/today trả
       { count, questions_available, min_questions, can_quiz,
         lessons: [{ id, title, course_title, question_count, completed_at }] }

     Ba trạng thái:
       · chưa học bài nào hôm nay -> ẩn hẳn thẻ (không bịa "0 bài")
       · có học nhưng chưa đủ câu -> liệt kê bài, nút bị vô hiệu kèm lý do
       · đủ câu                    -> nút mở đề gộp từ đúng những bài đó

     Cố ý KHÔNG dùng chung nút với thẻ "Ôn tập hôm nay": đề bên kia lấy câu
     từ mọi bài từng học và mỗi ngày một lần; đề ở đây bó vào buổi học hôm
     nay và làm lại thoải mái. */
  function renderToday(data) {
    var card = $('edu-d-today');
    if (!card) return;

    // Không có dữ liệu, hoặc hôm nay chưa học gì -> ẩn, đúng nguyên tắc
    // "không dựng khối rỗng" của các thẻ khác trên màn này.
    if (!data || !data.count) { card.hidden = true; return; }

    var countEl = $('edu-d-today-count'), listEl = $('edu-d-today-list'),
        subEl = $('edu-d-today-sub'), cta = $('edu-d-today-cta');

    countEl.textContent = data.count + (data.count > 1 ? ' bài' : ' bài');

    // Liệt kê tối đa 4 bài cho vừa thẻ, dư thì gộp thành "+N bài nữa".
    var MAX_ROWS = 4;
    var shown = (data.lessons || []).slice(0, MAX_ROWS);
    var rest = (data.lessons || []).length - shown.length;
    listEl.innerHTML = shown.map(function (l) {
      return '<li class="edu-d-today-item">' +
        '<span class="edu-d-today-dot" aria-hidden="true"></span>' +
        '<span class="edu-d-today-name">' + esc(l.title) + '</span>' +
        '<span class="edu-d-today-course">' + esc(l.course_title) + '</span>' +
        '</li>';
    }).join('') + (rest > 0
      ? '<li class="edu-d-today-item edu-d-today-more">+' + rest + ' bài nữa</li>'
      : '');

    if (data.can_quiz) {
      subEl.textContent = 'Gộp ' + data.questions_available +
        ' câu hỏi từ những bài này thành một đề';
      cta.disabled = false;
      cta.textContent = 'Ôn lại bài hôm nay';
      cta.onclick = function () {
        if (typeof window.peOpenReviewQuiz === 'function') window.peOpenReviewQuiz('today');
      };
    } else {
      // Nói THẲNG lý do ngay trên thẻ thay vì để người dùng bấm rồi mới nhận
      // màn hình lỗi cụt — đây chính là trải nghiệm đang gặp hiện nay.
      subEl.textContent = 'Cần ít nhất ' + (data.min_questions || 5) +
        ' câu hỏi mới tạo được đề · những bài này mới có ' +
        (data.questions_available || 0);
      cta.disabled = true;
      cta.textContent = 'Chưa đủ câu hỏi';
      cta.onclick = null;
    }
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
  function loadToday() {
    getJson('/quiz/today').then(renderToday);
  }

  // edu-review-quiz.js gọi lại sau khi nộp bài: điểm mới có thể đổi tiến độ
  // kỹ năng nên số "cần ôn" trên thẻ phải tính lại, và cờ "đã ôn hôm nay"
  // cũng vừa bật lên.
  window.eduReloadReviewCard = function () {
    loadReview();
    loadToday();
  };

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
      var raw = (u && u.user) || u || {};
      var name = raw.name;
      if (name) userName = String(name).trim().split(/\s+/).slice(-1)[0];
      userStreak = raw.streak != null ? raw.streak : 0;
      // "Vừa tạo tài khoản": /user báo chưa hoàn thành khảo sát — đúng cho
      // OAuth (vào thẳng /dashboard, chưa từng qua /questionaire) — HOẶC cờ
      // register.inline.js ghi lúc đăng ký xong. Đăng ký bằng mật khẩu luôn
      // đi qua /questionaire BẮT BUỘC trước khi tới đây, lúc đó
      // questionnaireCompleted đã true nên chỉ riêng cờ mới bắt được case này.
      var justRegistered = false;
      try { justRegistered = sessionStorage.getItem('pe_just_registered') === '1'; } catch (e) { /* private mode */ }
      userIsNew = Boolean(raw.first_login || raw.needs_questionnaire || justRegistered);
      if (justRegistered) {
        try { sessionStorage.removeItem('pe_just_registered'); } catch (e) { /* noop */ }
      }
      setHead(currentPage());
    });
    setHead(currentPage());

    bindArrows();
    loadRecent();
    loadReview();
    loadToday();
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
