'use client';

// Port course_db_design.html — trang chi tiết 3 khóa DB Design (db_design /
// db_design_tc / db_design_nc dùng CHUNG markup; course_db_design.js đọc
// data-course trên <body> để render roadmap đúng khóa — giữ nguyên cơ chế).
//
// Không còn gọi API: trang đăng nhập đã gỡ nên /api/enrolled, /api/stats, /api/user
// đều trả 401. Mọi chữ trên trang đến từ course_db_design.js (COURSE_PAGE_META);
// thẻ bên phải chỉ còn nút "Bắt đầu học" vì Đăng ký/Hủy đăng ký/tiến độ cần tài khoản.
import { useCallback, useEffect, useSyncExternalStore } from 'react';

import shell from '@/components/CourseShell.module.css';
import LegacyScripts from '@/components/LegacyScripts';
import SiteHeader from '@/components/SiteHeader';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function CourseDbDesign({ courseId }: { courseId: string }) {
  /* course_db_design.js dựng toàn bộ nội dung thật (tên khóa, lộ trình, yêu
   * cầu, thành tựu) đè lên markup mặc định trong JSX — mà markup mặc định đó là
   * của khóa CƠ BẢN. Chưa chờ tín hiệu thì mở khóa Trung cấp/Nâng cao vẫn thấy
   * tên và nội dung khóa Cơ bản nhấp nháy một nhịp trước khi bị thay.
   * useSyncExternalStore thay cho useEffect+setState: đọc được cờ ngay ở lần
   * render đầu (script có thể đã chạy xong trước khi React mount) và không gây
   * render dây chuyền. */
  const subscribeReady = useCallback((cb: () => void) => {
    document.addEventListener('pe:db-course-ready', cb);
    return () => document.removeEventListener('pe:db-course-ready', cb);
  }, []);
  // Snapshot phải trả về GIÁ TRỊ NGUYÊN THỦY — trả object mới mỗi lần gọi sẽ
  // làm useSyncExternalStore lặp vô hạn.
  const dbTitle = useSyncExternalStore(
    subscribeReady,
    () => (window as any).__peDbCourseTitle || '',
    () => '',
  );
  const contentReady = !!dbTitle;

  useEffect(() => {
    // data-course: course_db_design.js đọc để biết dựng nội dung khóa nào.
    //
    // KHÔNG ép thêm class 'dark' nữa. Template Jinja gốc là <body class="dark">
    // vì bản cũ chỉ có giao diện tối; giờ app có chủ đề thật đọc từ localStorage.
    // Ép ở đây làm body chuyển sang tối một nhịp rồi applyTheme() của file JS
    // mới kéo về sáng — đo được: đang để chế độ SÁNG, mở khóa CSDL thì body
    // mang class 'dark' từ 688ms tới 775ms, đúng nhịp vệt chờ nháy đen.
    // Chủ đề đã được đặt trước khi vẽ ở layout gốc (src/app/layout.tsx).
    document.body.setAttribute('data-course', courseId);
    return () => {
      document.body.removeAttribute('data-course');
    };
  }, [courseId]);


  return (
    <>
      <title>Database Design – Programming EDU</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className={shell.shell}>
        <SiteHeader />

        {/* Page content */}
        {/* Nội dung trang — bố cục 2 cột y như trang chi tiết khóa học chung
            (/courses/[courseId]): hero dạng thẻ + các khối nội dung bên trái,
            thẻ đăng ký/tiến độ bên phải. Các class .cd-* bên trong GIỮ NGUYÊN vì
            course_db_design.js tìm đúng những selector đó để đổ nội dung. */}
        <div className="page active">
          {/* Quay lại trang chủ — <a> thường (tải lại trang), xem SiteHeader. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className={shell.back} href="/">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            <span>Tất cả khóa học</span>
          </a>

          {/* Vệt chờ y như trang chi tiết khóa học chung — hiện cho tới khi
              course_db_design.js đổ xong nội dung đúng khóa. Bố cục trùng khớp
              với nội dung thật (hero 218px, 2 cột) nên không xô đẩy khi đổi. */}
          {!contentReady && (
            <div className="edu-cd-grid" aria-busy="true">
              <div className="edu-cd-main">
                <div className="edu-skel" style={{ height: 218 }} />
                <div className="edu-skel" style={{ height: 320 }} />
                <div className="edu-skel" style={{ height: 150 }} />
              </div>
              <div className="edu-cd-side">
                <div className="edu-skel" style={{ height: 300 }} />
              </div>
            </div>
          )}
          {/* Nội dung thật LUÔN nằm trong DOM (chỉ ẩn đi khi chưa sẵn sàng) —
              course_db_design.js phải tìm thấy .cd-hero-title, #cd-roadmap,
              .cd-skills… để đổ dữ liệu vào; bỏ hẳn khỏi cây thì script không có
              gì để ghi và trang kẹt ở vệt chờ vĩnh viễn. */}
          <div className={contentReady ? 'edu-cd-grid' : 'edu-cd-grid edu-cd-prep'}>
            <div className="edu-cd-main">
              {/* Hero */}
              <div className="edu-cd-hero">
                <div className="edu-cd-hero-info">
                  {/* dùng .edu-cd-tag (chữ nhỏ in hoa màu accent, đúng design)
                      chứ KHÔNG kèm .cd-tag của bộ cũ — class đó vẽ thêm viên
                      thuốc có chấm nhấp nháy, design không có */}
                  <span className="edu-cd-tag">DATABASE</span>
                  <h2 className="edu-cd-title cd-hero-title">Database Design</h2>
                  <p className="edu-cd-subtitle cd-hero-subtitle">ER Mapping, Phụ thuộc hàm &amp; Chuẩn hóa dữ liệu — theo giáo trình Silberschatz</p>
                  {/* thứ tự 3 ô này cố định: course_db_design.js ghi số bài vào .val thứ 2 */}
                  <div className="cd-meta">
                    <div className="cd-meta-item">🕐 <span className="val" id="cd-hero-time">~5 giờ</span></div>
                    <div className="cd-meta-item">📖 <span className="val">20</span> bài học</div>
                    <div className="cd-meta-item">🎯 <span className="val cd-difficulty-gradient">Cơ bản → Nâng cao</span></div>
                  </div>
                  <div className="edu-cd-hero-cta">
                    <button type="button" className="edu-cd-btn primary" onClick={() => W().goLesson()}>▶ Bắt đầu học</button>
                  </div>
                </div>
                {/* không kèm .cd-hero-visual: class cũ ép ô vuông 150px, chọi
                    với khung 220×158 của design (không JS nào dùng class đó).
                    Ảnh bìa thật (13/08/2026) thay cho emoji 🗄️ — ba khóa CSDL
                    không đi qua API /courses ở trang này nên dựng đường dẫn
                    theo đúng quy ước `static/images/<id>.webp` của backend. */}
                <div className="edu-cd-hero-art">
                  <img
                    src={`/static/images/${courseId}.webp`}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* Nội dung khóa học — lộ trình dạng nút do course_db_design.js dựng
                  vào #cd-roadmap. Danh sách .cd-lesson ẩn (.cd-roadmap-fallback) đã
                  bỏ: CSS luôn display:none nên nó chỉ là bản sao chết của lộ trình. */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📚</div>
                  <h3>Nội dung khóa học</h3>
                  {/* course_db_design.js tìm span khớp /Khóa .*bài/ để ghi nhãn theo khóa */}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--edu-t4)" }}>Khóa Cơ bản: 20 bài · 3 module</span>
                </div>
                <div style={{ padding: 0 }}>
                  <div className="cd-roadmap" id="cd-roadmap" aria-label="Lộ trình khóa học"></div>
                </div>
              </div>

              {/* Block 1: Tổng quan */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📋</div>
                  <h3>Tổng quan khóa học</h3>
                </div>
                <div className="cd-block-body">
                  <p className="cd-desc">
                    Bạn có ý tưởng một <strong>game shop</strong>, một <strong>mạng xã hội cho gamer</strong>, hay một <strong>app đặt đồ ăn</strong> — nhưng chưa biết <em>&quot;cơ sở dữ liệu&quot; thì thiết kế từ đâu</em>? Khóa học này dành cho bạn.
                    <br /><br />
                    Trong <strong>20 bài</strong> (3 module), bạn sẽ đi từ <em>không biết gì</em> đến <em>tự tin thiết kế</em> một database hoàn chỉnh chạy thật trong dự án của mình. Mỗi bài là một <strong>bài toán thực tế</strong> (game shop, mạng xã hội, app giao đồ ăn) chứ không phải lý thuyết khô khan.
                  </p>
                  <p className="cd-desc" style={{ marginTop: 14 }}>
                    <strong>Sau khóa học, bạn sẽ làm được:</strong>
                  </p>
                  <ul className="cd-outcomes">
                    <li>📐 <strong>Vẽ được sơ đồ ER</strong> cho bất kỳ bài toán nào (game, web, app) chỉ trong vài phút</li>
                    <li>🗄️ <strong>Thiết kế bảng SQL</strong> không thừa không thiếu — không bao giờ bị lỗi <em>&quot;duplicate dữ liệu&quot;</em> hay <em>&quot;mất thông tin khi update&quot;</em></li>
                    <li>🧠 <strong>Giải thích được vì sao</strong> cần tách bảng, thêm khóa ngoại — để tự tin bảo vệ thiết kế trước team/lead</li>
                    <li>📊 <strong>Chuẩn hóa dữ liệu</strong> qua 1NF → BCNF → 3NF với thuật toán tách bảng chuẩn</li>
                    <li>🛡️ <strong>Biết cách đánh đổi</strong> giữa BCNF (chuẩn tuyệt đối) và 3NF (thực tế, performance tốt hơn)</li>
                    <li>🏆 <strong>Hoàn thành Boss Battle</strong> — thiết kế database cho Mạng Xã Hội Gamers từ A-Z (capstone project)</li>
                  </ul>
                  {/* dùng token thay #9CA3AF viết cứng: màu đó hợp nền đen tuyền
                      cũ, trên nền sáng mới chỉ đạt tỉ lệ tương phản 2.5 */}
                  <p className="cd-desc" style={{ marginTop: 14, fontSize: 13, color: 'var(--text-400)' }}>
                    💡 <strong>Cách học:</strong> Mỗi bài 4 bước — đọc lý thuyết ngắn gọn → trắc nghiệm kiểm tra hiểu → kéo thả xếp câu SQL → tự code với gợi ý 4 cấp độ. Thực hành ngay trên trình duyệt, không cần cài database.
                  </p>
                </div>
              </div>

              {/* Block 3: Yêu cầu */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📌</div>
                  <h3>Yêu cầu</h3>
                </div>
                <div className="cd-block-body">
                  <ul className="cd-req-list">
                    <li data-prereq="sql">
                      <span className="cd-req-text">Biết SQL cơ bản: SELECT, FROM, WHERE (tương đương PART 1 — đã học ở &quot;SQL cơ bản&quot;)</span>
                      <span className="cd-req-status" aria-label="Trạng thái"><i className="fas fa-lock"></i></span>
                    </li>
                    <li data-prereq="static">
                      <span className="cd-req-text">Hiểu khái niệm bảng, cột, dòng, khóa chính/khóa ngoại</span>
                      <span className="cd-req-status is-info" aria-label="Khuyến nghị"><i className="fas fa-lightbulb"></i></span>
                    </li>
                    <li data-prereq="static">
                      <span className="cd-req-text">Có khả năng đọc ER Diagram cơ bản</span>
                      <span className="cd-req-status is-info" aria-label="Khuyến nghị"><i className="fas fa-lightbulb"></i></span>
                    </li>
                    <li data-prereq="static">
                      <span className="cd-req-text">Trình duyệt web hiện đại (Chrome / Edge / Firefox mới nhất) — không cần cài DB</span>
                      <span className="cd-req-status is-info" aria-label="Khuyến nghị"><i className="fas fa-lightbulb"></i></span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Block 4: Thành tựu */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">🏅</div>
                  <h3>Thành tựu</h3>
                </div>
                <div className="cd-block-body">
                  <div className="cd-skills">
                    <div className="cd-skill-item" data-module="1">
                      <div className="cd-skill-icon"><i className="fas fa-key"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Phân biệt các loại Key</div>
                        <div className="cd-skill-desc">Primary, Composite, Foreign Key</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="1">
                      <div className="cd-skill-icon"><i className="fas fa-link"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Thiết kế FK 1:1 &amp; 1:N</div>
                        <div className="cd-skill-desc">Quan hệ một-một &amp; một-nhiều qua khóa ngoại</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="1">
                      <div className="cd-skill-icon"><i className="fas fa-project-diagram"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Junction Table cho M:N</div>
                        <div className="cd-skill-desc">Quan hệ nhiều-nhiều qua bảng trung gian</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="1">
                      <div className="cd-skill-icon"><i className="fas fa-cubes"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Composite Key &amp; Weak Entity</div>
                        <div className="cd-skill-desc">Thực thể yếu &amp; khóa phức hợp đúng chuẩn</div>
                      </div>
                    </div>

                    <div className="cd-skill-item" data-module="2">
                      <div className="cd-skill-icon"><i className="fas fa-broom"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Loại bỏ Redundancy &amp; FD dư thừa</div>
                        <div className="cd-skill-desc">Phát hiện &amp; xử lý phụ thuộc hàm thừa</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="2">
                      <div className="cd-skill-icon"><i className="fas fa-layer-group"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Chuẩn hóa 1NF → BCNF → 3NF</div>
                        <div className="cd-skill-desc">Thuật toán tách bảch chuẩn &amp; phi tổn thất</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="2">
                      <div className="cd-skill-icon"><i className="fas fa-balance-scale"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">BCNF vs 3NF trade-off</div>
                        <div className="cd-skill-desc">Giải thích thỏa hiệp chuẩn vs thực tế</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="2">
                      <div className="cd-skill-icon"><i className="fas fa-crown"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Boss Battle — Mạng Xã Hội Gamers</div>
                        <div className="cd-skill-desc">Thiết kế schema A-Z từ yêu cầu thực tế</div>
                      </div>
                    </div>

                    <div className="cd-skill-item" data-module="3">
                      <div className="cd-skill-icon"><i className="fas fa-code"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">JSONB trong Postgres</div>
                        <div className="cd-skill-desc">Toán tử <code>-&gt;</code>, <code>-&gt;&gt;</code>, GROUP BY theo key lồng</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="3">
                      <div className="cd-skill-icon"><i className="fas fa-map-marker-alt"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Spatial Query PostGIS</div>
                        <div className="cd-skill-desc"><code>ST_MakePoint</code>, <code>ST_Distance</code>, <code>ST_DWithin</code>, GiST index</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="3">
                      <div className="cd-skill-icon"><i className="fab fa-python"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">ORM Django</div>
                        <div className="cd-skill-desc"><code>select_related</code>, <code>values/annotate</code>, ánh xạ Class ↔ Table</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="3">
                      <div className="cd-skill-icon"><i className="fas fa-shield-alt"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Phòng chống SQL Injection</div>
                        <div className="cd-skill-desc">Prepared Statement, validate input, least privilege</div>
                      </div>
                    </div>
                    <div className="cd-skill-item" data-module="3">
                      <div className="cd-skill-icon"><i className="fas fa-user-shield"></i></div>
                      <div className="cd-skill-body">
                        <div className="cd-skill-title">Password Security</div>
                        <div className="cd-skill-desc">bcrypt + salt, audit <code>CASE WHEN</code> phát hiện hash yếu</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 5: Đánh giá */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">⭐</div>
                  <h3>Đánh giá của học viên</h3>
                </div>
                <div className="cd-block-body">
                  <div className="cd-reviews-stub">
                    <div className="star-avg-wrap">
                      <div className="star-avg">
                        <div className="star-avg-bg">★★★★★</div>
                        <div className="star-avg-fill" data-fill="96">★★★★★</div>
                      </div>
                    </div>
                    <div className="score">4.8</div>
                    <div className="avg-label">Đánh giá trung bình</div>

                    <div className="user-rate-section">
                      <div className="user-rate-label">Đánh giá của bạn:</div>
                      <div className="star-interactive" id="starInteractive">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div className="si-star" data-star={i} key={i}>★</div>
                        ))}
                      </div>
                      <div className="user-rate-val" id="userRateVal">—</div>
                    </div>

                    <div className="coming-soon-note">Tính năng lưu đánh giá đang được phát triển. Hãy quay lại sau!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải — thẻ đăng ký/tiến độ, cùng khung với trang chi tiết
                khóa học chung. Bỏ .cd-card-image (khối tối 130px chỉ để chứa
                emoji 🗄️): hero đã có ảnh rồi, design không có ảnh thứ hai ở đây. */}
            <div className="edu-cd-side">
              {/* Chỉ còn nút "Bắt đầu học": Đăng ký/Hủy đăng ký/tiến độ cần tài khoản,
                  mà frontend không còn trang đăng nhập. goLesson() của
                  course_db_design.js nhảy tới bài đầu theo LESSON_URL. */}
              <div className="edu-cd-card">
                <div>
                  <div className="edu-cd-price">Miễn phí</div>
                  <div className="edu-cd-price-free">🎉 Hoàn toàn không mất phí</div>

                  <div id="cd-cta-area">
                    <button type="button" className="edu-cd-btn primary" style={{ width: '100%', marginTop: 18 }} onClick={() => W().goLesson()}>▶ Bắt đầu học</button>
                  </div>

                  <div className="edu-cd-includes">
                    <div className="edu-cd-includes-title">KHÓA HỌC BAO GỒM</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-book-open"></i> 20 bài học (Khóa Cơ bản)</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-project-diagram"></i> 3 module (ER / Normalization / Application)</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-clock"></i> ~14 giờ học</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-database"></i> Thực hành trên trình duyệt (không cần cài DB)</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-infinity"></i> Truy cập vĩnh viễn</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-certificate"></i> Chứng chỉ hoàn thành</div>
                    <div className="edu-cd-inc-item cd-inc-item"><i className="fas fa-mobile-alt"></i> Học trên mọi thiết bị</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Globals cho course_db_design.js (thay inline script Jinja gốc):
          <script> trong JSX không bao giờ được React thực thi, nên phải gán
          qua LegacyScripts trước khi nạp file legacy. Không còn nạp edu-chrome.js
          (menu người dùng/chuông của HeaderBar) và chatbot.js — hai thứ đó đã gỡ. */}
      <LegacyScripts
        srcs={['/static/js/course_db_design.js']}
        globals={{
          COURSE_ID: courseId,
          USER_STREAK: 0,
          CURRENT_LESSON_IDX: 0,
          LESSON_URL: `/lesson/${courseId}`,
        }}
      />
    </>
  );
}
