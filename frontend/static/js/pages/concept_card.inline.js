    (function () {
      var id = document.body.getAttribute('data-card-id');
      var card = null;
      var courses = window.LESSON_CONTENT || {};
      Object.keys(courses).forEach(function (k) {
        ((courses[k] && courses[k].concept_cards) || []).forEach(function (c) {
          if (c.id === id) card = c;
        });
      });
      var root = document.getElementById('card-root');
      if (!card) {
        root.innerHTML = '<div class="cc-missing">Không tìm thấy hồ sơ <code>' +
          String(id).replace(/[<>&]/g, '') + '</code>.<br><br><a class="cc-back" href="/courses/db_design_tc">← Về roadmap</a></div>';
        return;
      }
      document.title = card.title + ' — Concept Card';
      if (card.accent) document.documentElement.style.setProperty('--cc-accent', card.accent);
      // NC: card thuộc khóa nào thì link "về roadmap" trỏ khóa đó (trước hardcode TC)
      if (card.back_href) document.getElementById('cc-back-link').setAttribute('href', card.back_href);
      root.innerHTML =
        '<article class="cc-card">' +
          '<div class="cc-eyebrow">' + (card.eyebrow || 'CONCEPT CARD') + '</div>' +
          '<h1 class="cc-title">' + card.title + '</h1>' +
          (card.intro ? '<p class="cc-intro">' + card.intro + '</p>' : '') +
          (card.sections || []).map(function (s) {
            return '<section class="cc-section"><h2><i class="fa-solid ' + (s.icon || 'fa-circle-info') + '"></i>' +
              s.heading + '</h2><p>' + s.body + '</p></section>';
          }).join('') +
          renderQuiz(card.quiz) +
          (card.source ? '<div class="cc-source">📖 ' + card.source + '</div>' : '') +
          (card.cta ? '<a class="cc-cta" href="' + card.cta.href + '">' + card.cta.label + ' <i class="fa-solid fa-arrow-right"></i></a>' : '') +
        '</article>';

      // Micro quiz (PART_6 format) — 1 câu, chọn là khóa, feedback tại chỗ
      function renderQuiz(quiz) {
        if (!quiz || !quiz.options || !quiz.options.length) return '';
        return '<div class="cc-quiz"><div class="cc-quiz-label">⚡ KIỂM TRA 10 GIÂY</div>' +
          '<div class="cc-quiz-q">' + escapeText(quiz.question) + '</div>' +
          quiz.options.map(function (o, i) {
            return '<button type="button" class="cc-quiz-opt" data-opt="' + i + '">' + escapeText(o.label) + '</button>';
          }).join('') +
          '<div class="cc-quiz-feedback" id="cc-quiz-feedback"></div></div>';
      }
      function escapeText(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      if (card.quiz && card.quiz.options) {
        var locked = false;
        root.querySelectorAll('.cc-quiz-opt').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (locked) return;
            locked = true;
            var opt = card.quiz.options[parseInt(btn.getAttribute('data-opt'), 10)];
            var fb = document.getElementById('cc-quiz-feedback');
            root.querySelectorAll('.cc-quiz-opt').forEach(function (b) {
              b.disabled = true;
              var o = card.quiz.options[parseInt(b.getAttribute('data-opt'), 10)];
              if (o && o.correct) b.classList.add('correct');
            });
            if (!opt.correct) btn.classList.add('wrong');
            fb.textContent = opt.feedback || (opt.correct ? '✓ Chính xác!' : '✗ Chưa đúng — đáp án đúng đã được tô xanh.');
            fb.className = 'cc-quiz-feedback ' + (opt.correct ? 'ok' : 'ko');
          });
        });
      }
    })();
