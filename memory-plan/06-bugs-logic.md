# 06 — Bug & Logic

Mỗi bug kèm **test tái hiện** (đỏ trước khi sửa). ✅ đã sửa · 📝 ghi nhận (cần schema).

## B1 ✅ Stored XSS — tên tác giả bài viết không escape
- **Loại**: security/logic (thiếu escape).
- **Vị trí**: `frontend/static/js/dashboard.js:1100`.
- **Edge case**: `users.name` chứa HTML/JS.
- **Test**: `frontend/e2e/unit/forum-xss.test.mjs` — kiểm dòng render `fpc-author` bọc
  `escHtml`, và mọi `escHtml` trung hòa `<img onerror>` + null-safe.
- **Sửa**: `escHtml(p.author)` + nâng `escHtml@1188` lên bản null-safe.

## B2 ✅ `UserView.put` — đổi email trùng → 500 thay vì 400
- **Loại**: edge case (unique constraint) + xử lý lỗi.
- **Vị trí**: `backend/accounts/views.py` `UserView.put`.
- **Tái hiện**: user A đổi email = email của B → `IntegrityError` chưa bắt → 500.
- **Test**: `accounts/tests.py::test_update_profile_duplicate_email_returns_400`
  (+ `::test_update_profile_same_email_ok` bảo đảm tự-giữ-email vẫn OK).
- **Sửa**: pre-check `SELECT ... WHERE email=%s AND id<>%s` → 400 `errors.email`.

## B3 ✅ `StatsView` — `progress = NULL` gây 500
- **Loại**: edge case null.
- **Vị trí**: `backend/stats/views.py:42`.
- **Tái hiện**: enrollment có `progress = NULL` (cột nullable) → `sum(None)` →
  `TypeError` → 500 khi mở `/api/stats`.
- **Test**: `stats/tests.py::test_stats_avg_progress_handles_null_progress`.
- **Sửa**: `sum((r['progress'] or 0) for r in rows)`.

## B4 ✅ Forum @mention khớp substring → báo nhầm người
- **Loại**: logic (off-by-boundary).
- **Vị trí**: `backend/forum/views.py` `_notify_mentions` (`('@'+name) in content`).
- **Tái hiện**: user tên `An`; ai đó bình luận `@Anh ...` → `'@An' in '@Anh...'` = True →
  `An` bị thông báo nhầm.
- **Test**: `forum/tests.py::test_mention_*` (4 case: khớp đúng, không khớp prefix,
  tên nhiều từ có dấu, input rỗng/None).
- **Sửa**: helper `_is_name_mentioned(content, name)` khớp theo ranh giới (ký tự sau
  `@name` không phải chữ/số/`_`).

## B5 📝 `CompleteMissionView` — không idempotent → farm XP vô hạn
- **Loại**: logic/business integrity (nghiêm trọng).
- **Vị trí**: `backend/stats/views.py:87` `CompleteMissionView.post`.
- **Vấn đề**: xác minh mission chỉ so `condition/action`; **không lưu mission nào đã
  hoàn thành**. Gửi lại đúng request → cộng `xp_reward` + `gems` **mỗi lần**, vô hạn.
  Trái ngược `CompleteLessonView` (đã check `existed` để không cộng XP lần 2).
- **Tái hiện (mô tả)**: gọi `/api/mission/complete` cùng payload 2 lần → `xp` tăng gấp đôi.
- **Vì sao chưa tự sửa**: schema hiện **không có bảng `user_missions`** để chống lặp;
  thêm bảng = đổi schema DB **dùng chung với bản Flask production** → rủi ro, cần chủ dự án
  quyết. **Đề xuất**: tạo bảng `user_missions(user_id, mission_id, completed_at, UNIQUE)`,
  `INSERT ... ON CONFLICT DO NOTHING RETURNING`; chỉ cộng XP khi có RETURNING (giống lessons).
- **Snippet test sẵn dùng khi có schema**:
  ```python
  def test_mission_not_award_twice(auth_api, temp_user, mock_mission):
      before = q1('SELECT xp FROM users WHERE id=%s', (temp_user,))['xp'] or 0
      _complete_mission(auth_api); _complete_mission(auth_api)
      after = q1('SELECT xp FROM users WHERE id=%s', (temp_user,))['xp'] or 0
      assert after - before == 10   # chỉ cộng 1 lần (hiện tại: == 20)
  ```

## B6 📝 `_resolve_lesson_id` — race tạo lesson stub trùng
- **Loại**: race condition.
- **Vị trí**: `backend/lessons/views.py:12`.
- **Vấn đề**: `SELECT ... WHERE course_id,sort_order` không thấy → `INSERT` lesson stub.
  Hai request đồng thời cho cùng `(course_id, lesson_no)` khi chưa có row → **cả hai
  INSERT** → nhân đôi lesson (không có UNIQUE trên `(course_id, sort_order)`).
- **Tái hiện**: khó ổn định trong unit test (cần đồng thời thật); mô tả + đề xuất.
- **Đề xuất**: thêm UNIQUE index `(course_id, sort_order)` rồi `INSERT ... ON CONFLICT
  (course_id, sort_order) DO NOTHING` + re-SELECT; hoặc khóa `SELECT ... FOR UPDATE`.
  (Đổi schema → cần chủ dự án duyệt như B5.)

## Đã kiểm và KHÔNG phải bug (để tránh sửa nhầm)
- `forum/_paging`: `offset=(page-1)*per_page`, `page>=1` → **không off-by-one**. ✅
- `total_pages = (total+per_page-1)//per_page` → ceil đúng. ✅
- `RateCourseView`: chặn `bool` trước `int` (`isinstance(rating,bool)`) → đúng. ✅
- `CompleteLessonView`: có `existed` chống cộng XP lần 2 → đúng (đối chiếu B5). ✅
- Logic streak (reset khi cách >1 ngày, +1 khi hôm qua, giữ khi hôm nay) → đúng, đã có
  test trong `stats/tests.py`. ✅ (chỉ trùng lặp — xem `05` DRY).
