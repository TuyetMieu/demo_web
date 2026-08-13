import { FixedWindowThrottlerStorage } from './fixed-window-throttler.storage';

describe('FixedWindowThrottlerStorage', () => {
  let storage: FixedWindowThrottlerStorage;

  beforeEach(() => {
    storage = new FixedWindowThrottlerStorage();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
  });

  it('đếm số hit trong cửa sổ', async () => {
    const a = await storage.increment('k', 60_000, 3, 0, 'ip_hour');
    const b = await storage.increment('k', 60_000, 3, 0, 'ip_hour');

    expect(a.totalHits).toBe(1);
    expect(b.totalHits).toBe(2);
    expect(b.isBlocked).toBe(false);
  });

  it('chặn khi vượt hạn mức', async () => {
    for (let i = 0; i < 3; i++) {
      await storage.increment('k', 60_000, 3, 0, 'ip_hour');
    }
    const over = await storage.increment('k', 60_000, 3, 0, 'ip_hour');

    expect(over.isBlocked).toBe(true);
    expect(over.timeToBlockExpire).toBeGreaterThan(0);
  });

  it('mỗi key đếm ĐỘC LẬP — một IP bị chặn không ảnh hưởng IP khác', async () => {
    for (let i = 0; i < 5; i++) {
      await storage.increment('ip-A', 60_000, 3, 0, 'ip_hour');
    }
    const other = await storage.increment('ip-B', 60_000, 3, 0, 'ip_hour');

    expect(other.isBlocked).toBe(false);
    expect(other.totalHits).toBe(1);
  });

  it('mở cửa sổ mới sau khi TTL hết hạn', async () => {
    // ttl 1ms rồi chờ qua mốc -> cửa sổ mới, bộ đếm về 1
    await storage.increment('k', 1, 1, 0, 'ip_hour');
    await new Promise((r) => setTimeout(r, 5));
    const fresh = await storage.increment('k', 1, 1, 0, 'ip_hour');

    expect(fresh.totalHits).toBe(1);
    expect(fresh.isBlocked).toBe(false);
  });

  // Đây là LÝ DO TỒN TẠI của lớp này: storage mặc định của @nestjs/throttler tạo
  // một setTimeout cho MỖI hit (đo thực tế: 20.000 request -> 40.000 timer treo,
  // +20MB heap; ngoại suy 200 req/s trong 24h ~ 35 triệu timer -> OOM).
  it('KHÔNG tạo timer theo từng hit — chỉ một timer dọn dẹp duy nhất', async () => {
    const before = process
      .getActiveResourcesInfo()
      .filter((r) => r === 'Timeout').length;

    storage.onModuleInit(); // tạo đúng 1 timer quét dọn
    for (let i = 0; i < 500; i++) {
      await storage.increment('key-' + i, 3_600_000, 1000, 0, 'ip_hour');
    }

    const after = process
      .getActiveResourcesInfo()
      .filter((r) => r === 'Timeout').length;
    // 500 hit chỉ được phép thêm tối đa 1 timer (timer quét dọn), không phải 500.
    expect(after - before).toBeLessThanOrEqual(1);
  });

  it('có TRẦN số key để kẻ tấn công đổi IP liên tục không làm cạn RAM', async () => {
    process.env.THROTTLE_MAX_KEYS = '50';
    const bounded = new FixedWindowThrottlerStorage();
    try {
      for (let i = 0; i < 300; i++) {
        await bounded.increment('ip-' + i, 3_600_000, 1000, 0, 'ip_hour');
      }
      expect(
        (bounded as unknown as { store: Map<string, unknown> }).store.size,
      ).toBeLessThanOrEqual(50);
    } finally {
      bounded.onApplicationShutdown();
      delete process.env.THROTTLE_MAX_KEYS;
    }
  });
});
