import { registerAs } from '@nestjs/config';

/**
 * Giới hạn tần suất request — tách ra env thay vì hardcode.
 *
 * Lý do: cùng một bộ code chạy ở dev / staging / production / lúc đo tải cần
 * ngưỡng khác nhau. Trước đây các số này nằm cứng trong code nên muốn đo sức
 * chịu tải thật (hoặc nới cho môi trường nội bộ) là phải sửa code rồi build lại.
 *
 * Giá trị mặc định giữ NGUYÊN như bản hardcode cũ để không đổi hành vi production.
 */
export default registerAs('throttle', () => ({
  // Tier chung áp cho mọi route
  ipHourLimit: Number(process.env.THROTTLE_IP_HOUR_LIMIT ?? 1000),
  ipDayLimit: Number(process.env.THROTTLE_IP_DAY_LIMIT ?? 10000),

  // Override riêng cho các route nhạy cảm (đăng nhập/đăng ký) — chống dò mật khẩu
  loginLimit: Number(process.env.THROTTLE_LOGIN_LIMIT ?? 20),
  loginTtlSeconds: Number(process.env.THROTTLE_LOGIN_TTL_SECONDS ?? 60),
  registerLimit: Number(process.env.THROTTLE_REGISTER_LIMIT ?? 10),
  registerTtlSeconds: Number(process.env.THROTTLE_REGISTER_TTL_SECONDS ?? 60),

  // Cho phép tắt HOÀN TOÀN rate limit — CHỈ dùng khi đo tải nội bộ.
  // Không bao giờ bật ở production: mất lớp chống dò mật khẩu và chống DoS.
  disabled: process.env.THROTTLE_DISABLED === 'true',
}));
