import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
// Kiểu NestExpressApplication (không phải INestApplication chung) mới có
// useBodyParser — cần để đặt trần kích thước body.
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/logger/logger.service';
import { setupApiGateway } from './api-getway/api-getway.setup';

async function bootstrap() {
  const logger = new AppLogger({ json: true });

  // Một promise bị reject mà không ai bắt sẽ làm Node KẾT THÚC TIẾN TRÌNH
  // (mặc định từ Node 15). Dưới tải cao, chỉ cần một lỗi mạng Neon lọt ra ngoài
  // là cả server sập, mọi người đang dùng bị văng ra. Ghi log rồi tiếp tục sống.
  process.on('unhandledRejection', (reason) => {
    logger.error(
      `unhandledRejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  });
  // uncaughtException thì trạng thái tiến trình đã không còn đáng tin -> ghi log
  // rồi thoát có kiểm soát để trình quản lý tiến trình khởi động lại sạch sẽ.
  process.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err.message}`, err.stack);
    process.exit(1);
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    // Chặn body quá lớn ngay tại cổng vào: không có trần thì một request duy
    // nhất gửi JSON hàng chục MB (vd lộ trình cá nhân) đủ để ngốn RAM và làm
    // chậm cả tiến trình. 1mb thoải mái cho mọi payload hợp lệ của hệ thống.
    bodyParser: true,
    rawBody: false,
  });

  app.useBodyParser('json', { limit: process.env.BODY_LIMIT || '1mb' });
  app.useBodyParser('urlencoded', {
    limit: process.env.BODY_LIMIT || '1mb',
    extended: true,
  });

  // Nén gzip/brotli cho response JSON lớn (courses, skills, forum feed...) —
  // giảm băng thông đáng kể khi nhiều client cùng poll badge/feed.
  app.use(compression());

  setupApiGateway(app);

  // Bảo đảm PrismaService.onModuleDestroy ($disconnect) chạy khi SIGTERM/SIGINT
  // — không có dòng này thì pool Neon giữ connection treo tới khi timeout.
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `Server sẵn sàng trên cổng ${port} | UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE ?? '4 (mặc định)'} | rate limit ${process.env.THROTTLE_DISABLED === 'true' ? 'ĐÃ TẮT (chỉ dùng khi đo tải)' : 'đang bật'}`,
    'Bootstrap',
  );
}
bootstrap();
