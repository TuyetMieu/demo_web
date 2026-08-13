import type { Metadata } from 'next';

// Root layout TỐI THIỂU — không import CSS global nào ở đây.
// Mỗi page/layout con tự import ĐÚNG tổ hợp CSS của template gốc
// (MIGRATION_PLAN.md §4) để tránh class trùng tên giữa các file đè nhau.

export const metadata: Metadata = {
  title: 'Programming EDU',
  icons: {
    // favicon rocket 🚀 y hệt base.html
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E",
  },
};

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Template gốc nào cũng có meta csrf-token; course_detail.js/course_db_design.js
            đọc .content KHÔNG guard → meta phải tồn tại (rỗng — auth giờ là JWT). */}
        <meta name="csrf-token" content="" />
        {/* Origin backend cho pe-bridge.js — phải có TRƯỚC mọi script legacy */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PE_API_ORIGIN=${JSON.stringify(API_ORIGIN)};`,
          }}
        />
        {/* ── CSS TỐI THIỂU, NỘI TUYẾN ──────────────────────────────────────
            Mọi thứ "ẩn mặc định" trong app này đều chỉ được ẩn bởi file CSS
            ngoài (/static/css/*). Các file đó nạp qua <link> nên có một khoảng
            trước khi áp — và trong khoảng đó TẤT CẢ bung ra cùng lúc. Đo được
            khi làm chậm CSS: trang Bảng điều khiển hiện đồng thời cả 8 khối
            .page (Khóa học, Lộ trình, Diễn đàn, Xếp hạng, Kỹ năng, Cá nhân,
            Cài đặt chồng lên nhau — đúng "màn hình HTML thô"), 3 hộp thoại
            (nhắc chuỗi học, đổi mật khẩu, hủy đăng ký) và toàn bộ khung chat
            mở bung.

            Chép lại đúng những quy tắc ẩn đó ở đây: style nội tuyến đi cùng
            HTML nên áp NGAY, không chờ mạng. File ngoài nạp sau sẽ ghi đè bằng
            chính quy tắc tương đương, nên không đổi hành vi lúc đã tải xong.
            Chỉ chép phần ẩn/hiện — không chép màu sắc, bố cục. */}
        <style
          dangerouslySetInnerHTML={{
            __html: [
              /* SPA: chỉ khối .page.active được hiện (style.css:449-450) */
              '.page{display:none}.page.active{display:block}',
              /* tiện ích ẩn dùng khắp nơi (dashboard.css / chatbot.css) */
              '.hidden{display:none!important}.chatbot-hidden{display:none!important}',
              /* hộp thoại: ẩn bằng opacity+visibility, mở bằng .active
                 (dashboard.css .un-overlay/.streak-overlay, ChangePassword.css .cp-overlay) */
              '.un-overlay,.cp-overlay,.streak-overlay{opacity:0;visibility:hidden}',
              '.un-overlay.active,.cp-overlay.active,.streak-overlay.active{opacity:1;visibility:visible}',
              /* bảng thông báo + menu người dùng, mở bằng .open (style.css:243/372) */
              '.bell-panel,.user-dropdown{opacity:0;visibility:hidden}',
              '.bell-panel.open,.user-dropdown.open{opacity:1;visibility:visible}',
            ].join(''),
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* ── Đặt chủ đề TRƯỚC khi vẽ ────────────────────────────────────
            Trước đây script này chỉ có ở layout nhóm (base), nên mọi trang
            nhóm (standalone) — chi tiết khóa học, bài học, đăng nhập… — vào
            với body KHÔNG có class chủ đề: vẽ ra nền SÁNG rồi tới khi JS cũ
            chạy applyTheme() mới đổi sang tối. Đo được: đang để chế độ tối,
            mở /courses/* thì nháy trắng gần 1 giây (tới ~950ms).

            Đặt cả `dark` LẪN `light`: applyTheme() trong course_detail.js /
            course_db_design.js bật tắt cả hai, và course_db_design.css có 53
            quy tắc gắn với `body.light`. Chỉ 3 file CSS của khóa CSDL dùng
            `body.light` nên thêm class này ở mọi trang không đổi gì chỗ khác.

            Phải nằm trong <body> (không phải <head>) vì cần document.body. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=localStorage.getItem('theme')==='dark';" +
              "document.body.classList.toggle('dark',d);" +
              "document.body.classList.toggle('light',!d);}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
