import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('trả về ok kèm trạng thái db khi query được database', async () => {
    await expect(controller.check()).resolves.toEqual({
      status: 200,
      message: 'ok',
      db: 'up',
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  // Đây là thay đổi hành vi CÓ CHỦ ĐÍCH so với bản cũ (trước đây ném lỗi).
  // /health đóng vai trò liveness probe: DB chết KHÔNG có nghĩa tiến trình chết.
  // Nếu trả lỗi, trình điều phối sẽ restart service giữa lúc DB đang trục trặc
  // -> đá văng toàn bộ người đang dùng và biến sự cố tạm thời thành toàn phần.
  it('VẪN trả 200 khi database lỗi, nhưng báo rõ db=down (không làm sập liveness probe)', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('DB down'));

    await expect(controller.check()).resolves.toEqual({
      status: 200,
      message: 'ok',
      db: 'down',
    });
  });

  it('CACHE kết quả: gọi liên tiếp chỉ truy vấn database MỘT lần', async () => {
    await controller.check();
    await controller.check();
    await controller.check();

    // Không cache thì mỗi lượt kiểm tra tốn ~237ms round-trip tới Neon và
    // chiếm một connection trong pool — chính health check sẽ làm nghẽn hệ thống.
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('GỘP các lời gọi song song thành MỘT truy vấn duy nhất', async () => {
    let release: (v: unknown) => void = () => {};
    prisma.$queryRaw.mockReturnValue(
      new Promise((r) => {
        release = r;
      }),
    );

    const all = Promise.all([
      controller.check(),
      controller.check(),
      controller.check(),
    ]);
    release([{ '?column?': 1 }]);
    await all;

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
