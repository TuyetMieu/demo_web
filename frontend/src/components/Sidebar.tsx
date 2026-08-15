'use client';

import { useEffect, useState } from 'react';

// Brilliant-inspired re-skin (Programming EDU.dc.html) — vertical nav rail
// replacing the old horizontal Topbar. Reuses main.js's exact contract:
// #topbar-nav wraps .nav-btn[data-page] buttons, #nav-underline exists
// (hidden via edu-theme.css) so navigate()/_updateNavUnderline() keep
// working untouched. #topbar-title / .sub are visually-hidden housekeeping
// nodes for the same reason. Visual chrome lives in edu-theme.css.
/* eslint-disable @typescript-eslint/no-explicit-any */
const W = () => window as any;

// Trang ngoài SPA dashboard (vd. /courses/[id]) không có các div .page nên
// phải điều hướng thật sang /dashboard kèm hash — main.js đọc hash đó lúc
// DOMContentLoaded (main.js:1978-1982) để mở đúng tab.
//
// Điều kiện phải là "CÓ div đích trong DOM", KHÔNG phải "có hàm navigate".
// Khi đi bằng client-side routing, main.js đã nạp từ lượt ghé dashboard trước
// vẫn nằm nguyên trên window ở mọi route sau đó, nên kiểm tra typeof navigate
// luôn đúng — và navigate() chạy trên trang chi tiết khóa học sẽ ném
// "Cannot read properties of null (reading 'classList')" vì không có
// #page-dashboard, khiến bấm nút Sidebar không đi đâu cả.
function goToPage(page: string) {
  const w = W();
  const hasSpaTarget =
    typeof document !== 'undefined' &&
    !!(document.getElementById(`page-${page}`) || document.getElementById('page-dashboard'));
  if (hasSpaTarget && typeof w.navigate === 'function') {
    w.navigate(page);
    return;
  }
  // peGoTab (edu-chrome.js): về /dashboard rồi mở đúng tab qua biến toàn cục,
  // KHÔNG qua hash trên URL — router.push('/dashboard#tab') của Next ghép hash
  // cũ vào hash mới khi trang hiện tại đến từ một lượt client-side trước đó
  // (đo được: bấm 2 lần liên tiếp ra URL "/dashboard#courses#courses" và dừng
  // ở tab Bảng điều khiển thay vì đúng tab). Rơi về điều hướng thường (còn hash
  // trên URL, đọc đúng vì đây LÀ lượt nạp lại trang thật) nếu bridge chưa mount.
  if (typeof w.peGoTab === 'function') w.peGoTab(page);
  else window.location.href = page === 'dashboard' ? '/dashboard' : `/dashboard#${page}`;
}

const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
  ),
  courses: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>
  ),
  roadmap: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>
  ),
  forum: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  ),
  leader: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
  ),
  profile: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  admin: <span className="nav-icon">🛠️</span>,
};

const NAV_ITEMS: { page: string; label: string }[] = [
  { page: 'dashboard', label: 'Bảng điều khiển' },
  { page: 'courses', label: 'Khóa học' },
  { page: 'roadmap', label: 'Lộ trình' },
  { page: 'forum', label: 'Diễn đàn' },
  { page: 'leader', label: 'Xếp hạng' },
  { page: 'profile', label: 'Cá nhân' },
];

