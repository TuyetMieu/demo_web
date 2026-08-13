import { Controller, HttpCode, Get, HttpStatus, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/common/decorators/public.decorators';
import { PrismaService } from 'src/prisma/prisma.service';

/** Kết quả kiểm tra DB được dùng lại trong bao lâu (ms). */
const DB_CHECK_TTL_MS = Number(process.env.HEALTH_DB_TTL_MS ?? 5000);

// /health nằm ở root (đã exclude khỏi prefix 'api' trong api-getway.setup.ts).
@Controller('health')
@Public()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  /** Kết quả kiểm tra DB gần nhất, dùng lại trong DB_CHECK_TTL_MS. */
  private dbCache: { ok: boolean; checkedAt: number; error?: string } = {
    ok: true,
    checkedAt: 0,
  };
  /** Lời gọi kiểm tra đang bay — gộp mọi request cùng lúc vào 1 truy vấn. */
  private inFlight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness + readiness gộp làm một, nhưng KHÔNG truy vấn DB ở mọi request.
   *
   * Trước đây mỗi lần gọi /health đều chạy `SELECT 1`. Đo thực tế: một vòng
   * tới Neon (us-east-2) mất ~237ms và CHIẾM một connection trong pool. Hệ quả:
   *  - mỗi lượt kiểm tra sức khoẻ tốn 237ms và tranh connection với người dùng thật;
   *  - khi hệ thống đang quá tải, chính health check lại càng làm nghẽn thêm,
   *    rồi bị timeout -> trình điều phối tưởng service chết và restart oan,
   *    đá văng toàn bộ người đang dùng. Đây là kiểu lỗi tự khuếch đại sự cố.
   *
   * Nay: kết quả kiểm tra DB được lưu lại trong 5 giây và các request cùng lúc
   * dùng chung MỘT truy vấn (gộp lời gọi), nên tần suất poll dày đặc cũng chỉ
   * tốn tối đa 1 truy vấn / 5 giây. Vẫn phát hiện được DB chết trong ~5 giây.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ ip_hour: true, ip_day: true })
  async check() {
    await this.ensureDbChecked();
    return {
      status: 200,
      message: 'ok',
      db: this.dbCache.ok ? 'up' : 'down',
    };
  }

  private async ensureDbChecked(): Promise<void> {
    const fresh = Date.now() - this.dbCache.checkedAt < DB_CHECK_TTL_MS;
    if (fresh) return;
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        this.dbCache = { ok: true, checkedAt: Date.now() };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        this.dbCache = { ok: false, checkedAt: Date.now(), error };
        this.logger.error(`Health check DB thất bại: ${error}`);
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }
}
