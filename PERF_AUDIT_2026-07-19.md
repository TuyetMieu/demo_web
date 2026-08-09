# Audit performance & DB — 2026-07-19

Phạm vi: backend Django + frontend Next.js (Programming_EDU_next) + NeonDB dùng
chung với bản Flask. Mục tiêu chủ dự án: **mọi thứ dưới 500ms**. Thay đổi chi
tiết: `PERF_CHANGES_2026-07-19.md`.

Điều kiện đo: máy dev tại VN, DB Neon us-east-1 (RTT ~250ms), backend
`runserver`, frontend `next start` (production build), curl 6 lần/endpoint bỏ
lần warm-up. **Số tuyệt đối phụ thuộc RTT tới us-east-1** — deploy backend cùng
region với DB thì phần ~460ms nền sẽ còn ~20–50ms; điều giữ được lâu dài là SỐ
ROUND TRIP mỗi endpoint (giờ = 1).

## API — median trước/sau (ms)

| Endpoint | Ban đầu | Sau pool+cache auth | Sau gộp query | Số query |
| --- | ---: | ---: | ---: | :---: |
| `/api/user` | 2.728 | 463 | **464** | 1 |
| `/api/courses-enrolled` | 2.617 | 473 | **476** | 1 |
| `/api/stats` | 2.781 | 707 | **469** | 2→1 |
| `/api/stats/xp-by-course` | 2.590 | 461 | **460** | 1 |
| `/api/skills` | 2.853 | 733 | **470** | 1 + cache 5' |
| `/api/notifications/feed` | 2.845 | 722 | **456** | 2→1 |
| `/api/achievements` | 2.634 | 478 | **458** | 1 |
| `/api/posts?page=1` | 3.740 | 1.513 | **474** | 5→1 |
| `/api/leaderboard?weekly` | 3.676 | 1.480 | **474** | 5→1 |
| `/api/leaderboard?streak` | 3.022 | 959 | **462** | 3→1 |
| `/api/roadmaps` | 2.908 | 720 | **477** | 2→1 |

✅ **11/11 endpoint median < 500ms** (452–488ms). Max thỉnh thoảng ~720ms ở
posts/roadmaps do payload lớn ăn thêm 1 vòng TCP — median vẫn đạt.

## Trang (production build, Playwright)

| Trang | TTFB | FCP | DCL | legacy-ready |
| --- | ---: | ---: | ---: | ---: |
| Landing `/` | 5 | 160 | 22 | 142 |
| Login | 3 | — | 13 | 55 |
| Dashboard | 4 | 116 | 25 | **123** |
| Lesson db_design | 61 | 204 | 190 | **567** (trước: 1.350) |

Lesson db_design 567ms là thời điểm **toàn bộ ~2MB engine JS** (codemirror,
confetti + 4 file lesson_content) chạy xong — first paint chỉ 204ms nên cảm nhận
vẫn nhanh; lượt truy cập sau có browser cache. Muốn ép <500ms nốt: tự host 4 lib
CDN vào `/static/js/vendor/` (bỏ phụ thuộc jsdelivr) — chưa làm, xem phần cuối.

## Load test — 10 rồi 100 người đồng thời

Kịch bản: mỗi người dùng ảo lặp chu trình "mở dashboard" (4 API tuần tự:
`/api/user`, `/api/courses-enrolled`, `/api/stats`, `/api/notifications/feed`),
Node fetch keep-alive, 2.000 request/lượt đo, **0 lỗi ở mọi lượt**.

| Kịch bản | p50 | p90 | p95 | p99 | req/s |
| --- | ---: | ---: | ---: | ---: | ---: |
| 10 VU dồn dập, pool 10 (ban đầu) | 454 | 723 | 989 | 1.316 | 19 |
| 100 VU dồn dập, pool 10 (ban đầu) | 2.573 | 2.711 | 3.878 | 4.892 | 37 |
| 10 VU dồn dập, **pool 40** | 337 | **471** | 513 | 779 | 26 |
| 100 VU dồn dập, pool 40 (ấm) | 808 | 945 | 1.080 | 1.257 | 113,5 |
| **100 VU thực tế** (think ~3s), pool 40 | **269** | **335** | **410** | 615 | 70,6 |

