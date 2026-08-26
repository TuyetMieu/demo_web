'use client';

// Port lesson_db_design.html — trang bài học DB Design (dùng chung 3 khóa
// db_design / db_design_tc / db_design_nc; engine lesson_db_design.js 9.171 dòng
// giữ NGUYÊN, chỉ bọc). Markup 1:1. ?lesson=N / ?lesson_idx=N do engine tự đọc URL.
// {{ streak }}/{{ xp }} server bơm → hydrate fetch /api/stats + /api/user.
import { useEffect } from 'react';

import LegacyScripts from '@/components/LegacyScripts';
import { apiFetch } from '@/lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function LessonDbDesign({ courseId }: { courseId: string }) {
  useEffect(() => {
    // <body class="lesson-focus-mode" data-course="..."> y hệt template gốc
    document.body.classList.add('lesson-focus-mode');
    document.body.setAttribute('data-course', courseId);
    return () => {
      document.body.classList.remove('lesson-focus-mode');
      document.body.removeAttribute('data-course');
    };
  }, [courseId]);

  useEffect(() => {
    // Hydrate streak (header) + xp (player pill) — thay {{ streak }}/{{ xp }}.
    // apiFetch (không phải fetch tương đối): pe-bridge chưa chắc đã nạp xong.
    apiFetch('/api/stats').then((r) => (r.ok ? r.json() : null)).then((s) => {
      if (!s) return;
      const el = document.getElementById('streak-count');
      // /stats trả `streak` (không phải `streakDays`) — xem stats.service.ts
      if (el) el.textContent = String(s.streak ?? s.streakDays ?? 0);
    }).catch(() => {});
    apiFetch('/api/user').then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) return;
      const el = document.querySelector('.xp-text');
      if (el) el.textContent = `${u.xp || 0}/2000`;
    }).catch(() => {});
  }, []);

  // Thứ tự script y hệt template: CodeMirror(head) → confetti(head) → content
  // → [content_tc|content_nc theo khóa] → table_explorer → drag_game → decomp_game → engine
  const scripts = [
    'https://cdn.jsdelivr.net/npm/codemirror@5.65.7/lib/codemirror.min.js',
    'https://cdn.jsdelivr.net/npm/codemirror@5.65.7/mode/sql/sql.min.js',
    'https://cdn.jsdelivr.net/npm/codemirror@5.65.7/addon/display/placeholder.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js',
    '/static/js/lesson_content.js',
    ...(courseId === 'db_design_tc' ? ['/static/js/lesson_content_tc.js'] : []),
    ...(courseId === 'db_design_nc' ? ['/static/js/lesson_content_nc.js'] : []),
    '/static/js/table_explorer.js',
    '/static/js/drag_game.js',
    '/static/js/decomp_game.js',
    '/static/js/lesson_db_design.js',
  ];

  return (
    <>
      <title>Database Design — Bài học</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* PERF 2026-07-19: trang này tải 4 script + 2 css từ jsdelivr và css từ
          cdnjs — preconnect cắt DNS+TLS handshake khỏi đường găng nạp engine */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.7/lib/codemirror.min.css" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      {/* Scroll progress bar (4.8) */}
      <div className="scroll-progress" id="scroll-progress"></div>

      {/* ════════════ FOCUS HEADER ════════════ */}
      <header className="lesson-header">
        <button className="exit-btn" onClick={() => W().exitLesson()} title="Thoát bài học">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="header-center">
          <div className="progress-track" id="progress-track">
            <div className="progress-step" data-step="1">
              <span className="step-num">1</span>
              <span className="step-label-tiny">Lý thuyết</span>
              <span className="step-check"><i className="fa-solid fa-check"></i></span>
            </div>
            <div className="progress-connector"></div>
            <div className="progress-step" data-step="2">
              <span className="step-num">2</span>
              <span className="step-label-tiny">Trắc nghiệm</span>
              <span className="step-check"><i className="fa-solid fa-check"></i></span>
            </div>
            <div className="progress-connector"></div>
            <div className="progress-step" data-step="3">
              <span className="step-num">3</span>
              <span className="step-label-tiny">Kéo thả</span>
              <span className="step-check"><i className="fa-solid fa-check"></i></span>
            </div>
            <div className="progress-connector"></div>
            <div className="progress-step" data-step="4">
              <span className="step-num">4</span>
              <span className="step-label-tiny">Tự code</span>
              <span className="step-check"><i className="fa-solid fa-check"></i></span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="hearts" id="hearts-display" title="Mạng — mất 1 khi sai">
            <i className="fa-solid fa-heart"></i>
            <i className="fa-solid fa-heart"></i>
            <i className="fa-solid fa-heart"></i>
          </div>

          <div className="xp-pill" title="Streak — chuỗi ngày học liên tiếp">
            <span className="streak-fire">🔥</span>
            <span id="streak-count">0</span>
          </div>

          <div className="player-pill" id="player-card" title="Code Wizard — SQL Apprentice">
            <div className="player-avatar">
              <i className="fa-solid fa-hat-wizard"></i>
            </div>
            <div className="player-info">
              <div className="player-name">Code Wizard</div>
              <div className="player-meta">
                <span className="player-level">L4</span>
                <span className="player-class">SQL Apprentice</span>
                <span className="xp-text">0/2000</span>
              </div>
            </div>
          </div>

          <button className="report-btn" onClick={() => W().reportBug()} title="Báo lỗi">
            <i className="fa-regular fa-flag"></i>
          </button>
        </div>
      </header>

      <main className="lesson-stage">
        {/* ═══════════ STEP 1: THEORY ═══════════ */}
        <section className="step-pane active" data-step="1">
          <article className="step-1-content">
            <div className="eyebrow-row">
              <span className="step-pill">Bước 1 / 4</span>
              <span className="topic-tag">Lý thuyết bite-sized + Trực quan Database</span>
            </div>

            <h1 className="lesson-title" id="lesson-title">Entity Set &amp; Primary Key</h1>

            <div id="story-banner" className="story-banner" hidden></div>
            <div id="lesson-hero" className="lesson-hero" role="img" aria-label="Hero illustration"></div>
            <div id="concept-cards-hero"></div>
            <div id="primer-flow-mount"></div>

            <p className="lesson-intro" id="lesson-intro"></p>
            <p className="lesson-example" id="lesson-example"></p>

            {/* SVG icon library — nạp nguyên văn từ template gốc (symbol defs) */}
            <SvgIconDefs />

            <div className="theory-extended" id="theory-extended" hidden>
              <div className="theory-extended-label">
                <i className="fa-solid fa-lightbulb"></i> Hiểu sâu hơn
              </div>
              <div className="theory-extended-content" id="theory-extended-content"></div>
            </div>

            <div className="syntax-example" id="syntax-example" hidden>
              <div className="syntax-example-label">
                <i className="fa-solid fa-code"></i> Ví dụ minh họa
              </div>
              <div className="syntax-example-code" id="syntax-example-code"></div>
              <div className="syntax-example-explain" id="syntax-example-explain"></div>
            </div>

            <div id="decomp-game-mount"></div>
            <div id="primer-svg-mount"></div>
            <div id="plan-visual-mount" hidden></div>

            {/* Visual DB Panel */}
            <div className="visual-db" id="visual-db-panel">
              <div className="db-panel schema-panel">
                <div className="panel-head">
                  <span className="panel-title"><i className="fa-solid fa-table"></i> Schema</span>
                  <span className="panel-sub" id="schema-table-name"></span>
                </div>
                <div className="schema-table" id="schema-table"></div>
              </div>

              <div className="db-panel data-panel">
                <div className="panel-head">
                  <span className="panel-title"><i className="fa-solid fa-database"></i> Sample Data</span>
                  <span className="panel-sub" id="data-row-count"></span>
                </div>
                <div className="data-table-wrap">
                  <table className="data-table" id="data-table"></table>
                </div>
              </div>
            </div>

            <div className="mission-card">
              <div className="mission-label">🎯 Nhiệm vụ</div>
              <div className="mission-text" id="mission-text"></div>
            </div>

            <button className="next-btn primary" id="step1-inline-cta" onClick={() => W().goToStep(2)} style={{ display: 'none' }} aria-hidden="true">
              Đã hiểu, tiếp tục
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </article>
        </section>

        {/* ═══════════ STEP 2: MCQ ═══════════ */}
        <section className="step-pane" data-step="2">
          <article className="step-2-content">
            <div className="eyebrow-row">
              <span className="step-pill">Bước 2 / 4</span>
              <span className="topic-tag">Kiểm tra nhanh — Đừng sai nhé!</span>
            </div>

            <h2 className="mcq-question" id="mcq-question"></h2>

            <div className="mcq-options" id="mcq-options"></div>

            <div className="inline-hint hidden" id="inline-hint">
              <i className="fa-solid fa-lightbulb"></i>
              <div>
                <strong>AI Hint:</strong>
                <span id="inline-hint-text"></span>
              </div>
            </div>

            <div className="mcq-explain hidden" id="mcq-explain">
              <i className="fa-solid fa-circle-check"></i>
              <span id="mcq-explain-text"></span>
            </div>

            {/* Mini-game bonus: drag correct/wrong */}
            <div className="mini-game" id="mini-game" hidden>
              <div className="mini-game-head">
                <span className="mini-game-tag"><i className="fa-solid fa-gamepad"></i> Mini-game bonus</span>
                <h3 className="mini-game-title" id="mini-game-title"></h3>
                <p className="mini-game-instruction" id="mini-game-instruction"></p>
              </div>
              <div className="mini-game-board">
                <div className="mini-game-chips" id="mini-game-chips"></div>
                <div className="mini-game-bins" id="mini-game-bins"></div>
              </div>
              <div className="mini-game-actions">
                <button className="icon-btn" id="btn-mini-reset" title="Bắt đầu lại mini-game"><i className="fa-solid fa-rotate-left"></i></button>
                <button className="next-btn primary small" id="btn-mini-check" onClick={() => W().checkMiniGame()}>
                  <i className="fa-solid fa-check"></i> Kiểm tra
                </button>
              </div>
              <div className="mini-game-feedback hidden" id="mini-game-feedback"></div>
            </div>

            <button id="btn-next-step3" className="next-btn primary hidden" onClick={() => W().goToStep(3)}>
              <span className="cta-label">Tiếp tục → Kéo Thả Logic</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </article>
        </section>

        {/* ═══════════ STEP 3: PIPELINE-AS-FEATURE (v6.2, 45/55) ═══════════ */}
        <section className="step-pane" data-step="3">
          <div className="step3-exercise" data-step3-wrapper="">
            <div className="split-pane step3-two-col">
              <div className="step3-topbar">
                <div className="mission-sticky" id="step3-mission">
                  <span className="mission-sticky-icon"><i className="fa-solid fa-bullseye"></i></span>
                  <div className="mission-sticky-text" id="step3-mission-text"></div>
                </div>
              </div>

              <div className="step3-pipeline-map">
                <div id="drag-game-mount"></div>
                <div className="data-preview" id="step3-data-preview">
                  <div className="data-preview-content" id="step3-data-content"></div>
                </div>
              </div>

              <div className="step3-editor">
                <div className="drop-zone-stack" id="drop-zones"></div>

                <div className="reveal-strip" id="reveal-strip" hidden>
                  <span className="reveal-strip-icon" aria-hidden="true">🔎</span>
                  <div className="reveal-strip-text" id="reveal-hint-text"></div>
                </div>

                <div className="block-bank-wrap">
                  <div className="bank-label">Kho khối lệnh</div>
                  <div className="block-bank" id="block-bank"></div>
                </div>
              </div>

              <div className="ide-pane step3-ide">
                <header className="pane-head ide-head">
                  <div className="terminal-chrome">
                    <div className="chrome-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <div className="filename-tab">
                      <i className="fa-solid fa-code"></i>
                      <span>query.sql</span>
                    </div>
                  </div>
                  <div className="ide-tools">
                    <span className="ide-type-hint" title="Bạn có thể gõ SQL trực tiếp vào đây"><i className="fa-solid fa-pen"></i> Tự gõ được</span>
                    <span className="char-count" id="ide-char-count">0 ký tự</span>
                    <button className="icon-btn" id="btn-drag-reset" title="Bắt đầu lại" onClick={() => W().handleDragReset()}>
                      <i className="fa-solid fa-rotate-left"></i>
                    </button>
                  </div>
                </header>
                <div className="ide-display pixel-terminal">
                  <div className="ide-line-numbers" id="ide-line-numbers">1</div>
                  <div
                    className="ide-content"
                    id="ide-code"
                    contentEditable
                    spellCheck={false}
                    data-placeholder="✎ Gõ SQL trực tiếp ở đây, hoặc kéo khối lệnh phía trên…"
                    suppressContentEditableWarning
                  ><span className="ide-cursor"></span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ STEP 4: CODECADEMY 3-COL ═══════════ */}
        <section className="step-pane" data-step="4">
          <div className="split-pane codecademy-layout">
            {/* CỘT 1: Hướng dẫn */}
            <div className="pane pane-left">
              <header className="pane-head">
                <div>
                  <div className="eyebrow-row tight">
                    <span className="step-pill small">Bước 4 / 4</span>
                  </div>
                  <h2 className="pane-title problem-title">
                    <span className="problem-number">1.</span>
                    <span id="step4-title">Entity Set &amp; Primary Key</span>
                  </h2>
                </div>
              </header>
              <div className="pane-scroll">
                <div className="prompt-block" id="step4-prompt"></div>
                <div className="instructions-block" id="step4-instructions"></div>
                <details className="hint-collapsible" id="step4-hint-details">
                  <summary>💡 Cần gợi ý?</summary>
                  <div className="hint-collapsible-content" id="step4-hint-mount"></div>
                </details>
              </div>
            </div>

            {/* CỘT 2: IDE */}
            <div className="pane pane-middle">
              <header className="pane-head ide-head">
                <div className="ide-head-title">
                  <i className="fa-solid fa-code"></i> Code
                </div>
                <div className="ide-tools">
                  <select className="lang-selector">
                    <option>SQL</option>
                    <option>Python</option>
                    <option>PostgreSQL</option>
                  </select>
                  <button className="icon-btn" title="Reset" onClick={() => W().handleChallengeReset && W().handleChallengeReset()}><i className="fa-solid fa-rotate-left"></i></button>
                  <button className="icon-btn" title="Format"><i className="fa-solid fa-indent"></i></button>
                </div>
              </header>

              <div className="challenge-host">
                <div className="challenge-pane" data-challenge="full_ide">
                  <div id="code-editor"></div>
                </div>
                <div className="challenge-pane" data-challenge="mcq_code" hidden>
                  <div className="mcq-code-host" id="mcq-code-host"></div>
                </div>
                <div className="challenge-pane" data-challenge="fill_blank" hidden>
                  <div className="fill-blank-host" id="fill-blank-host"></div>
                </div>
                <div className="challenge-pane" data-challenge="bug_fix" hidden>
                  <div className="bug-fix-host" id="bug-fix-host"></div>
                </div>
              </div>

              <div className="terminal leetcode-terminal">
                <div className="terminal-head">
                  <span className="terminal-title">
                    <i className="fa-solid fa-terminal"></i> Console
                  </span>
                  <div className="run-actions">
                    <button className="run-btn secondary btn btn-ghost" id="btn-run" onClick={() => W().handleChallengeRun && W().handleChallengeRun(false)}>
                      <i className="fa-solid fa-play"></i> Run
                    </button>
                    <button className="run-btn primary btn btn-primary" id="btn-submit" onClick={() => W().handleChallengeRun && W().handleChallengeRun(true)}>
                      <i className="fa-solid fa-paper-plane"></i> Submit
                    </button>
                  </div>
                </div>
                <div className="terminal-output" id="terminal-output">
                  <span className="prompt-arrow">$</span> Đang chờ bạn gõ lệnh...
                </div>
              </div>
            </div>

            {/* CỘT 3: Kết quả */}
            <div className="pane pane-right">
              <div className="results-pane results-pane--full">
                <header className="pane-head results-head">
                  <i className="fa-solid fa-square-poll-vertical"></i> Kết quả truy vấn
                </header>
                <div className="results-table" id="step4-results">
                  <div className="results-empty">Bấm <strong>Run</strong> để xem kết quả.</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ════════════ STICKY NAV FOOTER ════════════ */}
      <nav className="lesson-nav-footer" id="lesson-nav-footer">
        {/* disabled set qua ref (DOM) chứ KHÔNG qua prop JSX: nếu để prop, React
            giữ disabled=true vĩnh viễn trong fiber và chặn synthetic onClick kể cả
            sau khi updateNavFooter() của engine đã enable nút → Quay lại chết. */}
        <button
          className="nav-btn nav-back"
          id="nav-back"
          onClick={() => W().navBack?.()}
          ref={(el) => { if (el) el.disabled = true; }}
          aria-label="Quay lại"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span className="nav-btn-label">Quay lại</span>
        </button>

        <button className="nav-btn nav-next" id="nav-next" onClick={() => W().navNext()} aria-label="Tiếp theo">
          <span className="nav-btn-label">Tiếp theo</span>
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </nav>

      {/* ════════════ SUCCESS MODAL ════════════ */}
      <div id="success-modal" className="modal-overlay hidden">
        <div className="success-card">
          <div className="confetti-burst"></div>
          <div className="success-icon">
            <i className="fa-solid fa-trophy"></i>
          </div>
          <h2 className="success-title">Hoàn thành bài học!</h2>
          <div className="success-lesson-tag">
            <span className="success-lesson-num" id="success-lesson-num">Bài 1/20</span>
            <span className="success-lesson-title" id="success-lesson-title">Entity Set &amp; Primary Key</span>
          </div>
          <p className="success-message" id="success-message"></p>

          <div className="success-xp-breakdown" id="success-xp-breakdown">
            <div className="success-xp-row"><span>Trắc nghiệm</span><span>+15 XP</span></div>
            <div className="success-xp-row"><span>Mini-game</span><span>+15 XP</span></div>
            <div className="success-xp-row"><span>Kéo thả SQL</span><span>+30 XP</span></div>
            <div className="success-xp-row"><span>Viết code</span><span id="success-xp-code">+50 XP</span></div>
            <div className="success-xp-total"><span>Tổng</span><span className="success-xp-num" id="success-xp-total">+0</span></div>
          </div>

          <div className="success-next-preview" id="success-next-preview">
            <span className="success-next-label">Bài tiếp theo</span>
            <span className="success-next-title" id="success-next-title">—</span>
          </div>

          <div className="achievement-unlock" id="achievement-unlock-block" hidden>
            <div className="achievement-icon">
              <i className="fa-solid fa-key"></i>
            </div>
            <div className="achievement-info">
              <div className="achievement-name" id="achievement-name">—</div>
              <div className="achievement-desc" id="achievement-desc">—</div>
            </div>
          </div>

          <div className="success-rewards">
            <div className="reward">
              <div className="reward-icon"><i className="fa-solid fa-bolt"></i></div>
              <div className="reward-info">
                <div className="reward-value" id="reward-xp">+50</div>
                <div className="reward-label">XP</div>
              </div>
            </div>
            <div className="reward">
              <div className="reward-icon gem"><i className="fa-solid fa-gem"></i></div>
              <div className="reward-info">
                <div className="reward-value">+10</div>
                <div className="reward-label">Gems</div>
              </div>
            </div>
            <div className="reward">
              <div className="reward-icon streak-icon"><i className="fa-solid fa-fire"></i></div>
              <div className="reward-info">
                <div className="reward-value" id="reward-streak">+1</div>
                <div className="reward-label">Streak</div>
              </div>
            </div>
          </div>
          <div className="success-actions">
            <button className="next-btn ghost" onClick={() => W().closeSuccess()}>Ôn lại</button>
            <button className="next-btn primary" onClick={() => W().nextLesson()}>
              Bài tiếp theo
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* ════════════ EXIT CONFIRM MODAL (thay confirm() mặc định) ════════════ */}
      <div
        id="exit-confirm-modal"
        className="modal-overlay hidden"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        onClick={() => W().exitLessonCancel?.()}
      >
        <div className="exit-card" onClick={(e) => e.stopPropagation()}>
          <div className="exit-icon">
            <i className="fa-solid fa-door-open"></i>
          </div>
          <h2 className="exit-title" id="exit-confirm-title">Rời bài học?</h2>
          <p className="exit-message">
            Tiến độ bài này <strong>chưa được lưu</strong> — bạn sẽ phải làm lại từ
            đầu khi quay lại.
          </p>
          <p className="exit-note">Hoàn thành cả 4 bước để nhận XP và giữ chuỗi streak 🔥</p>
          <div className="exit-actions">
            <button className="next-btn primary" onClick={() => W().exitLessonCancel?.()} autoFocus>
              Ở lại học tiếp
            </button>
            <button className="next-btn danger-ghost" onClick={() => W().exitLessonConfirm?.()}>
              Thoát bài học
            </button>
          </div>
        </div>
      </div>

      {/* B7 Mobile: Step 3 drag-drop fallback notice */}
      <div id="mobile-step3-notice" className="mobile-step3-notice" role="alertdialog" aria-labelledby="mobile-step3-title">
        <div className="mobile-step3-icon"><i className="fa-solid fa-mobile-screen"></i></div>
        <div className="mobile-step3-content">
          <h3 id="mobile-step3-title" className="mobile-step3-title">Kéo-thả không hỗ trợ trên mobile</h3>
          <p className="mobile-step3-text">Step 3 cần thao tác chuột (kéo thả). Bạn có thể bỏ qua Step 3 để xem Step 4, hoặc dùng máy tính.</p>
          <div className="mobile-step3-actions">
            <button className="btn btn-ghost" type="button" id="mobile-step3-close-btn">Đóng</button>
            <button className="btn btn-primary" type="button" id="mobile-step3-skip-btn">Bỏ qua → Step 4</button>
          </div>
        </div>
      </div>

      <LegacyScripts srcs={scripts} />
    </>
  );
}

