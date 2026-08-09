# 04 — Performance findings

Ký hiệu: A = số achievement, U = số user, C = số course, P = per_page.
Mọi round-trip DB đi tới **Neon (us-east-1)**; frontend tới **Render** → latency mạng
cộng dồn là chi phí chính, không phải CPU.

## 🏆 3 điểm CHẬM NHẤT (ưu tiên xử lý)

### #1 — SSE `feed_stream`: rò rỉ thread + connection (âm thầm)
`backend/notifications/views.py:60`
- Mỗi kết nối SSE giữ **1 worker thread** kẹt trong `for _ in range(1200): time.sleep(3)`
  (~1 giờ) và **1 DB connection** sống suốt vòng lặp (`unread_state` mở cursor;
  `CONN_MAX_AGE=240` giữ connection ấm).
- **Big-O tài nguyên = O(số user đang mở dashboard)**. N người online đồng thời → N
  thread + N connection bị treo. Render ít worker + Neon pooler giới hạn connection →
  **cạn worker/connection**, request mới treo. Không ném lỗi → "âm thầm".
- **Sửa**: (a) chuyển sang ASGI + async view; hoặc (b) client short-poll
  `/api/notifications` mỗi 10–15s (bỏ luôn stream); tối thiểu **đóng DB connection
  giữa các nhịp poll** và **giới hạn số stream đồng thời/198user**.

### #2 — `check_and_award_achievements`: O(A) round-trip mỗi lần cộng XP
`backend/achievements/services.py:23`
- 1 query load tất cả achievement + `_get_metrics` (3 query) + **1 INSERT cho MỖI
  achievement** trong vòng lặp → **O(A) round-trip tuần tự** tới Neon.
- Nằm trên **đường nóng**: chạy mỗi lần `CompleteLessonView` và `CompleteMissionView`.
  A=10 → ~14 round-trip nối tiếp × latency mạng → trễ rõ khi hoàn thành bài.
- **Sửa**: gộp thành 1 câu
  `INSERT INTO user_achievements (user_id, achievement_id)
   SELECT %s, a.id FROM achievements a
   WHERE (a.condition_type='lesson_count' AND %s >= a.condition_value) OR (...)
   ON CONFLICT DO NOTHING RETURNING achievement_id;` → **1 round-trip**.

### #3 — Dashboard: waterfall ~20 API call + over-fetch cột
`frontend` (nhiều call) · `backend/courses/views.py:14,110`
- 1 lần load dashboard bắn **~20 request** (ghi trong `common/throttling.py:6`), mỗi
  request = 1 round-trip Render + 1 query Neon; cộng **Neon cold-start** khi compute idle.
- `CoursesView`/`CoursesEnrolledView` dùng `SELECT c.*` (kèm cột `description` dài) cho
  **mọi** course, không phân trang → **O(C) hàng × cột rộng** truyền mỗi lần.
- **Sửa**: gộp endpoint (đã có `CoursesEnrolledView`), **chỉ SELECT cột cần**, thêm
  HTTP cache cho danh sách course ít đổi, cân nhắc ping `/health` giữ Neon ấm.

## Big-O các endpoint nóng
| Endpoint | Query DB | Ghi chú |
|----------|----------|---------|
| `forum PostsView.get` | O(1) query, O(P) hàng | ✅ Tốt: `_reaction_map` batch GROUP BY + `= ANY(%s)`, không N+1 |
| `forum CommentsView.get` | O(1) query | ✅ 2 tầng batch (top + replies ANY) |
| `CompleteLessonView.post` | O(A) | Bị chi phối bởi vòng lặp achievement (#2) |
| `CompleteMissionView.post` | O(A) | Như trên |
| `LeaderboardView weekly` | 4 query | Có thể gộp còn 2 (top+rank chung CTE) |
| `CoursesEnrolledView` | O(1) query, O(C) hàng | Over-fetch cột (#3) |

## N+1 / vòng lặp — kết luận
- **Không có N+1 thực sự** trong forum/quiz/course (đã cố ý batch — khen tác giả).
- Vòng lặp query duy nhất đáng kể là **achievements** (#2).
- `leaderboard/_looks_like_test_name:39`: biểu thức `low == low` (luôn True — dead) và
  `any(c in '<62 ký tự có dấu>' for c in low)` chạy mỗi entry — **O(len × 62)** nhưng chỉ
  top-10 nên không phải hot; xếp vào *readability* (xem `05`).

## Memory leak (âm thầm)
- **Chính**: SSE (#1) giữ thread + DB connection.
- `common/middleware.py` `threading.local` request_id: reset trong `finally` → **không rò**. ✅
- Không thấy cache/không giới hạn nào tăng vô hạn ở backend.
