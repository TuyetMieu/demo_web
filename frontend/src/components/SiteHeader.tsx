'use client';

import styles from './SiteHeader.module.css';

/**
 * Thanh đầu trang dùng chung cho trang chủ và các trang chi tiết khóa học.
 *
 * Thay cho cặp Sidebar + HeaderBar cũ: hai component đó dẫn tới Bảng điều khiển,
 * Diễn đàn, Xếp hạng, Cá nhân và "Đăng xuất" — tất cả đã bị gỡ — và còn gọi
 * main.js/edu-chrome.js để chạy. Ở đây chỉ còn đúng hai việc: về trang chủ
 * và đổi giao diện sáng/tối.
 *
 * Giao diện sáng/tối dùng cùng hợp đồng với script chống nháy ở layout gốc:
 * khóa localStorage `theme` và cặp class `dark`/`light` trên <body>.
 */
function toggleTheme() {
  const dark = !document.body.classList.contains('dark');
  document.body.classList.toggle('dark', dark);
  document.body.classList.toggle('light', !dark);
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch {
    /* chế độ riêng tư: vẫn đổi được cho phiên này */
  }
}

export default function SiteHeader() {
  return (
    <header className={styles.bar}>
      {/* <a> thường (tải lại trang): về trang chủ từ trang chi tiết khóa CSDL
          phải bỏ các script legacy course_db_design.js/edu-chrome.js đã nạp,
          client-side routing sẽ giữ chúng sống tiếp. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className={styles.brand} href="/" aria-label="Programming EDU — về trang chủ">
        <span className={styles.brandName}>Programming</span>
        <span className={styles.brandAccent}>EDU</span>
      </a>
      <button
        type="button"
        className={styles.theme}
        onClick={toggleTheme}
        aria-label="Đổi giao diện sáng / tối"
        title="Đổi giao diện"
      >
        {/* Cả hai biểu tượng nằm sẵn trong DOM, CSS ẩn/hiện theo body.dark —
            không phụ thuộc state nên không nháy lúc tải. */}
        <svg className={styles.moon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
        <svg className={styles.sun} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
      </button>
    </header>
  );
}
