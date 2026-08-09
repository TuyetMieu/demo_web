# UI_PARITY_CHECKLIST.md — đối chiếu bằng mắt Flask ↔ bản mới

> Giai đoạn 5. Mở 2 tab cạnh nhau: Flask (`python app.py` → :9000) và bản mới
> (backend Django :9000* + `python frontend/serve.py` → :3000). So từng trang, cả LIGHT và DARK
> theme, ở 1600px và 960px. CSS là bản copy byte-identical nên lệch nếu có sẽ
> đến từ markup/JS — ghi lại mọi khác biệt vào cột Ghi chú.
>
> *Chạy đối chiếu: Flask đổi sang cổng khác (ví dụ `PORT=9001`) để 2 backend
> không giành cổng, hoặc so lần lượt.

Đăng nhập cùng 1 tài khoản ở cả 2 bản (chung DB nên số liệu phải Y HỆT).

| # | Trang cũ (Flask :9000) | Trang mới (tĩnh :3000) | Điểm phải giống | ☐ |
|---|---|---|---|---|
| 1 | `/` | `/` | Hero neon, particles, 4 stat (số khóa/giờ từ API), grid 6 project card, CTA cuối | ☐ |
| 2 | `/login` | `/login` | Split 50/50, particles rơi, toggle mắt, overlay success khi login, toast lỗi sai mật khẩu, lỗi field đỏ | ☐ |
| 3 | `/register` | `/register` | Form 4 field + validate lỗi từng field, brand canvas phải | ☐ |
| 4 | `/dashboard` (tab Dashboard) | `/dashboard` | Hero chào tên, lịch tuần streak, mini-roadmap mermaid, BXH 3 tab, tiến độ học | ☐ |
| 5 | `/dashboard` → nav Khóa học | như cũ | Grid card khóa, search + hint pills, filter cấp độ/ngôn ngữ, sort | ☐ |
| 6 | `/dashboard` → nav Lộ trình | như cũ | Tabbar pin, flow spine, canvas cá nhân kéo-thả, browse drawer 26 lộ trình | ☐ |
| 7 | `/dashboard` → Kỹ năng (từ profile) | như cũ | sk-grid theo module, progress % từng skill | ☐ |
| 8 | `/dashboard` → nav Diễn đàn | như cũ | Create box inline, 3 tab loại, react 6 cảm xúc, reply lồng 1 cấp | ☐ |
| 9 | `/dashboard` → Cài đặt | như cũ | Form profile, 4 toggle thông báo, modal đổi mật khẩu (strength bar) | ☐ |
| 10 | `/dashboard` → Trang của tôi | như cũ | Hero avatar, 5 stat card, XP bar chart, bài đăng | ☐ |
| 11 | `/questionaire` | `/questionaire` | 10 step, progress bar, sub-question hiện khi chọn "Có", modal cảm ơn | ☐ |
| 12 | `/interface` | `/interface` | Drag 4 khối, compiler panel, confetti khi đúng, +gems cập nhật, modal | ☐ |
| 13 | `/lesson/python` | `/lesson/python` | Màu đỏ brand, streak badge cháy khi active, drag game, terminal output | ☐ |
| 14 | `/lesson/java` | `/lesson/java` | Màu cam, cú pháp Java trong code panel | ☐ |
| 15 | `/lesson/htmlcss` | `/lesson/htmlcss` | Block html/css class riêng, breakpoint copy | ☐ |
| 16 | `/courses/python` (và java/htmlcss/cpp) | như cũ | Hero + giáo trình module mở/đóng, trạng thái done/current/locked đúng tiến độ, sidebar stats + nút enroll/tiếp tục | ☐ |
| 17 | `/courses/db_design` | như cũ | Roadmap node Brilliant-style, prereq SQL lock, sidebar 20 bài | ☐ |
| 18 | `/courses/db_design_tc`, `/courses/db_design_nc` | như cũ | data-course đúng khóa → roadmap TC/NC render đúng | ☐ |
| 19 | `/lesson/db_design?lesson=1` | như cũ | 4 step player: theory + visual DB, MCQ + mini-game, kéo thả pipeline, IDE CodeMirror + Run/Submit, modal hoàn thành + XP breakdown | ☐ |
| 20 | `/lesson/db_design_tc?lesson=1`, `..._nc?lesson=1` | như cũ | Data TC/NC load đúng (content script theo khóa) | ☐ |
| 21 | `/card/<id>` (lấy id từ roadmap TC) | như cũ | Card accent màu riêng, micro quiz khóa sau khi chọn, link "về roadmap" đúng khóa | ☐ |
| 22 | `/admin` (tài khoản role=admin) | như cũ | Bảng khóa học + CRUD, bảng bài giảng theo khóa, toast | ☐ |
| 23 | Chatbot (mọi trang có 🤖) | như cũ | Nút nổi, cửa sổ chat, quick action, đính ảnh | ☐ |
| 24 | Logout từ dropdown | như cũ | Về `/` , không còn đăng nhập | ☐ |
| 25 | OAuth Google/Facebook (cần credentials) | login → nút social | Redirect allauth → về `/auth/callback` → `/dashboard` | ☐ |

Khác biệt ĐÃ BIẾT (chấp nhận, xem MIGRATION_NOTES.md):
- URL bắt đầu OAuth là `<backend>/accounts/google/login/` (allauth) thay vì `/auth/google`.
- Sau OAuth Facebook về `/dashboard` (cũ về `/`).
- Trang lesson/interface: gems/streak hiện `0` ~nửa giây đầu rồi hydrate từ API
  (cũ server render sẵn) — chỉ khác lúc tải, trạng thái cuối giống hệt.
- `/lesson/db_design` title tab là "Database Design — Bài học" (cũ có số bài, do
  server biết lesson_idx; engine JS đặt lại title sau khi load).
