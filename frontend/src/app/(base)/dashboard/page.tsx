'use client';

// Port dashboard.html (extends base.html) — SPA-hub: các "trang" Dashboard/
// Khóa học/Lộ trình/Kỹ năng/Diễn đàn/Cài đặt/Trang của tôi chuyển client-side
// bằng main.js navigate() trong CÙNG route này (không tách route Next — giữ UX cũ).
// CSS đúng tổ hợp gốc (dashboard.html block extra_head, thứ tự giữ nguyên).

import PageStyles from '@/components/PageStyles';
import Chatbot from '@/components/Chatbot';
import LegacyScripts from '@/components/LegacyScripts';
import PeRouterBridge from '@/components/PeRouterBridge';
import RoadmapSection from '@/components/RoadmapSection';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
const W = () => window as any;

// Thứ tự script y hệt cuối dashboard.html (mermaid → svg-pan-zoom → roadmapData
// → roadmap → main → chatbot → dashboard); icons.js vốn nằm ở <head> base.html.
const SCRIPTS = [
  '/static/js/icons.js',
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js',
  'https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js',
  '/static/js/roadmapData.js',
  '/static/js/roadmap.js',
  '/static/js/main.js',
  '/static/js/chatbot.js',
  // menu người dùng + chuông thông báo — dùng chung với trang chi tiết khóa
  // học và 3 trang khóa CSDL (trước đây mỗi trang một bản, xem edu-chrome.js)
  '/static/js/edu-chrome.js',
  '/static/js/dashboard.js',
  // sau cùng: đổ dữ liệu cho các khối mới của màn dash theo design
  '/static/js/edu-dashboard.js',
  // bài ôn tập tự sinh (thẻ "Ôn tập hôm nay") — phải sau edu-dashboard.js vì
  // nút "Ôn ngay" ở đó gọi window.peOpenReviewQuiz
  '/static/js/edu-review-quiz.js',
];

