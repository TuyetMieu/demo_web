import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('User (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ids: number[] = [];
  const stamp = Date.now();
  let access = '';
  let meId = 0;
  let otherId = 0;

  const P = (p: string) => `/api${p}`;

  // Hook này gọi register (scrypt hash) + nhiều roundtrip tới Neon -> quá 5s mặc định.
  jest.setTimeout(60_000);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    setupApiGateway(app);
    await app.init();
    prisma = app.get(PrismaService);

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Me',
        email: `u_me_${stamp}@t.local`,
        password: 'secret123',
      });
    access = reg.body.access;
    const me = await prisma.user.findFirst({
      where: { email: `u_me_${stamp}@t.local` },
    });
    meId = me!.id;
    ids.push(meId);

    const other = await prisma.user.create({
      data: {
        name: 'Other',
        email: `u_other_${stamp}@t.local`,
        password: '',
        role: 'user',
      },
    });
    otherId = other.id;
    ids.push(otherId);
  });

  afterAll(async () => {
    await prisma.userFollow.deleteMany({
      where: { OR: [{ followerId: { in: ids } }, { followeeId: { in: ids } }] },
    });
    await prisma.roadMap.deleteMany({ where: { userId: { in: ids } } });
    await prisma.survey.deleteMany({ where: { userId: { in: ids } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${access}` });

  it('GET /api/user cần token, và không trả password', async () => {
    const noAuth = await request(app.getHttpServer()).get(P('/user'));
    expect(noAuth.status).toBe(401);

    const res = await request(app.getHttpServer()).get(P('/user')).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body.needs_questionnaire).toBe(true);
  });

  it('PUT /api/user cập nhật được, và chặn email của người khác', async () => {
    const ok = await request(app.getHttpServer())
      .put(P('/user'))
      .set(auth())
      .send({ name: 'Me Updated' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe('Me Updated');

    const dup = await request(app.getHttpServer())
      .put(P('/user'))
      .set(auth())
      .send({ email: `u_other_${stamp}@t.local` });
    expect(dup.status).toBe(400);
    expect(dup.body.error.message).toBe('Email đã được sử dụng');
  });

  it('PUT /api/user/password đổi mật khẩu và login lại được bằng mật khẩu mới', async () => {
    const wrong = await request(app.getHttpServer())
      .put(P('/user/password'))
      .set(auth())
      .send({ current: 'sai-mat-khau', new: 'newsecret123' });
    expect(wrong.status).toBe(401);

    const ok = await request(app.getHttpServer())
      .put(P('/user/password'))
      .set(auth())
      .send({ current: 'secret123', new: 'newsecret123' });
    expect(ok.status).toBe(200);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `u_me_${stamp}@t.local`, password: 'newsecret123' });
    expect(login.status).toBe(200);
  });

  it('follow: tự follow bị 400, follow 2 lần không lỗi và không nhân đôi', async () => {
    const self = await request(app.getHttpServer())
      .post(P(`/users/${meId}/follow`))
      .set(auth());
    expect(self.status).toBe(400);

    const f1 = await request(app.getHttpServer())
      .post(P(`/users/${otherId}/follow`))
      .set(auth());
    expect(f1.status).toBe(200);

    const f2 = await request(app.getHttpServer())
      .post(P(`/users/${otherId}/follow`))
      .set(auth());
    expect(f2.status).toBe(200);

    const count = await prisma.userFollow.count({
      where: { followerId: meId, followeeId: otherId },
    });
    expect(count).toBe(1);
  });

  it('GET /api/users/:id/following rồi DELETE follow', async () => {
    const list = await request(app.getHttpServer())
      .get(P(`/users/${meId}/following`))
      .set(auth());
    expect(list.status).toBe(200);
    expect(list.body.following.map((f: any) => f.id)).toContain(otherId);

    const del = await request(app.getHttpServer())
      .delete(P(`/users/${otherId}/follow`))
      .set(auth());
    expect(del.status).toBe(200);

    const after = await prisma.userFollow.count({
      where: { followerId: meId, followeeId: otherId },
    });
    expect(after).toBe(0);
  });

  it('POST /api/survey: transaction ghi survey + set questionnaire + sinh roadmap idempotent', async () => {
    const res = await request(app.getHttpServer())
      .post(P('/survey'))
      .set(auth())
      .send({ career_target: 'Backend', language: 'python', domain: 'web' });

    expect(res.status).toBe(200);
    // pickRoadmapTemplate ưu tiên career_target trước language/domain.
    expect(res.body.template).toBe('backend');
    expect(res.body.roadmap_id).toBe(`u${meId}_generated`);

    const user = await prisma.user.findUnique({ where: { id: meId } });
    expect(user!.questionnaireCompleted).toBe(true);

    // Gửi lần 2 -> vẫn chỉ 1 roadmap (upsert theo id cố định).
    await request(app.getHttpServer())
      .post(P('/survey'))
      .set(auth())
      .send({ career_target: 'Backend' });

    const roadmaps = await prisma.roadMap.count({ where: { userId: meId } });
    expect(roadmaps).toBe(1);
  });
});