export default function Sidebar({ activePage = 'dashboard' }: { activePage?: string }) {
  // Ngăn kéo (drawer) chỉ tồn tại ở khổ điện thoại — xem edu-responsive.css.
  // Dùng state của React thay vì biến toàn cục như phần lớn code cũ: component
  // này đã là 'use client', và mọi trang đều dựng lại nó nên không có trạng
  // thái nào phải đồng bộ xuyên trang.
  const [navOpen, setNavOpen] = useState(false);

  // Khoá cuộn nền khi ngăn kéo mở, nếu không nền vẫn cuộn dưới lớp phủ.
  // Đọc/ghi thẳng body.style thay vì thêm class: các file CSS cũ không có
  // quy ước nào cho việc này nên thêm class mới dễ bị luật khác đè.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onEsc);
    };
  }, [navOpen]);

  // Điều hướng xong phải đóng ngăn kéo: trên SPA dashboard việc đổi tab KHÔNG
  // làm component này unmount, nên nếu không đóng tay thì ngăn kéo che luôn
  // trang vừa mở.
  const go = (page: string) => { goToPage(page); setNavOpen(false); };

  return (
    <>
      <span id="sidebar-name" style={{ display: 'none' }}>—</span>
      <span id="sidebar-role" style={{ display: 'none' }}>Học viên</span>

      {/* Thanh trên cùng CHỈ hiện ở khổ điện thoại (CSS ẩn từ tablet trở lên):
          logo + nút ba gạch, đúng bố cục bản thiết kế mobile. */}
      <div className="edu-mobile-bar">
        <div
          className="edu-mobile-brand"
          onClick={() => go('dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') go('dashboard'); }}
        >
          <span className="edu-mobile-brand-c1">Programming</span>
          <span className="edu-mobile-brand-c2">EDU</span>
        </div>
        <button
          type="button"
          className="edu-burger"
          aria-label="Mở menu điều hướng"
          aria-expanded={navOpen}
          aria-controls="topbar-nav"
          onClick={() => setNavOpen(true)}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Lớp phủ sau ngăn kéo — bấm ra ngoài để đóng */}
      <div
        className={`edu-nav-backdrop${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      <div className={`topbar edu-sidebar-shell${navOpen ? ' edu-nav-open' : ''}`}>
        {/* Không còn nút đóng (dấu X) riêng trong ngăn kéo — thừa vì đã có
            .edu-nav-backdrop (bấm ra ngoài để đóng, xem onClick bên trên) và
            trước đây nó đè lên đúng chỗ tên thương hiệu "Programming EDU". */}

        <div className="topbar-left">
          <div
            className="brand brand-always"
            onClick={() => { go('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ cursor: 'pointer' }}
            title="Về trang chủ"
          >
            <span className="brand-title brand-full"><span className="brand-c1">Programming</span> <span className="brand-c2">EDU</span></span>
            <span className="brand-title brand-short">PE</span>
          </div>
        </div>

        <nav className="topbar-nav" role="navigation" aria-label="Main navigation" id="topbar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              className={`nav-btn${item.page === activePage ? ' active' : ''}`}
              data-page={item.page}
              onClick={() => go(item.page)}
              aria-label={item.label}
            >
              <span className="nav-icon">{NAV_ICONS[item.page]}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button className="nav-btn" id="nav-admin" style={{ display: 'none' }} onClick={() => { window.location.href = '/admin'; }} aria-label="Quản trị">
            <span className="nav-icon">{NAV_ICONS.admin}</span><span>Quản trị</span>
          </button>
          <span className="nav-underline" id="nav-underline"></span>
        </nav>

        <span id="topbar-title"></span>
        <span className="sub"></span>

        <div className="sidebar-bottom-links">
          {/* Nút hiện HÀNH ĐỘNG sẽ xảy ra khi bấm, đúng như hai bản design:
              đang sáng → 🌙 "Chế độ tối"; đang tối → ☀️ "Chế độ sáng".
              Cả hai cặp icon+chữ đều nằm sẵn trong DOM, CSS ẩn/hiện theo lớp
              `body.dark` — không JS nào đồng bộ. Quan trọng vì app có tới 3
              hàm toggleTheme (main.js, course_detail.js, course_db_design.js);
              làm bằng JS sẽ phải sửa cả 3 và dễ lệch. Cách này cũng không
              nháy lúc tải vì script chống FOUC đã set class trước hydrate. */}
          <button type="button" className="edu-bottom-link edu-theme-toggle" id="theme-toggle" onClick={() => W().toggleTheme()} title="Đổi giao diện" aria-label="Đổi giao diện sáng / tối">
            <svg className="edu-tt-ico edu-tt-ico--moon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            <svg className="edu-tt-ico edu-tt-ico--sun" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
            <span className="edu-tt-txt edu-tt-txt--toDark">Chế độ tối</span>
            <span className="edu-tt-txt edu-tt-txt--toLight">Chế độ sáng</span>
          </button>
          <button type="button" className="nav-btn" data-page="settings" onClick={() => go('settings')}>
            <span className="nav-icon">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
            </span>
            <span>Cài đặt</span>
          </button>
          <a className="edu-bottom-link" href="/auth/logout">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
            <span>Đăng xuất</span>
          </a>
        </div>
      </div>
    </>
  );
}
