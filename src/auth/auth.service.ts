import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { checkPassword } from 'src/common/security/check-password';
import { WerkzeugScryptHasher } from 'src/common/security/werkzeug-scrypt-hasher';
import { CachedUserService } from './cached-user.service';
import { LoginDto } from './dto/login.dto';
import { PHONE_REGEX, RegisterDto } from './dto/register.dto';
import { RefreshTokenService } from './refresh-token.service';

const HASH_PREFIXES = ['scrypt:', 'pbkdf2:'];

/** Khớp default của Django: backend/accounts/models.py -> role = 'Học viên'. */
const DEFAULT_ROLE = 'Học viên';

/**
 * Chuẩn hoá email về chữ thường + trim.
 * Cột users.email là text @unique (case-SENSITIVE trong Postgres), trong khi
 * Google luôn trả claim email ở dạng chữ thường. Không chuẩn hoá thì
 * 'Victim@Gmail.com' và 'victim@gmail.com' thành 2 tài khoản khác nhau.
 */
function normalizeEmail(email?: string | null): string | undefined {
  const v = email?.trim().toLowerCase();
  return v ? v : undefined;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email?: string;
  /** Chỉ true khi provider XÁC NHẬN email đã verify. Gate cho nhánh auto-link. */
  emailVerified?: boolean;
  name?: string;
  avatar?: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly cachedUsers: CachedUserService,
  ) {}

  // ---------- Task 43-45: login ----------

  async login(dto: LoginDto) {
    // Bước 1: tìm user theo email HOẶC phone.
    // Form đăng nhập chỉ có MỘT ô "Email hoặc số điện thoại" và FE gửi giá trị
    // đó vào field email. Nếu giá trị khớp định dạng SĐT thì phải tra cột phone
    // — không thì người đăng ký bằng SĐT không bao giờ đăng nhập được (email
    // của họ trong DB là placeholder '<sđt>@phone.local').
    const identifier = dto.email?.trim();
    const identifierIsPhone = !!identifier && PHONE_REGEX.test(identifier);

    const user = await this.findByEmailOrPhone(
      identifierIsPhone ? undefined : normalizeEmail(identifier),
      dto.phone?.trim() || (identifierIsPhone ? identifier : undefined),
    );

    // Bước 2: verify password. Cùng một message cho "không tìm thấy user" và
    // "sai mật khẩu" — tránh để lộ email/sđt nào đã tồn tại trong hệ thống.
    if (!user || !(await checkPassword(user.password, dto.password))) {
      throw new UnauthorizedException(
        'Email/số điện thoại hoặc mật khẩu không đúng',
      );
    }

    // Mật khẩu legacy lưu plaintext -> nâng cấp lên hash ngay khi đăng nhập đúng.
    await this.upgradeLegacyPasswordIfNeeded(user, dto.password);

    // Bước 3: build response.
    const tokens = await this.issueTokens(user);
    return {
      ok: true,
      name: user.name,
      needs_questionnaire: !user.questionnaireCompleted,
      ...tokens,
    };
  }

  // ---------- Task 46-47: register ----------

  async register(dto: RegisterDto) {
    // Bước 1: validate trùng TRƯỚC khi insert, message riêng từng field.
    // Nếu để DB tự ném unique-constraint thì client nhận 500 khó hiểu.
    const email = normalizeEmail(dto.email);
    if (email) {
      const existed = await this.prisma.user.findFirst({
        where: { email },
        select: { id: true },
      });
      if (existed) throw new BadRequestException('Email đã được sử dụng');
    }

    if (dto.phone) {
      const existed = await this.prisma.user.findFirst({
        where: { phone: dto.phone },
        select: { id: true },
      });
      if (existed) {
        throw new BadRequestException('Số điện thoại đã được sử dụng');
      }
    }

    // Bước 2: hash password + insert + sinh cặp JWT.
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        // Cột email NOT NULL + UNIQUE: user đăng ký bằng sđt vẫn phải có giá trị
        // duy nhất, dùng placeholder theo phone thay vì để trống.
        email: email ?? `${dto.phone}@phone.local`,
        phone: dto.phone ?? null,
        password: await WerkzeugScryptHasher.encode(dto.password),
        // Django User.role default='Học viên' — KHÔNG phải 'user'.
        role: DEFAULT_ROLE,
      },
    });

    const tokens = await this.issueTokens(user);
    return {
      ok: true,
      needs_questionnaire: !user.questionnaireCompleted,
      ...tokens,
    };
  }

  // ---------- Task 48: logout ----------

  async logout(refresh?: string) {
    if (refresh) {
      // Không try/catch vì revoke() đã được thiết kế không ném lỗi khi token sai.
      await this.refreshTokenService.revoke(refresh);
    }
    return { ok: true };
  }

  // ---------- Task 49-50: refresh ----------

  async refresh(refreshToken: string): Promise<TokenPair> {
    // rotateAndBlacklist đã bao gồm: verify còn hạn + chưa bị thu hồi (bước 1),
    // rồi đánh dấu revokedAt + cấp token mới (bước 2).
    const { userId, refreshToken: newRefresh } =
      await this.refreshTokenService.rotateAndBlacklist(refreshToken);

    const user = await this.cachedUsers.findById(userId);
    if (!user) throw new UnauthorizedException();

    return {
      access: await this.signAccessToken(user),
      refresh: newRefresh,
    };
  }

  // ---------- Task 55-57: OAuth ----------

  async validateOAuthLogin(profile: OAuthProfile): Promise<User> {
    // Bước 1: đã liên kết trước đó -> đăng nhập luôn.
    const linked = await this.prisma.user.findFirst({
      where: {
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
      },
    });
    if (linked) return linked;

    // Bước 2: email trùng tài khoản thường (chưa liên kết OAuth) -> tự động liên kết.
    // CHỈ khi provider đã xác minh email. Thiếu gate này, kẻ tấn công đăng ký
    // trước bằng email nạn nhân rồi chờ nạn nhân đăng nhập Google là chiếm được
    // tài khoản (OAuth pre-hijacking).
    if (profile.email && profile.emailVerified === true) {
      const sameEmail = await this.prisma.user.findFirst({
        where: { email: profile.email, oauthProvider: null },
      });
      if (sameEmail) {
        const updated = await this.prisma.user.update({
          where: { id: sameEmail.id },
          data: {
            oauthProvider: profile.provider,
            oauthProviderId: profile.providerId,
            avatar: sameEmail.avatar ?? profile.avatar ?? null,
          },
        });
        this.cachedUsers.invalidate(updated.id);
        return updated;
      }
    }

    // Bước 3: chưa có gì -> tạo user mới.
    return this.prisma.user.create({
      data: {
        name: profile.name?.trim() || 'Người dùng',
        email:
          profile.email ??
          `${profile.provider}_${profile.providerId}@oauth.local`,
        password: '',
        role: DEFAULT_ROLE,
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
        avatar: profile.avatar ?? null,
        isVerified: true,
      },
    });
  }

  async issueTokens(user: User): Promise<TokenPair> {
    return {
      access: await this.signAccessToken(user),
      refresh: await this.refreshTokenService.issue(user.id),
    };
  }

  // ---------- helpers ----------

  private async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async findByEmailOrPhone(email?: string, phone?: string) {
    const or: Array<Record<string, string>> = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    if (or.length === 0) return null;

    return this.prisma.user.findFirst({ where: { OR: or } });
  }

  private async upgradeLegacyPasswordIfNeeded(user: User, rawPassword: string) {
    const isHashed = HASH_PREFIXES.some((p) => user.password.startsWith(p));
    if (isHashed) return;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: await WerkzeugScryptHasher.encode(rawPassword) },
    });
    this.cachedUsers.invalidate(user.id);
  }
}
