'use client';

// Port course_detail.html (khóa python/java/htmlcss/cpp) — nay dùng chung khung
// Sidebar+HeaderBar với dashboard (Brilliant redesign, xem Programming EDU.dc.html
// màn isCourse) thay cho .topbar riêng trước đây. Cơ chế DỮ LIỆU giữ NGUYÊN:
// Flask cũ render Jinja server-side với CURRICULA + enrollment; bản Next fetch
// /api/courses + /api/enrolled + /api/stats + /api/user rồi tính trạng thái
// done/current/locked ĐÚNG logic main.py (curricula.json xuất nguyên văn từ
// CURRICULA). Design chỉ có 3 khối (Nội dung khóa học/Tiến độ/Bạn sẽ học được) —
// các khối khác (Tổng quan, Yêu cầu, Đánh giá, Quiz ôn tập) không có trong design
// nhưng là tính năng thật nên GIỮ NGUYÊN, chỉ đổi khung .cd-block cho khớp thẻ
// kính mờ mới (xem course_detail.css).
// LƯU Ý: 3 khóa db_design* có route tĩnh riêng (courses/db_design*/page.tsx)
// vì tổ hợp CSS khác (course_db_design.css đè 63 class trùng tên).

import PageStyles from '@/components/PageStyles';
import { use, useEffect, useState } from 'react';

import Chatbot from '@/components/Chatbot';
import HeaderBar from '@/components/HeaderBar';
import LegacyScripts from '@/components/LegacyScripts';
import PeRouterBridge from '@/components/PeRouterBridge';
import Sidebar from '@/components/Sidebar';
import { apiFetch, asList, findEnrollment } from '@/lib/api';
import CURRICULA_JSON from '@/lib/curricula.json';

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
const W = () => window as any;

type Curriculum = {
  requirements?: string[];
  skills?: string[];
  instructor?: string;
  modules?: { title: string; lessons: string[] }[];
};
const CURRICULA = CURRICULA_JSON.CURRICULA as Record<string, Curriculum>;
const LESSON_URLS = CURRICULA_JSON.LESSON_URLS as Record<string, string>;

type LessonRow = { title: string; status: 'done' | 'current' | 'locked'; index: number };
type ModuleRow = { title: string; lessons: LessonRow[]; done_count: number; total: number; has_current: boolean };

const RATE_LABELS: Record<number, string> = {
  0.5: 'Quá tệ', 1: 'Rất tệ', 1.5: 'Tệ', 2: 'Không tốt',
  2.5: 'Tạm được', 3: 'Bình thường', 3.5: 'Khá ổn',
  4: 'Tốt', 4.5: 'Rất tốt', 5: 'Xuất sắc! 🎉',
};

/**
 * Ô chấm sao — do React giữ, KHÔNG còn do course_detail.js.
 *
 * File legacy gắn sự kiện trong một IIFE chạy đúng một lần lúc nạp; từ khi
 * điều hướng đi client-side, mở khóa học thứ hai là React thay hết node mà
 * IIFE không chạy lại nên các ngôi sao thành trơ, bấm không lên điểm.
 *
 * Tách riêng để trang cha gắn key={courseId}: đổi khóa là React dựng lại từ
 * đầu, điểm của khóa trước không dính sang khóa sau — không cần effect nào
 * đi xóa state (kiểu đó gây render dây chuyền).
 */