export default function DashboardPage() {
  return (
    <>
      <PageStyles hrefs={["/static/css/style.css","/static/css/dashboard.css","/static/css/pages.css","/static/css/ChangePassword.css","/static/css/skeleton.css","/static/css/dark-mode.css","/static/css/roadmap.css","/static/css/edu-theme.css","/static/css/edu-dashboard.css","/static/css/edu-review-quiz.css"]} />
      <title>Programming EDU</title>
      {/* PERF 2026-07-19: mermaid + svg-pan-zoom tải từ jsdelivr — preconnect
          cắt DNS+TLS handshake khỏi đường găng nạp script */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <PeRouterBridge remountKey="dashboard" />
      <Sidebar />

      <div id="main">
        <HeaderBar />
        {/* ── Dashboard ── */}
        {/* Bố cục 1:1 theo "Programming EDU.dc.html" (màn dash): cột trái
            Bài học gần đây + Cuộc thi, cột phải Bảng xếp hạng + ô thống kê.
            edu-dashboard.js đổ dữ liệu vào các id edu-d-*. Lịch học / mini
            roadmap / tiến độ không có trong design nên đã chuyển xuống mục
            Khóa học (giữ nguyên id để main.js + dashboard.js vẫn tìm thấy). */}
        <div className="page active" id="page-dashboard">
          <div className="edu-d-grid">
            {/* ── Cột trái ── */}
            <div className="edu-d-col">
              <section>
                <div className="edu-d-sec-head">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7b8ff5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>
                  {/* đổi thành "Các khóa học" khi chưa đăng ký khóa nào — edu-dashboard.js */}
                  <span className="edu-d-sec-title" id="edu-d-recent-title">Bài học gần đây</span>
                  <div className="edu-d-spacer"></div>
                  {/* edu-dashboard.js gắn sự kiện: trượt qua các khóa đã đăng ký */}
                  <div className="edu-d-arrows">
                    <button type="button" className="edu-d-arrow" id="edu-d-prev" aria-label="Khóa học trước">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button type="button" className="edu-d-arrow" id="edu-d-next" aria-label="Khóa học tiếp theo">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>
                <div className="edu-d-recent" id="edu-d-recent"></div>
              </section>

              {/* Ôn tập hôm nay — thay thẻ "cuộc thi" (dữ liệu viết cứng, app
                  không có tính năng đó). Nội dung từ /api/streak/review-quiz-status
                  + /api/skills, do edu-dashboard.js đổ vào. Giữ nguyên khung của
                  design: tiêu đề → ô 104px → dòng phụ → nút pill 58px.
                  Ẩn sẵn, chỉ hiện khi lấy được dữ liệu thật. */}
              <div className="edu-d-card edu-d-contest" id="edu-d-review" hidden>
                <div className="edu-d-contest-title" id="edu-d-review-title">Ôn tập hôm nay</div>
                <div className="edu-d-date-tile">
                  <div className="edu-d-date-mon" id="edu-d-review-cap"></div>
                  <div className="edu-d-date-day" id="edu-d-review-num">–</div>
                </div>
                <div className="edu-d-contest-date" id="edu-d-review-sub"></div>
                <div className="edu-d-contest-cta-wrap">
                  <button className="edu-d-cta" id="edu-d-review-cta" type="button"></button>
                </div>
              </div>

              {/* ── Hôm nay bạn đã học ──────────────────────────────────
                  Bộ đếm các bài HOÀN THÀNH TRONG NGÀY, kèm nút gộp đúng
                  những bài đó thành một đề củng cố. Khác thẻ "Ôn tập hôm
                  nay" ở trên: bên kia ôn dàn trải mọi bài từng học và giới
                  hạn một đề mỗi ngày, bên này bó vào buổi học hôm nay và
                  làm lại bao nhiêu lần cũng được.
                  Dữ liệu từ /api/quiz/today, do edu-dashboard.js đổ vào.
                  Ẩn sẵn — chỉ hiện khi lấy được dữ liệu thật. */}
              <div className="edu-d-card edu-d-today" id="edu-d-today" hidden>
                <div className="edu-d-today-hd">
                  <span className="edu-d-today-icon" aria-hidden="true">📖</span>
                  <span className="edu-d-today-title">Hôm nay bạn đã học</span>
                  <span className="edu-d-today-count" id="edu-d-today-count">0</span>
                </div>
                <ul className="edu-d-today-list" id="edu-d-today-list"></ul>
                <p className="edu-d-today-sub" id="edu-d-today-sub"></p>
                <button className="edu-d-cta edu-d-today-cta" id="edu-d-today-cta" type="button">
                  Ôn lại bài hôm nay
                </button>
              </div>
            </div>

            {/* ── Cột phải ── */}
            <div className="edu-d-col">
              <section>
                <div className="edu-d-sec-head">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b93ff0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                  <span className="edu-d-sec-title">Bảng xếp hạng</span>
                </div>
                <div className="edu-d-card edu-d-lb" id="edu-d-lb"></div>
              </section>

              <div className="edu-d-stats">
                <div className="edu-d-bigstats" id="edu-d-bigstats"></div>
                <div className="edu-d-card edu-d-ministats" id="edu-d-ministats"></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Courses ── */}
        <div className="page" id="page-courses">

          <div className="courses-header fx-fade-up">
            <div>
              <h2>📚 Khóa học</h2>
              <p className="courses-subtitle" id="courses-count-sub">Đang tải…</p>
            </div>
            <div className="courses-controls">
              <div className="filter-group" role="group" aria-label="Enrollment filter">
                <button className="filter-btn active" onClick={(e) => W().setEnrollmentFilter(e.currentTarget, 'all')} role="radio" aria-checked="true">Tất cả</button>
                <button className="filter-btn" onClick={(e) => W().setEnrollmentFilter(e.currentTarget, 'enrolled')} role="radio" aria-checked="false">Đang học</button>
                <button className="filter-btn" onClick={(e) => W().setEnrollmentFilter(e.currentTarget, 'not-enrolled')} role="radio" aria-checked="false">Chưa đăng ký</button>
              </div>
              <div className="sort-dropdown-wrap">
                <label htmlFor="course-sort-select" className="sort-label">Sắp xếp:</label>
                <select id="course-sort-select" className="sort-select" onChange={(e) => W().setSortOrder(e.currentTarget.value)} aria-label="Sort courses by">
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Phổ biến nhất</option>
                  <option value="duration">Ngắn nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search bar + tag filter row */}
          <div className="courses-filter-row fx-fade-up" style={{ animationDelay: '.07s' }}>
            <div className="courses-search-bar-wrap" id="courses-search-bar-wrap">
              <span className="csb-icon" data-icon="search" data-size="14"></span>
              <input
                type="text"
                id="course-search-input"
                className="courses-search-bar-input"
                placeholder="Tìm kiếm khóa học, ngôn ngữ, chủ đề..."
                autoComplete="off"
                onClick={() => W().cshOpen()}
                onInput={(e) => W().cshInput(e.currentTarget.value)}
              />
              <button className="csb-clear" id="course-search-clear" type="button" style={{ display: 'none' }} onClick={() => W().cshClear()}>✕</button>
              <div className="course-search-hints" id="course-search-hints" style={{ display: 'none' }}>
                <div id="csh-static">
                  <div className="csh-label">Gợi ý tìm kiếm</div>
                  <div className="csh-pills">
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Phù hợp người mới')}>✨ Phù hợp người mới</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Cơ bản')}>📘 Cơ bản</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Trung cấp')}>🧠 Trung cấp</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Cao cấp')}>🚀 Cao cấp</button>

                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Python')}>🐍 Python</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('C++')}>⚙️ C / C++</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('Java')}>☕ Java</button>
                    <button type="button" className="csh-pill" onClick={() => W().cshPick('HTML CSS')}>🌐 HTML/CSS</button>
                  </div>
                </div>
                <ul id="csh-dynamic" style={{ display: 'none', listStyle: 'none', padding: 0, margin: '8px 0 0' }}></ul>
              </div>
            </div>

            {/* Bộ lọc cấp độ + ngôn ngữ */}
            <div className="course-filter-panel">
              <div className="filter-pill-row" id="level-filter-row">
                <span className="pill-label">Cấp độ</span>
                <button className="pill-btn" onClick={(e) => W().setLevelFilter(e.currentTarget, 'Cơ bản')}>Cơ bản</button>
                <button className="pill-btn" onClick={(e) => W().setLevelFilter(e.currentTarget, 'Trung cấp')}>Trung cấp</button>
                <button className="pill-btn" onClick={(e) => W().setLevelFilter(e.currentTarget, 'Nâng cao')}>Nâng cao</button>
              </div>
              <div className="filter-pill-row" id="language-filter-row">
                <span className="pill-label">Ngôn ngữ</span>
                <button className="pill-btn" onClick={(e) => W().toggleLanguageFilter(e.currentTarget, 'Python')}>Python</button>
                <button className="pill-btn" onClick={(e) => W().toggleLanguageFilter(e.currentTarget, 'JS')}>JS</button>
                <button className="pill-btn" onClick={(e) => W().toggleLanguageFilter(e.currentTarget, 'Java')}>Java</button>
                <button className="pill-btn" onClick={(e) => W().toggleLanguageFilter(e.currentTarget, 'SQL')}>SQL</button>
              </div>
              <div className="active-filters hidden" id="active-filters"></div>
            </div>
          </div>

          <div className="courses-grid" id="courses-grid">
            {/* Skeleton */}
            {[0, 1, 2, 3].map((i) => (
              <div className="skel-course-card" key={i}><div className="skel-card-img skel"></div><div className="skel-card-body"><div className="skel-card-tag skel"></div><div className="skel-card-title skel"></div><div className="skel-card-desc skel"></div><div className="skel-card-footer"><div className="skel-card-meta skel"></div><div className="skel-card-btn skel"></div></div></div></div>
            ))}
          </div>
          <div className="empty hidden" id="empty-state">
            <div className="empty-icon">🔍</div>
            <p>Không tìm thấy khóa học phù hợp.</p>
          </div>
        </div>

        {/* ── Roadmap (partial roadmap.html) ── */}
        <RoadmapSection />

        {/* ── Xếp hạng — lb-card widget moved here (unchanged ids) from Dashboard ── */}
        <div className="page" id="page-leader">
          <div className="courses-header fx-fade-up">
            <div>
              <h2>🏆 Bảng xếp hạng</h2>
              <p className="page-subtitle">XP tích lũy trong tuần này · cập nhật mỗi giờ</p>
            </div>
          </div>
          <div className="edu-leader-grid">
            <div className="section-card lb-card fx-fade-up" style={{ animationDelay: '.05s' }}>
              <div className="lb-header">
                <div className="section-title" style={{ marginBottom: 0 }}>
                  <span className="title-icon-blue">🏆</span><span>Bảng xếp hạng</span>
                </div>
                <div className="lb-tabs" role="tablist" aria-label="Bảng xếp hạng">
                  <button type="button" className="lb-tab active" data-type="weekly" role="tab" aria-selected="true">⏱ Tuần</button>
                  <button type="button" className="lb-tab" data-type="streak" role="tab" aria-selected="false">🔥 Streak</button>
                  <button type="button" className="lb-tab" data-type="friends" role="tab" aria-selected="false">👥 Bạn bè</button>
                </div>
              </div>
              <div className="lb-meta" id="lb-meta">Đang tải…</div>
              <ol className="lb-list" id="lb-list" aria-live="polite">
                <li className="lb-skel">Đang tải bảng xếp hạng…</li>
              </ol>
              <div className="lb-me" id="lb-me" hidden></div>
            </div>

            {/* Thẻ phụ dựng theo màn isLeader của design (tiêu đề → 1 câu →
                3 dòng số). Tiêu đề đổi sang giờ học tuần theo yêu cầu; các
                dòng số lấy từ /api/leaderboard. edu-dashboard.js đổ dữ liệu. */}
            <div className="section-card edu-leader-side fx-fade-up" style={{ animationDelay: '.1s' }}>
              <div className="edu-l-side-title">Xếp hạng tuần này</div>
              <p className="edu-l-side-sub" id="edu-l-hours-sub">Thứ hạng cập nhật mỗi khi bạn hoàn thành bài học.</p>
              <div className="edu-l-side-rows">
                <div className="edu-l-side-row"><span>Hạng của bạn</span><b id="edu-l-rank">—</b></div>
                <div className="edu-l-side-row"><span>XP tuần này</span><b id="edu-l-xp">—</b></div>
                <div className="edu-l-side-row"><span>Cách hạng nhất</span><b id="edu-l-gap">—</b></div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Skills ── */}
        <div className="page" id="page-skills">
          <div className="courses-header fx-fade-up">
            <h2>🐙 Kỹ năng</h2>
          </div>
          <div className="courses-search-bar-wrap fx-fade-up" id="skills-search-wrap" style={{ animationDelay: '.07s' }}>
            <span className="csb-icon" data-icon="search" data-size="14"></span>
            <input
              type="text"
              id="skills-search-input"
              className="courses-search-bar-input"
              placeholder="Tìm kỹ năng (ví dụ: Python, HTML, Git...)"
              autoComplete="off"
              onInput={(e) => W().skillsSearch(e.currentTarget.value)}
            />
            <button className="csb-clear" id="skills-search-clear" type="button" style={{ display: 'none' }} onClick={() => W().skillsClearSearch()}>✕</button>
          </div>

          <div id="skills-search-empty" style={{ display: 'none', textAlign: 'center', padding: '32px 0', color: 'var(--t3)', fontSize: 14 }}>🔍 Không tìm thấy kỹ năng phù hợp.</div>
          <div className="sk-summary fx-fade-up" id="sk-summary" style={{ animationDelay: '.12s' }}></div>
          <div className="sk-grid" id="sk-grid">
            <div style={{ color: '#9CA3AF', fontSize: 14, padding: 24 }}>Đang tải...</div>
          </div>
        </div>

        {/* ── Forum ── */}
        <div className="page" id="page-forum">
          <div className="courses-header fx-fade-up">
            <div>
              <h2>💬 Diễn đàn</h2>
              <p className="page-subtitle">Chia sẻ kiến thức, đặt câu hỏi và thảo luận cùng mọi người</p>
            </div>
          </div>

          <div className="courses-search-bar-wrap fx-fade-up" id="forum-search-wrap" style={{ animationDelay: '.07s' }}>
            <span className="csb-icon" data-icon="search" data-size="14"></span>
            <input
              type="text"
              id="forum-search-input"
              className="courses-search-bar-input"
              placeholder="Tìm bài viết..."
              autoComplete="off"
              onInput={(e) => W().forumSearch(e.currentTarget.value)}
            />
            <button className="csb-clear" id="forum-search-clear" type="button" style={{ display: 'none' }} onClick={() => W().forumClearSearch()}>✕</button>
          </div>

          <div className="courses-header fx-fade-up" style={{ marginBottom: 16, animationDelay: '.11s' }}>
            <div className="filter-group" id="forum-tabs">
              <button className="filter-btn active" data-cat="all" onClick={(e) => W().forumSetCat(e.currentTarget, 'all')}>🗂️ Tất cả</button>
              <button className="filter-btn" data-cat="question" onClick={(e) => W().forumSetCat(e.currentTarget, 'question')}>❓ Câu hỏi</button>
              <button className="filter-btn" data-cat="share" onClick={(e) => W().forumSetCat(e.currentTarget, 'share')}>💡 Chia sẻ</button>
              <button className="filter-btn" data-cat="discuss" onClick={(e) => W().forumSetCat(e.currentTarget, 'discuss')}>💬 Thảo luận</button>
            </div>
            <div className="sort-dropdown-wrap">
              <label className="sort-label">Sắp xếp:</label>
              <select className="sort-select" onChange={(e) => W().forumSetSort(e.currentTarget.value)}>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="likes">Nhiều like nhất</option>
              </select>
            </div>
          </div>

          {/* Create box */}
          <div className="forum-create-box fx-fade-up" style={{ animationDelay: '.15s' }}>
            <div className="forum-create-row">
              <div className="fcb-avatar" id="fcb-avatar">?</div>
              <textarea
                id="forum-inline-body"
                className="fcb-textarea"
                maxLength={2000}
                placeholder="Bạn đang nghĩ gì? Chia sẻ với mọi người..."
                onInput={(e) => W().forumInlineInput(e.currentTarget.value)}
              ></textarea>
            </div>
            <div className="fcb-bottom-row">
              <div className="fcb-type-picker" id="fcb-type-picker">
                <button type="button" className="fcb-type-btn active" data-val="question" onClick={(e) => W().forumInlinePickType(e.currentTarget)}>❓ Câu hỏi</button>
                <button type="button" className="fcb-type-btn" data-val="share" onClick={(e) => W().forumInlinePickType(e.currentTarget)}>💡 Chia sẻ</button>
                <button type="button" className="fcb-type-btn" data-val="discuss" onClick={(e) => W().forumInlinePickType(e.currentTarget)}>💬 Thảo luận</button>
              </div>
              {/* disabled qua ref (DOM), không qua prop JSX — prop disabled làm React
                  chặn onClick vĩnh viễn dù main.js đã enable nút khi có nội dung */}
              <button
                className="fcb-submit-btn"
                id="fcb-submit-btn"
                ref={(el) => { if (el) el.disabled = true; }}
                onClick={() => W().forumSubmitInline?.()}
              >Đăng</button>
            </div>
          </div>

          {/* Post list */}
          <div id="forum-list"></div>

          {/* Empty state */}
          <div className="empty hidden" id="forum-empty">
            <div className="empty-icon">💬</div>
            <p>Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!</p>
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="page" id="page-settings">
          <div className="settings-wrap">
            <div className="settings-section">
              <div className="settings-section-title"><span className="title-icon-blue">👤</span><span>Thông tin cá nhân</span></div>
              <div className="profile-top">
                <div className="profile-avatar">
                  <img src="/static/images/avatar.svg" alt="avatar" />
                  <button className="avatar-edit-btn">+</button>
                </div>
                <div>
                  <div className="profile-name" id="settings-profile-name">—</div>
                  <div className="profile-email" id="settings-profile-email">—</div>
                  <span className="profile-badge">Học viên</span>
                </div>
              </div>
              <div className="fields-grid">
                <div><label className="field-label">Họ và tên</label><input id="field-name" className="field-input" placeholder="Nhập họ và tên" /></div>
                <div><label className="field-label">Email</label><input id="field-email" className="field-input" placeholder="Nhập email" /></div>
                <div><label className="field-label">Số điện thoại</label><input id="field-phone" className="field-input" placeholder="Nhập số điện thoại" /></div>
                <div><label className="field-label">Ngày sinh</label><input id="field-birthday" className="field-input" placeholder="Chọn ngày sinh" /></div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title"><span className="title-icon-red">🔔</span><span>Thông báo</span></div>
              <div className="notif-row">
                <div>
                  <div className="notif-lbl">Thông báo qua Email</div>
                  <div className="notif-desc">Nhận cập nhật khóa học qua email</div>
                </div><button id="toggle-email" className="toggle on" onClick={(e) => W().toggleSwitch(e.currentTarget)} aria-label="Toggle email notifications"><span className="toggle-knob"></span></button>
              </div>
              <div className="notif-row">
                <div>
                  <div className="notif-lbl">Thông báo đẩy</div>
                  <div className="notif-desc">Nhận thông báo trực tiếp trên trình duyệt</div>
                </div><button id="toggle-push" className="toggle" onClick={(e) => W().toggleSwitch(e.currentTarget)} aria-label="Toggle push notifications"><span className="toggle-knob"></span></button>
              </div>
              <div className="notif-row">
                <div>
                  <div className="notif-lbl">Nhắc nhở học tập</div>
                  <div className="notif-desc">Nhắc nhở lịch học hàng ngày</div>
                </div><button id="toggle-remind" className="toggle on" onClick={(e) => W().toggleSwitch(e.currentTarget)} aria-label="Toggle study reminders"><span className="toggle-knob"></span></button>
              </div>
              <div className="notif-row">
                <div>
                  <div className="notif-lbl">Cập nhật nội dung</div>
                  <div className="notif-desc">Thông báo khi có bài học mới</div>
                </div><button id="toggle-content" className="toggle" onClick={(e) => W().toggleSwitch(e.currentTarget)} aria-label="Toggle content updates"><span className="toggle-knob"></span></button>
              </div>
            </div>

            <div className="sec-lang-grid">
              <div className="sec-lang-card">
                <div className="sec-lang-title"><span className="title-icon-blue">🛡</span><span>Bảo mật</span></div>
                <button className="change-pw-btn" onClick={() => W().openChangePasswordModal()}>Đổi mật khẩu</button>
              </div>
              <div className="sec-lang-card">
                <div className="sec-lang-title"><span className="title-icon-red">🌐</span><span>Ngôn ngữ</span></div>
                <select className="lang-select" aria-label="Select language">
                  <option>Tiếng Việt</option>
                  <option>English</option>
                </select>
              </div>
            </div>

            <button className="save-btn" onClick={() => W().saveSettings()}>💾 Lưu thay đổi</button>
          </div>
        </div>

        {/* ══════════ TRANG CỦA TÔI ══════════ */}
        <div className="page" id="page-profile">
          <div className="prof-wrap">
            {/* Hero card */}
            <div className="prof-hero fx-fade-up">
              <div className="prof-hero-bg"></div>
              <div className="prof-hero-body">
                <div className="prof-avatar-wrap">
                  <div className="prof-avatar" id="prof-avatar-letter">?</div>
                  <span className="prof-avatar-badge">🎓</span>
                </div>
                <div className="prof-hero-info">
                  <div className="prof-name" id="prof-name">—</div>
                  <div className="prof-email" id="prof-email">—</div>
                  <div className="prof-role-tag">🎓 Học viên</div>
                </div>
                <button className="prof-edit-btn" onClick={() => W().navigate('settings')}>
                  <span data-icon="pencil" data-size="13"></span> Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>

            {/* Stats row (5 cards) */}
            <div className="prof-stats-row">
              <div className="prof-stat-card fx-fade-up" style={{ animationDelay: '.05s' }}>
                <div className="prof-stat-icon" data-icon="flame" data-size="22" data-color="#F97316"></div>
                <div className="prof-stat-val" id="prof-streak">—</div>
                <div className="prof-stat-lbl">Chuỗi ngày học</div>
              </div>
              <div className="prof-stat-card fx-fade-up" style={{ animationDelay: '.1s' }}>
                <div className="prof-stat-icon" data-icon="book-open" data-size="22" data-color="#3B82F6"></div>
                <div className="prof-stat-val" id="prof-enrolled">—</div>
                <div className="prof-stat-lbl">Khóa học đang học</div>
              </div>
              <div className="prof-stat-card fx-fade-up" style={{ animationDelay: '.15s' }}>
                <div className="prof-stat-icon" data-icon="check-circle-2" data-size="22" data-color="#10B981"></div>
                <div className="prof-stat-val" id="prof-done">—</div>
                <div className="prof-stat-lbl">Bài học hoàn thành</div>
              </div>
              <div className="prof-stat-card fx-fade-up" style={{ animationDelay: '.2s' }}>
                <div className="prof-stat-icon" data-icon="medal" data-size="22" data-color="#F59E0B"></div>
                <div className="prof-stat-val" id="prof-achievements">—</div>
                <div className="prof-stat-lbl">Thành tích đạt được</div>
              </div>
              <div className="prof-stat-card prof-stat-card--link fx-fade-up" style={{ animationDelay: '.25s' }} onClick={() => W().navigateToSkills()} title="Xem kỹ năng">
                <div className="prof-stat-icon" data-icon="sparkles" data-size="22" data-color="#A78BFA"></div>
                <div className="prof-stat-val" id="prof-skills">—</div>
                <div className="prof-stat-lbl">Kỹ năng</div>
              </div>
            </div>

            {/* Content grid */}
            <div className="prof-grid">
              {/* Cột trái: Khóa học + XP card */}
              <div className="prof-col-left">
                <div className="prof-section fx-fade-up" style={{ animationDelay: '.25s' }}>
                  <div className="prof-section-hd">
                    <span className="prof-section-icon">📚</span>
                    <span className="prof-section-title">Khóa học đang học</span>
                  </div>
                  <div className="prof-course-list" id="prof-course-list">
                    <div className="prof-empty">Chưa đăng ký khóa học nào.</div>
                  </div>
                </div>

                <div className="prof-xp-card fx-fade-up" style={{ animationDelay: '.3s' }}>
                  <div className="prof-xp-label">kinh nghiệm bài học</div>
                  <div className="prof-xp-inner">
                    <div className="prof-xp-top">
                      <span className="prof-xp-top-title">Subjects and languages</span>
                      <span className="prof-xp-sort">Most progress ▾</span>
                    </div>
                    <div className="prof-xp-scale">
                      <span>0</span><span>100</span><span>200</span><span>300</span><span>400</span>
                    </div>
                    <div className="prof-xp-rows" id="prof-xp-rows"></div>
                    <div className="prof-xp-footer">
                      <span className="prof-xp-footer-link">Learn more about XP</span>
                      <span className="prof-xp-footer-more">View more details ›</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bài đăng */}
              <div className="prof-section prof-section--posts fx-fade-up" style={{ animationDelay: '.25s' }}>
                <h3 className="prof-posts-heading">bài đăng</h3>
                <div className="prof-post-list" id="prof-post-list">
                  <div className="prof-empty">Chưa có bài đăng nào.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ★ MODAL HỦY ĐĂNG KÝ KHÓA HỌC */}
      <div className="un-overlay" id="unenrollModal" onClick={(e) => W().handleUnenrollOverlayClick(e)}>
        <div className="un-card">
          <div className="un-icon-wrap">🗑️</div>
          <h3 className="un-title">Hủy đăng ký?</h3>
          <p className="un-sub">Bạn sắp hủy đăng ký khóa học</p>
          <p className="un-course-name" id="unenroll-course-name"></p>
          <div className="un-warning">
            <span>⚠️</span>
            <p>Toàn bộ tiến độ học tập của bạn trong khóa này sẽ bị <strong>xóa vĩnh viễn</strong> và không thể khôi phục lại.</p>
          </div>
          <div className="un-actions">
            <button className="un-btn-cancel" onClick={() => W().closeUnenrollModal()}>Không, giữ lại</button>
            <button className="un-btn-confirm" onClick={() => W().confirmUnenroll()}>Đồng ý hủy</button>
          </div>
        </div>
      </div>

      {/* ★ MODAL ĐỔI MẬT KHẨU */}
      <div className="cp-overlay" id="changePasswordModal" role="dialog" aria-modal="true" aria-labelledby="cpTitle">
        <div className="cp-modal">
          <button className="cp-close" onClick={() => W().closeChangePasswordModal()} aria-label="Đóng">✕</button>

          <div className="cp-header">
            <div className="cp-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                <circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"></circle>
              </svg>
            </div>
            <h3 className="cp-title" id="cpTitle">Đổi mật khẩu</h3>
            <p className="cp-subtitle">Bảo vệ tài khoản của bạn an toàn hơn</p>
          </div>

          <form id="cpForm" autoComplete="off">
            {/* Mật khẩu hiện tại */}
            <div className="cp-group">
              <label className="cp-label" htmlFor="cpCurrent">Mật khẩu hiện tại</label>
              <div className="cp-input-wrap">
                <svg className="cp-leading-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2"></rect>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                </svg>
                <input type="password" className="cp-input" id="cpCurrent" placeholder="Nhập mật khẩu hiện tại" required />
                <button type="button" className="cp-toggle-eye" onClick={(e) => W().togglePassword('cpCurrent', e.currentTarget)} aria-label="Hiện/ẩn mật khẩu">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div className="cp-msg" id="cpCurrentMsg"></div>
            </div>

            {/* Mật khẩu mới */}
            <div className="cp-group">
              <label className="cp-label" htmlFor="cpNew">Mật khẩu mới</label>
              <div className="cp-input-wrap">
                <svg className="cp-leading-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="15" r="4"></circle>
                  <path d="M10.8 12.2 21 2"></path>
                  <path d="m19 5 2 2"></path>
                  <path d="m16 8 2 2"></path>
                </svg>
                <input type="password" className="cp-input" id="cpNew" placeholder="Tối thiểu 8 ký tự" required onInput={(e) => W().checkStrength(e.currentTarget.value)} />
                <button type="button" className="cp-toggle-eye" onClick={(e) => W().togglePassword('cpNew', e.currentTarget)} aria-label="Hiện/ẩn mật khẩu">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div className="cp-strength" id="cpStrength">
                <div className="cp-strength-bars">
                  <span></span><span></span><span></span><span></span>
                </div>
                <div className="cp-strength-label" id="cpStrengthLabel"></div>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className="cp-group">
              <label className="cp-label" htmlFor="cpConfirm">Xác nhận mật khẩu mới</label>
              <div className="cp-input-wrap">
                <svg className="cp-leading-icon" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                <input type="password" className="cp-input" id="cpConfirm" placeholder="Nhập lại mật khẩu mới" required onInput={() => W().checkMatch()} />
                <button type="button" className="cp-toggle-eye" onClick={(e) => W().togglePassword('cpConfirm', e.currentTarget)} aria-label="Hiện/ẩn mật khẩu">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <div className="cp-msg" id="cpConfirmMsg"></div>
            </div>

            <div className="cp-actions">
              <button type="button" className="cp-btn cp-btn-cancel" onClick={() => W().closeChangePasswordModal()}>Hủy</button>
              <button type="submit" className="cp-btn cp-btn-submit" id="cpSubmitBtn">
                <span className="cp-btn-text">Cập nhật mật khẩu</span>
                <span className="cp-spinner"></span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ★ POPUP NHẮC GIỮ CHUỖI HỌC */}
      <div className="streak-overlay" id="streakPopup">
        <div className="streak-card">
          <div className="streak-fire-wrap">
            <div className="streak-ring"></div>
            <div className="streak-fire-bg">🔥</div>
          </div>
          <h3 className="streak-title">Đừng quên giữ chuỗi hôm nay 🔥</h3>
          <p className="streak-sub">Bạn đang có chuỗi học liên tiếp tuyệt vời.<br />Học một chút hôm nay để không bị gián đoạn nhé!</p>
          <button className="streak-btn-go" onClick={() => W().streakGoLearn()}>Đi học thôi</button>
          <button className="streak-btn-skip" onClick={() => W().streakClose()}>Để sau</button>
        </div>
      </div>

      {/* ★ HỘP THOẠI BÀI ÔN TẬP — nút "Ôn ngay" ở thẻ "Ôn tập hôm nay" mở cái
          này thay vì chỉ nhảy sang tab Kỹ năng. Nội dung do edu-review-quiz.js
          đổ vào (gọi /courses/:id/quiz/generate — backend tự sinh câu hỏi từ
          các bài user ĐÃ hoàn thành). Để rỗng ở đây: React không giữ state nào
          cho khối này nên không ghi đè lên phần JS đã vẽ. */}
      <div className="edu-rq-overlay" id="edu-rq-overlay" role="dialog" aria-modal="true" aria-labelledby="edu-rq-title">
        <div className="edu-rq-card">
          <div className="edu-rq-head">
            <div className="edu-rq-heads">
              <div className="edu-rq-title" id="edu-rq-title">Ôn tập hôm nay</div>
              <div className="edu-rq-sub" id="edu-rq-sub"></div>
            </div>
            <button type="button" className="edu-rq-close" id="edu-rq-close" aria-label="Đóng">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
          <div className="edu-rq-track" hidden><div className="edu-rq-bar" id="edu-rq-bar"></div></div>
          <div className="edu-rq-body" id="edu-rq-body"></div>
          <div className="edu-rq-foot" id="edu-rq-foot"></div>
        </div>
      </div>

      <Chatbot />

      <LegacyScripts srcs={SCRIPTS} />
    </>
  );
}
