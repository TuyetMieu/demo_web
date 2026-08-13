import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // `name` bắt buộc phải nằm trong key: ThrottlerStorageService lưu totalHits theo
  // Map<throttlerName> nhưng chỉ khởi tạo entry cho tier chạy đầu tiên, nên nếu 2 tier
  // dùng chung key thì tier sau đọc ra undefined và totalHits thành NaN (không bao giờ chặn).
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const controller = context.getClass().name;
    const route = context.getHandler().name;
    return `${controller}.${route}:${suffix}:${name}`;
  }

  /**
   * Cho phép tắt hoàn toàn rate limit qua env THROTTLE_DISABLED=true.
   *
   * Mục đích DUY NHẤT: đo sức chịu tải thật của server trong môi trường nội bộ.
   * Nếu không có công tắc này, mọi bài đo tải từ một máy đều chỉ đo được cơ chế
   * chặn (429 sau 20 request/phút) chứ không biết server chịu được bao nhiêu.
   * TUYỆT ĐỐI không bật ở production — mất lớp chống dò mật khẩu và chống DoS.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_DISABLED === 'true') return true;
    return super.shouldSkip(context);
  }
}
