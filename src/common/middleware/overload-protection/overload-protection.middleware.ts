import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/**
 * Chối tải sớm (admission control) — chặn hiệu ứng "xếp hàng đến chết".
 *
 * VÌ SAO CẦN: đo tải thực tế với 10.000 lượt đăng nhập đồng thời cho thấy server
 * KHÔNG chết, nhưng nhận hết mọi request rồi xếp hàng chờ connection DB. Khi
 * hàng đợi vượt 30 giây, Prisma ném "timeout exceeded when trying to connect"
 * và 4.568/10.000 request trả về HTTP 500 SAU KHI người dùng đã chờ 47 giây.
 *
 * Đó là kiểu hỏng tệ nhất: chờ rất lâu rồi nhận lỗi khó hiểu. Đúng ra phải từ
 * chối NGAY và NÓI RÕ khi hệ thống đã quá tải, để:
 *  - người vào được thì được phục vụ nhanh (độ trễ có trần);
 *  - người bị từ chối biết ngay mà thử lại, không mất 47 giây vô ích;
 *  - hàng đợi không phình làm cạn RAM.
 *
 * Ngưỡng mặc định 250 request đang xử lý đồng thời: với thông lượng đo được
 * (~35 lượt đăng nhập/giây do chi phí băm mật khẩu, ~127 req/giây cho các API
 * đọc), 250 tương ứng thời gian chờ tối đa khoảng 2-7 giây — vẫn chấp nhận được.
 */
@Injectable()
export class OverloadProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OverloadProtectionMiddleware.name);

  private inFlight = 0;
  private rejectedTotal = 0;
  private lastWarnAt = 0;

  private readonly max = Number(process.env.MAX_IN_FLIGHT ?? 250);
  private readonly enabled = process.env.OVERLOAD_PROTECTION !== 'false';

  /**
   * /health phải LUÔN đi qua: nếu bị chối trong lúc quá tải, trình điều phối
   * (Docker/K8s/PM2) tưởng service đã chết và restart — đá văng toàn bộ người
   * đang dùng, biến quá tải tạm thời thành sự cố toàn phần.
   */
  private isExempt(req: Request): boolean {
    return req.path === '/health' || req.path.startsWith('/health/');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled || this.isExempt(req)) {
      next();
      return;
    }

    if (this.inFlight >= this.max) {
      this.rejectedTotal++;

      // Chỉ ghi log tối đa 1 lần/giây: lúc quá tải có thể có hàng nghìn lượt
      // chối, ghi log từng lượt sẽ tự làm nghẽn thêm chính event loop.
      const now = Date.now();
      if (now - this.lastWarnAt > 1000) {
        this.lastWarnAt = now;
        this.logger.warn(
          `Quá tải: ${this.inFlight} request đang xử lý (trần ${this.max}), đã từ chối tổng cộng ${this.rejectedTotal}`,
        );
      }

      res.setHeader('Retry-After', '5');
      res.status(503).json({
        error: {
          status: 503,
          message: 'Hệ thống đang quá tải, vui lòng thử lại sau ít phút',
          detail: null,
        },
        request_id:
          (req as unknown as { requestId?: string }).requestId ?? null,
      });
      return;
    }

    this.inFlight++;

    // 'finish' (gửi xong response) và 'close' (client ngắt giữa chừng) đều có
    // thể bắn — và có thể bắn CẢ HAI. Phải chốt cờ, nếu không bộ đếm bị trừ 2
    // lần và tụt xuống âm, làm mất tác dụng bảo vệ.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      this.inFlight--;
    };
    res.on('finish', release);
    res.on('close', release);

    next();
  }
}