// SVG symbol defs — copy nguyên văn từ lesson_db_design.html:131-223
function SvgIconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="15" r="4" /><path d="m10.85 12.15 8.65 8.65M18 5l2 2M15 8l2 2M19 6l2 2" />
        </symbol>
        <symbol id="i-cube" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7 5M12 22V12" />
        </symbol>
        <symbol id="i-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </symbol>
        <symbol id="i-puzzle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.024-.79-.038-.79-.038s-.32-.018-.79.038a.98.98 0 0 1-.837-.276l-1.613-1.612a2.01 2.01 0 0 0-1.413-.587H9.414a2.01 2.01 0 0 1-1.413-.587L6.395 12.93a.99.99 0 0 1-.276-.837c.025-.482.038-.794.038-.794s.018-.32-.038-.794a.99.99 0 0 1 .276-.837l1.613-1.613a2 2 0 0 0 0-2.828L6.396 4.79a2 2 0 0 1 0-2.828l1.611-1.61A2 2 0 0 1 9.85 0h6.302a2 2 0 0 1 1.414.586l1.61 1.61a2 2 0 0 0 2.83 0l1.6-1.6a2 2 0 0 1 2.83 0l1.6 1.6a2 2 0 0 0 2.83 0" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </symbol>
        <symbol id="i-stack" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12.83 2.18 8.99 4.99c.13.07.18.21.18.33v9.99c0 .12-.05.25-.18.33l-8.99 4.99c-.12.07-.27.07-.39 0L3.46 17.82c-.13-.07-.18-.21-.18-.33V7.5c0-.12.05-.25.18-.33l8.99-4.99c.12-.07.27-.07.39 0M7 7.07v10M17 7.07v10" />
        </symbol>
        <symbol id="i-arrow-split" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5M8 3H3v5M12 22V8M21 3l-5 5M3 3l5 5" />
        </symbol>
        <symbol id="i-crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </symbol>
        <symbol id="i-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </symbol>
        <symbol id="i-zap" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 12 14z" />
        </symbol>
        <symbol id="i-database" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />
        </symbol>
        <symbol id="i-git-branch" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </symbol>
        <symbol id="i-bug" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M17 13h4M21 21c0-2.1-1.7-3.9-3.8-4" />
        </symbol>
        <symbol id="i-atom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
        </symbol>
        <symbol id="i-scissors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" /><path d="M8.12 8.12 12 12M20 4 8.12 15.88M14.83 14.83 20 20M14.83 9.17 20 4" /><circle cx="6" cy="18" r="3" />
        </symbol>
        <symbol id="i-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </symbol>
        <symbol id="i-location" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </symbol>
        <symbol id="i-explosion" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 12 14zM12 2v3M12 22v-3M2 12h3M22 12h-3M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7 5 5" />
        </symbol>
        <symbol id="i-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </symbol>
        <symbol id="i-brackets" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" />
        </symbol>
        <symbol id="i-table" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </symbol>
      </defs>
    </svg>
  );
}
