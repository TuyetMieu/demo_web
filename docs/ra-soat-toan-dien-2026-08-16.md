# Báo cáo rà soát toàn diện — PE_nest_next_js

> **Ngày:** 16/08/2026 · **Branch:** `test-usth` · **Phạm vi:** backend NestJS 11 + Prisma 7 (root) và frontend Next.js 16.2.10 (`frontend/`)
>
> **Phương pháp:** 10 tác nhân AI chạy song song — 5 tác nhân rà soát chính → 3 tác nhân kiểm chứng đối kháng (mở lại từng file/ảnh để xác nhận hoặc bác bỏ) → 2 tác nhân tổng hợp. Tổng cộng 455 lượt dùng tool, ~1,26 triệu token, 21 phút.
>
> **Skill sử dụng:** `ui-ux-pro-max` (+ `ui-styling`, `design-system`) cho frontend; `fullstack-dev-skills` (`security-reviewer`, `secure-code-guardian`, `nestjs-expert`, `code-reviewer`, `nextjs-developer`, `react-expert`, `api-designer`, `fullstack-guardian`) cho backend/tích hợp.
>
> **Design đối chiếu:** `Components.png`, `Dashboard.png`, `Filter.png`, `other.png` + bộ *Coding Website – UI Kit (Community)*: `DashBoard.png`, `Dashboard Navigation.png`, `Landing Page Navigation.png`.

## Sơ đồ tác nhân

| Tác nhân | Vai trò | Phạm vi |
|---|---|---|
| **W1** | Rà soát chính | Bảo mật backend: auth/JWT/OAuth, IDOR, rò rỉ lỗi, rate limit, secrets |
| **W2** | Rà soát chính | Logic backend: filter order, route conflict, transaction/race, P2002, module chết |
| **W3** | Rà soát chính | UI so với design Figma: token màu, dashboard, bộ component, filter, responsive |
| **W4** | Rà soát chính | UX frontend: loading/error state, form, điều hướng, accessibility, chuẩn Next 16 |
| **W5** | Rà soát chính | Tích hợp FE↔BE: contract API, auth flow, port/env/CORS, e2e, vệ sinh repo |
| **V1** | Bắt lỗi | Kiểm chứng toàn bộ findings của W1 + W2 |
| **V2** | Bắt lỗi | Kiểm chứng toàn bộ findings của W3 + W4 (mở lại cả ảnh Figma) |
| **V3** | Bắt lỗi | Kiểm chứng W5 + double-check mọi finding critical/high của W1–W4 + soi mâu thuẫn |
| **S1** | Tổng hợp | Viết báo cáo chi tiết (Phần B) |
| **S2** | Tổng hợp | Viết phần quy trách nhiệm "ai sai, ai bắt" (Phần A) |

**Kết quả tổng:** 52 findings → 50 CONFIRMED · 1 INACCURATE (đã hiệu chỉnh) · 1 REFUTED (loại bỏ) · +5 vấn đề bị bỏ sót do verifier phát hiện thêm. Phân bố sau kiểm chứng: **0 critical / 11 high / 23 medium / 17 low** (chưa tính 5 phát hiện bổ sung: 4 high, 1 medium).

---

# Phần A — Tác nhân nào làm sai & ai bắt được

## Bảng điểm độ tin cậy các tác nhân

| Worker | Tổng findings | CONFIRMED | INACCURATE | REFUTED | Tỷ lệ chính xác | Ghi chú |
|---|---|---|---|---|---|---|
| W1 | 11 | 11 | 0 | 0 | 100% | W1-01 được cả V1 và V3 double-check, cùng phán CONFIRMED — không mâu thuẫn |
| W2 | 10 | 10 | 0 | 0 | 100% | W2-01, W2-02 được V3 double-check, cùng phán CONFIRMED |
| W3 | 11 | 10 | 1 | 0 | 90,9% | W3-01/02/03 được V3 double-check, cùng phán CONFIRMED; W3-04 bị V2 hiệu chỉnh |
| W4 | 12 | 12 | 0 | 0 | 100% | W4-01/02/03 được V3 double-check, cùng phán CONFIRMED |
| W5 | 8 | 7 | 0 | 1 | 87,5% | W5-03 bị V3 bác bỏ hoàn toàn |

Không có finding nào bị 2 verifier phán khác nhau — mọi lượt double-check của V3 đều trùng phán quyết với V1/V2.

## Chi tiết tác nhân làm sai và ai bắt được

**1. W3-04 — INACCURATE (bắt bởi V2)**
- **Worker sai:** W3, finding "Không có bộ component dùng chung — thiếu trạng thái disabled".
- **Sai cái gì:** Claim gốc trong impact: *"bấm nút Đăng nhập lúc đang submit không có phản hồi thị giác disabled"*. Ngoài ra sai chi tiết nhỏ: nói src/components có 11 file (thực tế 10), và `.fcb-submit-btn` trích dòng 700-701 trong khi định nghĩa thật ở edu-dashboard.css:689 (700-701 chỉ là hover/disabled).
- **Bằng chứng hiệu chỉnh:** `login.inline.js:157-165` — hàm `setLoading()` ĐÃ disable nút, đổi chữ thành "Đang đăng nhập..." và hiện spinner; chỉ thiếu style CSS `:disabled` (opacity mờ) theo mẫu Components.png. Phần lõi finding (không có `src/components/ui`, 4 định nghĩa nút trùng lặp, grep `:disabled` = 0 trong login.css/edu-auth.css) vẫn đúng, severity medium giữ nguyên.
- **Bài học:** Khi kết luận "thiếu phản hồi UI", phải kiểm tra cả lớp JS xử lý hành vi chứ không chỉ grep CSS.

**2. W5-03 — REFUTED (bắt bởi V3)**
- **Worker sai:** W5, finding "frontend/.env.local đang bị git track dù frontend/.gitignore đã có rule .env*".
- **Sai cái gì:** Claim gốc: *"`git ls-files frontend | Select-String '\.env'` trả về `frontend/.env.local` (file đang được track)... file được add TRƯỚC khi rule tồn tại"*. Fix guidance đề xuất `git rm --cached` cho một file không hề nằm trong index; chi tiết phụ "frontend/.env.example đã được track từ trước" cũng sai.
- **Bằng chứng bác bỏ:** V3 tự chạy `git ls-files frontend/.env.local` và `git ls-files | Select-String '.env'` → chỉ có duy nhất `.env.example` ở root được track; `frontend/.env.local` tồn tại trên đĩa nhưng KHÔNG trong index, `git status --short` rỗng — rule `frontend/.gitignore:34` (`.env*`) đang hoạt động đúng như thiết kế.
- **Bài học:** Bằng chứng dạng lệnh git phải được chạy thật và trích output nguyên văn, không được suy đoán từ sự tồn tại của file trên đĩa.

## Bỏ sót bị phát hiện

| Worker sót | Verifier tìm ra | Bỏ sót | Severity |
|---|---|---|---|
| W1 | V1 | **Account pre-hijacking:** register không xác minh email (bảng email_verifications không được dùng) + `validateOAuthLogin` auto-link provider vào tài khoản trùng email có `oauthProvider: null` (auth.service.ts:182-198) → kẻ tấn công đăng ký trước bằng email nạn nhân, nạn nhân login Google là bị link vào tài khoản kẻ tấn công. | high |
| W2 | V1 | **Farm XP/gems vô hạn:** completeLesson chỉ chặn `lessonCount > 0 && lessonNo > lessonCount` (lessons.service.ts:135-139) — khoá lessonCount=0 (createCourse mặc định) cho phép lặp N=1,2,3... mỗi lần +50 XP +50 gems, resolveLesson tự tạo lesson rác và không sync lessonCount. | high |
| W3 | V2 | **Contrast WCAG fail (đo được, không còn là nghi vấn):** `--edu-t5: #8b87a0` chỉ đạt ≈3.5:1, `--edu-t4: #7c7894` ≈4.2:1 trên nền trắng — cả hai dưới ngưỡng AA 4.5:1, dùng khắp form đăng nhập/dashboard/leaderboard. W3 có nghi ngờ trong coverage_notes nhưng không đo. | high |
| W4 | V2 | **Tab Diễn đàn kẹt "Đang tải..." vĩnh viễn:** `renderPosts` trong dashboard.js:873-876 `Promise.all(...)` không có `.catch` — cùng lớp lỗi với W4-03 nhưng nằm trong vùng W4 tự khai chưa soát. | high |
| W5 | V3 | **handleFetch đọc sai contract lỗi:** main.js:680-686 đọc `body.message` trong khi backend trả `body.error.message` (all-exceptions.filter.ts:112) → mọi lỗi qua handleFetch thoái hoá thành "HTTP 400"/"HTTP 429". W5 đã soát pattern parse lỗi của main.js nhưng sót nhánh throw này. | medium |

