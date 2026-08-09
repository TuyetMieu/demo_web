# 05 — Naming & Readability

## Đánh giá chung
- **Backend Python**: snake_case nhất quán, docstring tốt (kèm lý do port từ Flask).
  Điểm trừ: vài helper đặt tên **quá ngắn** (`q/q1/x`) và convention **casing JSON** trả
  ra không đồng nhất (chỗ camelCase, chỗ snake_case).
- **Frontend legacy JS**: có **≥3 hàm escape HTML khác tên** ở các scope khác nhau →
  dễ dùng nhầm bản yếu (chính là gốc của bug XSS S1/S2).

## Bảng: tên cũ → tên đề xuất + lý do
| # | Tên cũ | Vị trí | Đề xuất | Lý do |
|---|--------|--------|---------|-------|
| N1 | `q` / `q1` / `x` | `common/db.py` | `fetch_all` / `fetch_one` / `execute` | 1 ký tự không nói lên hành vi; `x` vô nghĩa. (Đánh đổi: dùng 183 chỗ → churn lớn, có thể để alias). |
| N2 | `escHtml` (bản @1188) + `escHtml` (bản @2133) + `_rmVEsc` (`main.js:186`) | `dashboard.js`, `main.js` | 1 hàm chung `escapeHtml` | 3 bản escape khác tên/khác nội dung ở 3 scope → lập lờ, dễ dùng nhầm bản thiếu escape (nguồn bug XSS). Nên gom vào 1 util dùng chung. |
| N3 | `_can_modify` trả `(row, (body, status)|None)` | `forum/views.py:134` | `check_owner_or_admin` trả `(row, error)` với `error` là object rõ field | Tuple-lồng-tuple; call site đọc `err[0]`, `err[1]` khó hiểu. |
| N4 | `_looks_like_test_name` có `low == low` | `leaderboard/views.py:39` | Bỏ `low == low` (luôn True — dead), tách điều kiện | Biểu thức tautology + boolean dài 1 dòng khó đọc/khó test. |
| N5 | `qs` (query string) | `courses/views.py:16` | `search_query` | `qs` đặt ngay cạnh helper `q()` dễ nhầm; `qs` mơ hồ (queryset? querystring?). |
| N6 | `parse_time_spent` trả `float` | `stats/views.py:12` | Giữ tên, thêm type hint rõ `-> float` (đã có) | OK — nêu để xác nhận đã tốt. |
| N7 | Casing JSON không đồng nhất | `forum` (`author_name`,`like_count`,`my_reaction`) vs `courses` (`accentColor`,`totalLessons`) | Chọn **1 convention** cho payload (đề xuất camelCase toàn bộ, hoặc snake toàn bộ) | Cùng 1 API mà chỗ snake chỗ camel → client phải nhớ ngoại lệ, dễ bug map field. |
| N8 | `_add` (closure trong `GenerateQuizView`) | `quizzes/views.py:43` | `_append_question` | `_add` quá chung, không cho biết add cái gì. |
| N9 | `st` / `sets` / `subs` | `courses/views.py:254-270` | `skill_set` / `skill_sets` / `sub_skills` | Viết tắt dày đặc trong vòng lặp lồng làm khó theo dõi. |

## Code trùng lặp (DRY) — đề xuất gộp
| Chỗ trùng | Vị trí | Đề xuất |
|-----------|--------|---------|
| Logic tính streak (reset/giữ/tăng theo `last_study_date`) | `lessons/views.py:87-92` **và** `stats/views.py:107-113` | Tách 1 helper `next_streak(last_date, current, today)` dùng chung (đã ✅ giữ nguyên hành vi, khuyến nghị refactor ở `06`). |
| Hàm escape HTML | `dashboard.js` ×N + `main.js` | 1 util chung (xem N2). |
| Khối `data = request.data if isinstance(request.data, dict) else {}` | ~15 view | Có thể gói vào 1 helper/parser mixin. |

> Ghi chú: các đổi tên trên là **đề xuất readability**, không bắt buộc để chạy đúng.
> Đã thực hiện phần rủi ro-thấp & liên quan trực tiếp bug (N2 — thống nhất `escHtml`).
