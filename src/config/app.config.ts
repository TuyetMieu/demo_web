import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  frontendUrl: process.env.FRONTEND_URL,
  allowedOrigins:
    process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [],
}));