function StarRating() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || rating;
  // Nửa trái ngôi sao = nửa điểm (giữ đúng hành vi cũ)
  const half = (e: React.MouseEvent<HTMLDivElement>, i: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? i - 0.5 : i;
  };
  return (
    <>
      <div className="star-interactive" id="starInteractive" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            className={`si-star${shown >= i ? ' star-full' : shown >= i - 0.5 ? ' star-half' : ''}`}
            data-star={i}
            key={i}
            onMouseMove={(e) => setHover(half(e, i))}
            onClick={(e) => setRating(half(e, i))}
          >★</div>
        ))}
      </div>
      <div className="user-rate-val" id="userRateVal">
        {rating ? `${rating} ★  ${RATE_LABELS[rating] || ''}` : '—'}
      </div>
    </>
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // db_design* không vào route này (đã có route tĩnh) — guard giống main.py
    (async () => {
      try {
        // apiFetch (không phải fetch tương đối): pe-bridge chưa nạp ở thời điểm này
        const [courses, enrolled, stats, user]: any[] = await Promise.all([
          apiFetch('/api/courses').then((r) => (r.ok ? r.json() : [])),
          apiFetch('/api/enrolled').then((r) => (r.ok ? r.json() : [])),
          apiFetch('/api/stats').then((r) => (r.ok ? r.json() : {})),
          apiFetch('/api/user').then((r) => (r.ok ? r.json() : {})),
        ]);
        // Backend trả dạng BỌC ({ok, courses:[...]}, {ok, enrolled:[...]}), không
        // phải mảng trần. Kiểm tra Array.isArray thẳng vào response luôn sai:
        // course thành null và trang tự chuyển hướng về dashboard — nghĩa là
        // KHÔNG khoá học nào (ngoài db_design*) mở được trang chi tiết.
        const course = asList<any>(courses, 'courses').find((c) => c.id === courseId) ?? null;
        if (!course) {
          window.location.replace('/dashboard');
          return;
        }
        const enrollment = findEnrollment(asList(enrolled, 'enrolled'), courseId);
        // /api/stats trả trường `streak` (không phải `streakDays`).
        // Kèm courseId để biết dữ liệu này thuộc khóa nào (xem chỗ dựng skeleton).
        setData({ courseId, course, enrollment, streak: stats.streak ?? 0, userName: user.name || '—' });
      } catch {
        window.location.replace('/login');
      }
    })();
  }, [courseId]);

  // Cuộn tới bài đang học — cùng lý do với ô chấm sao: IIFE trong
  // course_detail.js chỉ chạy lúc nạp file, mở khóa thứ hai không chạy lại.
  useEffect(() => {
    if (!data) return;
    const el = document.getElementById('current-lesson');
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
    return () => clearTimeout(t);
  }, [data]);

  // Tên khóa cho tab trình duyệt. Thẻ <title> trong JSX KHÔNG ăn: metadata của
  // Next ở layout gốc (title: 'Programming EDU') đè lên, đo được tab luôn là
  // "Programming EDU". Từ khi bỏ tên khóa khỏi header thì tab là chỗ duy nhất
  // còn cho biết đang mở khóa nào, nên đặt thẳng document.title.
  useEffect(() => {
    if (!data?.course) return;
    document.title = `${data.course.title} – Programming EDU`;
  }, [data]);

  // `data.courseId !== courseId`: đổi khóa bằng client-side routing thì
  // component KHÔNG unmount, `data` vẫn giữ khóa cũ cho tới khi fetch mới xong
  // — không chặn ở đây sẽ thấy nội dung khóa vừa rời trong khoảng chờ đó.
  //
  // KHÔNG return sớm ở đây. Bản trước trả về một <div> skeleton trần, tức là
  // bỏ qua cả PageStyles/Sidebar/HeaderBar: mọi thẻ <link> CSS bị gỡ (đo được
  // 0 thẻ), sidebar và header biến mất → đúng khoảng trắng toàn màn hình mà
  // người dùng thấy khi bấm vào một khóa học. Giờ khung ngoài luôn được dựng,
  // chỉ vùng nội dung đổi thành vệt chờ.
  const loading = !data || data.courseId !== courseId;
  const course = data?.course;
  const enrollment = data?.enrollment;
  const streak = data?.streak ?? 0;
  const userName = data?.userName;

  const curriculum = CURRICULA[courseId] || {};
  const completed = enrollment ? enrollment.completedLessons || 0 : 0;
  const lessonUrl = LESSON_URLS[courseId] || `/lesson/${courseId}`;
  const progress = enrollment ? enrollment.progress || 0 : 0;

  // Port vòng tính status của main.py course_detail()
  let flatIdx = 0;
  const modules: ModuleRow[] = (curriculum.modules || []).map((module) => {
    const lessons: LessonRow[] = module.lessons.map((title) => {
      const status: LessonRow['status'] =
        flatIdx < completed ? 'done' : flatIdx === completed ? 'current' : 'locked';
      return { title, status, index: flatIdx++ };
    });
    const done_count = lessons.filter((l) => l.status === 'done').length;
    return {
      title: module.title,
      lessons,
      done_count,
      total: lessons.length,
      has_current: lessons.some((l) => l.status === 'current'),
    };
  });

  const totalLessons = course?.lessons || 0;
  const ratingFill = Math.round(((course?.rating || 0) / 5) * 1000) / 10;
  const image = `/${(course?.image || '').replace(/^static\//, 'static/')}`;
  const outcomes = curriculum.skills || [];

  return (
    <>
      <PageStyles hrefs={["/static/css/style.css","/static/css/dashboard.css","/static/css/pages.css","/static/css/dark-mode.css","/static/css/chatbot.css","/static/css/course_detail.css","/static/css/edu-theme.css","/static/css/edu-dashboard.css","/static/css/edu-course-detail.css"]} />
      <title>{course ? `${course.title} – Programming EDU` : 'Programming EDU'}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <PeRouterBridge />
      <Sidebar activePage="courses" />

      <div id="main">
        {/* hideTitle: hero ngay bên dưới đã có tên khóa + phụ đề, để cả ở header
            nữa là hiện y hệt hai lần chồng nhau. Tên khóa vẫn đặt ở <title> nên
            tab trình duyệt không mất thông tin. */}
        <HeaderBar userName={userName} streak={streak} hideTitle />

        <div className="page active">
          {/* Quay lại danh sách khóa học — đi qua peGo nên vẫn là client-side,
              không nạp lại trang. main.js đọc hash lúc khởi tạo lại để mở đúng
              tab Khóa học (xem _peInitMain). */}
          <button type="button" className="edu-cd-back" onClick={() => W().peGoTab('courses')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            <span>Tất cả khóa học</span>
          </button>
          {loading ? (
            /* Vệt chờ dựng theo đúng bố cục thật (2 cột, hero 218px, các khối
               bên dưới) nên khi dữ liệu về nội dung điền vào chỗ cũ, không xô đẩy. */
            <div className="edu-cd-grid" aria-busy="true">
              <div className="edu-cd-main">
                <div className="edu-skel" style={{ height: 218 }} />
                <div className="edu-skel" style={{ height: 320 }} />
                <div className="edu-skel" style={{ height: 150 }} />
              </div>
              <div className="edu-cd-side">
                <div className="edu-skel" style={{ height: 300 }} />
                <div className="edu-skel" style={{ height: 200 }} />
              </div>
            </div>
          ) : (
          <div className="edu-cd-grid">
            {/* ── Cột trái ── */}
            <div className="edu-cd-main">
              {/* Hero */}
              <div className="edu-cd-hero">
                <div className="edu-cd-hero-info">
                  <span className="edu-cd-tag">{[course.tag, course.level].filter(Boolean).join(' · ')}</span>
                  <h2 className="edu-cd-title">{course.title}</h2>
                  <p className="edu-cd-subtitle">{course.subtitle}</p>
                  {enrollment && (
                    <div className="edu-cd-hero-cta">
                      <button type="button" className="edu-cd-btn primary" onClick={() => W().goLesson()}>▶ Tiếp tục học</button>
                    </div>
                  )}
                </div>
                <div className="edu-cd-hero-art">
                  <img src={image} alt={course.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              </div>

              {/* Block: Nội dung khóa học (Giáo trình) */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📚</div>
                  <h3>Nội dung khóa học</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--edu-t4)' }}>
                    {modules.length} module · {course.lessons} bài học
                  </span>
                </div>
                <div className="cd-block-body" style={{ paddingTop: 10 }}>
                  {modules.map((module, mi) => {
                    const open = module.has_current || mi === 0;
                    return (
                      <div className="edu-cd-module" key={mi}>
                        <div className={`edu-cd-module-hd ${open ? 'open' : ''}`} onClick={(e) => W().toggleModule(e.currentTarget)}>
                          <div className="edu-cd-module-arrow">▶</div>
                          <div className="edu-cd-module-name">{module.title}</div>
                          <div className="edu-cd-module-meta">{module.total} bài</div>
                          {enrollment && module.done_count > 0 && (
                            <div className="edu-cd-module-prog" style={{ marginLeft: 8 }}>{module.done_count}/{module.total} ✓</div>
                          )}
                        </div>
                        <div className={`edu-cd-module-body ${open ? 'open' : ''}`}>
                          <div className="edu-cd-lesson-list">
                            {module.lessons.map((lesson) => (
                              <div
                                className={`edu-cd-lesson ${lesson.status}`}
                                key={lesson.index}
                                id={lesson.status === 'current' ? 'current-lesson' : undefined}
                                data-clickable={lesson.status !== 'locked' ? '1' : undefined}
                                onClick={
                                  lesson.status !== 'locked'
                                    ? () => { window.location.href = `${lessonUrl}?lesson=${lesson.index}`; }
                                    : undefined
                                }
                              >
                                <div className="edu-cd-lesson-icon">
                                  {lesson.status === 'done' ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                  ) : (
                                    lesson.index + 1
                                  )}
                                </div>
                                <div className="edu-cd-lesson-body">
                                  <div className="edu-cd-lesson-title">{lesson.title}</div>
                                  <div className="edu-cd-lesson-meta">Bài {lesson.index + 1}</div>
                                </div>
                                {lesson.status === 'current' && <span className="edu-cd-lesson-badge">Tiếp tục</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Block: Tổng quan */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📋</div>
                  <h3>Tổng quan khóa học</h3>
                </div>
                <div className="cd-block-body">
                  <p className="cd-desc">{course.description}</p>
                </div>
              </div>

              {/* Block: Yêu cầu */}
              <div className="cd-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">📌</div>
                  <h3>Yêu cầu</h3>
                </div>
                <div className="cd-block-body">
                  <ul className="cd-req-list">
                    {(curriculum.requirements || []).map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Block: Đánh giá */}
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
                        <div className="star-avg-fill" style={{ width: `${ratingFill}%` }}>★★★★★</div>
                      </div>
                    </div>
                    <div className="score">{course.rating}</div>
                    <div className="avg-label">Đánh giá trung bình</div>

                    <div className="user-rate-section">
                      <div className="user-rate-label">Đánh giá của bạn:</div>
                      <StarRating key={courseId} />
                    </div>

                    <div className="coming-soon-note">Tính năng lưu đánh giá đang được phát triển. Hãy quay lại sau!</div>
                  </div>
                </div>
              </div>

              {/* Block: Quiz ôn tập (FE-06) */}
              <div className="cd-block" id="review-quiz-block">
                <div className="cd-block-hd">
                  <div className="cd-block-icon">🧠</div>
                  <h3>Quiz ôn tập</h3>
                </div>
                <div className="cd-block-body">
                  {enrollment && completed >= 5 ? (
                    <>
                      <div id="quiz-idle">
                        <p>Ôn lại kiến thức đã học bằng 5-10 câu random từ các bài bạn đã hoàn thành.</p>
                        <button type="button" className="quiz-btn primary" onClick={() => W().startReviewQuiz(course.id)}>Bắt đầu ôn tập</button>
                      </div>
                      <div id="quiz-runner" style={{ display: 'none' }}></div>
                    </>
                  ) : (
                    <p className="cd-locked-note">🔒 Hoàn thành ít nhất 5 bài học để mở khóa quiz ôn tập.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Cột phải ── */}
            <div className="edu-cd-side">
              {/* Đăng ký / tiến độ */}
              <div className="edu-cd-card">
                <div className="edu-cd-price">Miễn phí</div>
                <div className="edu-cd-price-free">🎉 Hoàn toàn không mất phí</div>

                {enrollment ? (
                  <>
                    <div className="edu-cd-progress-row">
                      <div className="edu-cd-progress-top">
                        <span className="edu-cd-progress-pct">{progress}%</span>
                        <span className="edu-cd-progress-frac">{completed}/{totalLessons} bài</span>
                      </div>
                      <div className="edu-cd-progress-bar">
                        <div className="edu-cd-progress-fill" id="prog-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>

                    <div className="edu-cd-stats">
                      <div className="edu-cd-stat">
                        <div className="v">{completed}</div>
                        <div className="l">Bài đã học</div>
                      </div>
                      <div className="edu-cd-stat">
                        <div className="v">{totalLessons - completed}</div>
                        <div className="l">Còn lại</div>
                      </div>
                      <div className="edu-cd-stat">
                        <div className="v">{enrollment.timeSpent || '0h'}</div>
                        <div className="l">Đã học</div>
                      </div>
                      <div className="edu-cd-stat">
                        <div className="v">{streak}</div>
                        <div className="l">🔥 Streak</div>
                      </div>
                    </div>

                    <button type="button" className="edu-cd-btn primary" style={{ width: '100%', marginTop: 18 }} onClick={() => W().goLesson()}>▶ Tiếp tục học</button>
                    <button type="button" className="edu-cd-unenroll" id="unenroll-btn" onClick={() => W().unenroll()}>Hủy đăng ký</button>
                  </>
                ) : (
                  <button type="button" className="edu-cd-btn primary" style={{ width: '100%', marginTop: 18 }} id="enroll-btn" onClick={() => W().enroll()}>
                    Đăng ký ngay – Miễn phí
                  </button>
                )}

                <div className="edu-cd-includes">
                  <div className="edu-cd-includes-title">KHÓA HỌC BAO GỒM</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-book-open"></i> {course.lessons} bài học</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-clock"></i> {course.duration}</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-infinity"></i> Truy cập vĩnh viễn</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-certificate"></i> Chứng chỉ hoàn thành</div>
                  <div className="edu-cd-inc-item"><i className="fas fa-mobile-alt"></i> Học trên mọi thiết bị</div>
                </div>
              </div>

              {/* Bạn sẽ học được — chuyển từ khối "Kỹ năng đạt được" cũ vào sidebar,
                  đúng vị trí/khung của design; ẩn hẳn thay vì hiện thẻ trống khi
                  khóa không có curriculum.skills. */}
              {outcomes.length > 0 && (
                <div className="edu-cd-card">
                  <div className="edu-cd-card-title">Bạn sẽ học được</div>
                  <div className="edu-cd-outcomes">
                    {outcomes.map((skill, i) => (
                      <div className="edu-cd-outcome" key={i}>
                        <div className="edu-cd-outcome-dot"></div>
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      <Chatbot />
      {/* Globals cho course_detail.js — thay inline script Jinja của template gốc.
          <script> trong JSX không bao giờ được React thực thi (client component),
          nên gán qua LegacyScripts trước khi nạp file legacy.
          Chỉ nạp khi đã có dữ liệu: COURSE_ID/LESSON_URL phải đúng khóa. */}
      {!loading && (
        <LegacyScripts
          srcs={['/static/js/edu-chrome.js', '/static/js/course_detail.js', '/static/js/review_quiz.js', '/static/js/chatbot.js']}
          globals={{
            COURSE_ID: course.id,
            CURRENT_LESSON_IDX: completed,
            LESSON_URL: lessonUrl,
          }}
        />
      )}
    </>
  );
}
