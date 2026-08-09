# Nhật ký thay đổi performance — 2026-07-19

Mục tiêu: mọi API response và trang tải dưới **500ms**. Tất cả thay đổi nằm trong
working tree, **chưa commit** (theo yêu cầu chủ dự án). File song hành:
`PERF_AUDIT_2026-07-19.md` (số liệu đo trước/sau + phần chưa làm).

## Nguyên lý chung

Đo thực tế cho thấy chi phí không nằm ở SQL (server thực thi 0,2ms) mà ở **mạng**:

| Chi phí | Đo được |
| --- | --- |
| Mở kết nối mới tới Neon (TCP+TLS+SCRAM, us-east-1) | ~1.900ms |
| Mỗi query trên kết nối ấm (RTT từ VN) | ~240–260ms |
| Kết quả query > ~10kB (thêm 1 vòng TCP) | +~240ms |

⇒ Chiến lược: **pool kết nối** (né 1,9s) + **mỗi endpoint đúng 1 round trip DB**
+ cache những gì gần như tĩnh.

## Backend (Django)

### 1. `config/settings.py` — pool psycopg3 native thay `CONN_MAX_AGE`
- `CONN_MAX_AGE=240` chỉ giữ kết nối **theo thread**; runserver/gunicorn sync mỗi
  request một thread mới → gần như request nào cũng trả 1,9s phí mở kết nối.
- Chuyển sang `OPTIONS.pool` (min 5 / max 40 / timeout 15s / max_idle 240s) —
  kết nối ấm chia sẻ giữa mọi thread. `requirements.txt`: `psycopg[binary,pool]`.
- `max_size=40` chốt theo load test 100 user (xem PERF_AUDIT §Load test):
  throughput trần = pool × ~4 query/s khi RTT 250ms; Neon -pooler cấp 64
  backend/user+db dùng chung với bản Flask nên 40 là mức an toàn.

### 2. `accounts/authentication.py` (MỚI) — `CachedJWTAuthentication`
- JWTAuthentication gốc `SELECT users` ở **mọi** request chỉ để dựng `request.user`
  (= 1 RTT ≈ 260ms/request). Cache user 60s trong LocMemCache.
- Đánh đổi: đổi role/xóa user có hiệu lực trên API chậm tối đa 60s (access token
  vốn sống 30 phút nên đây không phải cửa thu hồi quyền). Toàn bộ views chỉ đọc
  `request.user.id` (+ `role` cho quyền admin) nên không có dữ liệu cũ hiển thị.

### 3. Gộp query — mỗi endpoint đúng 1 round trip
| Endpoint | Trước | Sau | Cách gộp |
| --- | --- | --- | --- |
| `/api/stats` | 2 | 1 | enrollments detail thành `json_agg` subquery |
| `/api/notifications/feed` | 2 | 1 | `unread` thành scalar subquery cùng câu |
| `/api/posts` | 5 | 1 | total = `COUNT(*) OVER()`; reactions = `jsonb_object_agg` subquery; my_reaction + comment_count = scalar subquery |
| `/api/leaderboard?type=weekly` | 5 | 1 | CTE `weekly/top/me` + JSON một hàng |
| `/api/leaderboard?type=streak` | 3 | 1 | CTE `top` + `row_to_json(me)`; query users chung dời vào riêng nhánh `friends` |
| `/api/roadmaps` | 2 | 1 | survey mới nhất lấy kèm subquery, lọc template ở Python |
| `/api/skills` | 1 (nhưng payload 10kB = 2 RTT) | 1 nhỏ | cấu trúc lessons×courses cache 5 phút (`skills:structure`); mỗi request chỉ query tiến độ user |

Ghi chú kỹ thuật: `json_agg`/`jsonb` từ psycopg3 đôi khi trả `str` — các view có
helper chuẩn hóa (`_json_rows`, `_json_list`, `_json_obj`), cùng lý do với
`roadmap/views._jsonb` có sẵn.

Files: `stats/views.py`, `notifications/views.py`, `forum/views.py`,
`leaderboard/views.py`, `roadmap/views.py`, `courses/views.py`.

## Frontend (Next.js)

### 4. `src/components/LegacyScripts.tsx` — nạp script song song
- Bản cũ `await` từng file xong mới chèn file tiếp → trang lesson db_design tải
  ~2MB JS (10 file, 4 CDN) **tuần tự từng round-trip**.
- Bản mới chèn tất cả thẻ `<script async=false>` một lượt: tải song song, thực
  thi đúng thứ tự — đúng ngữ nghĩa `<script>` cuối `<body>` của template Flask
  gốc (bản port cũ vô tình gây regression). Dedup qua `data-pe-legacy` giữ nguyên.

