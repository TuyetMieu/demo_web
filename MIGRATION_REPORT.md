# MIGRATION_REPORT.md — Báo cáo cuối migration Programming_EDU → Next.js + Django

> Hoàn tất 2026-07-14. Project gốc `Programming_EDU/` KHÔNG bị sửa/xóa file nào.
> Toàn bộ output nằm trong `Programming_EDU_next/` (backend/ + frontend/ +
> content-tools/). Tài liệu liên quan: MIGRATION_PLAN.md (audit + mapping),
> MIGRATION_NOTES.md (mọi khác biệt có chủ đích + lý do), UI_PARITY_CHECKLIST.md
> (checklist đối chiếu bằng mắt).

> ⚠️ **Tài liệu lịch sử.** Lớp Next.js/React mô tả dưới đây đã được gỡ bỏ:
> frontend hiện là **HTML/CSS/JS thuần** (mỗi route một thư mục `index.html`,
> không build step) — xem `frontend/README.md`. Backend Django và lớp JS legacy
> giữ nguyên. Đường dẫn `frontend/public/static/*` trong báo cáo này nay là
> `frontend/static/*`.

## 1. Những gì ĐÃ port

### Backend — Django 5.2 + DRF (`backend/`)
- **74 endpoint / 14 blueprint Flask → 11 app Django**, giữ nguyên 100% path +
  method + body/status từng response (urlconf tường minh, không dùng router tự sinh).
- **22 bảng → 22 model `managed=False`** (Django không bao giờ sinh DDL cho bảng
  legacy); composite PK dùng `CompositePrimaryKey` của Django 5.2. `inspectdb`
  đối chiếu schema thật trên Neon: **khớp 100%, không sai lệch** với `db/schema.py`.
- **Logic nghiệp vụ giữ nguyên từng câu SQL** (XP, streak, achievement, quiz
  snapshot, reaction, mention...) qua helper `common/db.py`; flow nhiều câu lệnh
  bọc `transaction.atomic()`.
- **Auth JWT** (SimpleJWT): access 30ph, refresh 8h (= session lifetime cũ);
  hasher tương thích werkzeug scrypt/pbkdf2 — user hiện hữu đăng nhập được ngay,
  hash mới vẫn ghi định dạng werkzeug (2 bản chạy song song được).
- **OAuth Google/Facebook** qua django-allauth, giữ luồng link-theo-email; callback
  cấp JWT rồi redirect `FRONTEND_URL/auth/callback#access=…` (fragment, không lộ log).
- Security headers + CSP y hệt danh sách domain cũ; rate-limit giữ semantics
  per-endpoint của Flask-Limiter (chống tái diễn bug 429 static — AUDIT-FIX 2026-07-07);
  logging request-id + log 5xx BẬT (quyết định chủ dự án); error JSON tiếng Việt
  khớp từng byte với guard/errorhandler cũ; `/health` cho cron giữ Neon ấm;
  `CONN_MAX_AGE=240` + TCP keepalive thay thread `start_keepalive()`.
- **Đã verify chạy thật trên Neon**: register → login (hasher OK) → enroll →
  complete lesson (+50 XP, achievement 🎯 "Khởi đầu", streak 1, progress 5%,
  time_spent 0.3h) → leaderboard/stats — smoke user đã xóa sạch (0 orphan).

### Frontend — Next.js 16 App Router + TypeScript (`frontend/`)
- **17/17 template Jinja2 → JSX 1:1** (build sạch, 19 route). `chatbot.html`/
  `roadmap.html`/topbar base.html thành component dùng chung; dashboard GIỮ cơ chế
  SPA-hub (navigate() client-side trong 1 route).
- **17 file JS legacy (~24.500 dòng) copy BYTE-IDENTICAL** vào `public/static/js/`
  — không sửa 1 byte nào, kể cả engine `lesson_db_design.js` 9.171 dòng. Mọi inline
  `<script>`/`<style>` của template trích verbatim ra `public/static/js/pages/*` /
  `public/static/css/pages/*`.
- **`pe-bridge.js`** (file MỚI duy nhất phía legacy): override fetch để rewrite
  `/api|/auth` sang origin backend, đính JWT, tự bắt token từ login/register,
  refresh-on-401, vá DOMContentLoaded. `LegacyScripts` nạp script tuần tự đúng
  thứ tự template gốc sau khi DOM mount.
- **CSS copy byte-identical, load qua `<link>` per-page** (`PageStyles`) — đúng
  tổ hợp + thứ tự từng template (MIGRATION_PLAN §4), không bundler đụng vào,
  không bleed giữa route (unmount là gỡ link). Ảnh giữ nguyên URL space
  `/static/images/**` (giá trị `courses.image` trong DB dùng được nguyên trạng).
- Trang MỚI bắt buộc: `/auth/callback` (nhận JWT sau OAuth), `/auth/logout`
  (base.html trỏ tới URL này — giờ do frontend xử lý).
- CURRICULA (data tĩnh trong main.py) xuất nguyên văn → `src/lib/curricula.json`;
  trang course_detail tính done/current/locked đúng logic `main.py`.

