import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(5000),

  // Default 'development' khớp cách dùng hiện có (chỉ so sánh === 'production').
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // Kill-switch rate-limit (chỉ dành cho đo tải nội bộ): optional để env cũ
  // không có biến này vẫn boot, nhưng ở production chỉ chấp nhận 'false' —
  // app TỪ CHỐI khởi động nếu công tắc đang bật.
  THROTTLE_DISABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('false'),
    otherwise: Joi.string().valid('true', 'false'),
  }),

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('30m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('8h'),

  FRONTEND_URL: Joi.string().uri().required(),
  ALLOWED_ORIGINS: Joi.string().required(),

  // OAuth: optional() chứ không required() — thiếu credential thì chỉ tắt
  // đăng nhập mạng xã hội, KHÔNG chặn app khởi động.
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),
  FACEBOOK_CLIENT_ID: Joi.string().optional(),
  FACEBOOK_CLIENT_SECRET: Joi.string().optional(),
  FACEBOOK_CALLBACK_URL: Joi.string().uri().optional(),
});
