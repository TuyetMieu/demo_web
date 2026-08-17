import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CachedUserService } from 'src/auth/cached-user.service';

export interface JwtPayload {
  sub: number;
  email?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly cachedUsers: CachedUserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // getOrThrow (không phải get): secretOrKey của passport-jwt là `string | Buffer`,
      // không nhận undefined. Thiếu secret -> ném ngay lúc bootstrap thay vì âm thầm
      // để mọi token đều fail verify lúc runtime.
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  // Chỉ được gọi khi passport-jwt ĐÃ verify xong chữ ký + hạn dùng.
  // Giá trị trả về tự động trở thành request.user.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    // Chữ ký hợp lệ KHÔNG có nghĩa user còn tồn tại — token còn hạn (access
    // thường 15p-1h) trong khi tài khoản đã bị xoá vẫn verify được bình thường.
    // Trước đây không check bước này: mọi insert theo @CurrentUserId() (đăng
    // bài, bình luận, đăng ký khoá...) sẽ nổ P2003 (khoá ngoại users.id không
    // tồn tại) và rơi xuống AllExceptionsFilter thành "Đã có lỗi xảy ra" —
    // người dùng không hiểu vì sao. Giờ chặn NGAY tại cổng vào với message rõ
    // ràng. Dùng CachedUserService (TTL 60s) để không thêm round-trip DB cho
    // mỗi request — đúng mục đích cache này được tạo ra.
    const user = await this.cachedUsers.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      );
    }

    // Trả về user TƯƠI từ DB thay vì payload: email/role trong JWT là snapshot
    // lúc phát hành token — admin bị hạ quyền vẫn giữ role cũ tới khi access
    // token hết hạn (30 phút). Đọc từ DB (cache 60s) thì thay đổi quyền có
    // hiệu lực trong tối đa 60 giây.
    return { sub: payload.sub, email: user.email, role: user.role };
  }
}