V3 không ghi nhận mục "MÂU THUẪN:" nào giữa các worker.

## Nhận xét

Nhóm worker backend (W1, W2) làm việc chính xác tuyệt đối trong phạm vi đã soát — 21/21 findings được xác nhận với trích dẫn file:line đúng nguyên văn — nhưng cả hai đều để lọt một lỗ hổng high ngay trong vùng mình phụ trách (pre-hijacking OAuth và farm XP lessonCount=0), cho thấy điểm yếu nằm ở độ phủ kịch bản tấn công chứ không phải độ chính xác. W4 là worker đáng tin nhất lần chạy này: 12/12 CONFIRMED, bằng chứng chi tiết, và tự khai vùng chưa soát trung thực (lỗ hổng forum bị sót đúng nằm trong vùng đã khai). W5 kém tin nhất: là worker duy nhất có finding bị REFUTED hoàn toàn do bịa/suy đoán output lệnh git, dù 7 finding còn lại chất lượng tốt. Nhóm verifier làm việc nghiêm túc — đều tự chạy lại lệnh, mở file và ảnh design để đối chứng; đặc biệt V3 vừa bắt được finding sai duy nhất bị bác bỏ vừa double-check 8 finding critical/high của W1-W4 mà không phát hiện mâu thuẫn nào, và V2 là verifier duy nhất hiệu chỉnh một claim tưởng-đúng bằng cách đọc chéo sang lớp JS.

---

# Phần B — Báo cáo chi tiết

## Tóm tắt điều hành

Dự án PE_nest_next_js (backend NestJS + frontend Next.js port từ template Flask) có nền tảng khá vững: validation global, refresh token rotation, raw SQL tham số hoá, 95/95 unit test pass, ~40 endpoint FE↔BE khớp path/method, và bộ theme tím pastel đã tái tạo công phu theo Figma. Tuy nhiên đợt audit 5 hướng ghi nhận **52 finding**, sau kiểm chứng bởi 3 verifier còn **51 finding hợp lệ** (1 bị bác bỏ — W5-03, không đưa vào báo cáo; 1 được hiệu chỉnh — W3-04). Phân bố severity sau kiểm chứng: **0 critical / 11 high / 23 medium / 17 low**. Ngoài ra các verifier phát hiện thêm **5 vấn đề bị bỏ sót** (4 high, 1 medium — xem mục 6), trong đó có 2 lỗ hổng nghiêm trọng về auth và XP integrity. Không có lỗi nào ở mức "cháy nhà", nhưng cụm auth (mật khẩu plaintext legacy, refresh token phía FE, quên-mật-khẩu giả) và vệ sinh repo cần xử lý trước khi nghĩ tới production.

Top 5 việc cần sửa NGAY:
1. **W1-01** — Migrate toàn bộ mật khẩu legacy plaintext trong DB sang scrypt hash.
2. **W5-01** — apiFetch không lưu refresh token mới sau rotation + không dedupe → user bị đăng xuất oan sau 30 phút.
3. **W4-01 / W5-06** — Nút "Quên mật khẩu?" báo "Email đã được gửi!" nhưng không gọi API nào — UI lừa người dùng ở luồng khôi phục tài khoản.
4. **W2-02** — Xoá khoá học ở trang admin nổ lỗi FK P2003 với mọi khoá từng có người học.
5. **W5-02** — .gitignore ignore nhầm cả `test/`, `scripts/`, `docs/` — toàn bộ e2e backend và scripts không hề được version control (rủi ro mất trắng như sự cố `git reset --hard` trước đây).

## 1. Bảo mật backend

**[W1-01] Mật khẩu legacy vẫn lưu và so sánh dạng plaintext trong DB** — 🟠 high — `src/common/security/check-password.ts:22`, `src/auth/auth.service.ts:243`
`check-password.ts:22-23` so sánh trực tiếp chuỗi lưu trong DB với mật khẩu nhập vào (comment xác nhận "Legacy: mật khẩu cũ lưu plaintext"); `upgradeLegacyPasswordIfNeeded` chỉ re-hash KHI user đăng nhập thành công. Ảnh hưởng: user chưa đăng nhập lại từ khi migrate vẫn có mật khẩu plaintext vô thời hạn — DB/backup lộ là lộ nguyên văn mật khẩu (OWASP A02, rủi ro credential-stuffing).
Cách sửa: viết script one-off trong `scripts/` (ts-node): (1) query users có password không bắt đầu bằng `scrypt:`/`pbkdf2:` và khác rỗng; (2) từng user gọi `WerkzeugScryptHasher.encode(passwordPlaintext)` rồi update (batch 100 user/lần); (3) log số lượng đã migrate. Chạy xong trên production thì xoá nhánh plaintext trong `checkPassword` (thay bằng `return false`). Giữ `upgradeLegacyPasswordIfNeeded` thêm 1-2 release rồi xoá.

**[W1-02] OAuth Google/Facebook không dùng state param — lộ diện login CSRF** — 🟡 medium — `src/common/guards/jwt-auth/google.strategy.ts:14`, `facebook.strategy.ts:14`, `src/auth/auth.controller.ts:91`
Cả hai strategy chỉ có clientID/clientSecret/callbackURL/scope, không `state`; app không có session middleware. Kẻ tấn công lấy authorization code của tài khoản CỦA HẮN rồi lừa nạn nhân mở `/auth/google/callback?code=...` — nạn nhân nhận JWT của tài khoản kẻ tấn công (login CSRF, RFC 6749 §10.12).
Cách sửa: tự cài state bằng cookie không cần session store — implement custom StateStore của passport-oauth2: `store(req, cb)` sinh 32 bytes random, set cookie httpOnly + SameSite=Lax rồi `cb(null, state)`; `verify(req, providedState, cb)` so cookie với state rồi xoá cookie. Truyền instance vào option `store` của `super()` ở cả 2 strategy; đăng ký `cookieParser()` trong main.ts. Viết e2e: callback thiếu/sai state phải 403.

**[W1-03] Refresh rotation không có trần tuổi thọ tuyệt đối, không thu hồi chuỗi phiên khi phát hiện reuse** — 🟡 medium — `src/auth/refresh-token.service.ts:84,93`
Mỗi lần rotate cấp token mới 8h đầy đủ (phiên bị trộm sống vô thời hạn); token đã revoked bị dùng lại chỉ nhận 401 trơn — không thu hồi nhánh còn sống, kẻ trộm rotate trước sẽ chiếm phiên.
Cách sửa: thêm cột `familyId` (uuid sinh lúc login) và `absoluteExpiresAt` vào AuthSession. `issue()` nhận thêm 2 tham số — login mới sinh mới (absolute = now + 30 ngày, env `JWT_REFRESH_ABSOLUTE`), rotate kế thừa. Trong `rotateAndBlacklist`: (a) tìm theo hash KHÔNG lọc revokedAt — nếu revokedAt != null là REUSE → revoke toàn bộ session cùng familyId rồi throw; (b) quá absoluteExpiresAt thì từ chối; (c) token mới giữ nguyên familyId/absoluteExpiresAt. Cập nhật spec.

**[W1-04] Quyền admin đọc từ claim role trong JWT — thu hồi quyền không có hiệu lực tức thì** — 🟡 medium — `src/common/guards/admin/admin.guard.ts:18`, `jwt.strategy.ts:51`, `src/auth/auth.service.ts:230`
`jwt.strategy` đã fetch user DB nhưng lại `return payload;` — role lấy từ token ký lúc login. Admin bị hạ quyền vẫn giữ toàn bộ `/api/admin/*` tới khi access token hết hạn (mặc định 30m).
Cách sửa: trong `JwtStrategy.validate()` đổi return thành `{ sub: payload.sub, email: user.email, role: user.role }` (user tươi từ DB, cache 60s). Khi có endpoint đổi role nhớ gọi `cachedUsers.invalidate(id)`. Không cần sửa AdminGuard; kiểm tra các chỗ đọc `req.user` để chắc shape không đổi.

