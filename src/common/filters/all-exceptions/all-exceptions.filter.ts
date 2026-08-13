import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Nhận diện lỗi hạ tầng DB tạm thời (cạn pool, mất kết nối, Neon đang ngủ dậy).
 * Phải so theo THÔNG ĐIỆP vì driver adapter Neon ném Error thường, không phải
 * PrismaClientKnownRequestError có mã lỗi.
 */
const DB_UNAVAILABLE_PATTERNS = [
  'timeout exceeded when trying to connect',
  'Connection terminated',
  "Can't reach database server",
  'Connection pool timeout',
  'ECONNREFUSED',
  'ETIMEDOUT',
];

function isDbUnavailable(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  const msg = exception.message ?? '';
  return DB_UNAVAILABLE_PATTERNS.some((p) => msg.includes(p));
}

@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: T, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra, xin vui lòng thử lại sau';
    let detail: any = null;
    let fields: Record<string, string> | null = null;

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Quá nhiều yêu cầu, vui lòng thử lại sau';
    } else if (isDbUnavailable(exception)) {
      // Cạn pool / mất kết nối DB là tình trạng TẠM THỜI của hạ tầng, không
      // phải lỗi lập trình -> 503 (kèm Retry-After) đúng ngữ nghĩa hơn 500.
      // Đo tải thực tế cho thấy khi 10.000 người đăng nhập cùng lúc, hàng đợi
      // xin connection vượt 30 giây và ném "timeout exceeded when trying to
      // connect"; trước đây tất cả rơi vào nhánh 500 "Đã có lỗi xảy ra" khiến
      // người dùng chờ rất lâu rồi nhận thông báo vô nghĩa.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Hệ thống đang quá tải, vui lòng thử lại sau ít phút';
      response.setHeader?.('Retry-After', '10');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res != null) {
        const resObj = res as any;
        if (Array.isArray(resObj.message)) {
          // Nói RÕ sai ở đâu thay vì câu chung chung 'Dữ liệu không hợp lệ':
          // client hiển thị message này trực tiếp cho người dùng.
          message = resObj.message[0] ?? 'Dữ liệu không hợp lệ';
          detail = resObj.message;
          // Map field -> message (do validationExceptionFactory sinh ra) giúp
          // form tô đỏ đúng ô nhập.
          if (resObj.fields && typeof resObj.fields === 'object') {
            fields = resObj.fields;
          }
        } else {
          message = resObj.message || message;
        }
      }

      // Message tiếng Việt mặc định CHỈ áp khi exception không mang message
      // riêng (guard/passport ném ra 'Unauthorized'/'Forbidden' trống nghĩa).
      // Trước đây ép cứng nên mọi lỗi 401 đều thành 'Chưa đăng nhập' — kể cả
      // 'Email/số điện thoại hoặc mật khẩu không đúng' do AuthService ném ra,
      // khiến người dùng nhập sai mật khẩu không biết mình sai ở đâu.
      if (
        exception instanceof UnauthorizedException &&
        message === 'Unauthorized'
      ) {
        message = 'Chưa đăng nhập';
      } else if (
        exception instanceof ForbiddenException &&
        message === 'Forbidden'
      ) {
        message = 'Không có quyền truy cập';
      }
    }

    const requestId = request.requestId || null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${message}`,
        stack,
      );
    }

    response.status(status).json({
      error: {
        status,
        message,
        detail,
        ...(fields ? { fields } : {}),
      },
      request_id: requestId,
    });
  }
}
