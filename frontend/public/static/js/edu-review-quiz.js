/* ══════════════════════════════════════════════════════════════
   edu-review-quiz.js — thẻ "Ôn tập hôm nay" ở Bảng điều khiển giờ
   MỞ THẲNG bài ôn thay vì chỉ nhảy sang tab Kỹ năng.

   Backend lo phần chọn nội dung — file này chỉ nối dây:

     POST /api/quiz/generate-review  ->  { ok, quiz_id, questions }
          questions[i] = { index, question, options }   (options: mảng CHUỖI)
          Đề ôn HẰNG NGÀY: backend trộn câu từ contentJson.step_2 của MỌI bài
          học viên đã hoàn thành (không bó trong một khóa), ưu tiên bài hay sai.
          400 kèm thông báo tiếng Việt nếu chưa đủ câu hỏi, HOẶC nếu hôm nay
          đã nộp một đề rồi — mỗi ngày học chỉ một đề.

     POST /api/quizzes/:id/submit  <- { answers }
          answers là mảng THEO VỊ TRÍ: answers[i] là đáp án của câu thứ i.
          -> { ok, score, total, detail }
          detail[i] = { question, given, correct, is_correct, explanation }

   GỬI CHỈ SỐ HAY GỬI CHỮ? Backend chấm bằng
        String(q.correct).trim().toLowerCase() === String(given).trim().toLowerCase()
   nên giá trị gửi lên phải trùng đúng dạng `correct` được lưu trong
   contentJson. Bản kiểm thử của chính backend (quizzes.service.spec.ts)
   khai { options: ['a','b'], correct: 0 } rồi nộp [0, 0] và kỳ vọng đúng —
   tức `correct` là CHỈ SỐ trong options. Vậy file này gửi chỉ số.
   (Nếu nội dung bài học của bạn lưu `correct` là NGUYÊN VĂN đáp án thì đổi
   `answerValue()` bên dưới trả về nhãn thay vì chỉ số — chỉ một chỗ.)

   Lỗi từ backend có dạng { error: { status, message, detail } } — đọc
   .message, đừng alert cả object (xem all-exceptions.filter).
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var API_BASE = (typeof API === 'string' && API) || '/api';

  /* Trạng thái ván ôn đang mở. null = chưa mở / đã đóng.
     { quizId, questions[], picked[], at, phase } */
  var st = null;

  /* Nguồn đề đang mở: 'review' = ôn dàn trải mọi bài đã học (mỗi ngày một
     lần), 'today' = gộp đúng các bài học trong ngày (làm lại thoải mái). */
  var curMode = 'review';

  function $(id) { return document.getElementById(id); }

  /* Câu hỏi/đáp án đến từ contentJson do quản trị nhập — escape trước
     khi ghép vào innerHTML. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function csrfHeader() {
    var m = document.querySelector('meta[name=csrf-token]');
    return m ? { 'X-CSRFToken': m.content } : {};
  }

  function errText(data, fallback) {
    var e = data && data.error;
    if (e && typeof e === 'object') return e.message || fallback;
    return e || fallback;
  }

  /* ── Đáp án ────────────────────────────────────────────────────
     Nội dung bài học do quản trị dán JSON nên `options` có thể là mảng
     CHUỖI (dạng chuẩn, xem quizzes.service.spec.ts) hoặc mảng OBJECT
     kiểu {id, text} như dữ liệu khóa CSDL. Tách riêng "nhãn để hiện" và
     "giá trị để gửi" để hai dạng đó không lẫn vào nhau. */

  /** Chữ hiện lên nút — object thì lấy text/label, chuỗi thì dùng thẳng. */
  function optLabel(opt) {
    if (opt && typeof opt === 'object') return opt.text || opt.label || opt.value || '';
    return opt;
  }

  /** Giá trị gửi lên chấm điểm: CHỈ SỐ trong options (xem chú thích đầu file).
   *  Option dạng object thì `id` là định danh sẵn có, ưu tiên dùng. */
  function answerValue(opt, idx) {
    if (opt && typeof opt === 'object' && opt.id != null) return opt.id;
    return idx;
  }

  /** Đổi giá trị đáp án (chỉ số / id / nguyên văn) thành nhãn đọc được.
   *  Thử theo thứ tự nguyên văn → id → chỉ số, để option là chuỗi số
   *  ("1", "2"…) không bị hiểu nhầm thành vị trí. */
  function labelOf(options) {
    var opts = options || [];
    return function (v) {
      if (v == null) return '';
      var i;
      for (i = 0; i < opts.length; i++) {
        if (String(optLabel(opts[i])) === String(v)) return optLabel(opts[i]);
      }
      for (i = 0; i < opts.length; i++) {
        var o = opts[i];
        if (o && typeof o === 'object' && o.id != null && String(o.id) === String(v)) return optLabel(o);
      }
      var n = Number(v);
      if (!isNaN(n) && String(n) === String(v).trim() && opts[n] != null) return optLabel(opts[n]);
      return v;
    };
  }

  /* ── Khung hộp thoại ───────────────────────────────────────── */

  function overlay() { return $('edu-rq-overlay'); }

  function open() {
    var o = overlay();
    if (!o) return;
    o.classList.add('active');
    // khoá cuộn nền — hộp thoại tự cuộn bên trong
    document.body.style.overflow = 'hidden';
    var close = $('edu-rq-close');
    if (close) close.focus();
  }

  function close(force) {
    // Đang làm dở mà bấm nhầm ra ngoài thì hỏi lại — mỗi quiz chỉ nộp
    // được một lần (backend trả 409 nếu nộp lại), bỏ giữa chừng là mất.
    if (!force && st && st.phase === 'quiz' && st.picked.some(function (a) { return a != null; })) {
      if (!confirm('Thoát bây giờ sẽ bỏ dở bài ôn này. Thoát chứ?')) return;
    }
    var o = overlay();
    if (o) o.classList.remove('active');
    document.body.style.overflow = '';
    st = null;
  }

  function setSub(text) {
    var el = $('edu-rq-sub');
    if (el) el.textContent = text || '';
  }

  function setBar(done, total) {
    var bar = $('edu-rq-bar');
    if (!bar) return;
    var pct = total ? Math.round((done / total) * 100) : 0;
    bar.style.width = pct + '%';
    var track = bar.parentNode;
    if (track) track.hidden = !total;
  }

  function body(html) {
    var el = $('edu-rq-body');
    if (el) el.innerHTML = html;
  }

  function foot(html) {
    var el = $('edu-rq-foot');
    if (el) el.innerHTML = html;
  }

  /* ── Các màn ───────────────────────────────────────────────── */

  function showLoading(msg) {
    setBar(0, 0);
    body(
      '<div class="edu-rq-center">' +
      '<div class="edu-rq-spinner" aria-hidden="true"></div>' +
      '<p class="edu-rq-center-text">' + esc(msg) + '</p>' +
      '</div>'
    );
    foot('');
  }

  function showMessage(msg, ctaLabel, ctaAction) {
    setBar(0, 0);
    body(
      '<div class="edu-rq-center">' +
      '<div class="edu-rq-emoji" aria-hidden="true">📭</div>' +
      '<p class="edu-rq-center-text">' + esc(msg) + '</p>' +
      '</div>'
    );
    foot('<button type="button" class="edu-rq-btn edu-rq-btn--ghost" data-act="close">Đóng</button>' +
      (ctaLabel ? '<button type="button" class="edu-rq-btn" data-act="' + esc(ctaAction) + '">' + esc(ctaLabel) + '</button>' : ''));
  }

  function showQuestion() {
    var q = st.questions[st.at];
    var total = st.questions.length;
    setBar(st.at, total);
    setSub('Câu ' + (st.at + 1) + '/' + total + ' · ' +
      (curMode === 'today' ? 'bài học hôm nay' : 'đề hôm nay'));

    var chosen = st.picked[st.at];
    body(
      '<p class="edu-rq-q">' + esc(q.question) + '</p>' +
      '<div class="edu-rq-opts">' +
      (q.options || []).map(function (opt, i) {
        return '<button type="button" class="edu-rq-opt' + (chosen === i ? ' is-on' : '') + '" data-opt="' + i + '">' +
          '<span class="edu-rq-opt-key">' + String.fromCharCode(65 + i) + '</span>' +
          '<span class="edu-rq-opt-text">' + esc(optLabel(opt)) + '</span>' +
          '</button>';
      }).join('') +
      '</div>'
    );

    var last = st.at === total - 1;
    foot(
      (st.at > 0 ? '<button type="button" class="edu-rq-btn edu-rq-btn--ghost" data-act="prev">Quay lại</button>' : '<span></span>') +
      '<button type="button" class="edu-rq-btn" data-act="' + (last ? 'submit' : 'next') + '"' +
      (chosen == null ? ' disabled' : '') + '>' + (last ? 'Nộp bài' : 'Tiếp tục') + '</button>'
    );
  }

  function showResult(res) {
    st.phase = 'result';
    var detail = res.detail || [];
    var total = res.total || detail.length || 0;
    var score = res.score || 0;
    var pct = total ? Math.round((score / total) * 100) : 0;

    setBar(total, total);
    setSub(curMode === 'today' ? 'Bài học hôm nay' : 'Đề ôn hôm nay');

    var mood = pct >= 80 ? '🎉' : pct >= 50 ? '💪' : '📚';
    var line = pct >= 80 ? 'Quá tốt! Kiến thức vẫn còn chắc.'
      : pct >= 50 ? 'Khá ổn — xem lại mấy câu sai là chắc bài.'
        : 'Cần ôn lại phần này thêm một lượt nhé.';

    body(
      '<div class="edu-rq-score">' +
      '<div class="edu-rq-score-emoji" aria-hidden="true">' + mood + '</div>' +
      '<div class="edu-rq-score-num">' + score + '<span>/' + total + '</span></div>' +
      '<div class="edu-rq-score-pct">' + pct + '% đúng</div>' +
      '<div class="edu-rq-score-line">' + esc(line) + '</div>' +
      '</div>' +
      '<div class="edu-rq-review">' +
      detail.map(function (r, i) {
        // `given`/`correct` trả về đúng dạng đã lưu trong contentJson — có thể
        // là chỉ số hoặc id. Đổi lại thành nhãn để người học đọc được, thay vì
        // hiện trơ "Bạn chọn: 2". detail[] cùng thứ tự với questions[].
        var opts = (st.questions[i] && st.questions[i].options) || [];
        var lbl = labelOf(opts);
        return '<div class="edu-rq-item ' + (r.is_correct ? 'ok' : 'no') + '">' +
          '<p class="edu-rq-item-q"><span class="edu-rq-item-no">' + (i + 1) + '</span>' + esc(r.question) + '</p>' +
          '<p class="edu-rq-item-a">Bạn chọn: <b>' + (r.given != null ? esc(lbl(r.given)) : '(bỏ trống)') + '</b></p>' +
          (r.is_correct ? '' : '<p class="edu-rq-item-a">Đáp án đúng: <b>' + esc(lbl(r.correct)) + '</b></p>') +
          (r.explanation ? '<p class="edu-rq-item-ex">' + esc(r.explanation) + '</p>' : '') +
          '</div>';
      }).join('') +
      '</div>'
    );

    // Không còn nút "Ôn tiếp": mỗi ngày chỉ một đề, bấm lại chỉ nhận đúng
    // thông báo "hôm nay bạn đã ôn tập rồi" từ backend — mời quay lại mai.
    foot(
      '<button type="button" class="edu-rq-btn edu-rq-btn--ghost" data-act="skills">Xem kỹ năng</button>' +
      '<button type="button" class="edu-rq-btn" data-act="close">Xong</button>'
    );
  }

  /* ── Gọi API ───────────────────────────────────────────────── */

  /**
   * Gọi đề ôn HẰNG NGÀY — một endpoint duy nhất, không gắn khóa nào:
   * backend tự trộn câu từ MỌI bài học viên đã hoàn thành và tự chặn nếu hôm
   * nay đã ôn rồi (mỗi ngày một đề).
   *
   * Trước đây file này phải tự đoán khóa nào đáng ôn rồi thử lần lượt từng
   * khóa cho tới khi có khóa đủ câu — vừa tốn nhiều lượt gọi, vừa bó đề trong
   * đúng một khóa. Giờ backend lo hết.
   */
  function generate(mode) {
    var today = mode === 'today';
    showLoading(today
      ? 'Đang gộp các bài bạn học hôm nay thành đề…'
      : 'Đang soạn bài ôn từ những gì bạn đã học…');

    fetch(API_BASE + (today ? '/quiz/generate-today' : '/quiz/generate-review'), {
      method: 'POST',
      headers: csrfHeader()
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          // 400 ở đây là thông báo có nghĩa cho người dùng (đã ôn hôm nay /
          // chưa đủ câu hỏi) — hiện nguyên văn tiếng Việt từ backend.
          showMessage(
            errText(res.data, 'Chưa tạo được bài ôn. Thử lại sau nhé.'),
            'Tới khóa học', 'courses'
          );
          return;
        }
        var qs = res.data.questions || [];
        if (!qs.length) {
          showMessage('Đề trả về không có câu hỏi nào.', 'Tới khóa học', 'courses');
          return;
        }

        st = {
          quizId: res.data.quiz_id,
          questions: qs,
          // picked[i] = VỊ TRÍ option đã chọn ở câu i (null = chưa trả lời).
          // Giữ vị trí thay vì giá trị để tô sáng lại nút khi quay lại câu cũ
          // dù nhãn có trùng nhau; giá trị gửi đi dựng lúc nộp.
          picked: qs.map(function () { return null; }),
          at: 0,
          phase: 'quiz'
        };
        showQuestion();
      })
      .catch(function () {
        showMessage('Lỗi mạng — thử lại sau nhé.', 'Thử lại', 'retry');
      });
  }

  function submit() {
    var unanswered = st.picked.filter(function (a) { return a == null; }).length;
    if (unanswered && !confirm('Còn ' + unanswered + ' câu chưa trả lời. Nộp luôn?')) return;

    // Mảng THEO VỊ TRÍ — backend chấm bằng answers?.[i] (quizzes.service.ts).
    // Câu bỏ trống gửi null; backend coi null là sai, không tính điểm.
    var answers = st.picked.map(function (idx, i) {
      if (idx == null) return null;
      return answerValue((st.questions[i].options || [])[idx], idx);
    });

    st.phase = 'submitting';
    showLoading('Đang chấm bài…');

    fetch(API_BASE + '/quizzes/' + st.quizId + '/submit', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, csrfHeader()),
      body: JSON.stringify({ answers: answers })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          st.phase = 'quiz';
          showMessage(errText(res.data, 'Nộp bài thất bại.'), null, null);
          return;
        }
        showResult(res.data);
        // điểm mới có thể đổi tiến độ kỹ năng -> làm mới thẻ ở nền
        if (typeof window.eduReloadReviewCard === 'function') window.eduReloadReviewCard();
      })
      .catch(function () {
        st.phase = 'quiz';
        showMessage('Lỗi mạng — bài chưa được nộp.', null, null);
      });
  }

  /* ── Sự kiện ───────────────────────────────────────────────── */

  function onBodyClick(e) {
    var opt = e.target.closest ? e.target.closest('.edu-rq-opt') : null;
    if (!opt || !st || st.phase !== 'quiz') return;
    st.picked[st.at] = Number(opt.getAttribute('data-opt'));
    showQuestion();
  }

  function onFootClick(e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-act');

    if (act === 'close') { close(true); return; }
    if (act === 'prev') { st.at--; showQuestion(); return; }
    if (act === 'next') { st.at++; showQuestion(); return; }
    if (act === 'submit') { submit(); return; }
    if (act === 'retry') { var m = curMode; close(true); window.peOpenReviewQuiz(m); return; }
    if (act === 'courses') { close(true); goTab('courses'); return; }
    if (act === 'skills') { close(true); goTab('skills'); return; }
  }

  function goTab(tab) {
    if (typeof window.navigate === 'function') window.navigate(tab);
    else if (typeof window.peGoTab === 'function') window.peGoTab(tab);
  }

  function bind() {
    var o = overlay();
    if (!o || o.__rqBound) return;
    o.__rqBound = true;

    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    var x = $('edu-rq-close');
    if (x) x.addEventListener('click', function () { close(); });
    var b = $('edu-rq-body');
    if (b) b.addEventListener('click', onBodyClick);
    var f = $('edu-rq-foot');
    if (f) f.addEventListener('click', onFootClick);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && o.classList.contains('active')) close();
    });
  }

  /* ── Cửa vào ───────────────────────────────────────────────── */

  /**
   * Gọi từ nút "Ôn ngay" ở thẻ Bảng điều khiển.
   * Không còn nhận tham số: backend tự chọn nội dung (trộn mọi khóa đã học) và
   * tự chặn nếu hôm nay đã ôn. Vẫn để chữ ký nhận tham số thừa mà không dùng,
   * phòng chỗ gọi cũ còn truyền `skillsRes` vào.
   */
  window.peOpenReviewQuiz = function (mode) {
    bind();
    open();
    setSub('');
    // Nhớ chế độ để màn câu hỏi/kết quả ghi đúng nhãn, và để nút "thử lại"
    // quay về đúng nguồn đề.
    curMode = mode === 'today' ? 'today' : 'review';
    var t = $('edu-rq-title');
    if (t) t.textContent = curMode === 'today' ? 'Ôn lại bài hôm nay' : 'Ôn tập hôm nay';
    generate(curMode);
  };

  // Trang dashboard được gắn lại khi điều hướng client-side (PeRouterBridge
  // phát pe:page-remount) — DOM hộp thoại là mới nên phải gắn lại sự kiện.
  document.addEventListener('pe:page-remount', function () {
    if (st) close(true);
    bind();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
