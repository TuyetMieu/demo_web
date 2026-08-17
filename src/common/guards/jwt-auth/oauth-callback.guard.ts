import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/** Request được gắn thêm message lỗi OAuth để controller redirect kèm thông báo. */
export type OAuthErrorRequest = Request & { oauthError?: string };

/**
 * AuthGuard mặc định NÉM exception khi strategy báo lỗi (done(err)) — nhưng ở
 * route callback OAuth, người dùng đang được TRÌNH DUYỆT điều hướng nên sẽ
 * nhìn thấy trang JSON 401 thô thay vì quay về frontend. Ví dụ: nhánh từ chối
 * auto-link trong validateOAuthLogin (chống pre-hijacking) ném
 * UnauthorizedException với message tiếng Việt cần hiển thị cho người dùng.
 *
 * Guard này nuốt lỗi, lưu message vào req.oauthError và trả user=undefined để
 * rơi đúng vào nhánh `if (!user) res.redirect(...)` sẵn có trong AuthController.
 */
function createOAuthCallbackGuard(provider: string): Type<CanActivate> {
  @Injectable()
  class OAuthCallbackGuard extends AuthGuard(provider) {
    handleRequest<TUser = unknown>(
      err: unknown,
      user: unknown,
      _info: unknown,
      context: ExecutionContext,
    ): TUser {
      if (err instanceof Error) {
        const req = context.switchToHttp().getRequest<OAuthErrorRequest>();
        req.oauthError = err.message;
      }
      return (user || undefined) as TUser;
    }
  }
  return OAuthCallbackGuard;
}

export class GoogleCallbackGuard extends createOAuthCallbackGuard('google') {}
export class FacebookCallbackGuard extends createOAuthCallbackGuard(
  'facebook',
) {}
