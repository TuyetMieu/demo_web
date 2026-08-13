'use client';

// Brilliant-inspired re-skin — search/bell/avatar cluster, extracted from
// the old horizontal Topbar (now Sidebar.tsx) since the new layout puts
// the nav rail on the left and this cluster stays top-right of the
// content pane. Same ids as before (#search-wrap, #bell-wrap,
// #user-chip-wrap…) — main.js/dashboard.js keep driving them unchanged.
/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

// Cùng cơ chế với Sidebar.tsx (kể cả peGoTab để né lỗi Next.js ghép hash cũ
// vào hash mới) — điều kiện là CÓ div .page đích trong DOM, không phải "có
// hàm navigate" (xem giải thích dài ở Sidebar.tsx).
function goToPage(page: string) {
  const w = W();
  const hasSpaTarget =
    typeof document !== 'undefined' &&
    !!(document.getElementById(`page-${page}`) || document.getElementById('page-dashboard'));
  if (hasSpaTarget && typeof w.navigate === 'function') {
    w.navigate(page);
    return;
  }
  if (typeof w.peGoTab === 'function') w.peGoTab(page);
  else window.location.href = page === 'dashboard' ? '/dashboard' : `/dashboard#${page}`;
}

type HeaderBarProps = {
  // Trang ngoài SPA dashboard (vd. /courses/[id]) không nạp edu-dashboard.js
  // nên không gì đổ nội dung tiêu đề/streak/avatar theo trang — cho phép
  // trang gọi truyền sẵn giá trị đã có từ dữ liệu server-fetch của chính nó.
  // Bỏ trống thì giữ nguyên hành vi cũ (placeholder rồi JS của dashboard đổ vào).
  title?: string;
  subtitle?: string;
  userName?: string;
  streak?: number;
  /** Đang chờ API: hiện vệt xám nhấp nháy thay cho chữ, giữ NGUYÊN chiều cao
   *  khối tiêu đề nên header không nhảy khi dữ liệu về. */
  loading?: boolean;
  /** Ẩn hẳn chữ ở khối tiêu đề — dùng cho trang chi tiết khóa học: hero ngay
   *  bên dưới đã có tên khóa + phụ đề rồi, để cả hai là lặp chữ. Vẫn giữ khối
   *  rỗng làm khoảng đệm để cụm tìm kiếm/chuông/avatar bám mép phải như cũ. */
  hideTitle?: boolean;
};

