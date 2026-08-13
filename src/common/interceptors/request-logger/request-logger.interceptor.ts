import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/** Tham số mang bí mật — giá trị phải bị che trước khi ghi log. */
const SENSITIVE_PARAMS = [
  'refresh',
  'access',
  'token',
  'password',
  'code',
  'secret',
];

/**
 * Giữ nguyên path, che giá trị của các query param nhạy cảm.
 * Ví dụ: /auth/logout?refresh=abc123 -> /auth/logout?refresh=[REDACTED]
 */
function redactQuery(originalUrl: string): string {
  const idx = originalUrl.indexOf('?');
  if (idx === -1) return originalUrl;

  const path = originalUrl.slice(0, idx);
  const params = new URLSearchParams(originalUrl.slice(idx + 1));

  for (const key of params.keys()) {
    if (SENSITIVE_PARAMS.includes(key.toLowerCase())) {
      params.set(key, '[REDACTED]');
    }
  }

  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method = req.method;
    // originalUrl không bị Express ghi đè theo mount path (khác req.path/req.url).
    // PHẢI che query string: GET /auth/logout?refresh=<token> sẽ ghi nguyên
    // refresh token vào log nếu log thẳng originalUrl.
    const path = redactQuery(req.originalUrl);
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        // Handler chạy xong bình thường -> status đã được set trên response
        next: () => this.write(method, path, res.statusCode, startedAt),
        // Handler ném lỗi -> exception filter chưa chạy nên res.statusCode chưa đúng,
        // phải lấy status từ chính exception.
        error: (err: unknown) =>
          this.write(method, path, this.resolveStatus(err), startedAt),
      }),
    );
  }

  private resolveStatus(err: unknown): number {
    const status = (err as { status?: unknown })?.status;
    return typeof status === 'number' ? status : 500;
  }

  private write(
    method: string,
    path: string,
    status: number,
    startedAt: number,
  ): void {
    this.logger.log(`${method} ${path} ${status} ${Date.now() - startedAt}ms`);
  }
}
