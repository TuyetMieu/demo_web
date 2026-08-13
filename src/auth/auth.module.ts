import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookStrategy } from 'src/common/guards/jwt-auth/facebook.strategy';
import { GoogleStrategy } from 'src/common/guards/jwt-auth/google.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CachedUserService } from './cached-user.service';
import { RefreshTokenService } from './refresh-token.service';

/**
 * Đăng ký GoogleStrategy qua factory thay vì khai thẳng vào providers.
 *
 * Lý do: PassportStrategy tự đăng ký vào passport ngay trong constructor, và
 * constructor gọi getOrThrow() cho clientID/secret. Nếu môi trường chưa cấu hình
 * OAuth (dev mới clone repo, CI...), khai thẳng sẽ làm app CHẾT lúc bootstrap.
 * Với factory, thiếu credential thì chỉ log cảnh báo và bỏ qua — các route còn
 * lại vẫn chạy bình thường, chỉ /auth/google là không dùng được.
 */
const googleStrategyProvider = {
  provide: GoogleStrategy,
  inject: [ConfigService, AuthService],
  useFactory: (config: ConfigService, authService: AuthService) => {
    const clientId = config.get<string>('oauth.google.clientId');
    const clientSecret = config.get<string>('oauth.google.clientSecret');

    if (!clientId || !clientSecret) {
      new Logger('AuthModule').warn(
        'Thiếu GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET — bỏ qua đăng nhập Google.',
      );
      return null;
    }
    return new GoogleStrategy(config, authService);
  },
};

// Cùng pattern với Google: thiếu credential thì bỏ qua thay vì chết bootstrap.
const facebookStrategyProvider = {
  provide: FacebookStrategy,
  inject: [ConfigService, AuthService],
  useFactory: (config: ConfigService, authService: AuthService) => {
    const clientId = config.get<string>('oauth.facebook.clientId');
    const clientSecret = config.get<string>('oauth.facebook.clientSecret');

    if (!clientId || !clientSecret) {
      new Logger('AuthModule').warn(
        'Thiếu FACEBOOK_CLIENT_ID/FACEBOOK_CLIENT_SECRET — bỏ qua đăng nhập Facebook.',
      );
      return null;
    }
    return new FacebookStrategy(config, authService);
  },
};

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    CachedUserService,
    googleStrategyProvider,
    facebookStrategyProvider,
  ],
  exports: [AuthService, RefreshTokenService, CachedUserService],
})
export class AuthModule {}
