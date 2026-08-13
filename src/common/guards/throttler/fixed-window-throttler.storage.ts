import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

interface WindowRecord {
  /** Số hit trong cửa sổ hiện tại. */
  hits: number;
  /** Mốc hết hạn cửa sổ (epoch ms). */
  expiresAt: number;
  /** Mốc hết hạn lệnh chặn (epoch ms); 0 = không bị chặn. */
  blockedUntil: number;
}

/**
 * Bộ đếm rate-limit kiểu CỬA SỔ CỐ ĐỊNH, thay cho ThrottlerStorageService mặc định.
 *
 * VÌ SAO PHẢI THAY (đã kiểm chứng bằng thực nghiệm trên chính thư viện):
 * ThrottlerStorageService mặc định tạo MỘT setTimeout cho MỖI lượt hit, với thời
 * gian đúng bằng ttl của tier. Hệ thống khai 2 tier (1 giờ và 1 ngày) nên mỗi
 * request sinh 2 timer, và timer chỉ biến mất khi tự nổ. Đo thực tế: 20.000
 * request tạo 40.000 timer còn sống và làm heap tăng 20MB. Ngoại suy ở mức 200
 * request/giây liên tục trong 24 giờ là ~35 TRIỆU timer treo (nhiều GB RAM).
 *
 * Tệ hơn cả tốn RAM: khi timer nổ, thư viện chạy `mảng.filter(...)` để gỡ id ra
 * khỏi MỘT mảng dùng chung cho cả tier — thao tác O(n) cấp phát lại toàn bộ mảng.
 * Với mảng hàng trăm nghìn phần tử và hàng trăm timer nổ mỗi giây, event loop bị
 * chiếm liên tục, toàn bộ API (kể cả /health) treo trước cả khi hết bộ nhớ.
 *
 * CÁCH LÀM Ở ĐÂY: mỗi key chỉ giữ một bản ghi {hits, expiresAt, blockedUntil}.
 * KHÔNG tạo timer nào theo hit. Một setInterval DUY NHẤT quét dọn key đã hết hạn
 * theo chu kỳ, nên bộ nhớ tỉ lệ với số key ĐANG hoạt động chứ không tỉ lệ với
 * tổng số request đã từng phục vụ.
 *
 * Giới hạn còn lại: vẫn là bộ nhớ trong từng tiến trình. Khi chạy nhiều instance,
 * mỗi instance đếm riêng nên hạn mức thực tế nhân lên theo số instance — lúc đó
 * cần chuyển sang Redis. Với một tiến trình như hiện tại thì chính xác.
 */
@Injectable()
export class FixedWindowThrottlerStorage
  implements ThrottlerStorage, OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(FixedWindowThrottlerStorage.name);
  private readonly store = new Map<string, WindowRecord>();
  private sweepTimer?: NodeJS.Timeout;

  /** Chu kỳ quét dọn key hết hạn. */
  private readonly sweepIntervalMs = Number(
    process.env.THROTTLE_SWEEP_INTERVAL_MS ?? 60_000,
  );

  /**
   * Trần số key giữ trong bộ nhớ. Chạm trần thì dọn ngay các key đã hết hạn;
   * nếu vẫn quá trần (bị tấn công từ hàng triệu IP giả) thì loại bỏ key cũ nhất.
   * Không có trần này, kẻ tấn công đổi IP liên tục vẫn làm cạn RAM được.
   */
  private readonly maxKeys = Number(process.env.THROTTLE_MAX_KEYS ?? 200_000);

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    // unref: timer dọn dẹp không được giữ tiến trình sống khi tắt server.
    this.sweepTimer.unref();
  }

  onApplicationShutdown(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.store.clear();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const now = Date.now();
    let rec = this.store.get(key);

    // Hết cửa sổ (hoặc chưa có) -> mở cửa sổ mới.
    if (!rec || rec.expiresAt <= now) {
      rec = { hits: 0, expiresAt: now + ttl, blockedUntil: 0 };
      this.store.set(key, rec);
      if (this.store.size > this.maxKeys) this.enforceMaxKeys();
    }

    // Đang trong thời gian bị chặn -> không tăng đếm nữa, trả về trạng thái chặn.
    if (rec.blockedUntil > now) {
      return {
        totalHits: rec.hits,
        timeToExpire: Math.ceil((rec.expiresAt - now) / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil((rec.blockedUntil - now) / 1000),
      };
    }

    rec.hits++;

    // Vượt hạn mức -> bật chặn. blockDuration = 0 nghĩa là chặn tới hết cửa sổ.
    if (rec.hits > limit) {
      rec.blockedUntil =
        blockDuration > 0 ? now + blockDuration : rec.expiresAt;
      return {
        totalHits: rec.hits,
        timeToExpire: Math.ceil((rec.expiresAt - now) / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil((rec.blockedUntil - now) / 1000),
      };
    }

    return {
      totalHits: rec.hits,
      timeToExpire: Math.ceil((rec.expiresAt - now) / 1000),
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /** Xoá mọi key đã hết cửa sổ VÀ hết thời gian chặn. */
  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, rec] of this.store) {
      if (rec.expiresAt <= now && rec.blockedUntil <= now) {
        this.store.delete(key);
        removed++;
      }
    }
    if (removed > 1000) {
      this.logger.debug(
        `Dọn ${removed} key rate-limit hết hạn, còn ${this.store.size}`,
      );
    }
  }

  /** Chạm trần: dọn key hết hạn trước; vẫn quá thì bỏ key cũ nhất (Map giữ thứ tự chèn). */
  private enforceMaxKeys(): void {
    this.sweep();
    if (this.store.size <= this.maxKeys) return;

    const excess = this.store.size - this.maxKeys;
    let i = 0;
    for (const key of this.store.keys()) {
      this.store.delete(key);
      if (++i >= excess) break;
    }
    this.logger.warn(
      `Số key rate-limit chạm trần ${this.maxKeys}, đã loại bỏ ${excess} key cũ nhất`,
    );
  }
}
