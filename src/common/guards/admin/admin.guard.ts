import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from 'src/common/guards/jwt-auth/jwt.strategy';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user as JwtPayload | undefined;

    // ForbiddenException (403) chứ không phải Unauthorized (401): user ĐÃ đăng nhập
    // hợp lệ (JwtAuthGuard toàn cục đã chạy trước), chỉ là không đủ quyền.
    if (user?.role !== 'admin') {
      throw new ForbiddenException();
    }

    return true;
  }
}
