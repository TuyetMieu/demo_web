import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';
import { CustomThrottlerGuard } from '../src/common/guards/throttler/custom-throttler.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth/jwt-auth.guard';

describe('Gateway pipeline order (e2e)', () => {
  describe('Middleware chạy trước guard, bất kể guard có reject hay không', () => {
    // Controller riêng, KHÔNG @Public() -> chắc chắn bị JwtAuthGuard chặn 401.
    @Controller('secure-check')
    class SecureCheckController {
      @Get()
      ping() {
        return { ok: true };
      }
    }

    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
        controllers: [SecureCheckController],
      }).compile();

      app = moduleFixture.createNestApplication();
      setupApiGateway(app);
      await app.init();
    });

    afterAll(async () => await app.close());

    it('request bị 401 vẫn có đủ header do middleware set trước khi guard chạy', async () => {
      const res = await request(app.getHttpServer()).get('/api/secure-check');

      // Guard (chạy SAU middleware) phải reject vì không có token.
      expect(res.status).toBe(401);

      // Nếu các header này vắng mặt -> chứng tỏ middleware KHÔNG chạy trước guard,
      // tức thứ tự pipeline đã bị đảo ngược so với thiết kế.
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Thứ tự guard: CustomThrottlerGuard phải chạy TRƯỚC JwtAuthGuard', () => {
    @Controller('order-check')
    class OrderCheckController {
      @Get()
      ping() {
        return { ok: true };
      }
    }

    // Module thu nhỏ, dùng ĐÚNG 2 class guard thật của app, chỉ hạ limit throttle
    // xuống rất thấp để test nhanh & tất định - không phải spam 1000 request thật.
    @Module({
      controllers: [OrderCheckController],
      imports: [
        ThrottlerModule.forRoot([{ name: 'ip_hour', ttl: 60_000, limit: 2 }]),
      ],
      providers: [
        // Đúng thứ tự đăng ký như api-getway.module.ts: throttler trước, jwt sau.
        { provide: APP_GUARD, useClass: CustomThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        // JwtAuthGuard cần đủ dependency để Nest resolve được, nhưng nhánh
        // "không có token" ném UnauthorizedException NGAY, không bao giờ chạm
        // tới jwtService/configService -> stub trống là đủ, không cần giá trị thật.
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    })
    class OrderCheckModule {}

    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [OrderCheckModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => await app.close());

    it('2 request đầu bị JwtAuthGuard chặn (401), request thứ 3 bị CustomThrottlerGuard chặn (429) chứ KHÔNG phải 401', async () => {
      const server = app.getHttpServer();

      const first = await request(server).get('/order-check');
      const second = await request(server).get('/order-check');
      const third = await request(server).get('/order-check');

      expect(first.status).toBe(401);
      expect(second.status).toBe(401);
      // Nếu JwtAuthGuard chạy trước CustomThrottlerGuard, request thứ 3 vẫn sẽ là 401
      // (vì JWT luôn reject trước khi throttler kịp đếm) -> test này sẽ FAIL, đúng ý đồ.
      expect(third.status).toBe(429);
    });
  });
});