**[W1-05] GET /auth/logout nhận refresh token qua query string** — 🟡 medium — `src/auth/auth.controller.ts:70`, `src/api-getway/api-getway.setup.ts:25`
Refresh token 8h đi qua URL → lọt access log proxy/CDN, browser history, Referer; logout GET còn bị CSRF logout.
Cách sửa: nếu buộc giữ GET: bỏ `@Query('refresh')`, chỉ trả `{ ok: true }`; sửa frontend để mọi luồng logout gọi POST /auth/logout với body `{ refresh }`. Nếu bỏ được GET thì xoá handler và đổi `RequestMethod.ALL` thành POST trong PREFIX_EXCLUDED. Token đã lỡ nằm trong log cũ: coi như lộ, TTL 8h tự vô hiệu.

**[W1-06] Kill-switch THROTTLE_DISABLED tắt toàn bộ rate limit bằng một biến env, không ràng buộc môi trường** — 🟡 medium — `src/common/guards/throttler/custom-throttler.guard.ts:28`, `src/config/env.validation.ts:3`
`shouldSkip` return true khi `THROTTLE_DISABLED === 'true'`, Joi không khai báo biến này — một dòng env đặt nhầm là production mất sạch chống brute-force/spam/DoS.
Cách sửa: (1) chỉ skip khi đồng thời `NODE_ENV !== 'production'`; (2) thêm vào envValidationSchema: `NODE_ENV` valid('development','test','production') và `THROTTLE_DISABLED` valid('true','false') kèm `.when('NODE_ENV', { is: 'production', then: Joi.valid('false') })` để app từ chối khởi động. Cập nhật log bootstrap trong main.ts.

**[W1-07] UpdatePostDto/UpdateCommentDto không giới hạn độ dài — lách trần 10.000 ký tự của create** — ⚪ low — `src/forum/forum.module.ts:46,81`
Update DTO chỉ `@IsString`, trong khi Create chặn MAX_CONTENT=10_000/MAX_TITLE=300 — PUT với content ~1MB nhét được khối gấp 100 lần giới hạn vào DB.
Cách sửa: thêm `@MaxLength(MAX_CONTENT)` cho content, `@MaxLength(MAX_TITLE)` cho title, giới hạn category (~50) vào UpdatePostDto; `@MaxLength(MAX_CONTENT)` vào UpdateCommentDto — dùng lại hằng và message tiếng Việt sẵn có.

**[W1-08] Chính sách mật khẩu không nhất quán: đổi mật khẩu chỉ cần 6 ký tự, không có trần độ dài** — ⚪ low — `src/user/dto/user.dto.ts:52`, `src/auth/dto/register.dto.ts:48`
Register đòi 8..128, ChangePassword chỉ `@MinLength(6)` không MaxLength — hạ được chuẩn chung, mật khẩu 1MB đi thẳng vào scrypt.
Cách sửa: field `new` của ChangePasswordDto đổi thành `@MinLength(8)` + `@MaxLength(128)`; field `current` thêm `@MaxLength(128)`. Min 8 chỉ áp cho mật khẩu MỚI nên user cũ mật khẩu ngắn vẫn xác nhận được.

**[W1-09] CSP của API dùng script-src 'unsafe-inline' cùng loạt CDN không cần thiết** — ⚪ low — `src/common/middleware/security-headers/security-headers.middleware.ts:6`
CSP copy từ app render HTML áp cho backend chỉ trả JSON — 'unsafe-inline' vô hiệu hoá chính lớp chống XSS nếu có response bị render như HTML.
Cách sửa: thay CONTENT_SECURITY_POLICY bằng `default-src 'none'; frame-ancestors 'none'`; giữ X-Content-Type-Options, Referrer-Policy, HSTS. Nếu sau này có trang HTML thật (Swagger) thì thêm CSP riêng cho route đó.

**[W1-10] SaveRoadmapDto nhận nodes/edges/mermaid_def hoàn toàn không kiểm tra kiểu và kích thước** — ⚪ low — `src/roadmap/roadmap.module.ts:27`
`nodes?: unknown; edges?: unknown` không decorator, title/mermaid_def không MaxLength — client lưu blob ~1MB mỗi lần bấm lưu; mermaid_def có thể thành kênh stored XSS nếu FE render không sanitize.
Cách sửa: thêm `@MaxLength` cho title (~200) và mermaid_def (~20_000); nodes/edges thêm `@IsArray()` + custom validator giới hạn `JSON.stringify(value).length <= 100_000` (hoặc check trong service, ném BadRequestException). FE: render mermaid với securityLevel 'strict', không `dangerouslySetInnerHTML` SVG chưa sanitize.

**[W1-11] Access + refresh token trả về frontend qua URL fragment trong OAuth callback** — ⚪ low — `src/auth/auth.controller.ts:112,145`
Fragment không lên server log nhưng vẫn nằm trong browser history, extension đọc được — pattern implicit-flow mà OAuth 2.0 Security BCP khuyến nghị bỏ.
Cách sửa: nâng cấp one-time exchange code: lưu cặp token theo mã ngẫu nhiên 32 bytes dùng-một-lần (TTL 60s); callback redirect `#code=<mã>`; thêm POST /auth/exchange (Public, throttle chặt) nhận {code} trả token rồi xoá mã; FE đọc code, gọi exchange, `history.replaceState` xoá fragment. Tối thiểu: bảo đảm trang callback FE `history.replaceState` ngay khi đọc xong.

## 2. Logic backend & xung đột tính năng

**[W2-01] rateCourse không đồng bộ cột courses.rating — hai endpoint trả rating mâu thuẫn vĩnh viễn** — 🟠 high — `src/courses/courses.service.ts:210,351`, `prisma/schema.prisma:118`
rateCourse chỉ upsert `course_ratings`, trong khi `mapCourse` trả `c.rating` đọc cột tĩnh của bảng courses — user đánh giá 5 sao nhưng card khoá học hiện rating seed cũ mãi mãi.
Cách sửa: trong rateCourse bọc vào `$transaction`: sau upsert, gọi `tx.courseRating.aggregate({ _avg })` rồi `tx.course.update({ data: { rating: avg làm tròn 1 chữ số } })`. (Phương án bỏ cột tĩnh khỏi response tốn thêm query cho listCourses nên đồng bộ khi ghi hợp lý hơn.)

**[W2-02] deleteCourse của course-admin nổ P2003 vì không dọn lesson_progress / course_ratings / missions** — 🟠 high — `src/course-admin/course-admin.module.ts:241`, `src/courses/courses.service.ts:191`, `prisma/schema.prisma:188`
Guard chỉ chặn theo enrollment count, nhưng unenroll GIỮ lesson_progress theo thiết kế và các FK không cascade — kịch bản enroll→học→unenroll→xoá khoá nổ P2003; tính năng xoá khoá gần như chết với mọi khoá từng có người học.
Cách sửa: mở rộng transaction xoá theo thứ tự phụ thuộc: (1) `tx.reviewQuizResult.deleteMany({ where: { quiz: { courseId } } })` rồi `tx.quiz.deleteMany` (đừng dựa vào onDelete Cascade trong schema — DB thật dùng chung Django có thể không có CASCADE); (2) `tx.lessonProgress.deleteMany`; (3) `tx.courseRating.deleteMany`; (4) `tx.mission.deleteMany`; (5) `tx.lesson.deleteMany` rồi `tx.course.delete`. Cân nhắc thêm xác nhận ở FE vì xoá cả lịch sử học.

**[W2-03] submitQuiz kiểm tra status ngoài transaction, không compare-and-set — nộp đôi khi 2 request song song** — 🟡 medium — `src/quizzes/quizzes.service.ts:249,274`
Check `status === 'submitted'` ngoài tx, update trong tx vô điều kiện — double-click tạo 2 bản ghi review_quiz_results, lệch trọng số quiz ôn tập, lịch sử trùng dòng. Trái ngược với completeLesson/completeMission đã dùng đúng CAS.
Cách sửa: trong tx thay `tx.quiz.update` bằng `tx.quiz.updateMany({ where: { id: quizId, status: 'generated' }, data: { status: 'submitted' } })` đặt TRƯỚC `tx.reviewQuizResult.create`; nếu `claimed.count === 0` thì throw ConflictException để request thua rollback. Giữ check sớm ngoài tx làm fast-path.

