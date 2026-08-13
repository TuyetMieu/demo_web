# Ranh giới Gateway ↔ Module nghiệp vụ

`ApiGetwayModule` là nơi tập trung mọi cross-cutting concern (auth, rate limit,
CORS, security header, error envelope, logging, prefix/version). Mục tiêu của
tài liệu này: nếu sau này tách phần "gateway" ra thành một service/reverse
proxy riêng (Kong, NGINX, Traefik...) đứng trước app, **module nghiệp vụ
(Auth, Courses, Lessons...) không cần sửa một dòng logic nào**.

Muốn vậy, ranh giới phải là một **hợp đồng (contract)**, không chỉ là "code
đang nằm chung 1 file". Bảng dưới đây phân loại từng phần đang có trong
`ApiGetwayModule`/`api-getway.setup.ts` theo 3 loại.

## 1. Chuyển thẳng sang Kong/NGINX được, gần như không cần đổi gì

| Hiện tại | Vì sao chuyển được |
|---|---|
| `CorsMiddleware` | CORS là thuần network-edge concern, không cần biết gì về nghiệp vụ |
| `SecurityHeadersMiddleware` | Header tĩnh, set 1 lần ở edge cho mọi request |
| `setGlobalPrefix('api')` + `enableVersioning` | Kong route theo path prefix là tính năng lõi của nó |
| Rate limit theo IP (`CustomThrottlerGuard`) | Kong có plugin rate-limiting riêng — nhưng **thuật toán và storage khác hẳn** (Kong dùng Redis/cluster-aware, code hiện tại dùng in-memory `Map` per-instance). Chuyển đi được về mặt *khái niệm*, không phải *lift-and-shift y nguyên code*. |

## 2. BẮT BUỘC ở lại trong app, dù có tách gateway hay không

| Hiện tại | Vì sao không chuyển được |
|---|---|
| `AllExceptionsFilter`, `PrismaExceptionFilter` | Cần hiểu ngữ nghĩa lỗi của **chính app** (vd: map field DB nào bị trùng unique sang message tiếng Việt). Kong/NGINX không biết Prisma là gì. |
| `ValidationPipe` (`whitelist`, `transform`) | Validate dựa trên DTO class + decorator `class-validator` — logic này sống trong code TypeScript của app, không phải thứ Kong hiểu được. |
| `RequestLoggerInterceptor` | Đo thời gian xử lý **trong process** (guard → controller → response). Access log của Kong đo latency ở tầng edge — hai con số khác nhau, không thay thế nhau được. |
| Logic controller/service của từng module nghiệp vụ | Hiển nhiên — đây chính là thứ gateway tồn tại để bảo vệ, không phải thứ gateway thay thế. |

## 3. Cần một HỢP ĐỒNG rõ ràng nếu tách thật (chưa tự động đúng)

- **`X-Request-Id`**: `RequestIdMiddleware` hiện đã tôn trọng header đến nếu
  hợp lệ (`isUuid(incomingId) ? incomingId : uuidv4()`) — nghĩa là nếu Kong
  gắn `X-Request-Id` trước khi forward, app sẽ tự dùng lại, không tạo ID mới.
  Đây là điểm **đã tương thích sẵn**, không cần sửa gì khi tách gateway.
- **JWT**: hiện `JwtAuthGuard` tự verify chữ ký + đọc `@Public()` metadata
  qua `Reflector`. Nếu Kong đảm nhận việc verify JWT (Kong JWT plugin), phải
  quyết định 1 trong 2 hướng — **và đây là quyết định kiến trúc cần bàn lúc
  tách, không tự nhiên đúng**:
  1. App vẫn tự verify lại (defense-in-depth, đơn giản, không đổi code) — khuyến nghị.
  2. Kong verify rồi forward claims qua header riêng, `JwtAuthGuard` đổi thành đọc
     header đó thay vì verify — phải sửa code guard.
- **`@Public()`**: cơ chế loại trừ route hiện nằm trong code (`Reflector` +
  decorator). Nếu Kong đảm nhận auth, danh sách route public phải được khai
  báo LẠI trong cấu hình route của Kong — hai nơi khai báo, dễ lệch nhau nếu
  không đồng bộ quy trình.

## Quy tắc bắt buộc cho module nghiệp vụ (giữ ranh giới sạch)

1. **Không khai báo prefix/version trong `@Controller()`** của module nghiệp
   vụ. Viết `@Controller('courses')`, không viết `@Controller('api/v1/courses')`
   — prefix/version là tài sản độc quyền của gateway (`api-getway.setup.ts`).
   `HealthController` hiện đã đúng pattern này (`@Controller({path:'health', version: VERSION_NEUTRAL})`).
2. **Không tự implement CORS/security header/rate limit riêng** trong module
   nghiệp vụ. Một nguồn duy nhất — nếu module nào cần rate limit khác biệt,
   dùng `@Throttle()`/`@SkipThrottle()` override tại route, không viết guard mới.
3. **Không tự `res.json({error:...})` trong controller khi lỗi.** Luôn
   `throw` exception (built-in hoặc `PrismaClientKnownRequestError`), để
   filter ở gateway định dạng response. Controller viết `res.json()` thủ công
   sẽ phá vỡ envelope thống nhất và không đi qua log/mapping message.
4. **Đọc identity qua `req.user`** (được `JwtAuthGuard` gán), không tự parse
   header `Authorization` trong service/controller. Nhờ vậy khi auth chuyển
   ra Kong, chỉ cần sửa *cách `req.user` được điền*, controller không đổi gì.
