import { Module, ValidationPipe, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, days, hours } from '@nestjs/throttler';
import { AuthModule } from 'src/auth/auth.module';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions/all-exceptions.filter';
import { PrismaExceptionFilter } from 'src/common/filters/prisma-exception/prisma-exception.filter';
import { validationExceptionFactory } from 'src/common/filters/validation-exception.factory';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth/jwt-auth.guard';
import { JwtStrategy } from 'src/common/guards/jwt-auth/jwt.strategy';
import { CustomThrottlerGuard } from 'src/common/guards/throttler/custom-throttler.guard';
import { FixedWindowThrottlerStorage } from 'src/common/guards/throttler/fixed-window-throttler.storage';
import { ThrottlerStorageModule } from 'src/common/guards/throttler/throttler-storage.module';
import { RequestLoggerInterceptor } from 'src/common/interceptors/request-logger/request-logger.interceptor';
import { CorsMiddleware } from 'src/common/middleware/cors/cors.middleware';
import { OverloadProtectionMiddleware } from 'src/common/middleware/overload-protection/overload-protection.middleware';
import { RequestIdMiddleware } from 'src/common/middleware/request-id/request-id.middleware';
import { SecurityHeadersMiddleware } from 'src/common/middleware/security-headers/security-headers.middleware';

@Global()
@Module({
  imports: [
    // Cần cho JwtStrategy: xác minh user còn tồn tại qua CachedUserService
    // (AuthModule export sẵn, không tạo phụ thuộc ngược vì AuthModule
    // không import lại ApiGetwayModule).
    AuthModule,
    // Ngưỡng đọc từ config (env) thay vì hardcode — xem src/config/throttle.config.ts.
    //
    // storage: BẮT BUỘC dùng FixedWindowThrottlerStorage. Storage mặc định
    // của @nestjs/throttler tạo 1 setTimeout cho MỖI hit của MỖI tier; với
    // ttl 1 giờ/1 ngày, timer tích luỹ tới hàng chục triệu và làm sập tiến
    // trình (đã đo: 20.000 request -> 40.000 timer treo, +20MB heap).
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [ConfigService, FixedWindowThrottlerStorage],
      useFactory: (
        config: ConfigService,
        storage: FixedWindowThrottlerStorage,
      ) => ({
        storage,
        throttlers: [
          {
            name: 'ip_hour',
            ttl: hours(1),
            limit: config.get<number>('throttle.ipHourLimit') ?? 1000,
          },
          {
            name: 'ip_day',
            ttl: days(1),
            limit: config.get<number>('throttle.ipDayLimit') ?? 10000,
          },
        ],
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.accessExpires') as any,
        },
      }),
    }),
  ],
  providers: [
    // Provider thường (không phải APP_*): instantiate là tự đăng ký strategy tên
    // 'jwt' vào passport, để AuthGuard('jwt') tìm thấy.
    JwtStrategy,
    // 3 middleware đăng ký qua app.use() trong setupApiGateway (KHÔNG dùng
    // consumer.forRoutes('*') — setGlobalPrefix('api') sẽ đè prefix lên path
    // middleware thành '/api/*', làm /auth/* và /health MẤT CORS/RequestId).
    // Khai ở providers để DI khởi tạo (cần ConfigService) rồi setup lấy ra.
    RequestIdMiddleware,
    OverloadProtectionMiddleware,
    SecurityHeadersMiddleware,
    CorsMiddleware,
    { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // Giữ lại TÊN FIELD bị lỗi trong response (mặc định Nest chỉ trả
        // mảng message) để frontend tô đỏ đúng ô nhập.
        exceptionFactory: validationExceptionFactory,
      }),
    },
  ],
})
export class ApiGetwayModule {}
