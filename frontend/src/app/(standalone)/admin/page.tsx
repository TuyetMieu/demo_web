'use client';

// Port admin.html — trang quản trị (restyle dark dashboard, script inline gốc giữ verbatim).
// Backend guard: mọi /api/admin/* yêu cầu role admin (403 nếu không) — giống
// @api_admin_required cũ; trang chỉ là shell gọi API.
import LegacyScripts from '@/components/LegacyScripts';
import PageStyles from '@/components/PageStyles';

/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

export default function AdminPage() {
  return (
    <>
      <PageStyles hrefs={['/static/css/theme.css', '/static/css/pages/admin.inline.css', '/static/css/edu-theme.css', '/static/css/edu-forms.css']} />
      <title>Quản trị | Programming EDU</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
      />

      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <span className="admin-topbar-icon" aria-hidden="true">🛠️</span>
          <h1>Quản trị khoá học</h1>
        </div>
        <a className="admin-back" href="/dashboard">← Về Dashboard</a>
      </header>

      <main className="wrap">
        {/* KHÓA HỌC — danh sách */}
        <section className="card area-course-table">
          <div className="card-head">
            <h2>Khóa học</h2>
            <p className="card-sub">Bấm vào một dòng để xem bài giảng của khóa.</p>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Id</th><th>Tiêu đề</th><th>Bài</th><th></th></tr></thead>
              <tbody id="courseRows"></tbody>
            </table>
          </div>
        </section>

        {/* KHÓA HỌC — form */}
        <section className="card form-box area-course-form">
          <h3 id="courseFormTitle">Thêm khóa học</h3>
          <div className="field">
            <label htmlFor="cId">Id</label>
            <input id="cId" placeholder="id (vd: python)" />
          </div>
          <div className="field">
            <label htmlFor="cTitle">Tiêu đề</label>
            <input id="cTitle" placeholder="Tiêu đề" />
          </div>
          <div className="field">
            <label htmlFor="cSubtitle">Phụ đề</label>
            <input id="cSubtitle" placeholder="Phụ đề" />
          </div>
          <div className="field">
            <label htmlFor="cDescription">Mô tả</label>
            <textarea id="cDescription" placeholder="Mô tả"></textarea>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="cLevel">Cấp độ</label>
              <input id="cLevel" placeholder="Cấp độ" />
            </div>
            <div className="field">
              <label htmlFor="cDuration">Thời lượng</label>
              <input id="cDuration" placeholder="Thời lượng" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="cTag">Tag</label>
              <input id="cTag" placeholder="Tag" />
            </div>
            <div className="field">
              <label htmlFor="cImage">Đường dẫn ảnh</label>
              <input id="cImage" placeholder="Đường dẫn ảnh" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="cColor">Màu (color)</label>
              <input id="cColor" placeholder="color" />
            </div>
            <div className="field">
              <label htmlFor="cAccentColor">Màu nhấn (accent_color)</label>
              <input id="cAccentColor" placeholder="accent_color" />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={() => W().saveCourse()}>Lưu</button>
            <button className="btn-ghost" onClick={() => W().resetCourseForm()}>Hủy</button>
          </div>
        </section>

        {/* BÀI GIẢNG — danh sách */}
        <section className="card area-lesson-table">
          <div className="card-head">
            <h2 id="lessonTitle">Bài giảng</h2>
          </div>
          <p className="hint" id="lessonHint">Chọn một khóa học để xem bài giảng.</p>
          <div className="table-scroll">
            <table>
              <thead><tr><th>#</th><th>Module</th><th>Tiêu đề</th><th></th></tr></thead>
              <tbody id="lessonRows"></tbody>
            </table>
          </div>
        </section>

        {/* BÀI GIẢNG — form */}
        <section className="card form-box area-lesson-form" id="lessonFormBox" style={{ display: 'none' }}>
          <h3 id="lessonFormTitle">Thêm bài giảng</h3>
          <div className="field">
            <label htmlFor="lModule">Module</label>
            <input id="lModule" placeholder="Module" />
          </div>
          <div className="field">
            <label htmlFor="lLessonTitle">Tiêu đề bài giảng</label>
            <input id="lLessonTitle" placeholder="Tiêu đề bài giảng" />
          </div>
          <div className="field">
            <label htmlFor="lContent">Nội dung</label>
            <textarea id="lContent" placeholder="Nội dung"></textarea>
          </div>
          <div className="field">
            <label htmlFor="lSort">Thứ tự</label>
            <input id="lSort" type="number" placeholder="Thứ tự" defaultValue={0} />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={() => W().saveLesson()}>Lưu</button>
            <button className="btn-ghost" onClick={() => W().resetLessonForm()}>Hủy</button>
          </div>
        </section>
      </main>

      <div id="toast"></div>

      <LegacyScripts srcs={['/static/js/pages/admin.inline.js']} />
    </>
  );
}
