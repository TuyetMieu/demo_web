# pe_usth — hướng dẫn làm việc trong repo này

Nền tảng học lập trình: NestJS 11 + Prisma 7 + PostgreSQL (Neon), Next.js 16 + React 19,
giáo trình Python chạy trong trình duyệt bằng Pyodide. Chi tiết kiến trúc: [README.md](README.md).

## Lệnh hay dùng

```bash
# Backend (từ thư mục gốc)
npm run typecheck          # phải sạch
npx jest --ci              # phải xanh
npm run start:dev          # cổng 5000

# Frontend
cd frontend && npm run typecheck && npm run lint && npm run build
cd frontend && npm run dev # cổng 3000

# Giáo trình Python
py scripts/pe-v3/build.py              # dựng lại 40 bài -> scripts/pe-v3/out/
npm i --no-save pyodide@0.27.7         # cần cho bước dưới
node scripts/pe-v3/check-pyodide.mjs   # chấm thử 233 ca bằng chính bộ chấm của trình duyệt
py scripts/pe-v3/motion.py              # sinh hoạt hình "code chạy từng bước" -> frontend/public/static/motion/*.json
```

Trên Windows dùng `py`, không dùng `python` — `python` là stub của Microsoft Store.

## Mốc nền

Đo ngày 12/10/2026. Đừng để tụt xuống dưới mức này:

| Hạng mục | Mốc |
|---|---|
| Backend typecheck | sạch |
| Backend test | 22 bộ, 161 ca, tất cả đạt |
| Backend lint | 527 lỗi — **mốc trần trong CI là 600, chỉ được hạ** |
| Frontend typecheck | sạch |
| Frontend lint | 0 lỗi, ~180 cảnh báo |
| Frontend unit test | `cd frontend && npm run test:unit` → 40 ca đạt |

## Ràng buộc không được phá

- **DB dùng chung với bản Django cũ.** Migration chỉ được THÊM: thêm cột nullable hoặc có
  default, thêm index. Không đổi tên, không xoá cột, không đổi kiểu.
- **Mật khẩu giữ định dạng hash của Werkzeug** (`scrypt:…`, `pbkdf2:sha256:…`) để bản Django
  vẫn đăng nhập được. Xem `src/common/security/`.
- **Gateway giữ độc quyền prefix/version/CORS/rate-limit.** Module nghiệp vụ viết
  `@Controller('courses')`, không viết `@Controller('api/v1/courses')`. Xem
  [src/api-gateway/README.md](src/api-gateway/README.md).
- **Không `res.json()` thủ công khi lỗi** — `throw` để filter ở gateway định dạng response.

## Những cái bẫy đã gặp

Ghi lại để không ai vấp lại. Mỗi dòng là một lỗi có thật đã sửa hoặc còn mở.

- **Fixture test không giống dữ liệu thật thì test vô dụng.** `quizzes.service.spec.ts` từng
  khẳng định "không bao giờ lộ đáp án" bằng fixture `options: ['a','b']`, trong khi dữ liệu
  thật là mảng object mang cờ `correct` — lỗ lộ đáp án sống sót qua mọi lần chạy test. Khi
  viết test cho dữ liệu đọc từ `content_json`, lấy hình dạng thật từ
  `scripts/pe-v3/out/lessons/*.json`.
- **Chấm bài nằm ở trình duyệt.** Server không chấm lại gì; `POST /lessons/:n/complete` tin
  `quizScore` do client gửi. XP bị chặn trần bằng `lessons.xp_reward` nên không farm vô hạn
  được, nhưng đừng nhầm đây là hệ thống chống gian lận.
- **Bài tra theo `(course_id, sort_order)`, không theo `id`.** Lỗ hổng trùng bài từng tồn tại
  vì `lesson_code` NULL làm ràng buộc unique cũ vô hiệu. Ràng buộc đúng nay nằm trong
  migration `20261012000000_…`; chạy câu kiểm tra dữ liệu trùng trong README trước khi deploy.