Đọc kết quả:
- **Điểm nghẽn duy nhất là kích thước pool**: mỗi kết nối chỉ phục vụ ~4 query/s
  khi RTT 250ms ⇒ throughput trần = pool × 4. Pool 10 → 39 req/s (100 user xếp
  hàng 2,5s); pool 40 → ~113 req/s. Đã tăng `max_size` 10→40, `min_size` 2→5
  (Neon -pooler cho 64 backend/user+db, chia sẻ với bản Flask — 40 là trần an
  toàn, phần vượt pgbouncer tự xếp hàng, không lỗi).
- **10 người: đạt <500ms tới p90** kể cả khi bấm liên tục không nghỉ.
- **100 người dùng thật (có nghỉ tay ~3s giữa các thao tác): đạt <500ms tới
  p95**, p50 chỉ 269ms.
- Kịch bản 100 người **bấm liên tục 0ms nghỉ** (tương đương ~220 req/s liên
  tục — vượt xa tải thật của 100 người) thì p50 ~800ms: đây là giới hạn vật lý
  RTT×pool, không sửa được bằng code từ VN. Deploy backend cùng region với DB
  thì mỗi query còn 2–5ms và cùng pool 40 phục vụ được hàng nghìn req/s.
- Lưu ý vận hành: pool tăng trưởng ~1,9s/kết nối — sau restart cần ~12s ấm máy
  (`num_workers: 6`) mới đạt throughput trần.

### Vòng bổ sung — chuyển bước ~1,5s (nhanh gấp đôi)

Yêu cầu chủ dự án: user chuyển bước chỉ nghỉ ~1,5s ⇒ offered ~167 req/s.
Chẩn đoán tách lớp tìm trần mới:

| Phép đo | Kết quả | Kết luận |
| --- | ---: | --- |
| URL 404 (không DB, đủ middleware) | 244 req/s, p50 3ms | Django routing khỏe |
| SQL thô 48 kết nối song song | 187,6 q/s, p99 284ms | Neon vô can, tuyến tính hoàn hảo |
| `pg_stat_activity` lúc load | 1 active / 4 backend | Query chỉ 0,1ms server-side — 250ms là đường truyền; pgbouncer ghép kênh cực tốt |
| `/health` qua Django (1 query) | ~115 req/s | **Trần = CPU 1 tiến trình Python (GIL), ~8ms/request** |

⇒ Một process không bao giờ vượt ~115 req/s dù pool to bao nhiêu. Đây là bài
toán **số worker**, đã xử lý:

- `settings.py`: pool đọc từ env `DB_POOL_MIN`/`DB_POOL_MAX` (pool là
  per-process — tổng workers × DB_POOL_MAX ≤ ~56).
- `gunicorn.conf.py` (MỚI): mặc định 4 worker sync (SSE đã gỡ nên không cần
  gthread), ví dụ chạy: `WEB_CONCURRENCY=4 DB_POOL_MAX=14 gunicorn config.wsgi
  -c gunicorn.conf.py`.

Đối chứng trên máy dev (2 instance runserver × pool 24, VU chia round-robin —
mô phỏng gunicorn 2 worker):

| Kịch bản 100 VU, think ~1,5s | p50 | p90 | p99 | req/s |
| --- | ---: | ---: | ---: | ---: |
| 1 tiến trình, pool 48 | 605 | 949 | 1.335 | 84 |
| **2 tiến trình, pool 24×2** | **369** | 585 | 714 | 102 |

0 lỗi cả hai. p90 585ms của bản 2-worker chủ yếu do máy dev gánh cùng lúc 2
server + trình bắn tải + RTT 250ms/query; production 4 worker đặt cạnh DB
(query 2–5ms) thì mọi percentile dưới 100ms. Ghi chú thực tế: trong app thật,
chuyển bước TRONG bài học không gọi API nào (LESSON_CONTENT nằm client-side) —
kịch bản 5 API/1,5s này khắc nghiệt hơn hành vi thật rất nhiều.

## DB Neon — đánh giá tài nguyên & phân bổ bảng

**Kết luận: khỏe.** Tổng 15MB, bảng lớn nhất (`lessons`) 3MB trong đó 2,2MB là
một GIN index không ai dùng. Bảng nghiệp vụ vài chục dòng, autovacuum chạy đều,
phân bổ theo domain hợp lý, cache (`enrollments.progress`) luôn recompute từ
nguồn thật (`lesson_progress`).

