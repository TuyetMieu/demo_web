import { INestApplication, RequestMethod } from '@nestjs/common';
import { CorsMiddleware } from 'src/common/middleware/cors/cors.middleware';
import { OverloadProtectionMiddleware } from 'src/common/middleware/overload-protection/overload-protection.middleware';
import { RequestIdMiddleware } from 'src/common/middleware/request-id/request-id.middleware';
import { SecurityHeadersMiddleware } from 'src/common/middleware/security-headers/security-headers.middleware';

/**
 * Prefix '/api' áp cho toàn bộ route nghiệp vụ.
 *
 * KHÔNG bật enableVersioning: Sheet 1 của spec ghi rõ "GIỮ NGUYÊN PATH & METHOD",
 * path đích là /api/user, /api/courses... và /auth/login (không có /api).
 * Thêm /v1 sẽ làm vỡ toàn bộ frontend Next.js đang gọi các path này.
 */
export const API_PREFIX = 'api';

/**
 * Các route KHÔNG mang prefix '/api' (theo đúng path gốc bản Django):
 *  - /health        : endpoint hạ tầng cho monitoring/cron ping
 *  - /auth/*        : nhóm auth nằm ở root, không thuộc namespace /api
 */
const PREFIX_EXCLUDED = [
  { path: 'health', method: RequestMethod.GET },
  { path: 'auth/login', method: RequestMethod.POST },
  { path: 'auth/register', method: RequestMethod.POST },
  { path: 'auth/logout', method: RequestMethod.ALL },
  { path: 'auth/refresh', method: RequestMethod.POST },
  { path: 'auth/google', method: RequestMethod.GET },
  { path: 'auth/google/callback', method: RequestMethod.GET },
  { path: 'auth/facebook', method: RequestMethod.GET },
  { path: 'auth/facebook/callback', method: RequestMethod.GET },
];

export function setupApiGateway(app: INestApplication): void {
  // trust proxy: Express chỉ điền req.ip từ X-Forwarded-For khi được bật.
  // Không bật thì sau reverse proxy (nginx/Render/Railway/Cloudflare) MỌI người
  // dùng đều mang IP của proxy -> dùng chung một bucket rate-limit, người thứ 21
  // đăng nhập trong 1 phút đã bị 429 dù không ai làm gì sai. Rate-limit theo IP
  // cũng mất tác dụng chống dò mật khẩu.
  //
  // Giá trị là SỐ HOP proxy, KHÔNG dùng `true`: `true` khiến Express tin toàn bộ
  // chuỗi X-Forwarded-For, kẻ tấn công chỉ cần bịa header là có IP mới mỗi
  // request và vượt qua rate-limit hoàn toàn. Chạy trực tiếp không proxy -> 0.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (trustProxyHops > 0) {
    (
      app.getHttpAdapter().getInstance() as {
        set: (k: string, v: unknown) => void;
      }
    ).set('trust proxy', trustProxyHops);
  }

  // Middleware hạ tầng đăng ký qua app.use() TOÀN CỤC, không qua
  // consumer.forRoutes('*'): setGlobalPrefix bên dưới sẽ prefix path middleware
  // thành '/api/*' làm /auth/* và /health mất CORS/RequestId/SecurityHeaders
  // (kể cả preflight OPTIONS bị 404). Thứ tự: RequestId trước để mọi log phía
  // sau có request_id trong AsyncLocalStorage.
  const requestId = app.get(RequestIdMiddleware);
  const overload = app.get(OverloadProtectionMiddleware);
  const securityHeaders = app.get(SecurityHeadersMiddleware);
  const cors = app.get(CorsMiddleware);

  app.use(requestId.use.bind(requestId));
  // Chối tải đặt NGAY SAU request-id (để lượt bị chối vẫn có mã request để tra
  // cứu) và TRƯỚC mọi thứ tốn kém khác — mục đích là loại bỏ request thừa với
  // chi phí nhỏ nhất có thể khi hệ thống đang quá tải.
  app.use(overload.use.bind(overload));
  app.use(securityHeaders.use.bind(securityHeaders));
  app.use(cors.use.bind(cors));

  app.setGlobalPrefix(API_PREFIX, { exclude: PREFIX_EXCLUDED });
}