**[W2-04] Chốt chặn XP đôi của resolveLesson phụ thuộc unique index chỉ tồn tại trong file SQL chạy tay** — 🟡 medium — `src/lessons/lessons.service.ts:64`, `prisma/optional-indexes.sql:43`, `prisma/schema.prisma:155`, `src/course-admin/course-admin.module.ts:275`
`uq_lessons_course_sort` nằm trong file "KHÔNG chạy tự động"; `@@unique([courseId, lessonCode])` không chặn vì lessonCode NULL. Nếu index chưa áp: 2 request completeLesson song song cộng XP/streak hai lần; admin createLesson cũng tạo được 2 bài cùng sort_order.
Cách sửa: (1) kiểm tra ngay trên DB thật: `SELECT indexname FROM pg_indexes WHERE indexname='uq_lessons_course_sort';` — chưa có thì chạy lệnh trong optional-indexes.sql (dọn dữ liệu trùng trước theo hướng dẫn trong file); (2) ghi vào README/tài liệu deploy như bước BẮT BUỘC; (3) createLesson thêm `findFirst({ where: { courseId, sortOrder } })` và ném ConflictException 409 nếu trùng.

**[W2-05] Leaderboard weekly cắt tuần theo CURRENT_DATE của DB (UTC) trong khi log_date theo Asia/Ho_Chi_Minh** — 🟡 medium — `src/leaderboard/leaderboard.service.ts:31`, `src/common/streak/streak.service.ts:16,34`
Từ 00:00–07:00 sáng thứ Hai giờ VN, `date_trunc('week', CURRENT_DATE)` trả thứ Hai TUẦN TRƯỚC — leaderboard tuần không reset đúng lúc, lệch với ranh giới ngày của streak/daily-quiz.
Cách sửa: tính mốc đầu tuần phía Node theo cùng logic toStudyDate: viết helper `startOfStudyWeek()` (lấy toStudyDate() hôm nay, lùi về thứ Hai bằng getUTCDay()), rồi đổi WHERE thành `l.log_date >= ${weekStart}` (Prisma.sql tham số hoá Date) — giữ nguyên index và đồng nhất định nghĩa "tuần" với "ngày" toàn hệ thống.

**[W2-06] completeMission bỏ qua kiểm tra correct_condition khi client không gửi condition** — 🟡 medium — `src/stats/stats.service.ts:129`, `src/stats/stats.controller.ts:58`
Điều kiện `body.condition &&` khiến phép so khớp bị skip khi không gửi trường condition — POST `{mission_id: 'python'}` trần là nhận đủ XP + 10 gems không cần đáp án (thiệt hại có trần nhờ CAS isActive, nhưng logic điều kiện vô hiệu).
Cách sửa: bỏ vế `body.condition &&`: `if (mission.correctCondition && mission.correctCondition !== body.condition) throw new BadRequestException(...)`. Trước khi siết, kiểm tra 4 trang bài học FE có luôn gửi condition không để tránh phá luồng hợp lệ.

**[W2-07] user_daily_xp_logs không có unique (user_id, log_date) — findFirst-rồi-create tạo dòng trùng khi ghi song song** — ⚪ low — `prisma/schema.prisma:310`, `src/lessons/lessons.service.ts:250`, `src/stats/stats.service.ts:180`
Hai transaction song song cùng user cùng ngày tạo 2 dòng trùng; SUM leaderboard vẫn đúng nhưng dữ liệu rác tích luỹ, tính năng tương lai đọc "log ngày X" bằng findFirst sẽ thiếu số.
Cách sửa: thêm `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_daily_xp_user_date ON user_daily_xp_logs (user_id, log_date);` vào optional-indexes.sql (gộp SUM các dòng trùng về 1 dòng trước). Sau đó thêm `@@unique([userId, logDate])` vào schema và thay khối findFirst/update/create ở CẢ HAI file bằng `tx.userDailyXpLog.upsert` theo composite key.

**[W2-08] fetchTopBy trộn ROW_NUMBER (danh sách top) với COUNT+1 (hạng của mình) — mâu thuẫn khi đồng điểm** — ⚪ low — `src/leaderboard/leaderboard.service.ts:73,82,37`
Ba ngữ nghĩa xếp hạng trộn lẫn: đồng điểm quanh ranh giới top 20 cho "hai người cùng hạng 20 nhưng chỉ một trong danh sách"; tab weekly lại theo luật RANK khác.
Cách sửa: chọn MỘT ngữ nghĩa (khuyến nghị RANK cho khớp weekly): đổi ROW_NUMBER() thành RANK() trong query top; giữ COUNT(*)+1 cho "me" (chính là RANK). Thêm tie-breaker `ORDER BY value DESC, id ASC`. Kiểm tra `buildResponse` filter `rank <= TOP_N` khi RANK tạo nhiều người cùng hạng 20 (danh sách có thể dài hơn — quyết định cắt hay giữ).

**[W2-09] pickRoadmapTemplate trả chuỗi multi-select ('python, java') khiến lọc template theo title gần như không bao giờ khớp** — ⚪ low — `src/user/pick-roadmap-template.ts:11`, `src/user/dto/user.dto.ts:62`, `src/roadmap/roadmap.module.ts:64`
Người chọn 2+ ngôn ngữ sinh preferred = 'python, java' → filter luôn rỗng, rơi về fallback trả toàn bộ templates — pipeline khảo sát→template chết lặng lẽ với đa số user, title roadmap thành "Lộ trình python, java".
Cách sửa: trong pickRoadmapTemplate, `norm()` thêm bước `v.split(',')[0].trim()` lấy phần tử đầu làm template chính. Ở RoadmapService.getRoadmaps cân nhắc lọc theo TỪNG token với `some()` thay vì includes nguyên chuỗi. Viết unit test cho input 'python, java'.

**[W2-10] Giới hạn "mỗi ngày một đề ôn" là read-then-act và chỉ neo vào lần NỘP** — ⚪ low — `src/quizzes/quizzes.service.ts:99,104`
Hai request generate song song đều qua (tạo 2 đề, nộp được cả 2); đề chưa nộp không bị đếm nên tích rác trong bảng quizzes.
Cách sửa: trong generateDailyReviewQuiz kiểm tra thêm quiz status='generated' tạo trong ngày và TRẢ LẠI chính quiz_id đó (idempotent — giải quyết cả rác lẫn race); tuỳ chọn thêm check "đã có reviewQuizResult hôm nay" trong cùng transaction CAS của submitQuiz (kết hợp fix W2-03).

## 3. Giao diện so với design Figma

**[W3-01] Màu accent tím bị hardcode ~130 lần ở 16 file thay vì đi qua token** — 🟠 high — `frontend/public/static/css/edu-auth.css:74`, `edu-dashboard.css:332`, `edu-landing.css:59`, `frontend/public/static/js/pages/interface.tailwind.js:12`
Grep ra ~130 kết quả rgba(185,63,240)/`#b93ff0`/`#c04af5`/`#e08cf9` trong khi edu-theme.css đã có `--edu-accent`/`--edu-accent-grad` (nhưng thiếu token cho biến thể alpha/gradient phụ). Đã lệch thực tế: logo dùng `#c04af5→#e396fb` còn token là `#c04af5→#e08cf9`.
Cách sửa: (1) bổ sung token phái sinh vào `:root` edu-theme.css: `--edu-accent-glow-16/-28/-32/-44`, `--edu-accent-border`; (2) tìm-thay từng file đổi giá trị thô sang `var(...)`; (3) gom 4 file `*.tailwind.js` về 1 file config chung để hex chỉ còn 1 chỗ; (4) thêm comment quy định "mọi màu tím phải đi qua --edu-*".

**[W3-02] Design chỉ là "lớp sơn đè": 2 hệ token xung đột, theme neon/đỏ/xanh cũ vẫn nằm dưới** — 🟠 high — `theme.css:20-25`, `edu-theme.css:64-98`, `login.css:366`, `dark-mode.css:108-110`, `frontend/src/app/layout.tsx:33-48`
theme.css vẫn giữ hệ cũ accent xanh, edu-theme.css làm cầu re-point toàn bộ; bên dưới login.css/.dark-mode.css còn gradient đỏ; layout.tsx phải dựng cơ chế 'pe-anchor' ghim precedence. Quên 1 href hoặc trang mới không kèm override là lộ nguyên theme cũ; mỗi thay đổi phải tra 3 lớp.
Cách sửa (không cần big-bang): (1) đổi giá trị gốc `--accent/--blue/--purple/--radius` trong theme.css về thẳng giá trị edu rồi xoá khối bridge — theme.css thành nguồn token duy nhất; (2) mỗi lần sửa trang nào thì xoá hẳn rule legacy bị override 100% (vd `.btn-bg` đỏ ở login.css); (3) viết checklist trong frontend/AGENTS.md: "trang mới bắt buộc nạp edu-theme.css trước file edu-* của trang".

