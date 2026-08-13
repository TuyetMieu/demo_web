import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService, OAuthProfile } from 'src/auth/auth.service';

/** Task 58 — GoogleStrategy, scope openid/email/profile. */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('oauth.google.clientId'),
      clientSecret: configService.getOrThrow<string>(
        'oauth.google.clientSecret',
      ),
      callbackURL: configService.getOrThrow<string>('oauth.google.callbackUrl'),
      scope: ['openid', 'email', 'profile'],
    });
  }

  /**
   * Passport gọi hàm này SAU khi đã đổi code lấy token và verify với Google.
   * Ở đây chỉ còn việc map profile -> user trong DB (3 bước ở validateOAuthLogin).
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const primary = profile.emails?.[0];

      // BẮT BUỘC kiểm tra email_verified trước khi coi email là danh tính.
      // passport-google-oauth20 (profile/openid.js) trả emails[0].verified từ
      // claim email_verified. Nếu bỏ qua, một Google Workspace tenant chưa xác
      // minh tên miền có thể phát hành địa chỉ trùng email nạn nhân -> chiếm
      // tài khoản qua nhánh auto-link ở validateOAuthLogin bước 2.
      const emailVerified =
        (primary as { verified?: boolean | string } | undefined)?.verified ===
          true ||
        (primary as { verified?: boolean | string } | undefined)?.verified ===
          'true' ||
        (profile._json as { email_verified?: boolean } | undefined)
          ?.email_verified === true;

      const mapped: OAuthProfile = {
        provider: 'google',
        providerId: profile.id,
        // Email chưa xác minh -> KHÔNG truyền xuống, buộc rơi vào nhánh tạo user mới
        // thay vì nhánh liên kết vào tài khoản sẵn có.
        email: emailVerified ? primary?.value?.trim().toLowerCase() : undefined,
        emailVerified,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
      };

      const user = await this.authService.validateOAuthLogin(mapped);
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
