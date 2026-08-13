import { Module } from '@nestjs/common';
import { FixedWindowThrottlerStorage } from './fixed-window-throttler.storage';

/**
 * Module nhỏ chỉ để cung cấp storage cho ThrottlerModule.forRootAsync.
 *
 * ThrottlerAsyncOptions chỉ nhận `imports` (không có `extraProviders`), nên
 * muốn inject storage tự viết vào useFactory thì phải gói nó trong một module
 * có export. Đặt riêng cũng bảo đảm chỉ có DUY NHẤT một instance storage —
 * khai trực tiếp ở hai nơi sẽ tạo hai bộ đếm độc lập và hạn mức bị nhân đôi.
 */
@Module({
  providers: [FixedWindowThrottlerStorage],
  exports: [FixedWindowThrottlerStorage],
})
export class ThrottlerStorageModule {}
