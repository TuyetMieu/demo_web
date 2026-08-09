/**
 * course_detail.page.js — đổ dữ liệu cho trang /courses/<id> (khóa python, java,
 * htmlcss, cpp). Thay phần Jinja render server-side của course_detail.html:
 * Flask dựng sẵn giáo trình + trạng thái enrollment, bản tĩnh này fetch API rồi
 * điền vào khung HTML có sẵn.
 *
 * Vòng tính done/current/locked giữ ĐÚNG logic main.py course_detail():
 * bài thứ i là done nếu i < completed, current nếu i == completed, còn lại locked.
 *
 * Yêu cầu nạp trước: pe-config.js → pe-bridge.js (rewrite /api/* + JWT) → curricula.js.
 * Nạp SAU khi render xong: course_detail.js, review_quiz.js, chatbot.js — cả ba
 * có IIFE truy vấn DOM ngay lúc load (vd #current-lesson) nên phải đợi markup.
 */
(function () {
  'use strict';

  var COURSE_ID = window.COURSE_ID;
  var CURRICULA = window.CURRICULA || {};
  var LESSON_URLS = window.LESSON_URLS || {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(sel, value) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = value; });
  }

  function json(path) {
    return fetch(path).then(function (r) { return r.ok ? r.json() : null; });
  }

  Promise.all([json('/api/courses'), json('/api/enrolled'), json('/api/stats'), json('/api/user')])
    .then(function (res) {
      var courses = res[0] || [];
      var enrolled = res[1] || [];
      var stats = res[2] || {};
      var user = res[3] || {};

      var course = Array.isArray(courses)
        ? courses.filter(function (c) { return c.id === COURSE_ID; })[0]
        : null;
      // Khóa không tồn tại → về dashboard, y hệt guard của main.py
      if (!course) { window.location.replace('/dashboard'); return; }

      var enrollment = Array.isArray(enrolled)
        ? enrolled.filter(function (e) { return e.id === COURSE_ID; })[0] || null
        : null;

      render(course, enrollment, stats.streakDays || 0, user.name || '—');
    })
    .catch(function () { window.location.replace('/login'); });

  function render(course, enrollment, streak, userName) {
    var curriculum = CURRICULA[COURSE_ID] || {};
    var completed = enrollment ? enrollment.completedLessons || 0 : 0;
    var lessonUrl = LESSON_URLS[COURSE_ID] || '/lesson/' + COURSE_ID;
    var progress = enrollment ? enrollment.progress || 0 : 0;
    var totalLessons = course.lessons || 0;
    var image = '/' + String(course.image || '').replace(/^\//, '');

    document.title = course.title + ' – Programming EDU';

    setText('[data-user-name]', userName);
    setText('[data-course-duration]', course.duration || '');
    setText('[data-course-lessons]', String(course.lessons == null ? '' : course.lessons));

    document.getElementById('cd-tag').textContent = course.tag || '';
    document.getElementById('cd-title').textContent = course.title || '';
    document.getElementById('cd-subtitle').textContent = course.subtitle || '';
    document.getElementById('cd-level').textContent = course.level || '';
    document.getElementById('cd-desc').textContent = course.description || '';

    ['cd-hero-img', 'cd-card-img'].forEach(function (id) {
      var img = document.getElementById(id);
      img.src = image;
      img.alt = course.title || '';
    });

    var starFill = document.getElementById('cd-star-fill');
    starFill.setAttribute('data-fill', String(Math.round(((course.rating || 0) / 5) * 1000) / 10));
    document.getElementById('cd-score').textContent = course.rating == null ? '' : course.rating;

    renderModules(curriculum.modules || [], completed, enrollment, lessonUrl, course.lessons || 0);
    renderList('cd-req-list', curriculum.requirements || [], function (r) {
      return '<li>' + esc(r) + '</li>';
    });
    renderList('cd-skills', curriculum.skills || [], function (s) {
      return '<div class="cd-skill-item"><div class="check">✓</div><span>' + esc(s) + '</span></div>';
    });
    renderReviewQuiz(enrollment, completed);
    renderCardActions(enrollment, progress, completed, totalLessons, streak);

    // Globals mà course_detail.js đọc (trước là inline <script> Jinja)
    window.CURRENT_LESSON_IDX = completed;
    window.LESSON_URL = lessonUrl;

    loadScripts([
      '/static/js/course_detail.js',
      '/static/js/review_quiz.js',
      '/static/js/chatbot.js',
    ]);
  }

  function renderList(id, items, tpl) {
    document.getElementById(id).innerHTML = items.map(tpl).join('');
  }

  function renderModules(modules, completed, enrollment, lessonUrl, lessonCount) {
    var flatIdx = 0;
    var html = modules.map(function (module, mi) {
      var lessons = (module.lessons || []).map(function (title) {
        var status = flatIdx < completed ? 'done' : flatIdx === completed ? 'current' : 'locked';
        return { title: title, status: status, index: flatIdx++ };
      });
      var doneCount = lessons.filter(function (l) { return l.status === 'done'; }).length;
      var hasCurrent = lessons.some(function (l) { return l.status === 'current'; });
      var open = hasCurrent || mi === 0;

      var rows = lessons.map(function (lesson) {
        var icon = lesson.status === 'done' ? '✓' : lesson.status === 'current' ? '▶' : '○';
        var attrs = lesson.status === 'current' ? ' id="current-lesson"' : '';
        if (lesson.status !== 'locked') {
          attrs += ' style="cursor:pointer" onclick="window.location.href=\'' +
            esc(lessonUrl) + '?lesson=' + lesson.index + '\'"';
        }
        var tail = lesson.status === 'current'
          ? '<span class="cd-lesson-badge">Tiếp tục</span>'
          : '<div class="cd-lesson-num">' + (lesson.index + 1) + '</div>';
        return '<div class="cd-lesson ' + lesson.status + '"' + attrs + '>' +
          '<div class="cd-lesson-icon">' + icon + '</div>' +
          '<div class="cd-lesson-title">' + esc(lesson.title) + '</div>' + tail + '</div>';
      }).join('');

      var prog = enrollment && doneCount > 0
        ? '<div class="cd-module-prog" style="margin-left:8px">' + doneCount + '/' + lessons.length + ' ✓</div>'
        : '';

      return '<div class="cd-module">' +
        '<div class="cd-module-hd' + (open ? ' open' : '') + '" onclick="toggleModule(this)">' +
          '<div class="cd-module-arrow">▶</div>' +
          '<div class="cd-module-name">' + esc(module.title) + '</div>' +
          '<div class="cd-module-meta">' + lessons.length + ' bài</div>' + prog +
        '</div>' +
        '<div class="cd-module-body' + (open ? ' open' : '') + '">' +
          '<div class="cd-lesson-list">' + rows + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('cd-modules').innerHTML = html;
    document.getElementById('cd-curriculum-meta').textContent =
      modules.length + ' module · ' + lessonCount + ' bài học';
  }

  function renderReviewQuiz(enrollment, completed) {
    // Mở khóa từ bài thứ 5 trở đi — giữ nguyên ngưỡng của bản Flask
    document.getElementById('review-quiz-body').innerHTML = enrollment && completed >= 5
      ? '<div id="quiz-idle">' +
          '<p>Ôn lại kiến thức đã học bằng 5-10 câu random từ các bài bạn đã hoàn thành.</p>' +
          '<button type="button" class="quiz-btn primary" onclick="startReviewQuiz(window.COURSE_ID)">Bắt đầu ôn tập</button>' +
        '</div><div id="quiz-runner" style="display:none"></div>'
      : '<p class="cd-locked-note">🔒 Hoàn thành ít nhất 5 bài học để mở khóa quiz ôn tập.</p>';
  }

  function renderCardActions(enrollment, progress, completed, totalLessons, streak) {
    var box = document.getElementById('cd-card-actions');
    if (!enrollment) {
      box.innerHTML =
        '<button type="button" class="cd-enroll-btn primary" id="enroll-btn" onclick="enroll()">' +
        'Đăng ký ngay – Miễn phí</button>';
      return;
    }
    box.innerHTML =
      '<div class="cd-progress-row">' +
        '<div class="cd-progress-label"><span>Tiến độ</span><span class="pct">' + progress + '%</span></div>' +
        '<div class="cd-prog-bar"><div class="cd-prog-fill" id="prog-fill" style="width:' + progress + '%"></div></div>' +
      '</div>' +
      '<div class="cd-card-stats">' +
        stat(completed, 'Bài đã học') +
        stat(Math.max(totalLessons - completed, 0), 'Còn lại') +
        stat(enrollment.timeSpent || '0h', 'Đã học') +
        stat(streak, '🔥 Streak') +
      '</div>' +
      '<button type="button" class="cd-enroll-btn continue" onclick="goLesson()">▶ Tiếp tục học</button>' +
      '<button type="button" class="cd-enroll-btn unenroll" id="unenroll-btn" onclick="unenroll()">Hủy đăng ký</button>';
  }

  function stat(value, label) {
    return '<div class="cd-cs"><div class="v">' + esc(value) + '</div><div class="l">' + label + '</div></div>';
  }

  /** Nạp tuần tự script legacy — async=false giữ đúng thứ tự thực thi. */
  function loadScripts(srcs) {
    srcs.forEach(function (src) {
      var el = document.createElement('script');
      el.src = src;
      el.async = false;
      document.body.appendChild(el);
    });
  }
})();
