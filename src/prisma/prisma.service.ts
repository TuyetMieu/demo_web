import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  constructor() {
    const adapter = new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
      // Neon autosuspend: compute "ngủ" sau vài phút không hoạt động và mất
      // ~10s để thức dậy — timeout mặc định ~10s làm request ĐẦU TIÊN sau
      // khoảng lặng luôn 500. Nới lên 30s để sống sót qua cold start.
      connectionTimeoutMillis: 30_000,
      // Đóng connection idle sau 30s: Neon proxy tự cắt socket idle phía
      // server; giữ lâu hơn chỉ tổ dùng phải connection chết.
      idleTimeoutMillis: 30_000,
      // Trần pool (Task 262 — cấu hình pool tương đương bản Django).
      //
      // ĐÂY LÀ THAM SỐ QUYẾT ĐỊNH THÔNG LƯỢNG của toàn hệ thống. Mỗi truy
      // vấn tới Neon (us-east-2) mất ~237ms round-trip, nên số request/giây
      // tối đa ≈ max / 0.237. Với max=10 thì trần chỉ ~42 req/s — đo thực
      // tế đúng 37 req/s. Nâng max lên là cách tăng thông lượng hiệu quả
      // nhất vì thời gian đó là CHỜ MẠNG, không tốn CPU.
      //
      // Dùng endpoint '-pooler' của Neon (PgBouncer) nên chịu được hàng
      // nghìn connection; nút thắt không nằm ở phía Neon.
      max: Number(process.env.DB_POOL_MAX ?? 50),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
