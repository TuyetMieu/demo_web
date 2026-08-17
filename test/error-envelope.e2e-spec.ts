import { Test } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Public } from '../src/common/decorators/public.decorators';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';

@Controller('boom')
@Public()
class BoomController {
  @Get('forbidden') forbidden() {
    throw new ForbiddenException();
  }
  @Get('bad') bad() {
    throw new BadRequestException(['email must be an email']);
  }
  @Get('crash') crash() {
    throw new Error('kaboom');
  }
}

describe('Error envelope (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [BoomController],
    }).compile();

    app = moduleFixture.createNestApplication();
    // BẮT BUỘC: e2e dùng AppModule nên KHÔNG tự chạy main.ts
    // -> phải gọi setup thủ công, nếu không prefix/version sẽ khác production
    setupApiGateway(app);
    await app.init();
  });

  afterAll(async () => await app.close());

  it.each([
    ['/api/boom/forbidden', 403],
    ['/api/boom/bad', 400],
    ['/api/boom/crash', 500],
    ['/khong-ton-tai', 404],
  ])('%s trả về đúng envelope với status %i', async (path, expected) => {
    const res = await request(app.getHttpServer()).get(path);

    expect(res.status).toBe(expected);
    // dùng toMatchObject + kiểm tra key riêng thay vì expect.anything(), vì matcher đó
    // LOẠI TRỪ null trong khi detail/request_id hợp lệ khi null (Jest docs: anything()
    // matches everything except null/undefined).
    expect(res.body).toMatchObject({
      error: { status: expected, message: expect.any(String) },
    });
    expect(res.body.error).toHaveProperty('detail');
    expect(res.body).toHaveProperty('request_id');
  });
});
