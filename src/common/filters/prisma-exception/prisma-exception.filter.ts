import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from 'src/generated/prisma';

// Key = tên CỘT DB (snake_case), nối bằng ',' theo đúng thứ tự Postgres trả về
const UNIQUE_FIELD_MESSAGES: Record<string, string> = {
  email: 'Email này đã được sử dụng',
  code: 'Mã này đã tồn tại',
  'course_id,lesson_code': 'Mã bài học đã tồn tại trong khoá học này',
  'user_id,course_id': 'Bạn đã đăng ký khoá học này rồi',
  'user_id,lesson_id': 'Bài học này đã được ghi nhận tiến độ',
  'user_id,post_id': 'Bạn đã thích bài viết này rồi',
  'user_id,badge_id': 'Huy hiệu này đã được trao rồi',
  'user_id,roadmap_id,item_id': 'Mục lộ trình này đã được ghi nhận',
  user_id: 'Dữ liệu của người dùng này đã tồn tại',
};

function extractFields(
  exception: Prisma.PrismaClientKnownRequestError,
): string[] {
  const meta = exception.meta as any;

  // Prisma 7 + driver adapter (@prisma/adapter-neon): shape thực tế của project này
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(fields)) return fields;

  // Fallback: shape cũ meta.target, phòng khi đổi adapter/engine sau này
  const target = meta?.target;
  if (Array.isArray(target)) return target;
  if (typeof target === 'string') return [target];

  return [];
}

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Đã có lỗi xảy ra, xin vui lòng thử lại sau';
    let detail: any = null;

    if (exception.code === 'P2002') {
      status = HttpStatus.BAD_REQUEST;
      const fields = extractFields(exception);
      message =
        UNIQUE_FIELD_MESSAGES[fields.join(',')] ??
        'Dữ liệu đã tồn tại, vui lòng kiểm tra lại';
      detail = fields.length ? fields : null;
    } else if (exception.code === 'P2003') {
      // Vi phạm khoá ngoại. Lá chắn thứ 2 (JwtStrategy đã chặn user bị xoá
      // ngay từ cổng vào) — phòng trường hợp bản ghi tham chiếu (khoá học,
      // bài học...) bị xoá đúng lúc request đang xử lý (race hiếm gặp).
      status = HttpStatus.BAD_REQUEST;
      const meta = exception.meta as any;
      const constraint: string | undefined =
        meta?.driverAdapterError?.cause?.constraint?.name ?? meta?.field_name;
      message = constraint?.includes('user_id')
        ? 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại'
        : 'Dữ liệu liên quan không còn tồn tại, vui lòng tải lại trang';
    }

    const requestId = (request as any).requestId || null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} Prisma ${exception.code}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      error: { status, message, detail },
      request_id: requestId,
    });
  }
}
