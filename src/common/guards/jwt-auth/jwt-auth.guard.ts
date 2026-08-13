import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Route public: KHÔNG gọi super.canActivate() -> passport không chạy chút nào.
    if (isPublic) return true;

    // Nhường lại cho AuthGuard('jwt') gốc: nó tự trích Bearer token, tự verify,
    // tự gọi JwtStrategy.validate() và tự gán request.user.
    return super.canActivate(context);
  }
}
