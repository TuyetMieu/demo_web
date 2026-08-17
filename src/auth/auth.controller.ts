import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, seconds } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from 'src/common/decorators/public.decorators';
import {
  FacebookCallbackGuard,
  GoogleCallbackGuard,
  type OAuthErrorRequest,
} from 'src/common/guards/jwt-auth/oauth-callback.guard';
import type { User } from 'src/generated/prisma';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LogoutDto, RefreshDto } from './dto/token.dto';

// Toàn bộ route auth phải @Public(): JwtAuthGuard là APP_GUARD toàn cục, không
// loại trừ thì không ai đăng nhập được (chicken-and-egg).
@Controller('auth')
@Public()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Throttle override: đè tier 'ip_hour' RIÊNG cho route này.
  // CustomThrottlerGuard sinh key theo `${controller}.${route}:${ip}:${name}` nên
  // quota này không dùng chung với các route khác.
  // Ngưỡng đọc từ env (mặc định giữ nguyên 20 req/60s) — @Throttle là decorator
  // nên giá trị phải tính được lúc nạp class, đọc trực tiếp process.env.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    ip_hour: {
      limit: Number(process.env.THROTTLE_LOGIN_LIMIT ?? 20),
      ttl: seconds(Number(process.env.THROTTLE_LOGIN_TTL_SECONDS ?? 60)),
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    ip_hour: {
      limit: Number(process.env.THROTTLE_REGISTER_LIMIT ?? 10),
      ttl: seconds(Number(process.env.THROTTLE_REGISTER_TTL_SECONDS ?? 60)),
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Spec yêu cầu hỗ trợ CẢ GET và POST /auth/logout.
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logoutPost(@Body() dto: LogoutDto) {
    return this.authService.logout(dto?.refresh);
  }

  // GET KHÔNG nhận refresh token qua query string: token trong URL lọt vào
  // access log, browser history và header Referer. Muốn thu hồi token phải
  // dùng POST với body {refresh}; GET chỉ còn trả ok để không phá client cũ.
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  logoutGet() {
    return { ok: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh);
  }

  // ---------- Task 59 ----------
  // Không có thân hàm: AuthGuard('google') tự redirect sang trang consent của Google.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    /* passport lo phần redirect */
  }

  // ---------- Task 60 ----------
  // GoogleCallbackGuard (không phải AuthGuard('google') trần): lỗi từ
  // strategy/service không được ném thành trang JSON 401 mà lưu vào
  // req.oauthError để redirect về frontend kèm thông báo.
  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.getOrThrow<string>('app.frontendUrl');

    // GoogleStrategy.validate() đã gán user (qua done(null, user)).
    const user = req.user as User | undefined;
    if (!user) {
      const params = new URLSearchParams({ error: 'oauth_failed' });
      const message = (req as OAuthErrorRequest).oauthError;
      if (message) params.set('message', message);
      res.redirect(`${frontendUrl}/auth/callback#${params.toString()}`);
      return;
    }

    const tokens = await this.authService.issueTokens(user);

    // Sheet 3: PHẢI dùng fragment (#), KHÔNG dùng query string (?).
    // Fragment không được trình duyệt gửi lên server, không lọt vào access log
    // hay header Referer của các request sau -> tránh rò rỉ JWT.
    const fragment = new URLSearchParams({
      access: tokens.access,
      refresh: tokens.refresh,
    }).toString();

    res.redirect(`${frontendUrl}/auth/callback#${fragment}`);
  }

  // ---------- Task 61-62: Facebook OAuth ----------
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth(): void {
    /* passport lo phần redirect sang trang consent của Facebook */
  }

  // Spec sheet 1 (API #7): giống Google nhưng KHÁC target redirect khi thất bại
  // — dùng mã lỗi riêng facebook_oauth_failed để FE phân biệt provider.
  @Get('facebook/callback')
  @UseGuards(FacebookCallbackGuard)
  async facebookCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl =
      this.configService.getOrThrow<string>('app.frontendUrl');

    const user = req.user as User | undefined;
    if (!user) {
      const params = new URLSearchParams({ error: 'facebook_failed' });
      const message = (req as OAuthErrorRequest).oauthError;
      if (message) params.set('message', message);
      res.redirect(`${frontendUrl}/login?${params.toString()}`);
      return;
    }

    const tokens = await this.authService.issueTokens(user);
    const fragment = new URLSearchParams({
      access: tokens.access,
      refresh: tokens.refresh,
    }).toString();

    res.redirect(`${frontendUrl}/auth/callback#${fragment}`);
  }
}
