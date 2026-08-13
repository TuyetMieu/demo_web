// Port landing.html (extends base.html) — markup 1:1, giữ nguyên class/id.
// Inline script gốc (landing.html block extra_scripts) → /static/js/pages/landing.inline.js
import type { Metadata } from 'next';

import LegacyScripts from '@/components/LegacyScripts';
import PageStyles from '@/components/PageStyles';

export const metadata: Metadata = {
  title: 'Programming EDU — Học lập trình hiện đại',
};

export default function LandingPage() {
  return (
    <div className="landing-body-wrap">
      <BodyClass name="landing-body" />
      {/* Re-skin layer: tokens từ edu-theme.css, override landing ở edu-landing.css */}
      <PageStyles hrefs={["/static/css/edu-theme.css", "/static/css/edu-landing.css"]} />
      {/* block body_decor */}
      <div className="bg-canvas">
        <div className="bg-blob b1"></div>
        <div className="bg-blob b2"></div>
        <div className="bg-blob b3"></div>
        <div className="bg-blob b4"></div>
      </div>
      <div className="grid-overlay"></div>
      <div className="particles" id="landingParticles">
        <span className="particle particle-1"></span>
        <span className="particle particle-2"></span>
        <span className="particle particle-3"></span>
        <span className="particle particle-4"></span>
        <span className="particle particle-5"></span>
        <span className="particle particle-6"></span>
      </div>

      {/* block nav (landing override) */}
      <nav className="landing-nav">
        <div className="landing-logo">
          Programming <span className="red">EDU</span>
        </div>
        <div className="nav-actions">
          <a href="/login" className="btn-outline">Đăng nhập</a>
          <a href="/register" className="btn-primary">Đăng ký miễn phí →</a>
        </div>
      </nav>

      {/* block content */}
      <section className="hero-section reveal-on-scroll">
        <div className="hero-content">
          <div className="hero-badge neon-badge">🚀 Nền tảng học lập trình hàng đầu Việt Nam</div>

          <h1 className="hero-title neon-text">
            Học <span className="neon-cyan">Lập Trình</span>
            <br />
            Theo Cách <span className="neon-pink">Hiện Đại</span>
          </h1>

          <p className="hero-sub fade-in-up delay-1">
            Từ HTML/CSS đến AI &amp; Backend — nắm vững mọi kỹ năng lập trình với lộ trình được thiết kế bởi chuyên gia.
          </p>

          <div className="hero-actions fade-in-up delay-2">
            <a href="/register" className="btn-main neon-btn">Bắt đầu miễn phí →</a>
            <a href="/login" className="btn-hero-outline glass-btn">Đăng nhập</a>
          </div>

          <div className="hero-stats fade-in-up delay-3">
            <div className="hero-stat">
              <div className="hero-stat-val neon-glow-text" id="stat-courses">—</div>
              <div className="hero-stat-lbl">Khóa học</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val neon-glow-text" id="stat-hours">—</div>
              <div className="hero-stat-lbl">Giờ học</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val neon-glow-text">100%</div>
              <div className="hero-stat-lbl">Miễn phí</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-val neon-glow-text">4 bước</div>
              <div className="hero-stat-lbl">Lý thuyết → Thực hành</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll">
        <div className="section-container">
          <h2 className="section-heading neon-text-sm">Học theo lộ trình thực chiến</h2>
          <p className="section-sub">Chúng tôi thiết kế từng bài học để bạn có thể làm được việc ngay từ ngày đầu tiên. Mỗi khóa học gồm bài tập thực tế, dự án mini và thử thách tương tác, phù hợp cho người mới lẫn người muốn nâng cấp kỹ năng.</p>

          <div className="section-grid 3d-grid">
            <div className="section-card neon-card">
              <div className="card-icon neon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <strong>Học từ căn bản đến chuyên sâu</strong>
              <p>Chuỗi bài học rõ ràng, dễ hiểu và cập nhật theo xu hướng công nghệ mới nhất.</p>
            </div>
            <div className="section-card neon-card">
              <div className="card-icon neon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <strong>Thực hành cùng dự án</strong>
              <p>Từng module đi kèm bài tập thực tế để bạn xây dựng portfolio ngay trong quá trình học.</p>
            </div>
            <div className="section-card neon-card">
              <div className="card-icon neon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <strong>Giáo viên hướng dẫn</strong>
              <p>Đội ngũ mentor giàu kinh nghiệm luôn hỗ trợ 1:1 khi bạn gặp khó khăn.</p>
            </div>
            <div className="section-card neon-card">
              <div className="card-icon neon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <strong>Học mọi lúc, mọi nơi</strong>
              <p>Hỗ trợ học online linh hoạt, dễ dàng trên máy tính và điện thoại.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll">
        <div className="section-container">
          <h2 className="section-heading neon-text-sm">Khóa học nổi bật</h2>
          <p className="section-sub">Bắt đầu với lộ trình được thiết kế bởi chuyên gia. Mỗi khóa học có bài tập thực tế và dự án mini.</p>

          <div className="section-grid 3d-grid" id="course-preview-grid">
            <div className="section-card neon-card" id="course-preview-loading">
              <div className="card-icon neon-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></div>
              <strong>Đang tải khóa học…</strong>
              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll">
        <div className="section-container">
          <h2 className="section-heading neon-text-sm">Bạn sẽ xây dựng được gì?</h2>
          <p className="section-sub">Mỗi khóa học kết thúc bằng một dự án thực tế — sản phẩm bạn có thể đưa vào portfolio và khoe với nhà tuyển dụng.</p>

          <div className="project-grid">
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)' }}>
                <div className="project-thumb-icon">🎮</div>
              </div>
              <strong>Hệ thống Catalog Game Shop</strong>
              <p>Database cho shop game online: bảng game, user, đơn hàng, thể loại. Áp dụng 1NF → BCNF → 4NF.</p>
              <span className="project-tag">Database Design · 20 bài</span>
            </article>
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #FF4D6D 0%, #C9184A 100%)' }}>
                <div className="project-thumb-icon">🏆</div>
              </div>
              <strong>Mạng Xã Hội Gamers</strong>
              <p>Grand system: users, posts, games, genres, platforms + 4 junction tables đạt chuẩn 4NF.</p>
              <span className="project-tag">Boss Battle · Tổng hợp</span>
            </article>
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                <div className="project-thumb-icon">⚙️</div>
              </div>
              <strong>App Settings với JSONB</strong>
              <p>Cột JSON lưu cấu hình người dùng linh hoạt, query bằng toán tử mũi tên -&gt;, -&gt;&gt;.</p>
              <span className="project-tag">JSON · app_users.settings</span>
            </article>
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' }}>
                <div className="project-thumb-icon">🔒</div>
              </div>
              <strong>Vault bảo mật người dùng</strong>
              <p>Login chống SQL Injection với Prepared Statement, lưu password bcrypt + salt an toàn.</p>
              <span className="project-tag">Security · bcrypt · SQLi</span>
            </article>
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}>
                <div className="project-thumb-icon">📍</div>
              </div>
              <strong>App bản đồ tìm tiệm game</strong>
              <p>Dữ liệu không gian (POINT), truy vấn ST_DWithin tìm chi nhánh gần user nhất.</p>
              <span className="project-tag">Spatial · PostGIS · ST_Distance</span>
            </article>
            <article className="project-card neon-card">
              <div className="project-thumb" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}>
                <div className="project-thumb-icon">🐍</div>
              </div>
              <strong>Log query với Django ORM</strong>
              <p>Ánh xạ Python class sang bảng SQL, query filter, select_related, values/annotate.</p>
              <span className="project-tag">ORM · Django · log_events</span>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll">
        <div className="section-container">
          <h2 className="section-heading neon-text-sm">Những gì bạn sẽ làm được sau khóa học</h2>
          <p className="section-sub">Tập trung vào kỹ năng thực tế và kết quả rõ ràng: xây website, lập trình ứng dụng, xử lý dữ liệu, tạo AI đơn giản và tự tin làm việc nhóm.</p>

          <div className="section-grid 3d-grid">
            <div className="section-card neon-card">
              <span className="value-pill neon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                Web development
              </span>
              <p>Xây dựng giao diện responsive, JavaScript tương tác và kết nối backend.</p>
            </div>
            <div className="section-card neon-card">
              <span className="value-pill neon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                AI &amp; Machine Learning
              </span>
              <p>Làm quen với mô hình cơ bản, xử lý dữ liệu và triển khai ứng dụng thông minh.</p>
            </div>
            <div className="section-card neon-card">
              <span className="value-pill neon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                Backend + Database
              </span>
              <p>Xây server, quản lý dữ liệu và tạo API an toàn cho ứng dụng thực tế.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section reveal-on-scroll">
        <div className="section-container">
          <h2 className="section-heading neon-text-sm">Học viên nói gì về chúng tôi</h2>
          <p className="section-sub">Hơn 94.000 học viên đã hoàn thành khóa học và tự tin xây sản phẩm đầu tay chỉ trong vài tuần.</p>

          <div className="testimonial-grid">
            <div className="testimonial-card glass-card trust-card">
              <div className="trust-stat">
                <div className="trust-stat-val neon-glow-text">100%</div>
                <div className="trust-stat-lbl">Miễn phí mọi khóa học</div>
              </div>
              <div className="trust-stat">
                <div className="trust-stat-val neon-glow-text">20</div>
                <div className="trust-stat-lbl">Bài học theo lộ trình Silberschatz</div>
              </div>
              <div className="trust-stat">
                <div className="trust-stat-val neon-glow-text">4-step</div>
                <div className="trust-stat-lbl">Lý thuyết → Trắc nghiệm → Kéo thả → Tự code</div>
              </div>
            </div>
            <div className="testimonial-card glass-card trust-card">
              <p className="trust-quote">&quot;Cách giảng dễ hiểu, bài tập thực tế. Mỗi module đi kèm dự án nhỏ giúp mình xây portfolio ngay trong quá trình học.&quot;</p>
              <div className="trust-note">Đánh giá từ học viên thử nghiệm — phần đánh giá đầy đủ đang được tích hợp vào trang khóa học.</div>
            </div>
            <div className="testimonial-card glass-card trust-card">
              <p className="trust-quote">&quot;Pipeline 4 bước (Theory → MCQ → Drag-Query → Code) giúp mình không bị &apos;đọc xong quên&apos;. Phải kéo thả, phải gõ SQL thật.&quot;</p>
              <div className="trust-note">Trải nghiệm thực tế từ nhóm pilot — chúng tôi đang thu thập đánh giá từ 50 học viên đầu tiên.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section cta-panel neon-cta reveal-on-scroll">
        <div className="section-container">
          <h2 className="neon-text-sm">Bắt đầu hành trình lập trình của bạn hôm nay</h2>
          <p>Đăng ký miễn phí và khám phá lộ trình phù hợp với mục tiêu cá nhân. Từ học viên mới đến người muốn nâng cấp kỹ năng, mọi thứ đã sẵn sàng.</p>
          <div className="hero-actions">
            <a href="/register" className="btn-hero-primary neon-btn">Tham gia miễn phí</a>
            <a href="/login" className="btn-hero-outline glass-btn">Đã có tài khoản?</a>
          </div>
        </div>
      </section>

      {/* block footer */}
      <footer className="landing-footer">© 2026 Programming EDU. All rights reserved.</footer>

      {/* icons.js của base + inline script landing (block extra_scripts) */}
      <LegacyScripts srcs={['/static/js/icons.js', '/static/js/pages/landing.inline.js']} />
    </div>
  );
}

// base.html đặt class lên <body> qua block body_class — component nhỏ gắn/gỡ đúng class đó
function BodyClass({ name }: { name: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: `document.body.classList.add(${JSON.stringify(name)});` }}
    />
  );
}
