# 08 — Mobile responsive (bản mobile cho web)

## Yêu cầu (từ chủ dự án, 2026-07-17)
> "Design thêm 1 bản mobile cho web để khi web thay đổi từ web desktop sang web
> mobile vẫn hiển thị **đầy đủ nội dung**."

Diễn giải thành tiêu chí đo được (Definition of Done):
1. **Không tràn ngang** (`scrollWidth <= viewport`) ở viewport 375×812 (iPhone chuẩn)
   trên mọi trang chính: `/` (landing), `/login`, `/register`, `/dashboard`
   (+ các tab SPA: courses, roadmap, forum, profile, leaderboard), `/questionaire`.
2. **Nội dung đầy đủ**: không phần tử nội dung nào bị `display:none` ở mobile
   trừ phi có bản thay thế (vd nav label → icon vẫn còn aria-label). Nav, search,
   bell, user-chip vẫn dùng được.
3. **Grid nhiều cột → xếp chồng**: mọi grid cố định (`repeat(4,1fr)`, `1fr 1fr`,
   `minmax(0,1fr) 280px`…) phải có media query đưa về 1–2 cột ở ≤768px/≤480px.
4. **Bảng/khối rộng**: cuộn ngang **bên trong container riêng** (`overflow-x:auto`),
   không đẩy cả trang.
5. **Tap target ≥ 40px** cho nút chính; font body ≥ 14px ở mobile.
6. **Không đổi hành vi desktop**: chỉ thêm media query / CSS phủ ở cuối,
   không sửa markup trừ khi bắt buộc (giữ nguyên legacy JS).

## Ràng buộc kỹ thuật
- Markup là port 1:1 từ Flask (LegacyScripts + global JS) → **ưu tiên CSS thuần**,
  hạn chế đổi DOM/JS để không phá logic legacy.
- Style hiện tại rải ở `style.css` (topbar/layout), `dashboard.css` (3.8k dòng),
  `pages.css`, và CSS inline per-page (`pages/*.inline.css`). Đã có sẵn một phần
  breakpoint 768/600/576 nhưng phủ không đều.
- Quyết định kiến trúc: **1 file mới `frontend/static/css/mobile.css`** làm lớp
  responsive tập trung (dễ audit, không đụng file cũ), load SAU các css khác
  ở cả layout (base) lẫn (standalone). Trường hợp fix nhỏ lẻ đúng chỗ hơn thì
  sửa tại file gốc (ghi rõ trong tasklist).

## Test-first (đỏ → xanh)
- Spec mới: `frontend/e2e/mobile-responsive.spec.ts`
  - viewport 375×812, dùng `login()` từ `e2e/helpers.ts` (tài khoản e2e có sẵn
    của repo) cho các trang cần auth.
  - Mỗi trang/tab: assert `document.documentElement.scrollWidth <= innerWidth + 1`
    + đếm "offender" (phần tử visible tràn viewport, bỏ qua phần tử trang trí
    `.bg-blob` có overflow:hidden cha) == 0 + các khối nội dung chính hiển thị.
- **Dự đoán fail trước khi sửa**: dashboard tab courses/forum/profile tràn ngang
  do grid cứng; admin/lesson standalone tràn do bảng; topbar 375px chật.

## Tasks
- [x] M1. Dựng stack local (backend 9000 + `python serve.py` 3000) + xác nhận login e2e chạy.
      Phát hiện: tài khoản e2e mặc định `audit@example.com` (helpers.ts) CHƯA có trong
      DB → đã tạo qua API register local + hoàn tất survey (login không bị đá về
      /questionaire). Cài Playwright Chromium (trước đó chưa cài). Thêm
      `.claude/launch.json` (backend/frontend) dùng cho phiên sau.
- [x] M2. Viết `mobile-responsive.spec.ts` (đỏ) — offender thật:
      `/questionaire` scrollWidth **540 > 375** (blob `body::before/::after` 500px
      absolute + animation translate); `/login` `/register` hạt `.particle` thò mép
      phải ~4px (flaky theo pha animation).
- [x] M3. **Quyết định kiến trúc thay đổi so với dự kiến**: KHÔNG tạo `mobile.css` —
      audit thực tế cho thấy style.css/dashboard.css đã phủ breakpoint 768/600/576
      khá đủ (mọi tab SPA pass ngay). Chỉ cần 2 fix điểm TẠI FILE GỐC:
    - [x] M3a. `questionaire.css`: blob `body::before/::after` → `position: fixed`
           (phần tử fixed không nới scroll area; hiệu ứng nền giữ nguyên).
    - [x] M3b. `auth.css` + `login.css` + `register.css`: `.particles` container
           thêm `overflow: hidden` (hạt trang trí không thò ra mép viewport).
    - [x] M3c. Topbar/tab SPA/standalone đã đạt sẵn — không sửa (tránh đổi hành vi).
- [x] M4. Spec **6/6 pass** (375×812: `/`, `/login`, `/register`, dashboard + 7 tab
      SPA, `/courses/db_design`, `/questionaire`). Screenshot xác nhận: topbar thu
      icon, courses/forum 1 cột, lịch tuần cuộn ngang trong container riêng,
      modal streak vừa màn hình.
- [x] M5. Dọn: không thêm layer CSS mới (2 fix nằm đúng file gốc), spec giữ lại làm
      lưới regression mobile; cập nhật 02-tasks.md + 07-conclusion.md.

## Kết quả
- Sửa 4 file CSS (5 dòng hiệu lực): `questionaire.css` (fixed), `auth.css`,
  `login.css`, `register.css` (overflow hidden).
- Test mới: `frontend/e2e/mobile-responsive.spec.ts` — 6 test, tự động đo tràn ngang
  (scrollWidth + offender ngoài container cuộn) cho mọi trang chính, chạy bằng:
  `node node_modules/@playwright/test/cli.js test --config e2e/playwright.config.ts mobile-responsive`
- Mobile 375px hiển thị **đầy đủ nội dung**: nav (icon + aria-label), search ẩn ở
  ≤576px theo thiết kế sẵn có (còn bell/user-chip), bảng & lịch cuộn ngang cục bộ.
