# 07 — Kết luận & khuyến nghị

## Tổng quan sức khỏe repo
Codebase **chất lượng khá tốt** cho một bản port Flask→Django: SQL tham số hóa nhất quán,
forum đã cố ý batch chống N+1, có sẵn bộ test (72 case) chạy trên DB thật. Vấn đề tập
trung ở **1 lỗ XSS**, **vài edge case null/constraint**, và **rủi ro tài nguyên SSE**.

## Đã sửa (kèm test đỏ→xanh)
| ID | Mức | Nội dung | Test |
|----|-----|----------|------|
| B1/S1 | 🟠 High | XSS tên tác giả bài viết chưa escape | `frontend/e2e/unit/forum-xss.test.mjs` |
| S2 | 🟡 Med | `escHtml` forum thiếu null-guard/escape `'` | (chung test trên) |
| B2/S4 | 🟡 Med | Đổi email trùng → 500 thay vì 400 | `accounts/tests.py::test_update_profile_duplicate_email_*` |
| B3 | 🟡 Med | `/api/stats` 500 khi `progress = NULL` | `stats/tests.py::test_stats_avg_progress_handles_null_progress` |
| B4 | 🟡 Med | @mention khớp substring → báo nhầm | `forum/tests.py::test_mention_*` |

**Kết quả test**: backend **90 passed** (72 cũ + 18 mới); frontend XSS unit **PASS**.

## Ghi nhận — cần chủ dự án quyết (đổi schema DB chung)
| ID | Mức | Nội dung | Đề xuất |
|----|-----|----------|---------|
| B5 | 🟠 High | Farm XP vô hạn ở `CompleteMissionView` (không idempotent) | Bảng `user_missions` UNIQUE + `ON CONFLICT DO NOTHING RETURNING`, chỉ cộng XP khi có RETURNING |
| B6 | 🟡 Med | Race tạo lesson stub trùng | UNIQUE `(course_id, sort_order)` + `ON CONFLICT` |
| S3 | 🟡 Med | Gemini key đặt client-side (chưa lộ nhưng rủi ro) | Proxy `/api/chatbot` ở backend, key nằm ở env server |
| S5 | 🟡 Med | CSP `script-src 'unsafe-inline'` | Lộ trình bỏ inline (nonce/hash) |
| S6 | 🔵 Low | Env production trên Render | Đặt `DJANGO_ENV=production`, `SECRET_KEY`, `ALLOWED_HOSTS`, `FRONTEND_URL` |

## Hiệu năng — 3 điểm ưu tiên (chi tiết `04`)
1. **SSE `feed_stream`** giữ thread + DB connection/kết nối → cạn tài nguyên (O(user online)).
2. **`check_and_award_achievements`** O(A) round-trip/lần cộng XP → gộp 1 câu INSERT…SELECT.
3. **Dashboard waterfall ~20 call + over-fetch `SELECT c.*`** → gộp endpoint, chọn cột.

## Thứ tự hành động đề xuất
1. **Ngay**: deploy bản vá XSS (B1/S2) + B2/B3/B4 (đã xong, chỉ cần push).
2. **Tuần này**: xử lý B5 (farm XP) — có ảnh hưởng công bằng gamification.
3. **Kế tiếp**: tối ưu SSE (#1 perf) + achievements (#2 perf).
4. **Nền**: thống nhất casing JSON (N7), proxy Gemini (S3), siết CSP (S5).

## Mobile responsive (bổ sung 2026-07-17 — chi tiết `08-mobile-responsive.md`)
Web đã hiển thị đầy đủ nội dung ở 375×812: phần lớn breakpoint có sẵn hoạt động tốt;
chỉ 2 lỗi tràn ngang thật (blob `/questionaire` 540px, hạt particle login/register)
— đã sửa 4 file CSS + thêm lưới regression `e2e/mobile-responsive.spec.ts` (6/6 pass).

## Ghi chú nhỏ
- `accounts/views.py:332` dùng `datetime.utcnow()` (deprecated Py3.12). **Không sửa** để
  không đổi format `surveys.created_at` (TEXT) trên DB chung; nên đổi khi có dịp cùng migrate.
- Ràng buộc dự án `frontend/AGENTS.md`: đọc `node_modules/next/dist/docs/` trước khi viết
  code frontend. Các thay đổi ở đây **không** đụng markup trang (chỉ legacy JS + test).