**[W3-03] 4 trang lesson/interface nạp Tailwind qua CDN runtime — hệ styling thứ 3, không production-safe** — 🟠 high — `frontend/src/app/(standalone)/interface/page.tsx:17`, `lesson/python/page.tsx:17`, `lesson/java/page.tsx:15`, `lesson/htmlcss/page.tsx:15`
Tailwind Play CDN compile CSS bằng JS mỗi lượt vào trang (FOUC, chậm, hỏng khi offline); edu-lesson.css phải viết counter-rule `!important` đè utility class.
Cách sửa: cài tailwindcss thật (`pnpm add -D tailwindcss @tailwindcss/postcss`), tạo file CSS build sẵn chỉ import cho 4 route này (content trỏ 4 page.tsx); chuyển config trong `*.tailwind.js` (fontFamily, colors.brand) vào tailwind config; bỏ 2 phần tử CDN khỏi SCRIPTS. Kiểm tra lại edu-lesson.css vì thứ tự thắng/thua có thể đổi.

**[W3-04] Không có bộ component dùng chung — mỗi trang tự định nghĩa button/tab, thiếu style :disabled và biến thể outline của design** *(đã hiệu chỉnh bởi V2)* — 🟡 medium — `frontend/src/components/`, `edu-auth.css:87-97`, `edu-dashboard.css:319-333`, `edu-landing.css:68-86`
Không có thư mục `src/components/ui`; cùng một "nút gradient tím pill" định nghĩa lại ít nhất 4 lần (.btn-main, .edu-d-cta, .btn-primary, .fcb-submit-btn); grep `:disabled` trong login.css/edu-auth.css: 0 kết quả; biến thể outline viền tím của Components.png không tồn tại (.btn-outline viền trắng). Hiệu chỉnh của V2: nút Đăng nhập khi submit VẪN có phản hồi thị giác (login.inline.js:157-165 đã disable nút + spinner + đổi text "Đang đăng nhập...") — chỉ thiếu style CSS `:disabled` (mờ opacity) theo mẫu Components.png, không phải "không có phản hồi" như mô tả gốc.
Cách sửa: giai đoạn 1 (CSS-only): thêm vào edu-theme.css 3 class chung `.edu-btn` (gradient/pill/shadow token), `.edu-btn--outline` (border 1.5px `var(--edu-accent-3)`, chữ `var(--edu-accent-text)` — mẫu có sẵn ở `.edu-d-review--locked .edu-d-cta`), `.edu-btn:disabled { opacity:.45; box-shadow:none; cursor:default }`; cho các class nút hiện có kế thừa. Giai đoạn 2: trang React mới tạo `src/components/ui/Button.tsx` render các class đó, không viết CSS mới.

**[W3-05] Khái niệm "Tests" của design không tồn tại: sidebar thiếu mục Tests, không có danh sách bài test** — 🟡 medium — `frontend/src/components/Sidebar.tsx:65-72`, `dashboard/page.tsx:59-137`
Design có menu Tests + khối Recent Tests/32 Tests Written/No of Tests-Passed-Failed-Waiting; code thay bằng Bài học gần đây + stats khoá học (pivot có chủ đích, comment trong code xác nhận). Dark mode toggle đã đúng vị trí.
Cách sửa: quyết định sản phẩm trước: (a) giữ pivot khoá học → cập nhật Figma/PNG làm nguồn chuẩn mới; (b) làm tính năng Tests → thêm entry `{ page: 'tests', label: 'Bài test' }` vào NAV_ITEMS, tạo `.page` id=page-tests theo khung SPA hiện có, dựng danh sách từ API quizzes, khi đó mới gắn filter W3-06.

**[W3-06] Dropdown filter "All/Submitted/Upcoming Tests" (Filter.png) chưa có; filter hiện tại là button-group cho khoá học** — 🟡 medium — `dashboard/page.tsx:148-152`, `edu-dashboard.css:395-409`
3 nút pill Tất cả/Đang học/Chưa đăng ký — ngữ nghĩa trạng thái ghi danh, không phải Submitted/Upcoming; grep 'Submitted|Upcoming' trong src: 0 kết quả.
Cách sửa: khi làm trang Tests: tái dùng pattern `.sort-dropdown-wrap` + `.sort-select` sẵn có (đổi options Tất cả/Đã nộp/Sắp diễn ra) hoặc giữ dạng segmented `.filter-btn` cho nhất quán — thêm handler setTestFilter tương tự setEnrollmentFilter trong main.js; styling kế thừa khối edu-dashboard.css:395-409 sẵn có.

**[W3-07] Panel test-case 2 tab Sample|Custom (Components.png) chưa được hiện thực ở practice/interface** — 🟡 medium — `practice/page.tsx:1-30`, `interface/page.tsx:67-186`
practice là quiz trắc nghiệm, interface là mini-game kéo-thả — không nơi nào có panel trắng 2 tab với textarea "Write Your Input Cases Here Like 1234".
Cách sửa: nếu quyết định làm: dựng component React `TestCasePanel` trong src/components/ui — state activeTab 'sample'|'custom'; tab bar nền xám nhạt, tab active nền trắng; body textarea monospace (sample readOnly từ API, custom người dùng gõ); token màu từ `--edu-*`. Gắn vào trang giải bài tương lai — đừng nhét vào interface/page.tsx (khác bản chất).

**[W3-09] Thẻ "Bài học gần đây" render bằng div onclick — nút Tiếp tục không truy cập được bằng bàn phím** — 🟡 medium — `frontend/public/static/js/edu-dashboard.js:192-198`
Cả thẻ lẫn "nút" Resume đều là div không tabindex/role/href — người dùng bàn phím/screen-reader không mở được khoá học từ dashboard.
Cách sửa: trong `paintRecent()` đổi phần tử ngoài thành `<a class="edu-d-lesson" href="…">` (bỏ onclick, giữ class), `.edu-d-lesson-btn` thành `<span>` bên trong. Thêm `.edu-d-lesson:focus-visible { outline: 2px solid var(--edu-accent); outline-offset: 3px }` vào edu-dashboard.css. (2 nút mũi tên đã là `<button>` thật — ổn.)

**[W3-08] Delta thị giác Dashboard: thiếu huy hiệu nguyệt quế top-3, card cột trái ẩn mặc định** — ⚪ low — `edu-dashboard.js:298-310`, `dashboard/page.tsx:87,107`
Leaderboard chỉ render số trần đổi màu, không có nguyệt quế vàng/bạc/đồng; #edu-d-review và #edu-d-today mang thuộc tính `hidden` → user mới thấy cột trái chỉ còn 1 khối, lệch bố cục design.
Cách sửa: vẽ 1 SVG laurel duy nhất (2 nhánh lá đối xứng, số ở giữa) trong ICONS của edu-dashboard.js, fill lần lượt #E8B931/#B9BDC7/#C98A50; thay `.edu-d-lb-pos` (giữ id/class). Card ẩn: thay hidden bằng trạng thái empty — render card "Ôn tập hôm nay" dạng khoá (style `.edu-d-review--locked` sẵn có) với thông điệp "Học 5 bài hôm nay để mở khoá", chỉ hidden khi lỗi mạng thật.

**[W3-10] Landing nav thiếu 2 mục Practice/Explore so với Kit-Landing-Navigation.png** — ⚪ low — `frontend/src/app/(base)/page.tsx:36-44`
Chỉ có 2 nút Đăng nhập/Đăng ký; thiếu link Practice/Explore, LogIn hiện là pill viền thay vì text-link tím.
Cách sửa: thêm vào `.nav-actions` hai `<a>` text-link: Practice → /practice, Khám phá → cuộn tới #course-preview-grid; style `.landing-nav .nav-link { color: var(--edu-t2); font-weight:600 }` + hover `var(--edu-accent-text)`; đổi nút Đăng nhập từ .btn-outline thành text-link màu `var(--edu-accent-text)` (giữ Sign Up pill gradient — đã khớp).

