import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApiGateway } from '../src/api-getway/api-getway.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Courses + Lessons (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now();
  const courseId = `e2e_course_${stamp}`;
  let access = '';
  let userId = 0;

  const P = (p: string) => `/api${p}`;
  jest.setTimeout(120_000);

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    setupApiGateway(app);
    await app.init();
    prisma = app.get(PrismaService);

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'CL User',
        email: `cl_${stamp}@t.local`,
        password: 'secret123',
      });
    access = reg.body.access;
    const u = await prisma.user.findFirst({
      where: { email: `cl_${stamp}@t.local` },
    });
    userId = u!.id;

    await prisma.course.create({
      data: {
        id: courseId,
        title: 'Khoá E2E Python',
        level: 'beginner',
        rating: 0,
        lessonCount: 2,
        instructorId: userId,
        xp_reward: 50,
        language: 'python',
        accentColor: '#3776AB',
      },
    });
  });

  afterAll(async () => {
    await prisma.userDailyXpLog.deleteMany({ where: { userId } });
    await prisma.userAchievement.deleteMany({ where: { userId } });
    await prisma.lessonProgress.deleteMany({ where: { userId } });
    await prisma.courseRating.deleteMany({ where: { courseId } });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.lesson.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.authSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${access}` });

  it('GET /api/courses trả camelCase + cờ enrolled=false ban đầu', async () => {
    const res = await request(app.getHttpServer())
      .get(P('/courses'))
      .set(auth());
    expect(res.status).toBe(200);
    const c = res.body.courses.find((x: any) => x.id === courseId);
    expect(c).toMatchObject({
      totalLessons: 2,
      accentColor: '#3776AB',
      language: 'python',
      enrolled: false,
    });
  });

  it("search 'c' KHÔNG khớp nhầm khoá python (case đặc biệt)", async () => {
    const res = await request(app.getHttpServer())
      .get(P('/courses') + '?q=c')
      .set(auth());
    expect(res.status).toBe(200);
    expect(
      res.body.courses.find((x: any) => x.id === courseId),
    ).toBeUndefined();

    // Nhưng search 'py' thì phải ra.
    const hit = await request(app.getHttpServer())
      .get(P('/courses') + '?q=py')
      .set(auth());
    expect(hit.body.courses.find((x: any) => x.id === courseId)).toBeTruthy();
  });

  it('rate khi CHƯA enroll bị 403', async () => {
    const res = await request(app.getHttpServer())
      .post(P('/course/rating'))
      .set(auth())
      .send({ course_id: courseId, rating: 5 });
    expect(res.status).toBe(403);
  });

  it('POST enroll 2 lần không nhân đôi bản ghi', async () => {
    const a = await request(app.getHttpServer())
      .post(P(`/courses/${courseId}/enroll`))
      .set(auth());
    expect(a.status).toBe(200);

    const b = await request(app.getHttpServer())
      .post(P(`/courses/${courseId}/enroll`))
      .set(auth());
    expect(b.status).toBe(200);

    const n = await prisma.enrollment.count({ where: { userId, courseId } });
    expect(n).toBe(1);
  });

  it('rate sau khi enroll: lưu được, AVG làm tròn 1 chữ số', async () => {
    const res = await request(app.getHttpServer())
      .post(P('/course/rating'))
      .set(auth())
      .send({ course_id: courseId, rating: 4 });
    expect(res.status).toBe(200);
    expect(res.body.average).toBe(4);
    expect(res.body.count).toBe(1);

    const bad = await request(app.getHttpServer())
      .post(P('/course/rating'))
      .set(auth())
      .send({ course_id: courseId, rating: 9 });
    expect(bad.status).toBe(400);
  });

  it('completeLesson lần 1: cộng XP + gems + streak=1, tiến độ 50%', async () => {
    const before = await prisma.user.findUnique({ where: { id: userId } });

    const res = await request(app.getHttpServer())
      .post(P('/lessons/1/complete'))
      .set(auth())
      .send({ courseId, xpEarned: 30 });

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(false);
    expect(res.body.xpGained).toBe(30);
    expect(res.body.streak).toBe(1);
    expect(res.body.progress).toBe(50); // 1/2 bài

    const after = await prisma.user.findUnique({ where: { id: userId } });
    expect(after!.xp).toBe(before!.xp + 30);
    expect(after!.gems).toBe(before!.gems + 30); // Django: gems += xpEarned
  });

  it('completeLesson lần 2 CÙNG bài: KHÔNG cộng XP lần nữa (Task 119 idempotency)', async () => {
    const before = await prisma.user.findUnique({ where: { id: userId } });

    const res = await request(app.getHttpServer())
      .post(P('/lessons/1/complete'))
      .set(auth())
      .send({ courseId, xpEarned: 30 });

    expect(res.status).toBe(200);
    expect(res.body.alreadyCompleted).toBe(true);
    expect(res.body.xpGained).toBe(0);

    const after = await prisma.user.findUnique({ where: { id: userId } });
    // Đây là chốt chặn chống spam F5 — XP/gems phải đứng yên tuyệt đối.
    expect(after!.xp).toBe(before!.xp);
    expect(after!.gems).toBe(before!.gems);

    // Log XP theo ngày cũng không được cộng thêm.
    const logs = await prisma.userDailyXpLog.findMany({ where: { userId } });
    expect(logs.reduce((s, l) => s + l.xpEarned, 0)).toBe(30);
  });

  it('học bài thứ 2 -> tiến độ 100%, streak GIỮ NGUYÊN vì cùng ngày', async () => {
    const res = await request(app.getHttpServer())
      .post(P('/lessons/2/complete'))
      .set(auth())
      .send({ courseId, xpEarned: 20 });

    expect(res.status).toBe(200);
    expect(res.body.progress).toBe(100);
    // Đã học hôm nay rồi -> streak không tăng lên 2.
    expect(res.body.streak).toBe(1);
  });

  it('GET /api/enrolled phản ánh tiến độ mới nhất', async () => {
    const res = await request(app.getHttpServer())
      .get(P('/enrolled'))
      .set(auth());
    expect(res.status).toBe(200);
    const e = res.body.enrolled.find((x: any) => x.courseId === courseId);
    expect(e).toMatchObject({
      progress: 100,
      completedLessons: 2,
      totalLessons: 2,
    });
  });

  it('unenroll KHÔNG xoá lesson_progress; enroll lại giữ nguyên 100%', async () => {
    await request(app.getHttpServer())
      .delete(P(`/courses/${courseId}/enroll`))
      .set(auth())
      .expect(200);

    const kept = await prisma.lessonProgress.count({
      where: { userId, courseId },
    });
    expect(kept).toBe(2);

    const again = await request(app.getHttpServer())
      .post(P(`/courses/${courseId}/enroll`))
      .set(auth());
    expect(again.status).toBe(200);
    // Nếu thiếu bước "tính lại tiến độ" thì chỗ này sẽ ra 0%.
    expect(again.body.progress).toBe(100);
  });

  it('GET /api/courses-enrolled trả cả 2 mảng trong 1 lần gọi', async () => {
    const res = await request(app.getHttpServer())
      .get(P('/courses-enrolled'))
      .set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(Array.isArray(res.body.enrolled)).toBe(true);
    expect(res.body.courses.find((c: any) => c.id === courseId).enrolled).toBe(
      true,
    );
  });
});
