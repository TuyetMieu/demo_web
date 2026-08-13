import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService, toStudyDate } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { TX_OPTIONS } from 'src/common/prisma-tx.options';

const REVIEW_QUIZ_STREAK_REQUIRED = 5;

/**
 * Task 138 — parse chuỗi '12.5h' -> số giờ, clamp 0..500.
 * Export riêng để test được mà không cần dựng cả service.
 */
export function parseTimeSpent(value: unknown): number {
  if (typeof value === 'number') return clamp(value);
  if (typeof value !== 'string') return 0;

  const match = value.trim().match(/-?\d+(\.\d+)?/);
  if (!match) return 0;

  const n = Number.parseFloat(match[0]);
  return Number.isFinite(n) ? clamp(n) : 0;
}

function clamp(n: number): number {
  return Math.min(500, Math.max(0, n));
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
    private readonly achievements: AchievementsService,
  ) {}

  // ---------- Task 136-137 ----------
  async getStats(userId: number) {
    // Bước 1: gộp về ít roundtrip nhất — user + toàn bộ enrollment trong 1 lần.
    const [user, enrollments] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          streak: true,
          certificates: true,
          lastStudyDate: true,
          xp: true,
          gems: true,
        },
      }),
      this.prisma.enrollment.findMany({
        where: { userId },
        select: { progress: true, timeSpent: true },
      }),
    ]);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Bước 2: tính dẫn xuất.
    const avgProgress = enrollments.length
      ? Math.round(
          enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length,
        )
      : 0;

    const totalHours =
      Math.round(
        enrollments.reduce((s, e) => s + parseTimeSpent(e.timeSpent), 0) * 10,
      ) / 10;

    return {
      ok: true,
      xp: user.xp,
      gems: user.gems,
      streak: user.streak,
      certificates: user.certificates,
      lastStudyDate: user.lastStudyDate,
      coursesEnrolled: enrollments.length,
      avgProgress,
      totalHours,
      streakActive: this.streak.isStreakActive(user.lastStudyDate),
    };
  }

  // ---------- Task 139 ----------
  async getXpByCourse(userId: number) {
    const rows = await this.prisma.lessonProgress.groupBy({
      by: ['courseId'],
      where: { userId },
      _sum: { xpEarned: true },
    });

    return {
      ok: true,
      xp_by_course: rows.map((r) => ({
        courseId: r.courseId,
        xp: r._sum.xpEarned ?? 0,
      })),
    };
  }

  // ---------- Task 140-142 ----------
  async completeMission(
    userId: number,
    body: { course_id: string; condition?: string; action?: string },
  ) {
    // Bước 1: mission phải khớp ĐÚNG (user, course, điều kiện, đang bật).
    const mission = await this.prisma.mission.findUnique({
      where: { userId_courseId: { userId, courseId: body.course_id } },
    });

    if (!mission || !mission.isActive) {
      throw new NotFoundException('Không tìm thấy nhiệm vụ đang hoạt động');
    }
    if (
      mission.correctCondition &&
      body.condition &&
      mission.correctCondition !== body.condition
    ) {
      throw new BadRequestException('Điều kiện nhiệm vụ không khớp');
    }

    const xpGain = mission.xpReward ?? 0;

    const result = await this.prisma.$transaction(async (tx) => {
      // CHIẾM nhiệm vụ một cách NGUYÊN TỬ trước khi cộng bất kỳ phần thưởng nào.
      //
      // Kiểm tra isActive ở trên nằm NGOÀI transaction và lệnh tắt isActive
      // trước đây là ghi vô điều kiện, nên hai request song song đều đọc thấy
      // "đang hoạt động" rồi CẢ HAI cùng cộng XP + gems. Ở đây điều kiện
      // isActive:true nằm ngay trong lệnh UPDATE: Postgres đánh giá lại điều
      // kiện sau khi khoá dòng nên đúng một request nhận count=1.
      const claimed = await tx.mission.updateMany({
        where: { userId, courseId: body.course_id, isActive: true },
        data: { isActive: false },
      });
      if (claimed.count === 0) {
        return null; // request khác đã nhận thưởng nhiệm vụ này
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { streak: true, lastStudyDate: true },
      });

      const today = new Date();
      // Bước 2: dùng CHUNG StreakService với completeLesson (Sheet 3).
      const newStreak = this.streak.computeNewStreak(
        user?.lastStudyDate,
        user?.streak ?? 0,
        today,
      );

      await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: xpGain },
          gems: { increment: 10 },
          streak: newStreak,
          lastStudyDate: toStudyDate(today),
        },
      });

      // Bước 3: log XP theo ngày + trao achievement trong cùng transaction.
      const logDate = toStudyDate(today);
      const existing = await tx.userDailyXpLog.findFirst({
        where: { userId, logDate },
      });
      if (existing) {
        await tx.userDailyXpLog.update({
          where: { id: existing.id },
          data: { xpEarned: { increment: xpGain } },
        });
      } else {
        await tx.userDailyXpLog.create({
          data: { userId, logDate, xpEarned: xpGain },
        });
      }

      return {
        xp_earned: xpGain,
        gems_earned: 10,
        streak: newStreak,
      };
    }, TX_OPTIONS);

    // Request thua cuộc trong tranh chấp: nhiệm vụ đã được người khác (chính là
    // request song song của cùng user) nhận thưởng.
    if (!result) {
      throw new NotFoundException('Không tìm thấy nhiệm vụ đang hoạt động');
    }

    // Trao thành tích SAU commit — tránh giữ connection của pool thêm 5-7 vòng
    // gọi DB trong khi transaction đang mở (xem giải thích ở LessonsService).
    let awarded: unknown[] = [];
    try {
      awarded = await this.achievements.checkAndAwardAchievements(userId);
    } catch (e) {
      this.logger.warn(
        `Trao thành tích thất bại cho user ${userId}: ${e instanceof Error ? e.message : e}`,
      );
    }

    return { ok: true, ...result, new_achievements: awarded };
  }

  // ---------- Task 143 ----------
  async getReviewQuizStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true },
    });
    const streak = user?.streak ?? 0;

    return {
      ok: true,
      streak,
      is_unlocked: streak >= REVIEW_QUIZ_STREAK_REQUIRED,
      days_remaining: Math.max(0, REVIEW_QUIZ_STREAK_REQUIRED - streak),
    };
  }
}