**[W3-11] Font nạp bằng @import trong CSS + mỗi cụm trang một font khác nhau** — ⚪ low — `edu-theme.css:14`, `interface/page.tsx:37`
@import Poppins trong CSS tạo chuỗi request nối tiếp (FOIT/FOUT); trang lesson nạp thêm Plus Jakarta Sans gần như không dùng (~100KB thừa).
Cách sửa: (1) bỏ @import ở edu-theme.css; chuyển sang layout gốc dạng `<link rel=preconnect>` + `<link rel=stylesheet>` hoặc tốt hơn `next/font/google` Poppins (display:'swap', gán biến `--edu-font`); (2) xoá Plus+Jakarta+Sans khỏi interface/page.tsx và tailwind config — giữ Fira Code cho code; (3) giữ trọng số 400–800.

## 4. Trải nghiệm người dùng (UX)

**[W4-01] Nút "Quên mật khẩu?" là chức năng giả — báo "Email đã được gửi!" nhưng không gọi API nào** — 🟠 high — `frontend/public/static/js/pages/login.inline.js:117-155`, `login/page.tsx:94-101`
Phần gọi API bị comment, code chạy thật là `setTimeout` 1 giây rồi hiện overlay thành công. Người dùng quên mật khẩu tin email đã gửi, chờ mãi không đến và mất tài khoản vĩnh viễn — UX lừa dối ngoài ý muốn.
Cách sửa: (a) backend chưa có endpoint: sửa handleForgot hiển thị thông báo trung thực "Tính năng đang phát triển, vui lòng liên hệ hỗ trợ" (dùng showError sẵn có), bỏ overlay giả; (b) làm thật: thêm POST /auth/forgot-password ở NestJS, trong handleForgot thay setTimeout bằng fetch tới endpoint (pe-bridge tự rewrite origin), chỉ hiện overlay khi res.ok. Chi tiết backend xem thêm W5-06.

