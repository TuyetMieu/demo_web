# 02 — Task breakdown

Ký hiệu: `[ ]` chưa làm · `[~]` đang làm · `[x]` xong · `[!]` ghi nhận (không tự sửa).

## T0 — Chuẩn bị
- [x] T0.1 Khảo sát kiến trúc backend + frontend, lập bản đồ điểm nóng.
- [x] T0.2 Xác nhận chạy được pytest + kết nối DB Neon (rollback).
- [x] T0.3 Tạo `memory-plan/` + đóng gói yêu cầu.

## T1 — Security
- [x] T1.1 Quét SQL injection toàn bộ raw SQL (`q/q1/x`, f-string). → **an toàn** (whitelist).
- [x] T1.2 XSS: rà legacy JS render nội dung user. → tìm thấy **stored XSS** (post author).
- [x] T1.3 Lộ secret/API key (backend env, frontend bundle, chatbot.js). → Gemini key client-side (rủi ro kiến trúc).
- [x] T1.4 Thiếu validate input (auth, profile, forum, quiz).
- [x] T1.5 Cấu hình bảo mật deploy (DEBUG, ALLOWED_HOSTS, CSP unsafe-inline).
- [x] T1.6 Xếp hạng mức độ → `03-security-findings.md`.

## T2 — Performance
- [x] T2.1 Quét N+1 (vòng lặp có query bên trong).
- [x] T2.2 Vòng lặp lồng nhau vô ích / big-O.
- [x] T2.3 Memory/connection leak (SSE stream).
- [x] T2.4 Chọn **top-3 điểm chậm nhất** → `04-performance-findings.md`.

## T3 — Naming & Readability
- [x] T3.1 Rà tên hàm/biến khó hiểu, convention lệch, code trùng.
- [x] T3.2 Bảng tên cũ → mới → `05-naming-readability.md`.

## T4 — Bug & Logic (TDD: đỏ → xanh)
- [x] T4.1 [FIX] XSS post author chưa escape (frontend) — test `forum-xss.test.mjs`.
- [x] T4.2 [FIX] `UserView.put`: đổi email trùng → 500 (IntegrityError) thay vì 400.
- [x] T4.3 [FIX] `StatsView`: `progress = NULL` → TypeError (500) khi tính trung bình.
- [x] T4.4 [FIX] Forum @mention khớp **substring** → thông báo nhầm người.
- [!] T4.5 [GHI NHẬN] `CompleteMissionView`: không idempotent → farm XP vô hạn (cần schema).
- [!] T4.6 [GHI NHẬN] `_resolve_lesson_id`: race tạo lesson stub trùng (cần unique index).

## T5 — Dọn kiến trúc
- [x] T5.1 `escHtml` trùng: PHÁT HIỆN 2 bản ở 2 IIFE khác nhau (không phải dead code) →
        thống nhất bản dùng cho forum (dòng 1188) lên bản null-safe + escape `'`.
- [x] T5.2 Logic streak trùng lặp (lessons/stats) — ghi nhận đề xuất tách helper (không tự
        đổi để giữ nguyên hành vi đã có test).

## T6 — Kết luận
- [x] T6.1 `07-conclusion.md` + báo cáo tổng hợp cho chủ dự án.

## T7 — Mobile responsive (yêu cầu bổ sung 2026-07-17, chi tiết `08-mobile-responsive.md`)
- [x] T7.1 Spec đo tràn ngang 375×812 (`e2e/mobile-responsive.spec.ts`) — đỏ trước.
- [x] T7.2 Fix: blob questionaire (`position:fixed`), particle login/register
        (`overflow:hidden`) — 6/6 test xanh, screenshot xác nhận.
- [x] T7.3 Hạ tầng e2e: cài Chromium, tạo tài khoản test `audit@example.com`
        (chuẩn helpers.ts), thêm `.claude/launch.json`.
