import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { WerkzeugPBKDF2Hasher } from '../src/common/security/werkzeug-pbkdf2-hasher';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdUserIds: number[] = [];
  const stamp = Date.now();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApiGateway(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.authSession.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  const email = (tag: string) => `e2e_${tag}_${stamp}@test.local`;

  it('POST /auth/register tạo user và trả cặp token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'E2E User', email: email('reg'), password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      needs_questionnaire: true,
      access: expect.any(String),
      refresh: expect.any(String),
    });

    const user = await prisma.user.findFirst({
      where: { email: email('reg') },
    });
    expect(user).toBeTruthy();
    createdUserIds.push(user!.id);
    // Mật khẩu phải được hash theo định dạng Werkzeug, không lưu plaintext.
    expect(user!.password.startsWith('scrypt:')).toBe(true);
  });

  it('POST /auth/register từ chối email trùng với message tiếng Việt', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Trùng', email: email('reg'), password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Email đã được sử dụng');
  });

  it('POST /auth/register từ chối khi thiếu cả email lẫn phone', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Thiếu', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(
      'Vui lòng nhập email hoặc số điện thoại',
    );
  });

  it('POST /auth/login trả token + name + needs_questionnaire', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('reg'), password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      name: 'E2E User',
      needs_questionnaire: true,
      access: expect.any(String),
      refresh: expect.any(String),
    });
  });

  it('POST /auth/login sai mật khẩu trả 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('reg'), password: 'sai-mat-khau' });

    expect(res.status).toBe(401);
  });

  it('login được với mật khẩu PBKDF2 (tương thích hash Werkzeug cũ)', async () => {
    const hashed = await WerkzeugPBKDF2Hasher.encode('legacy-pbkdf2');
    const user = await prisma.user.create({
      data: {
        name: 'PBKDF2 User',
        email: email('pbkdf2'),
        password: hashed,
        role: 'user',
      },
    });
    createdUserIds.push(user.id);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('pbkdf2'), password: 'legacy-pbkdf2' });

    expect(res.status).toBe(200);
  });

  it('login mật khẩu plaintext legacy thành công VÀ tự nâng cấp thành hash', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Legacy User',
        email: email('legacy'),
        password: 'plaintext123', // chưa từng hash
        role: 'user',
      },
    });
    createdUserIds.push(user.id);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('legacy'), password: 'plaintext123' });
    expect(res.status).toBe(200);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.password).not.toBe('plaintext123');
    expect(after!.password.startsWith('scrypt:')).toBe(true);

    // Sau khi nâng cấp vẫn phải đăng nhập được bằng đúng mật khẩu đó.
    const again = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('legacy'), password: 'plaintext123' });
    expect(again.status).toBe(200);
  });

  it('POST /auth/refresh rotate token: token cũ dùng lại lần 2 bị 401', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('reg'), password: 'secret123' });

    const oldRefresh = login.body.refresh;

    const first = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh: oldRefresh });

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      access: expect.any(String),
      refresh: expect.any(String),
    });
    expect(first.body.refresh).not.toBe(oldRefresh);

    // Token cũ đã bị blacklist -> không dùng lại được.
    const replay = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh: oldRefresh });
    expect(replay.status).toBe(401);
  });

  it('POST /auth/logout thu hồi refresh token; token rác vẫn trả ok', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('reg'), password: 'secret123' });

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refresh: login.body.refresh });
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ ok: true });

    // Đã thu hồi -> refresh bằng token đó phải fail.
    const afterLogout = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh: login.body.refresh });
    expect(afterLogout.status).toBe(401);

    // Token không hợp lệ vẫn KHÔNG được ném lỗi (theo spec).
    const garbage = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refresh: 'token-rac-khong-ton-tai' });
    expect(garbage.status).toBe(200);
    expect(garbage.body).toEqual({ ok: true });
  });

  it('access token cấp ra dùng được với JwtAuthGuard toàn cục', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email('reg'), password: 'secret123' });

    // /api/khong-ton-tai không có route -> 404 chứ KHÔNG phải 401,
    // chứng tỏ token hợp lệ đã qua được guard.
    const res = await request(app.getHttpServer())
      .get('/api/khong-ton-tai')
      .set('Authorization', `Bearer ${login.body.access}`);
    expect(res.status).toBe(404);

    // Không có token -> vẫn 404 vì route không tồn tại (guard chạy sau router).
    const noToken = await request(app.getHttpServer()).get(
      '/api/khong-ton-tai',
    );
    expect(noToken.status).toBe(404);
  });
});