**[W4-02] Không có middleware/guard route: người chưa đăng nhập vào /dashboard vẫn render nguyên trang rồi mới bị đá đi** — 🟠 high — `frontend/public/static/js/main.js:672-679`, `dashboard/page.tsx:40-59`
Không có `src/middleware.*`; guard duy nhất chạy SAU khi trang mount và API trả 401 — user thấy sidebar/skeleton nhấp nháy 1-2 giây rồi mới về /login, không có return-URL.
Cách sửa: token ở localStorage nên middleware server không đọc được — (1) pe-bridge setTokens ghi thêm cookie `pe_has_session=1`, rồi thêm `frontend/src/middleware.ts` kiểm tra cookie cho /dashboard, /courses/*, /lesson/*, /practice, /admin, /questionaire — chưa có thì redirect `/login?next=` + pathname; (2) tối thiểu: component client AuthGate đọc localStorage trong useEffect, chưa có token thì `router.replace('/login?next=...')` và render null. Sửa login.inline.js đọc query `next` để đưa user về đúng trang sau login.

**[W4-03] Tab Khoá học kẹt skeleton vĩnh viễn khi fetch lỗi — loadCoursesAndEnrolled không có .catch** — 🟠 high — `main.js:1916-1937`, `dashboard/page.tsx:216-225`
handleFetch throw với mọi !ok, lỗi mạng cũng reject → unhandled rejection; skeleton 4 thẻ không bao giờ được thay, subtitle kẹt "Đang tải…". loadUser/loadStats/loadNotifications trong loadAll cũng không catch.
Cách sửa: thêm `.catch` cho loadCoursesAndEnrolled (và các hàm load* trong loadAll): khi lỗi, đổi #courses-grid thành khối lỗi (markup `.empty` sẵn có: icon ⚠️ + "Không tải được danh sách khoá học" + nút gọi lại loadCoursesAndEnrolled()), set #courses-count-sub thành thông báo lỗi. Tham khảo pattern đúng ở dashboard.js:2067-2070 (loadLeaderboard).

**[W4-04] Trang chi tiết khoá học redirect âm thầm: lỗi mạng → /login, API !ok → /dashboard, không nói gì với user** — 🟡 medium — `courses/[courseId]/page.tsx:92-119`
500/timeout parse thành `[]` → không tìm thấy course → replace('/dashboard'); mọi exception → replace('/login') dù token còn hợp lệ.
Cách sửa: tách 3 trạng thái: (1) throw hoặc status >= 500 → state error='network', render khối "Không tải được dữ liệu" + nút Thử lại (giữ Sidebar/HeaderBar); (2) 401 sau khi apiFetch đã tự refresh → mới replace('/login'); (3) OK nhưng không có courseId → "Khoá học không tồn tại" + nút về danh sách (hoặc redirect kèm `?err=course_not_found` để dashboard hiện toast). Đưa logic load vào useCallback để nút Thử lại tái dùng.

**[W4-05] Form register thiếu validate client-side, không có `<form>`, không submit được bằng Enter** — 🟡 medium — `register.inline.js:60-61`, `register/page.tsx:96-118`
Chỉ check rỗng — không check định dạng email, không check mật khẩu >= 8 dù placeholder ghi "Ít nhất 8 ký tự"; không có Enter listener (login có); toggle-eye thiếu aria-label.
Cách sửa: trong handleRegister trước setLoading: check regex email `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → showFieldErrors; `password.length < 8` → showFieldErrors. Thêm Enter listener như login.inline.js:193-201 nhưng trỏ #regBtn. Thêm aria-label="Hiện/ẩn mật khẩu" cho toggle-eye. Lâu dài: bọc cả hai form trong `<form onSubmit>` với button type="submit".

**[W4-06] Questionaire không chống double-submit và báo lỗi bằng alert()** — 🟡 medium — `questionaire.js:213-296`, `questionaire/page.tsx:245`
Không disable `.submit-btn` khi await → bấm nhiều lần tạo POST /api/survey trùng; lỗi hiện alert() chặn UI; dòng 272 còn console.log toàn bộ dữ liệu khảo sát.
Cách sửa: đầu try lấy `const btn = this.querySelector('.submit-btn')`, disabled=true + textContent "Đang gửi…", finally trả lại; thay alert bằng showStepError sẵn có (dòng 195-208); xoá console.log dòng 272.

**[W4-07] Trang /admin: người không phải admin (hoặc lỗi mạng) thấy trang trống vĩnh viễn — loadCourses() top-level không catch, không redirect** — 🟡 medium — `admin.inline.js:196,11-17`, `admin/page.tsx:39-44`
`loadCourses();` gọi trần → unhandled rejection; `data.error` là object nên message thành "[object Object]"; user thường thấy shell trang quản trị rỗng, không thông báo, không redirect.
Cách sửa: (1) api() rút message bằng helper `window.__PE_errMsg(data.error)` sẵn có của pe-bridge; (2) bọc lời gọi khởi động `loadCourses().catch(...)` — cho api() throw kèm `err.status = res.status` để phân biệt; 403 thì toast "Bạn không có quyền truy cập trang quản trị" rồi chuyển về /dashboard sau ~1.5s; lỗi khác thì toast + render dòng "Không tải được" vào #courseRows.

**[W4-08] Nhiều phần tử bấm được nhưng không truy cập được bằng bàn phím (div onClick không role/tabIndex)** — 🟡 medium — `HeaderBar.tsx:124`, `Sidebar.tsx:144-149`, `courses/[courseId]/page.tsx:256,266-277`, `dashboard/page.tsx:490`
user-chip mở menu Đăng xuất, header module, hàng bài học, prof-stat-card đều là div không focusable — người dùng bàn phím không đăng xuất được từ header, không mở được bài học.
Cách sửa: đổi các div bấm được thành `<button type="button">` (giữ className, reset style: background:none;border:0;padding:0;text-align:inherit) hoặc tối thiểu role="button" + tabIndex={0} + onKeyDown Enter/Space như mẫu đúng ở Sidebar.tsx:109-115. Ưu tiên: user-chip → hàng bài học + header module → prof-stat-card. Hàng bài học nên là `<a href>` để hỗ trợ mở tab mới.

**[W4-10] Fallback 'http://localhost:5000' hardcode — quên NEXT_PUBLIC_API_URL khi deploy là toàn app âm thầm gọi localhost** — 🟡 medium — `frontend/src/app/layout.tsx:17`, `frontend/src/lib/api.ts:19`
Fallback lặp ở 2 nơi; build production thiếu env không fail mà mọi fetch đập vào localhost:5000 của máy người dùng → skeleton vô tận (kết hợp W4-03).
Cách sửa: gom về 1 module (src/lib/config.ts export API_ORIGIN) và fail-fast: `if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') throw new Error('Thiếu NEXT_PUBLIC_API_URL')`; giữ fallback localhost chỉ cho development; layout.tsx và api.ts cùng import.

**[W4-09] Text Anh/Việt trộn lẫn hardcode trong trang cá nhân và aria-label** — ⚪ low — `dashboard/page.tsx:515-524,148`, `login/page.tsx:83`
"Subjects and languages", "Most progress ▾", "Learn more about XP"… giữa UI tiếng Việt; 2 dòng footer là text chết giống link; aria-label tiếng Anh lẫn tiếng Việt.
Cách sửa: dịch 4 chuỗi trong prof-xp-card ("Môn học và ngôn ngữ", "Tiến bộ nhất ▾", "Tìm hiểu về XP", "Xem chi tiết ›"); footer chưa có trang đích thì bỏ hẳn. Đồng nhất aria-label sang tiếng Việt; grep `aria-label="[A-Z]` trong src để quét một lượt.

**[W4-11] Không có error.tsx / global-error.tsx ở bất kỳ route segment nào** — ⚪ low — `frontend/src/app/layout.tsx:19`
Mọi exception render nổ thẳng lên root → production hiện trang "Application error" trắng tiếng Anh mặc định của Next.
Cách sửa: thêm `frontend/src/app/global-error.tsx` và error.tsx cấp app ('use client', nhận {error, reset}): thông điệp tiếng Việt + nút "Thử lại" (reset()) + link về /dashboard, style inline tự chứa (error page không có sẵn stylesheet). Đối chiếu convention trong `frontend/node_modules/next/dist/docs/` trước khi viết (Next 16.2 có breaking changes). loading.tsx không cần ưu tiên.

**[W4-12] Thẻ `<title>` JSX trong các trang client bị metadata layout gốc đè — tab luôn hiện "Programming EDU"** — ⚪ low — `courses/[courseId]/page.tsx:133-139`, `login/page.tsx:22`, `layout.tsx:9-15`
Comment nội bộ đã đo xác nhận pattern `<title>` JSX không ăn; login/register/admin/questionaire vẫn dùng pattern chết này.
Cách sửa: mỗi trang standalone thêm `useEffect(() => { document.title = '...'; }, [])` như practice/page.tsx:94 đã làm, xoá `<title>` JSX chết. Dài hạn: đổi title root layout thành `{ template: '%s – Programming EDU', default: 'Programming EDU' }` và tách các page tĩnh thành server component mỏng export metadata bọc client component.

## 5. Tích hợp FE-BE & cấu hình

**[W5-01] apiFetch refresh không lưu refresh token mới (backend rotate + blacklist) và không dedupe refresh song song → người dùng bị đăng xuất oan** — 🟠 high — `frontend/src/lib/api.ts:42,49`, `src/auth/refresh-token.service.ts:84`, `src/auth/auth.service.ts:160`, `pe-bridge.js:44`
api.ts chỉ lưu `d.access`, không lưu `d.refresh` — trong khi backend revoke token cũ ngay khi rotate. Sau 30 phút: lần refresh đầu thành công nhưng localStorage giữ token đã blacklist → lần 401 kế tiếp user văng ra dù refresh còn hạn 8h; Promise.all 3-4 request cùng 401 thì cả 4 cùng POST /auth/refresh, chỉ 1 thắng CAS, trang render thiếu dữ liệu ngẫu nhiên.
Cách sửa: (1) trong nhánh `if (rr.ok)` thêm `if (d.refresh) localStorage.setItem(LS_REFRESH, d.refresh)` (bọc try/catch); (2) dedupe: biến module-level `let refreshing: Promise<string|null> | null = null;` — tách logic gọi /auth/refresh ra hàm `refreshAccess()`, đang có promise thì return luôn, xong gán lại null (mirror pe-bridge.js:44-64 sang TypeScript); (3) tuỳ chọn: nếu `window.__PE_refreshAccess` tồn tại thì dùng luôn để 2 lớp không refresh chồng nhau; (4) refresh trả 401/403 thì xoá cả 2 key pe_access/pe_refresh.

**[W5-02] .gitignore root ignore nhầm toàn bộ test/, scripts/, docs/ — code e2e backend và scripts không được version control** — 🟠 high — `.gitignore:9,11,13`
`git ls-files test scripts docs` trả rỗng trong khi trên đĩa test/ có 8 mục, scripts/ có 8 mục. Một lần `git clean -fd` hoặc sự cố như vụ `git reset --hard` trước là mất trắng; pattern trần còn match MỌI thư mục con tên `test` trong repo.
Cách sửa: xoá 3 dòng `test`, `scripts`, `docs` (muốn ignore output cụ thể thì viết pattern có anchor, vd `/docs/build/`); chạy `git add test scripts docs` và commit. Xem lại luôn dòng `/generated/prisma` (dòng 5) — thư mục thực tế là `src/generated/prisma` và ĐANG bị track (21 file kể cả .wasm): muốn bỏ track thì sửa thành `/src/generated/prisma/` + `git rm -r --cached`, muốn giữ thì xoá dòng ignore chết.

**[W5-04] Hai chỗ legacy JS gán thẳng object lỗi của backend vào UI → hiển thị "[object Object]"** — 🟡 medium — `dashboard.js:198`, `interface.inline.js:97`, `src/common/filters/all-exceptions/all-exceptions.filter.ts:112`
Backend trả `{error: {status, message, ...}}` nhưng dashboard.js (modal đổi mật khẩu) và interface.inline.js gán `data.error` trần — ép chuỗi thành "[object Object]" thay vì message tiếng Việt.
Cách sửa: theo pattern các file khác đang dùng: dashboard.js:198 → `currentMsg.textContent = (window.__PE_errMsg ? window.__PE_errMsg(data.error) : data.error) || 'Mật khẩu hiện tại không đúng';`; interface.inline.js:97 → biến trung gian `var msg = data.message || (window.__PE_errMsg ? window.__PE_errMsg(data.error) : data.error);` rồi nội suy với fallback. Helper `__PE_errMsg` sẵn có ở pe-bridge.js:70-73.

**[W5-05] E2E Playwright chỉ chạy tay được: không CI, không webServer, comment còn trỏ "backend Django cổng 9000" lỗi thời** — 🟡 medium — `frontend/e2e/playwright.config.ts:4`, `helpers.ts:5`
Backend thật là NestJS cổng 5000 tại root; không có `.github/workflows`; bộ e2e (login thật, engine chấm SQL 20 bài, drag regression, mobile) chỉ có giá trị khi ai đó nhớ chạy tay đủ 2 server + DB seed.
Cách sửa: (1) sửa comment đầu config thành hướng dẫn đúng: `npm run start:dev` (NestJS 5000) + `cd frontend && pnpm dev`; (2) thêm block `webServer` dạng MẢNG: entry backend (cwd root, url `http://localhost:5000/health`) + entry frontend (cwd frontend, url `http://localhost:3000`), đều `reuseExistingServer: true`; (3) viết script seed tài khoản e2e trong scripts/ (sửa W5-02 trước để scripts/ được track); (4) thêm `.github/workflows/e2e.yml`: checkout, setup node+pnpm, cài deps 2 phía, Postgres service, `prisma db push` + seed, chạy playwright.

**[W5-06] Nút "Quên mật khẩu" giả lập thành công — backend không hề có endpoint /auth/forgot-password** — 🟡 medium — `login.inline.js:127,136`, `src/auth/auth.controller.ts:39`
Cùng gốc W4-01, góc nhìn tích hợp: auth.controller chỉ có login/register/logout/refresh/google/facebook; PREFIX_EXCLUDED cũng không khai route này.
Cách sửa: (A) ngắn hạn — handleForgot hiển thị thông báo trung thực hoặc ẩn link. (B) làm thật — backend: `@Post('forgot-password')` @Public + khai vào PREFIX_EXCLUDED; service sinh token reset ngắn hạn lưu DB, gửi mail (Resend/SES/nodemailer); thêm `@Post('reset-password')` nhận {token, password} verify + hash bằng WerkzeugScryptHasher; `@Throttle` chặt (~3 req/giờ/IP vì đây là endpoint dò email). FE: bỏ comment fetch, đổi URL thành `/auth/forgot-password` tương đối, xoá setTimeout giả.

**[W5-07] .env.example root thiếu nhiều biến mà code thực sự đọc** — ⚪ low — `.env.example:1`, `api-getway.setup.ts:43`, `oauth.config.ts:10`, `main.ts:39`, `auth.controller.ts:43`
Thiếu TRUST_PROXY_HOPS, GOOGLE/FACEBOOK_CALLBACK_URL, PORT, BODY_LIMIT, nhóm THROTTLE_* — quên TRUST_PROXY_HOPS sau proxy thì mọi user chung 1 bucket rate-limit; quên CALLBACK_URL trên domain thật thì OAuth chết redirect_uri_mismatch.
Cách sửa: bổ sung vào .env.example (giá trị mẫu + comment 1 dòng/biến): PORT=5000; TRUST_PROXY_HOPS=0 (ghi chú đặt = số hop proxy); BODY_LIMIT=1mb; GOOGLE/FACEBOOK_CALLBACK_URL (phải khớp console provider); nhóm THROTTLE_LOGIN/REGISTER/BADGE + THROTTLE_DISABLED; UV_THREADPOOL_SIZE. Cân nhắc thêm các biến này (optional + default) vào envValidationSchema để có một nguồn sự thật duy nhất.

**[W5-08] Landing page gọi /api/courses nhưng endpoint yêu cầu JWT → khách vãng lai không bao giờ thấy lưới khoá học thật** — ⚪ low — `landing.inline.js:21`, `src/courses/courses.controller.ts:31`
JwtAuthGuard là APP_GUARD toàn cục, `@Get('courses')` không có @Public — request vô danh nhận 401, landing luôn hiện số liệu cứng "5+/225+" + tạo request 401/refresh rác mỗi lượt.
Cách sửa: muốn khách xem được: thêm `@Public()` lên route (xử lý userId có thể undefined trong listCourses) — an toàn hơn là route riêng `@Public() @Get('courses/public')` trả danh sách không kèm cờ enrolled, FE trỏ path mới. Nếu giữ hành vi "phải đăng nhập": bỏ hẳn lời gọi fetch('/api/courses') trong landing.inline.js.

*(W5-03 — frontend/.env.local bị track — đã bị V3 bác bỏ sau kiểm chứng: file không hề nằm trong git index, rule .env* đang hoạt động đúng. Không đưa vào danh sách việc cần sửa.)*

## 6. Phát hiện bổ sung từ các tác nhân bắt lỗi

**[V1 phát hiện — W1 bỏ sót] Account pre-hijacking: đăng ký không xác minh email + OAuth auto-link cho phép chiếm trước tài khoản nạn nhân** — 🟠 high — `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`
register() tạo user ngay, không có flow xác minh email (bảng email_verifications chỉ tồn tại trong schema, không đâu dùng); validateOAuthLogin auto-link provider vào bất kỳ tài khoản trùng email có oauthProvider: null. Kịch bản: kẻ tấn công đăng ký trước bằng EMAIL NẠN NHÂN + mật khẩu của hắn; nạn nhân sau này "Đăng nhập bằng Google" → hệ thống link Google vào tài khoản kẻ tấn công tạo sẵn — kẻ tấn công giữ mật khẩu, đọc/dùng tài khoản bất kỳ lúc nào. Cùng vector: đổi email hồ sơ cũng không xác minh.
Cách sửa: khi auto-link vào tài khoản có password: (a) yêu cầu nhập mật khẩu tài khoản hiện có trước khi link, HOẶC (b) chỉ auto-link khi tài khoản đích isVerified=true (cần xây flow email_verifications đang bỏ trống), HOẶC (c) tối thiểu: khi link thì revoke toàn bộ authSession + vô hiệu password cũ (buộc reset). Áp tương tự cho đổi email ở updateProfile.

**[V1 phát hiện — W2 bỏ sót] Farm XP/gems vô hạn qua completeLesson với khoá học có lessonCount=0** — 🟠 high — `src/lessons/lessons.service.ts`, `src/course-admin/course-admin.module.ts`, `src/courses/courses.service.ts`
Điều kiện chặn `(course.lessonCount > 0 && lessonNo > course.lessonCount)` — khi lessonCount=0 thì MỌI lessonNo lọt; createCourse khởi tạo lessonCount=0, enroll không check isPublished, resolveLesson tự tạo lesson với xpReward=0 → rơi về DEFAULT_XP=50 → mỗi POST /api/lessons/N/complete cộng 50 XP + 50 gems + streak, vòng lặp N=1,2,3,… farm không giới hạn kèm bơm rác bảng lessons.
Cách sửa: từ chối luôn khi `course.lessonCount === 0`: `if (!Number.isInteger(lessonNo) || lessonNo < 1 || lessonNo > course.lessonCount) throw BadRequestException`. Cân nhắc thêm: enroll() từ chối khoá isPublished=false với user thường; resolveLesson chỉ được TẠO lesson khi lessonNo <= lessonCount.

**[V2 phát hiện — W4 bỏ sót] Tab Diễn đàn kẹt "Đang tải..." vĩnh viễn khi fetch lỗi — renderPosts không có .catch** — 🟠 high — `frontend/public/static/js/dashboard.js` (~:868-876)
Cùng lớp lỗi W4-03 nhưng ở dashboard.js (vùng W4 tự khai chưa soát): `Promise.all([getAllPostsAsync(), followReady]).then(...)` không catch, cả chuỗi forumApi.getPosts cũng không — backend down thì tab Diễn đàn hiện "Đang tải..." mãi mãi.
Cách sửa: thêm .catch vào chuỗi Promise.all trong renderPosts: khi lỗi đổi #forum-list thành khối lỗi (⚠️ + "Không tải được bài đăng" + nút gọi lại renderPosts()), theo pattern loadLeaderboard (dashboard.js:2067-2070). Áp tương tự cho loadMyPosts nếu thiếu.

**[V2 phát hiện — W3 bỏ sót] Màu chữ phụ --edu-t5/--edu-t4 rớt chuẩn tương phản WCAG AA trên nền trắng/glass** — 🟠 high — `edu-theme.css:37-38`, `edu-auth.css`, `edu-dashboard.css`
W3 chỉ nghi ngờ trong coverage_notes, V2 đã tính được: #8b87a0 trên trắng chỉ ≈3.5:1, #7c7894 ≈4.2:1 — cả hai DƯỚI ngưỡng AA 4.5:1 cho chữ thường; trên glass rgba(255,255,255,.55) đè pastel còn thấp hơn. --edu-t5 dùng cho chữ nhỏ khắp nơi (placeholder form login, nhãn 12px, dòng phụ leaderboard).
Cách sửa: đậm hoá 2 token trong edu-theme.css — --edu-t5 xuống cỡ #6e6a85 (≈5.3:1 trên trắng), --edu-t4 xuống cỡ #6b677f — toàn bộ chữ phụ đi qua token nên chỉ sửa 1 chỗ; kiểm tra lại bằng devtools trên nền glass thật, chỉnh alpha nền card lên .65-.7 nếu vẫn thiếu.

**[V3 phát hiện — W5 bỏ sót] main.js handleFetch đọc body.message trong khi backend bọc lỗi trong body.error.message — mọi thông báo lỗi qua handleFetch thoái hoá thành "HTTP <status>"** — 🟡 medium — `main.js:680`, `all-exceptions.filter.ts:112`
`throw new Error((body && body.message) || ('HTTP ' + r.status))` — nhưng body.message LUÔN undefined vì backend trả `{error: {message}}`; message tiếng Việt (validation 400, throttle 429…) bị mất, SPA dashboard chỉ còn thấy "HTTP 400"/"HTTP 429". Anh em cùng loại với W5-04 nhưng ở đường throw của handleFetch.
Cách sửa: sửa main.js:682 đọc cả hai dạng: `throw new Error((body && (body.message || (window.__PE_errMsg ? window.__PE_errMsg(body.error) : (body.error && body.error.message)))) || ('HTTP ' + r.status));` — giữ fallback 'HTTP <status>' khi body không parse được.