- **`style-src 'unsafe-inline'` còn hai nguyên nhân, không phải một.** Chú thích trong
  `frontend/next.config.ts` chỉ nói tới ~70 handler nội tuyến của JS legacy. Nhưng còn 257 chỗ
  dùng `style={{…}}` trong 40 file React — SSR tuần tự hoá chúng thành thuộc tính `style="…"`,
  cũng bị `style-src` chặn. Phải dọn cả hai mới bỏ được chỉ thị này.
- **Pyodide tải lại mỗi lần chạy.** Mỗi lần bấm Chạy/Nộp tạo Worker mới và nạp lại ~10 MB từ
  CDN. Giới hạn 5 giây hiện dựa vào `worker.terminate()`; nếu dùng lại worker thì phải giữ
  được khả năng cắt vòng lặp vô hạn.
- **Hoạt hình lý thuyết là file SINH RA, dễ cũ.** `frontend/public/static/motion/*.json` do
  `scripts/pe-v3/motion.py` chạy thử ví dụ minh hoạ (`step_1.code`) của từng bài. Sửa ví dụ
  minh hoạ (hoặc dựng lại bài) mà quên chạy lại script thì `npm run test:unit` đỏ ở ca "khớp ví
  dụ minh hoạ hiện tại"; còn ở trình duyệt, `motionFor()` tự bỏ hoạt hình khi code lệch. Bài có
  `import`/`open(`/`input(`/thread/fork không có hoạt hình (chủ ý — không chạy từng dòng được).
  Màn "Nhắc lại bài trước" và "Code chạy từng bước" chèn thêm vào đầu luồng nên bản nháp lưu theo
  chỉ số màn của người đang học dở sẽ lệch 1–2 màn (khoá màn `done`/`games` thì ổn định).
- **Hai nguồn danh sách bài.** Trang khoá học đọc `frontend/src/lib/curricula.json` (file tĩnh,
  chép tay từ `scripts/pe-v3/out/curriculum-python.json`), còn nội dung bài đọc từ DB. Sau mỗi
  lần seed phải kiểm hai nguồn có lệch không.
- **`prisma/seed-courses.js` vẫn tạo 40 bài rỗng mã `python-1…python-40`.** Chạy nhầm sau khi
  seed v3 sẽ sinh bài trùng thứ tự.
- **527 lỗi lint backend KHÔNG phải lỗi định dạng.** Đã đo: chỉ 6% chạy `--fix` là xong. 89%
  là nhóm `no-unsafe-*` (290 member-access, 120 call, 59 assignment, 14 return) — `any` chảy
  xuyên qua code ở các trang chuyển từ bản Django. Dọn là việc đặt lại kiểu ở ranh giới dữ
  liệu, làm dần từng module rồi hạ mốc trần trong `ci.yml`.
- **Server biết "đã hoàn thành", không biết "đã nộp".** Ở 5 bài cửa tự kiểm tra, lời giải mẫu
  bị giữ lại tới khi bài được ghi nhận hoàn thành, mà frontend chỉ nạp nội dung một lần lúc mở
  bài. Nên học viên nộp xong trong cùng phiên phải tải lại trang mới thấy lời giải. Cách sửa
  đúng nằm ở frontend: nạp lại nội dung sau `POST /lessons/:n/complete`, hoặc dùng cờ
  `solutionWithheld` để xin lời giải khi cần.

## Quy ước khi sửa

- Chú thích bằng tiếng Việt, giải thích **vì sao**, thường dẫn ra lỗi đang sửa. Đọc code quanh
  chỗ sắp sửa và viết cùng giọng.
- Test phải chứng minh được là nó bắt lỗi: gỡ bản sửa ra, test phải trượt. Ghi số ca trượt vào
  mô tả commit.
- Mỗi commit một việc, mô tả nói rõ triệu chứng → nguyên nhân → cách sửa.
- Thay đổi làm đổi hành vi người dùng thấy được thì nói thẳng trong mô tả commit.