### 5. Preconnect CDN
- `LessonDbDesign.tsx`: preconnect `cdn.jsdelivr.net` + `cdnjs.cloudflare.com`.
- `dashboard/page.tsx`: preconnect `cdn.jsdelivr.net` (mermaid, svg-pan-zoom).
- Cắt DNS+TLS handshake khỏi đường găng nạp engine.

## Đợt 3 — nhiều user cùng online (SSE + rate-limit)

### 6. Gỡ SSE, thay bằng badge polling
- **Backend**: xóa `feed_stream` (SSE); thêm `BadgeView` —
  `GET /api/notifications/badge` → `{unread, latest}`, 1 query, `throttle_classes=[]`
  (poll nền không đốt quota per-IP), vẫn bắt buộc JWT. Route `/stream` đã gỡ.
  Files: `notifications/views.py`, `notifications/urls.py`, `notifications/service.py`.
- **Frontend** `public/static/js/dashboard.js`: xóa toàn bộ máy móc EventSource
  (kể cả trò refresh-token-qua-query mà SSE bắt phải làm); thay bằng
  `_pollBadge()` mỗi 45s, chỉ chạy khi tab hiển thị; quay lại tab → đồng bộ ngay.
- Lý do: SSE giữ 1 thread/user ~1h + poll DB 3s/kết nối — 100 user online là cạn
  worker gunicorn sync + 33 query/s nền + Neon không autosuspend được.
- Test mới: `notifications/tests.py` thêm `test_badge_empty`,
  `test_badge_counts_unread`, badge 401 khi chưa đăng nhập.

### 7. Rate-limit production (settings.py)
- `ip_hour` 50→1000, `ip_day` 200→10000 (per-endpoint per-IP), `login` 5→20/min,
  `register` 3→10/min. Mức cũ (port nguyên Flask-Limiter defaults) sẽ 429 cả
  lớp học sau 1 NAT và chặn login từ người thứ 6 lúc đầu giờ.

### Đối chứng
100 VU thực tế (think ~3s) mix 5 API kèm badge mỗi vòng (~9× nặng hơn badge
thật 45s), pool ấm: p50 **293ms**, p90 630ms, 0 lỗi / 2.500 request. Smoke
Playwright: dashboard không còn mở EventSource, badge poll chạy, 0 lỗi JS.

## Đợt 4 — kịch bản chuyển bước ~1,5s (đa tiến trình)

Yêu cầu: user chuyển bước chỉ nghỉ ~1,5s (offered ~167 req/s với 100 user).
Chẩn đoán (chi tiết PERF_AUDIT §Vòng bổ sung): trần mới KHÔNG phải DB — Neon
tuyến tính tới 187 q/s, query chỉ 0,1ms server-side — mà là **CPU 1 tiến trình
Python (GIL): ~115 req/s** bất kể pool.

### 8. Pool theo env + gunicorn đa worker
- `config/settings.py`: `min_size`/`max_size` đọc từ `DB_POOL_MIN`/`DB_POOL_MAX`
  (mặc định 10/48 cho dev 1 process); thêm `num_workers: 6` để pool đầy sau
  ~12s thay vì ~25s sau restart. Pool là per-process: tổng workers × DB_POOL_MAX
  phải ≤ ~56 (Neon 64, chừa cho Flask).
- `backend/gunicorn.conf.py` (MỚI): 4 worker sync mặc định (`WEB_CONCURRENCY`),
  8 thread/worker; SSE đã gỡ nên không cần gthread/gevent.

### Đối chứng
2 instance × pool 24 (mô phỏng 2 worker), 100 VU think ~1,5s:
p50 **605→369ms**, p90 949→585, 0 lỗi. Production 4 worker cạnh DB ⇒ <100ms.

## Sự cố trong quá trình audit (đã khắc phục)

Script audit đọc `pg_stat` mở kết nối `set_session(readonly=True)` qua endpoint
**-pooler** của Neon → GUC `default_transaction_read_only=on` rò vào server
backend dùng chung (PgBouncer transaction pooling không reset session giữa các
client) → `/auth/login` 500 `cannot execute INSERT in a read-only transaction`.
Đã `RESET default_transaction_read_only` trên đúng backend và xác nhận login 200
ổn định. **Bài học: không bao giờ SET session GUC qua endpoint -pooler.**

## Kiểm chứng

- Backend: `pytest` toàn bộ **90/90 pass** sau khi gộp query.
- Frontend: `tsc --noEmit` + ESLint sạch; `pnpm build` production OK.
- E2e `pe-run-sql.spec.ts`: engine chấm SQL chạy bình thường (các lỗi chấm bài
  hiện có là do dữ liệu content thay đổi từ đợt "big update DB" phía Flask,
  tồn tại y hệt trước thay đổi — đã đối chứng bằng `git stash`).
- Smoke Playwright dashboard: 9 script đúng thứ tự, 0 lỗi JS.