export default function HeaderBar({ title, subtitle, userName, streak, loading, hideTitle }: HeaderBarProps) {
  const avatarInitial = userName ? userName.trim().charAt(0).toUpperCase() : undefined;
  return (
    <div className={hideTitle ? 'edu-header-bar edu-header-bar--notitle' : 'edu-header-bar'}>
      {/* Quy tắc ẩn mặc định của bảng thông báo / menu người dùng nằm trong CSS
          nội tuyến ở layout gốc (src/app/layout.tsx) cùng với các phần tử ẩn
          khác — xem chú thích dài ở đó. */}
      {/* Khối tiêu đề bên trái — design đặt H1 44px + phụ đề ngang hàng với
          cụm search/chuông/streak/avatar. edu-dashboard.js đổ nội dung theo
          trang đang mở (patch quanh navigate()); nếu trang truyền sẵn title/subtitle
          (trang ngoài SPA) thì dùng trực tiếp, khỏi cần JS. */}
      <div className="edu-head-titles">
        {hideTitle ? null : loading ? (
          <>
            <div className="edu-skel edu-skel--title" />
            <div className="edu-skel edu-skel--sub" />
          </>
        ) : (
          <>
            <h1 className="edu-page-title" id="edu-page-title">{title || 'Bảng điều khiển'}</h1>
            <p className="edu-page-sub" id="edu-page-sub">{subtitle || ''}</p>
          </>
        )}
      </div>

      {/* Cụm điều khiển là một nhóm flex riêng căn giữa theo chiều dọc — như
          design. Nếu để 4 control làm con trực tiếp của header (align-items:
          flex-start) thì chúng cao khác nhau nên tâm sẽ lệch nhau. */}
      <div className="edu-head-actions">
      <div className="search-wrap" id="search-wrap">
        <span className="search-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg></span>
        <input
          type="text"
          id="search-input"
          placeholder="Tìm kiếm..."
          // filterCourses/showSearchSuggestions chỉ tồn tại khi main.js được nạp
          // (trang SPA dashboard). Trang khác (vd. course detail) không có tìm
          // kiếm trực tiếp — giữ đúng hành vi cũ của trang đó: Enter điều hướng
          // sang /dashboard?q=... để tìm ở đó.
          onInput={() => { W().filterCourses?.(); W().showSearchSuggestions?.(); }}
          onFocus={() => W().showSearchSuggestions?.()}
          onClick={() => W().showSearchSuggestions?.()}
          onBlur={() => W().closeSearchSuggestions?.()}
          onKeyDown={(e) => {
            if (typeof W().filterCourses === 'function') return;
            const v = e.currentTarget.value.trim();
            if (e.key === 'Enter' && v) window.location.href = '/dashboard?q=' + encodeURIComponent(v);
          }}
          autoComplete="off"
        />
        <div className="search-suggestions hidden" id="search-suggestions">
          <div className="suggestions-header">Gợi ý tìm kiếm</div>
          <div className="suggestions-row" id="suggestions-row"></div>
          <div className="suggestions-header">Cấp độ học</div>
          <div className="suggestion-levels" id="suggestion-levels"></div>
        </div>
      </div>

      <div className="bell-wrap" id="bell-wrap">
        <button className="bell-btn" id="bell-btn" onClick={() => W().toggleBellPanel()} aria-haspopup="true" aria-expanded="false" aria-label="Thông báo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></svg>
          <span className="bell-dot" id="bell-dot"></span>
        </button>
        <div className="bell-panel" id="bell-panel" role="dialog" aria-label="Thông báo">
          <div className="bell-panel-header">
            <span className="bell-panel-title">🔔 Thông báo</span>
            <button className="bell-mark-all" onClick={() => W().markAllBellRead()}>Đánh dấu đã đọc</button>
          </div>
          <div className="bell-panel-body" id="bell-panel-body"></div>
        </div>
      </div>

      {/* Chuỗi ngày học — design để ngọn lửa + số ngay trước avatar */}
      <div className="edu-streak" id="edu-streak" title="Chuỗi ngày học">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /></svg>
        <span className="edu-streak-num" id="edu-streak-num">{streak ?? 0}</span>
      </div>

      <div className="user-chip-wrap" id="user-chip-wrap">
        <div className="user-chip" id="user-chip-btn" onClick={() => W().toggleUserMenu()} aria-haspopup="true" aria-expanded="false">
          <span className="chip-avatar" id="chip-avatar">{avatarInitial || '?'}</span>
          <span className="chip-name" id="chip-name">{userName || '—'}</span>
          <span className="dropdown-icon" id="chip-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg></span>
        </div>
        <div className="user-dropdown" id="user-dropdown" role="menu">
          <div className="user-dropdown-header">
            <span className="chip-avatar udh-avatar" id="udh-avatar">{avatarInitial || '?'}</span>
            <div>
              <div className="udh-name" id="udh-name">{userName || '—'}</div>
              <div className="udh-role">Học viên</div>
            </div>
          </div>
          <div className="user-dropdown-divider"></div>
          <button className="user-dropdown-item" onClick={() => { goToPage('profile'); W().closeUserMenu?.(); }} role="menuitem">
            <span className="udi-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span> Trang của tôi
          </button>
          <button className="user-dropdown-item" onClick={() => { goToPage('settings'); W().closeUserMenu?.(); }} role="menuitem">
            <span className="udi-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></span> Cài đặt
          </button>
          <div className="user-dropdown-divider"></div>
          <button className="user-dropdown-item danger" onClick={() => { window.location.href = '/auth/logout'; }} role="menuitem">
            <span className="udi-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg></span> Đăng xuất
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