### Content pipeline (`content-tools/`)
- `sync-lesson-content.mjs` (Node + pg + node:vm) thay `db/seed_lesson_content.py`
  (py_mini_racer). Giữ idempotent + SHA-256 per-course. **Đã verify trên Neon:
  hash Node = hash Python** → "Không có gì để sync" (tương thích byte-level).

### Tests (Giai đoạn 5)
- **4 file test Flask port đủ case**: test_parse_time_spent + test_streak → `stats/tests.py`;
  test_review_quiz → `quizzes/tests.py`; test_course_ratings → `courses/tests.py`.
- **8 app trước đây 0-test giờ có test cơ bản** (happy path + lỗi phổ biến):
  accounts (hasher/register/login/follow/survey), forum (post/react/nesting/403),
  lessons (complete/no-double-XP/clamp), achievements, leaderboard, notifications,
  roadmap, courseadmin. **Tổng 83 test — 83 PASS** (chạy trên DB thật, mỗi test
  bọc transaction rollback nên không để lại dấu vết — xem `backend/conftest.py`).
- **test_e2.py + regression_b6.py → Playwright TS** trong `frontend/e2e/`
  (pe-run-sql.spec.ts: 20 bài PE_runSQL; drag-regression.spec.ts: B6/B10 2-path).
- `UI_PARITY_CHECKLIST.md`: 25 mục đối chiếu bằng mắt Flask ↔ Next.

### CI (Giai đoạn 6)
- `.github/workflows/ci.yml`: job backend (pytest) + job frontend (eslint + tsc
  + next build) chạy mỗi push/PR. Cần khai secret `DATABASE_URL` trong repo.

## 2. Những gì CỐ Ý thay đổi (tóm tắt — chi tiết ở MIGRATION_NOTES.md)

| Thay đổi | Vì sao |
|---|---|
| Session cookie → JWT (+ endpoint mới `/auth/refresh`) | Frontend khác domain; SameSite=Lax không hoạt động cross-site |
| OAuth start URL → `/accounts/<provider>/login/` (allauth), callback → JWT fragment handoff | Backend không được render trang khi frontend ở domain khác |
| `GET /api/user` không trả cột `password` nữa | Bản Flask SELECT * lộ hash ra client — vá bảo mật |
| Rate-limit đếm per-endpoint (custom throttle key) | Giữ semantics Flask-Limiter, tránh tái diễn bug 429 |
| Logging request-id BẬT (bản gốc comment tắt) | Quyết định chủ dự án 2026-07-14 |
| Thêm bảng infra Django/allauth/JWT-blacklist vào Neon | Chỉ THÊM bảng mới; bảng cũ không đổi. Lưu ý FK token_blacklist → users không cascade |
| gems/streak/xp ở lesson pages hydrate client-side | Không còn server-side Jinja; trạng thái cuối giống hệt |
| Query version `?v=39`… bỏ | Next tự quản lý cache asset |

## 3. Còn cần làm TAY khi deploy

1. **OAuth credentials thật**: khai `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_*` vào
   `backend/.env`; thêm redirect URI mới `https://<backend>/accounts/google/login/callback/`
   (và facebook tương tự) trong console của Google/Meta.
2. **Env production**: `SECRET_KEY`, `DJANGO_ENV=production`, `ALLOWED_HOSTS`,
   `ALLOWED_ORIGINS` (origin frontend), `FRONTEND_URL`; frontend: `NEXT_PUBLIC_API_URL`.
3. **CI secret** `DATABASE_URL` trong GitHub repo settings.
4. **Cron ping `/health`** (GitHub Actions schedule hoặc cron platform) nếu muốn
   giữ Neon compute ấm 24/7.
5. **CACHES → Redis** khi chạy nhiều worker (throttle chính xác giữa process).
6. **Chạy e2e Playwright** lần đầu: `pnpm exec playwright install chromium` rồi
   chạy theo hướng dẫn trong `frontend/e2e/playwright.config.ts` (cần tài khoản
   test E2E_EMAIL/E2E_PASSWORD tồn tại trong DB).
7. **Đối chiếu UI bằng mắt** theo `UI_PARITY_CHECKLIST.md` (25 mục) — CSS là bản
   copy nguyên nên rủi ro tập trung ở khác biệt hydrate/timing.
8. `manage.py seed_data` (seed courses/roadmaps/missions/achievements cho DB
   trống) chưa cần vì DB hiện có dữ liệu — chỉ viết khi cần dựng môi trường mới.

## 4. Chạy dev

```bash
# Backend (cổng 9000 — giữ cổng cũ của Flask)
cd backend && .venv/Scripts/activate && python manage.py runserver 9000

# Frontend (cổng 3000)
cd frontend && corepack pnpm dev

# Content sync (khi sửa lesson_content*.js)
cd content-tools && node sync-lesson-content.mjs

# Tests
cd backend && python -m pytest -q          # 83 test
cd frontend && corepack pnpm build         # build + tsc
```
