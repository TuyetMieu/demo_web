import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/common/guards/jwt-auth/jwt.strategy';

/**
 * Lấy user đã được JwtAuthGuard/JwtStrategy gán vào request.
 * Controller KHÔNG tự parse header Authorization — nhờ vậy khi auth chuyển sang
 * Kong/gateway riêng, chỉ cần đổi chỗ điền req.user, controller không đổi.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    return data ? user?.[data] : user;
  },
);

/** Shortcut lấy thẳng id user hiện tại (payload.sub). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user as JwtPayload).sub;
  },
);
