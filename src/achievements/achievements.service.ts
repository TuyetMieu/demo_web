import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AchievementMetrics {
  lesson_count: number;
  streak_days: number;
  xp_total: number;
  course_complete: number;
}

/** Client Prisma trong hoặc ngoài transaction — checkAndAward phải chạy CÙNG tx với completeLesson. */
type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 150 ----------
  async getMetrics(
    userId: number,
    db: Db = this.prisma,
  ): Promise<AchievementMetrics> {
    const [lessonCount, user, completedCourses] = await Promise.all([
      db.lessonProgress.count({ where: { userId, status: 'completed' } }),
      db.user.findUnique({
        where: { id: userId },
        select: { streak: true, xp: true },
      }),
      db.enrollment.count({ where: { userId, progress: { gte: 100 } } }),
    ]);

    return {
      lesson_count: lessonCount,
      streak_days: user?.streak ?? 0,
      xp_total: user?.xp ?? 0,
      course_complete: completedCourses,
    };
  }

  /** Cache danh mục achievement (bảng cấu hình, đổi rất hiếm). */
  private achievementsCache: {
    data: Awaited<ReturnType<PrismaService['achievement']['findMany']>>;
    expiresAt: number;
  } | null = null;
  private static readonly CATALOG_TTL_MS = 5 * 60 * 1000;

  private async getAllCached(db: Db) {
    const now = Date.now();
    if (this.achievementsCache && this.achievementsCache.expiresAt > now) {
      return this.achievementsCache.data;
    }
    const data = await db.achievement.findMany();
    this.achievementsCache = {
      data,
      expiresAt: now + AchievementsService.CATALOG_TTL_MS,
    };
    return data;
  }

  // ---------- Task 151 ----------
  /** Trả về danh sách achievement VỪA được trao (để FE hiện modal chúc mừng). */
  async checkAndAwardAchievements(userId: number, db: Db = this.prisma) {
    // Danh mục achievement là bảng CẤU HÌNH, gần như không đổi — cache lại thay
    // vì quét bảng mỗi lần hoàn thành bài học. Mỗi lượt quét là một vòng ~237ms
    // tới Neon; ở mức hàng nghìn lượt hoàn thành bài, đây là chi phí thuần lãng phí.
    const all = await this.getAllCached(db);
    if (all.length === 0) return [];

    const [metrics, owned] = await Promise.all([
      this.getMetrics(userId, db),
      db.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      }),
    ]);

    const ownedIds = new Set(owned.map((o) => o.achievementId));
    const newlyAwarded: typeof all = [];

    for (const a of all) {
      if (ownedIds.has(a.id)) continue;
      if (!a.conditionType) continue;

      const current = metrics[a.conditionType as keyof AchievementMetrics];
      if (typeof current !== 'number' || current < a.conditionValue) continue;

      // ON CONFLICT DO NOTHING: 2 request đồng thời không làm vỡ transaction.
      const created = await db.userAchievement.createMany({
        data: [{ userId, achievementId: a.id }],
        skipDuplicates: true,
      });
      if (created.count > 0) newlyAwarded.push(a);
    }

    return newlyAwarded;
  }

  // ---------- Task 152 ----------
  async listForUser(userId: number) {
    const [all, owned, metrics] = await Promise.all([
      this.prisma.achievement.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { userId } }),
      this.getMetrics(userId),
    ]);

    const ownedMap = new Map(owned.map((o) => [o.achievementId, o.awardedAt]));

    return {
      ok: true,
      achievements: all.map((a) => {
        const current = a.conditionType
          ? (metrics[a.conditionType as keyof AchievementMetrics] ?? 0)
          : 0;
        const unlocked = ownedMap.has(a.id);
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          description: a.description,
          icon: a.icon,
          unlocked,
          awardedAt: ownedMap.get(a.id) ?? null,
          // Tiến độ tới mốc tiếp theo, clamp để không vượt 100%.
          progress:
            a.conditionValue > 0
              ? Math.min(100, Math.round((current / a.conditionValue) * 100))
              : 0,
          current,
          target: a.conditionValue,
        };
      }),
    };
  }
}
