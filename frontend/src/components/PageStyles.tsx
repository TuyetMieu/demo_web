// Nạp CSS byte-nguyên-xi từ /public/static/css qua <link> — đúng cơ chế Flask cũ:
// mỗi trang chỉ load ĐÚNG tổ hợp CSS của nó, đúng thứ tự; không qua bundler
// (CSS gốc có vài đoạn non-strict mà parser của Next từ chối, trình duyệt thì không).
//
// ── VÌ SAO DÙNG `precedence` ─────────────────────────────────────────────
// Đã thử hai cách trước, cách nào cũng hỏng một đầu:
//
//  1. <link> thuần trong JSX: SSR có sẵn thẻ nên lần tải đầu KHÔNG nhấp nháy,
//     nhưng khi đi client-side routing React gỡ HẾT thẻ của trang cũ rồi tạo
//     lại thẻ của trang mới — kể cả 6 file cả hai trang đều dùng. Thẻ mới phải
//     tải/parse lại nên có một nhịp không stylesheet nào được áp.
//
//  2. Tự tạo thẻ bằng JS trong useLayoutEffect: đi client-side thì mượt, nhưng
//     thẻ chỉ sinh ra SAU khi React chạy nên HTML máy chủ trả về KHÔNG có thẻ
//     CSS nào. Đo được: khung hình đầu vẽ lúc 368ms hoàn toàn trần, tới 786ms
//     style.css mới áp — gần 0,8 giây HTML thô mỗi lần tải trang.
//
// `precedence` (React 19) giải quyết cả hai: thẻ vẫn nằm trong JSX nên SSR có
// và chặn vẽ như thường; đồng thời React quản lý chúng như TÀI NGUYÊN TOÀN CỤC
// — gộp theo href và GIỮ LẠI khi component unmount, nên đổi trang không gỡ rồi
// tạo lại file dùng chung.
//
// Thứ tự trong <head> đi theo thứ tự các nhóm precedence được đăng ký. Nếu để
// tên nhóm theo từng trang thì trang nào nạp trước sẽ ghim thứ tự của nó, trang
// sau chèn lung tung. Nên dùng BẢNG HẠNG CỐ ĐỊNH dưới đây — hạng của một file
// là như nhau ở mọi trang, và mọi hạng đều được "ghim" sẵn trong layout gốc.
//
// Tem ?v= dùng chung với LegacyScripts — xem src/lib/assetVersion.ts.
import { withAssetVersion } from '@/lib/assetVersion';

/**
 * Thứ tự nạp toàn cục. Ràng buộc thật sự cần giữ:
 *   · theme/auth/style/dashboard/pages/dark-mode  TRƯỚC  edu-theme
 *   · edu-theme  TRƯỚC  mọi file edu-* còn lại (chúng đè lên token của nó)
 *   · course_db_design, lesson_db_design  TRƯỚC  edu-db
 * Những file không liệt kê ở đây rơi vào hạng mặc định (giữa nhóm gốc và nhóm
 * edu-*), đủ an toàn vì chúng đều là CSS riêng của một trang.
 */
const RANK: Record<string, number> = {
  'theme.css': 10,
  'auth.css': 11,
  'style.css': 12,
  'dashboard.css': 13,
  'pages.css': 14,
  'ChangePassword.css': 15,
  'skeleton.css': 16,
  'dark-mode.css': 17,
  'roadmap.css': 18,
  'login.css': 19,
  'register.css': 20,
  'questionaire.css': 21,
  'lesson.css': 22,
  'lesson_db_design.css': 23,
  'chatbot.css': 24,
  'course_detail.css': 25,
  'course_db_design.css': 26,
  // các file pages/*.inline.css → 30 (mặc định)
  'edu-theme.css': 40,
  'edu-dashboard.css': 41,
  'edu-course-detail.css': 42,
  'edu-db.css': 43,
  'edu-lesson.css': 44,
  'edu-auth.css': 45,
  'edu-forms.css': 46,
  'edu-card.css': 47,
  'edu-landing.css': 48,
  // hộp thoại bài ôn tập — sau edu-dashboard.css vì dùng lại token/nút của nó
  'edu-review-quiz.css': 49,
  // lớp co giãn điện thoại/tablet — PHẢI cuối cùng, xem RESPONSIVE_CSS bên dưới
  'edu-responsive.css': 50,
};
const DEFAULT_RANK = 30;

/**
 * Lớp co giãn dùng chung, tự thêm vào MỌI trang.
 *
 * Không liệt kê trong `hrefs` của từng trang vì đây là quy tắc toàn cục: bỏ
 * sót một trang là trang đó vỡ trên điện thoại, mà 18 chỗ gọi PageStyles thì
 * rất dễ sót khi thêm trang mới. Gom về một chỗ để không thể quên.
 */
const RESPONSIVE_CSS = '/static/css/edu-responsive.css';

/** Tên nhóm precedence — React xếp <head> theo thứ tự nhóm được đăng ký. */
export function cssPrecedence(href: string): string {
  const file = href.split('/').pop() || href;
  const rank = RANK[file] ?? DEFAULT_RANK;
  return `pe${String(rank).padStart(3, '0')}`;
}

/** Mọi hạng có thể có — layout gốc ghim sẵn theo đúng thứ tự này. */
export const ALL_PRECEDENCES: string[] = Array.from(
  new Set([...Object.values(RANK), DEFAULT_RANK]),
)
  .sort((a, b) => a - b)
  .map((r) => `pe${String(r).padStart(3, '0')}`);

export default function PageStyles({ hrefs }: { hrefs: string[] }) {
  // Lọc trùng phòng khi một trang đã tự liệt kê file co giãn.
  const all = hrefs.includes(RESPONSIVE_CSS) ? hrefs : [...hrefs, RESPONSIVE_CSS];
  return (
    <>
      {all.map((href) => (
        <link
          key={href}
          rel="stylesheet"
          href={withAssetVersion(href)}
          precedence={cssPrecedence(href)}
        />
      ))}
    </>
  );
}