Việc nên làm (DDL trên DB chung — **chưa chạy, chờ duyệt**):

```sql
-- 1. GIN index 2.2MB, idx_scan=0, không query nào cần (đã soát cả 2 codebase)
DROP INDEX idx_lessons_content_gin;
-- 2. Trùng hoàn toàn unique constraint user_daily_xp_logs(user_id, log_date)
DROP INDEX idx_daily_xp_user_date;
-- 3. Index chết (idx_scan=0, bảng quá nhỏ để planner dùng)
DROP INDEX idx_courses_title_trgm, idx_courses_tag_trgm,
           idx_courses_subtitle_trgm, idx_courses_level,
           idx_quizzes_status, idx_surveys_user_id;
-- 4. Bảng demo của Neon
DROP TABLE playing_with_neon;
```

- Cụm bảng `neon_auth`/Better-Auth (`user`, `account`, `session`, `member`,
  `organization`, `invitation`, `verification`, `jwks`) trống hoàn toàn — nếu
  không dùng Neon Auth thì xóa cho sạch schema.
- `token_blacklist_outstandingtoken` tăng vô hạn theo mỗi login/refresh → cron
  `manage.py flushexpiredtokens` hàng tuần.
- seq_scan cao ở `users`/`notifications` hiện là **đúng** (bảng vài chục dòng);
  khi `users` vượt vài nghìn hãy thêm index `users(xp DESC)` cho leaderboard.

## Nhiều user cùng online — SSE + rate-limit (ĐÃ XỬ LÝ 2026-07-19)

Hai điểm sẽ gãy khi nhiều user online thật, đã sửa cùng ngày:

1. **SSE `/api/notifications/stream` đã gỡ bỏ.** Mỗi tab mở giữ 1 thread server
   suốt ~1h + poll DB 3s/kết nối: 100 user online = cạn worker gunicorn sync
   (chết hẳn chứ không phải chậm) + 33 query/s nền tự ăn ~30% pool DB + Neon
   không bao giờ autosuspend (nguồn của 13.685 seq scan trên `notifications`).
   Thay bằng `GET /api/notifications/badge` (`{unread, latest}`, 1 query, miễn
   throttle vì là poll nền tự động nhưng vẫn bắt buộc JWT) + client poll 45s
   chỉ khi tab hiển thị (`dashboard.js`). Trễ badge tối đa 45s thay vì 3s —
   chấp nhận được cho chuông thông báo; server hết kết nối treo, deploy không
   cần gthread/gevent nữa.
2. **Rate-limit production nâng lên mức thực tế.** Mức cũ port nguyên từ Flask
   (50/giờ + 200/ngày per-endpoint per-IP, login 5/phút) sẽ 429 cả lớp học dùng
   chung 1 NAT và chặn login từ người thứ 6 lúc đầu giờ. Mức mới: 1000/giờ +
   10000/ngày per-endpoint, login 20/phút, register 10/phút — vẫn chặn được
   scrape/vét cạn per-endpoint.

Load test đối chứng sau khi sửa: 100 VU thực tế (think ~3s), mix 5 API **kèm
badge mỗi vòng ~5s — nặng gấp ~9 lần badge thật 45s**, pool ấm:
**p50 293ms**, p90 630ms, p99 1.004ms, ~79 req/s, **0 lỗi / 2.500 request**.
Smoke Playwright xác nhận dashboard không còn mở EventSource, badge poll chạy,
0 lỗi JS.

## Việc còn lại (theo thứ tự lợi ích)

1. **Deploy backend cùng region với DB** (us-east-1, hoặc dời Neon project về
   ap-southeast-1 gần người dùng VN) — đây là cách duy nhất đưa API xuống
   <100ms cho người dùng thật; code đã tối ưu hết mức 1-RTT rồi.
2. Bỏ `https://cdn.tailwindcss.com` (compiler runtime ~300kB) ở 3 trang lesson
   python/java/htmlcss — build CSS tĩnh bằng Tailwind CLI.
3. Tự host các lib CDN (mermaid, codemirror, confetti, svg-pan-zoom) vào
   `/static/js/vendor/` + `Cache-Control` dài hạn cho `/static/*`.
4. DDL dọn index + cron flushexpiredtokens (mục DB).
