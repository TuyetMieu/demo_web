import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { StreakService } from 'src/common/streak/streak.service';
import { StatsService, parseTimeSpent } from './stats.service';

describe('parseTimeSpent (Task 138)', () => {
  it("parse chuỗi dạng '12.5h' ra số giờ", () => {
    expect(parseTimeSpent('12.5h')).toBe(12.5);
    expect(parseTimeSpent('3h')).toBe(3);
    expect(parseTimeSpent('0.5 h')).toBe(0.5);
  });

  it('nhận luôn kiểu number', () => {
    expect(parseTimeSpent(42)).toBe(42);
  });

  it('giá trị rỗng/không parse được -> 0 (không NaN)', () => {
    expect(parseTimeSpent(null)).toBe(0);
    expect(parseTimeSpent(undefined)).toBe(0);
    expect(parseTimeSpent('')).toBe(0);
    expect(parseTimeSpent('abc')).toBe(0);
    expect(parseTimeSpent({})).toBe(0);
  });

  it('clamp trong khoảng 0..500', () => {
    expect(parseTimeSpent('9999h')).toBe(500);
    expect(parseTimeSpent('-5h')).toBe(0);
    expect(parseTimeSpent(1000)).toBe(500);
  });
});

// ---------- Task 143 ----------
describe('getReviewQuizStatus — mở khoá đếm lại từ 0 mỗi ngày', () => {
  let service: StatsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ streak: 3 }) },
      lessonProgress: { findMany: jest.fn() },
      reviewQuizResult: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const mod = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StreakService, useValue: {} },
        { provide: AchievementsService, useValue: {} },
      ],
    }).compile();
    service = mod.get(StatsService);
  });

  const gioHomNay = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d;
  };
  const homQua = new Date(Date.now() - 26 * 3_600_000);

  it('2 bài hôm nay + 3 bài hôm qua -> chỉ đếm 2, KHÔNG cộng dồn', async () => {
    prisma.lessonProgress.findMany.mockResolvedValue([
      { completedAt: gioHomNay(8) },
      { completedAt: gioHomNay(9) },
      { completedAt: homQua },
    ]);

    const res: any = await service.getReviewQuizStatus(1);

    expect(res.lessons_completed).toBe(2);
    expect(res.lessons_remaining).toBe(3);
    expect(res.is_unlocked).toBe(false);
  });

  it('đủ 5 bài hôm nay -> mở khoá', async () => {
    prisma.lessonProgress.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ completedAt: gioHomNay(8 + i) })),
    );

    const res: any = await service.getReviewQuizStatus(1);
    expect(res.lessons_completed).toBe(5);
    expect(res.is_unlocked).toBe(true);
    expect(res.lessons_remaining).toBe(0);
  });

  it('từng đủ 5 bài NHƯNG là của hôm qua -> hôm nay lại khoá (đếm lại từ 0)', async () => {
    prisma.lessonProgress.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => ({ completedAt: homQua })),
    );

    const res: any = await service.getReviewQuizStatus(1);
    expect(res.lessons_completed).toBe(0);
    expect(res.is_unlocked).toBe(false);
    expect(res.lessons_remaining).toBe(5);
  });

  it('chưa học bài nào -> 0/5, không lỗi', async () => {
    prisma.lessonProgress.findMany.mockResolvedValue([]);
    const res: any = await service.getReviewQuizStatus(1);
    expect(res.lessons_completed).toBe(0);
    expect(res.is_unlocked).toBe(false);
  });
});
