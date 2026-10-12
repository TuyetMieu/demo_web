import type { Metadata } from 'next';

import { ALL_PRECEDENCES } from '@/components/PageStyles';
import { withAssetVersion } from '@/lib/assetVersion';

// Root layout TỐI THIỂU — không import CSS global nào ở đây.
// Mỗi page/layout con tự import ĐÚNG tổ hợp CSS của template gốc
// (MIGRATION_PLAN.md §4) để tránh class trùng tên giữa các file đè nhau.

export const metadata: Metadata = {
  title: 'Programming EDU',
  // Lighthouse SEO trên bản triển khai chấm 90 vì THIẾU meta description —
  // không trang nào có. Đặt ở layout gốc thì mọi route thừa hưởng; route nào
  // cần câu riêng (ví dụ trang bài học) tự khai lại `description` của nó.
  description:
    'Programming EDU — học lập trình Python, Java, HTML/CSS và thiết kế cơ sở dữ liệu '
    + 'bằng bài tập chạy ngay trong trình duyệt, có chấm tự động và theo dõi tiến độ.',
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
        {/* ── RÚT NGẮN ĐƯỜNG TẢI FONT ──────────────────────────────────────
            edu-theme.css dòng 14 nạp Poppins bằng `@import url(fonts.
            googleapis.com/...&display=swap)`. @import nằm BÊN TRONG một file
            tải qua <link>, nên trình duyệt chỉ biết tới nó sau khi đã tải và
            phân tích xong edu-theme.css: chuỗi phụ thuộc là HTML → edu-theme
            .css → CSS của Google Fonts → file .woff2. Với `display=swap`, chữ
            vẽ bằng font dự phòng trước rồi mới nhảy sang Poppins — mỗi nhịp
            chậm trong chuỗi đó là một nhịp dịch bố cục (CLS).

            preconnect: dựng sẵn DNS + TLS cho hai origin của Google Fonts.
            preload as=style: nổ phát yêu cầu file CSS của font NGAY khi phân
            tích HTML, song song với edu-theme.css thay vì phải chờ nó — lúc
            @import chạy tới thì đã có trong cache.

            Cả hai chỉ là gợi ý tải trước, KHÔNG áp style nào, nên không đổi
            giao diện. Sửa tận gốc (bỏ @import, đưa <link> font vào thẳng đây)
            phải sửa edu-theme.css — ngoài phạm vi lần này. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* no-page-custom-font là luật của Pages Router ("phải đặt trong
            pages/_document.js"). App Router thì layout gốc CHÍNH LÀ chỗ dùng
            chung cho mọi trang — đúng điều luật đòi — nên ở đây nó báo oan
            (7 chỗ khác trong repo cũng đang chịu cảnh báo này). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
        />
        {/* Origin backend cho pe-bridge.js — phải có TRƯỚC mọi script legacy */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PE_API_ORIGIN=${JSON.stringify(API_ORIGIN)};`,
          }}
        />
        {/* ── GHIM THỨ TỰ CÁC NHÓM CSS ──────────────────────────────────────
            React xếp nhóm `precedence` theo THỨ TỰ LẦN ĐẦU GẶP, không theo
            tên nhóm. Layout nhóm (base) nạp theme/auth/chatbot và PageStyles
            tự thêm edu-responsive vào đó, nên hạng 50 bị ghim ngay vị trí thứ
            4 — TRƯỚC style.css (12) và edu-theme.css (40). Hậu quả đo được:
            toàn bộ lớp co giãn bị đè, ở 390px sidebar vẫn rộng 272px thay vì
            thành ngăn kéo, ở 768px vẫn 272px thay vì rail 84px.

            Mấy thẻ <style> rỗng dưới đây đăng ký TRƯỚC mọi thứ khác, đúng thứ
            tự hạng, nên về sau file nào rơi vào hạng nào cũng nằm đúng chỗ.
            Chúng không chứa quy tắc nào nên không ảnh hưởng giao diện. */}
        {ALL_PRECEDENCES.map((p) => (
          <style key={p} href={`pe-anchor-${p}`} precedence={p}>
            {`/*${p}*/`}
          </style>
        ))}
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
              /* SPA: chỉ khối .page.active được hiện (style.css:449-450).
                 PHẢI giới hạn vào các tab của SPA Bảng điều khiển — nhận diện
                 bằng id="page-*" (page-dashboard, page-courses, page-roadmap…).
                 Nếu để trần `.page` thì luật này chạm cả /login và /register:
                 hai trang đó cũng bọc nội dung trong <div class="page"> nhưng
                 KHÔNG theo quy ước .active (auth.css/login.css chỉ đặt padding,
                 không hề có display:none) → form đăng nhập bị ẩn vĩnh viễn,
                 trang trắng trơn. Trang chi tiết khóa học dùng .page active sẵn
                 nên không phụ thuộc luật này. */
              '[id^="page-"].page{display:none}[id^="page-"].page.active{display:block}',
              /* tiện ích ẩn dùng khắp nơi (dashboard.css / chatbot.css) */
              '.hidden{display:none!important}.chatbot-hidden{display:none!important}',
              /* hộp thoại: ẩn bằng opacity+visibility, mở bằng .active
                 (dashboard.css .un-overlay/.streak-overlay, ChangePassword.css .cp-overlay) */
              '.un-overlay,.cp-overlay,.streak-overlay,.edu-rq-overlay{opacity:0;visibility:hidden}',
              '.un-overlay.active,.cp-overlay.active,.streak-overlay.active,.edu-rq-overlay.active{opacity:1;visibility:visible}',
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
        {/* hiệu ứng tương tác dùng chung (đốm sáng theo chuột, nghiêng thẻ, nút hút) */}
        <script src={withAssetVersion('/static/js/edu-fx.js')} defer />
      </body>
    </html>
  );
}
