/**
 * course_db_design.page.js — đổ dữ liệu cho /courses/db_design{,_tc,_nc}.
 * Thay phần Jinja bơm server-side của course_db_design.html (user_name,
 * enrollment, streak, pct): bản tĩnh fetch API rồi điền vào khung có sẵn.
 *
 * Toàn bộ roadmap/nội dung khóa nằm trong course_db_design.js (đọc
 * <body data-course>) — file này chỉ lo dữ liệu người dùng + globals, rồi nạp
 * engine legacy SAU khi #cd-cta-area đã dựng xong.
 *
 * Yêu cầu nạp trước: pe-config.js → pe-bridge.js; window.COURSE_ID set inline.
 */
(function () {
  'use strict';

  var COURSE_ID = window.COURSE_ID;
  var LESSON_COUNT = 20; // Jinja: done = min(completed_lessons, 20)

  function json(path) {
    return fetch(path).then(function (r) { return r.ok ? r.json() : null; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  Promise.all([json('/api/enrolled'), json('/api/stats'), json('/api/user')])
    .then(function (res) { return res; })
    // Chưa đăng nhập / API lỗi: vẫn dựng trang ở trạng thái khách (giống React cũ)
    .catch(function () { return [[], {}, {}]; })
    .then(function (res) {
      var enrolled = res[0] || [];
      var stats = res[1] || {};
      var user = res[2] || {};
      var enrollment = Array.isArray(enrolled)
        ? enrolled.filter(function (e) { return e.id === COURSE_ID; })[0] || null
        : null;
      render(enrollment, stats.streakDays || 0, user.name || '—');
    });

  function render(enrollment, streak, userName) {
    document.querySelectorAll('[data-user-name]').forEach(function (el) {
      el.textContent = userName;
    });

    var completed = enrollment ? enrollment.completedLessons || 0 : 0;
    var done = Math.min(completed, LESSON_COUNT);
    var pct = done > 0 ? Math.round((done * 100) / LESSON_COUNT * 10) / 10 : 0;

    var area = document.getElementById('cd-cta-area');
    area.innerHTML = enrollment
      ? '<div class="cd-progress-row" style="margin-top:14px">' +
          '<div class="cd-progress-label"><span>Tiến độ</span><span class="pct">' + pct + '%</span></div>' +
          '<div class="cd-prog-bar"><div class="cd-prog-fill" id="prog-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
        '<div class="cd-card-stats">' +
          stat(done, 'Bài đã học') +
          stat(Math.max(LESSON_COUNT - completed, 0), 'Còn lại') +
          stat(enrollment.timeSpent || '0h', 'Đã học') +
          stat(streak, '🔥 Streak') +
        '</div>' +
        '<button class="cd-enroll-btn continue" onclick="goLesson()">▶ Tiếp tục học</button>' +
        '<button class="cd-enroll-btn unenroll" id="unenroll-btn" onclick="unenroll()">Hủy đăng ký</button>'
      : '<button class="cd-enroll-btn primary" style="margin-top:14px" id="enroll-btn" onclick="enroll()">' +
        'Đăng ký ngay – Miễn phí</button>';

    // Globals course_db_design.js đọc ngay lúc load (trước là inline <script> Jinja)
    window.USER_STREAK = streak;
    window.CURRENT_LESSON_IDX = completed;
    window.LESSON_URL = '/lesson/' + COURSE_ID;

    ['/static/js/course_db_design.js', '/static/js/chatbot.js'].forEach(function (src) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.body.appendChild(el);
    });
  }

  function stat(value, label) {
    return '<div class="cd-cs"><div class="v">' + esc(value) + '</div><div class="l">' + label + '</div></div>';
  }
})();
