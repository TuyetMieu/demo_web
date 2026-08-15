import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { CoursesService } from 'src/courses/courses.service';
import { LessonsService } from './lessons.service';

describe('LessonsService.completeLesson', () => {
  let service: LessonsService;
  let prisma: any;
  let courses: any;

  beforeEach(async () => {
    prisma = {
      course: { findUnique: jest.fn() },
      enrollment: { findUnique: jest.fn() },
      lesson: { findFirst: jest.fn(), create: jest.fn() },
      lessonProgress: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(1),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ streak: 0, lastStudyDate: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      userDailyXpLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    courses = { recomputeProgress: jest.fn().mockResolvedValue({ completedLessons: 1, progress: 5 }) };

    const mod = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StreakService, useValue: { computeNewStreak: jest.fn().mockReturnValue(1) } },
        { provide: AchievementsService, useValue: { checkAndAwardAchievements: jest.fn().mockResolvedValue([]) } },
        { provide: CoursesService, useValue: courses },
      ],
    }).compile();
    service = mod.get(LessonsService);
  });

  const COURSE = { id: 'python', lessonCount: 20 };

  // ---------- BB2-7 ----------
  describe('BẮT BUỘC ghi danh trước khi hoàn thành bài (chặn farm XP)', () => {
    it('CHƯA ghi danh -> 403 và KHÔNG cộng XP/streak, KHÔNG ghi tiến độ', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue(null); // chưa đăng ký

      await expect(
        service.completeLesson(1, 1, { courseId: 'python' }),
      ).rejects.toThrow(ForbiddenException);

      // Không được chạm tới bất kỳ đường ghi nào.
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.lessonProgress.createMany).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.userDailyXpLog.create).not.toHaveBeenCalled();
    });

    it('ĐÃ ghi danh -> chạy bình thường, có cộng XP', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({ userId: 1, courseId: 'python' });
      prisma.lesson.findFirst.mockResolvedValue({ id: 10, xpReward: 0 });

      const res: any = await service.completeLesson(1, 1, { courseId: 'python' });

      expect(res.ok).toBe(true);
      expect(res.xpGained).toBeGreaterThan(0);
      expect(prisma.user.update).toHaveBeenCalled();
      // XP cộng phải là giá trị SERVER quyết định, không theo client gửi lên
      const xpArg = prisma.user.update.mock.calls[0][0].data.xp.increment;
      expect(xpArg).toBe(50); // DEFAULT_XP khi lesson.xpReward = 0
    });

    it('client gửi xpEarned rất lớn -> vẫn chỉ cộng theo server', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({ userId: 1, courseId: 'python' });
      prisma.lesson.findFirst.mockResolvedValue({ id: 10, xpReward: 0 });

      await service.completeLesson(1, 1, { courseId: 'python', xpEarned: 999999 });

      expect(prisma.user.update.mock.calls[0][0].data.xp.increment).toBe(50);
    });
  });

  // Các chốt chặn có sẵn phải còn nguyên sau khi thêm kiểm tra ghi danh —
  // và phải chặn TRƯỚC khi kiểm tra ghi danh hoặc ngay sau, miễn là vẫn chặn.
  describe('các chốt chặn khác vẫn giữ nguyên', () => {
    it('thiếu courseId -> 400', async () => {
      await expect(service.completeLesson(1, 1, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('khoá học không tồn tại -> 404', async () => {
      prisma.course.findUnique.mockResolvedValue(null);
      await expect(
        service.completeLesson(1, 1, { courseId: 'khong-co' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lessonNo vượt số bài của khoá -> 400, không tạo bài rác', async () => {
      prisma.course.findUnique.mockResolvedValue(COURSE);
      prisma.enrollment.findUnique.mockResolvedValue({ userId: 1, courseId: 'python' });

      await expect(
        service.completeLesson(1, 999999, { courseId: 'python' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.lesson.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
