import { registerAs } from '@nestjs/config';

export default registerAs('oauth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Phải khớp CHÍNH XÁC "Authorized redirect URI" khai trên Google Cloud Console,
    // sai một ký tự (kể cả dấu / cuối) là Google trả redirect_uri_mismatch.
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:5000/auth/google/callback',
  },

  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackUrl:
      process.env.FACEBOOK_CALLBACK_URL ??
      'http://localhost:5000/auth/facebook/callback',
  },
}));
