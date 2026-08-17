import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';

describe('Google OAuth (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    setupApiGateway(app);
    await app.init();
  });

  afterAll(async () => await app.close());

  // ---------- Task 59 ----------
  it('GET /auth/google redirect sang Google với đúng scope + client_id + redirect_uri', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google');

    expect(res.status).toBe(302);
    const location = res.headers.location;
    expect(location).toContain('accounts.google.com');

    const url = new URL(location);
    expect(url.searchParams.get('client_id')).toBeTruthy();
    expect(url.searchParams.get('response_type')).toBe('code');

    // scope phải có đủ openid/email/profile theo task 58.
    const scope = url.searchParams.get('scope') ?? '';
    expect(scope).toContain('openid');
    expect(scope).toContain('email');
    expect(scope).toContain('profile');

    // redirect_uri phải trỏ về đúng callback của backend.
    expect(url.searchParams.get('redirect_uri')).toContain(
      '/auth/google/callback',
    );
  });

  it('/auth/google là route PUBLIC — không bị JwtAuthGuard chặn 401', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google');
    expect(res.status).not.toBe(401);
  });

  // ---------- Task 60 ----------
  it('GET /auth/google/callback không có code -> KHÔNG 500, không lộ token', async () => {
    const res = await request(app.getHttpServer()).get('/auth/google/callback');

    // Passport từ chối khi thiếu code; chấp nhận 302 (redirect lỗi) hoặc 401,
    // nhưng tuyệt đối không được 500 và không được kèm token nào.
    expect([302, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);

    const body = JSON.stringify(res.body ?? {});
    expect(body).not.toContain('access');
    expect(body).not.toContain('refresh');
  });
});
