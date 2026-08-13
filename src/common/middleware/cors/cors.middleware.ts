import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response, Request } from 'express';
import cors from 'cors';

const CORS_SCOPED_PATHS = ['/api', '/auth'];

function isScopedPath(path: string): boolean {
  // startsWith(prefix + '/') thay vì startsWith(prefix): '/apiary' không được
  // tính là thuộc scope '/api'.
  return CORS_SCOPED_PATHS.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/'),
  );
}

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly corsHandler: ReturnType<typeof cors>;

  constructor(private readonly configService: ConfigService) {
    this.corsHandler = cors({
      origin: this.configService.get<string[]>('app.allowedOrigins'),
      credentials: true,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // const pathname = req.originalUrl.split('?')[0];
    // console.log('[CORS]', req.method, pathname, isScopedPath(req.path));
    if (isScopedPath(req.path)) {
      this.corsHandler(req, res, next);
    } else {
      next();
    }
  }
}
