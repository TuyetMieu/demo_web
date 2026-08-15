import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { StreakService, toStudyDate } from 'src/common/streak/streak.service';
import { AchievementsService } from 'src/achievements/achievements.service';
import { CoursesService } from 'src/courses/courses.service';
import { TX_OPTIONS } from 'src/common/prisma-tx.options';

// Django: gems = gems + xp_earned (CÙNG giá trị với XP), không phải hằng số.
const DEFAULT_XP = 50; // Django default khi xpEarned không hợp lệ
const MAX_XP = 500; // Django chặn client gửi XP tuỳ ý
const DEFAULT_LESSON_MINUTES = 15; // COALESCE(l.estimated_minutes, 15)

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly streak: StreakService,
    private readonly achievements: AchievementsService,
    private readonly courses: CoursesService,
  ) {}

  // ---------- Task 108 ----------
  /**
   * Trả về id bài học theo (khoá học, thứ tự bài). Tạo bản ghi tối thiểu nếu
   * bài học chưa có trong DB — nội dung một số khoá vẫn nằm ở frontend.
   *
   * BẮT BUỘC gọi sau khi đã kiểm tra lessonNo nằm trong [1, course.lessonCount]:
   * trước đây hàm này tạo bản ghi cho BẤT KỲ số nào client gửi lên, nên chỉ cần
   * gọi /api/lessons/999999/complete rồi đổi số là cộng XP vô hạn và bơm phình
   * bảng lessons.
   */
  async resolveLesson(
    tx: Prisma.TransactionClient,
    courseId: string,
    lessonNo: number,
    title?: string,
  ): Promise<{ id: number; xpReward: number }> {
    const existing = await tx.lesson.findFirst({
      where: { courseId, sortOrder: lessonNo },
      select: { id: true, xpReward: true },
    });
    if (existing) return existing;

    try {
      return await tx.lesson.create({
        data: {
          courseId,
          sortOrder: lessonNo,
          title: title ?? `Bài ${lessonNo}`,
          xpReward: 0,
        },
        select: { id: true, xpReward: true },
      });
    } catch (e) {
      // Hai request song song cùng tạo một bài -> bản thua nhận lỗi trùng khoá
      // (khi đã áp unique index (course_id, sort_order) trong optional-indexes.sql).
      // Đọc lại bản của người thắng thay vì để cả request hỏng.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const winner = await tx.lesson.findFirst({
          where: { courseId, sortOrder: lessonNo },
          select: { id: true, xpReward: true },
        });
        if (winner) return winner;
      }
      throw e;
    }
  }

  // ---------- Task 110-116 ----------
  async completeLesson(
    userId: number,
    lessonNo: number,
    body: {
      courseId?: string;
      course_id?: string;
      lessonTitle?: string;
      title?: string;
      xpEarned?: number;
      xp?: number;
      quizScore?: number;
      quiz_score?: number;
    },
  ) {
    const courseId = body.courseId ?? body.course_id;
    if (!courseId) throw new BadRequestException('Thiếu courseId');

    const lessonTitle = body.lessonTitle ?? body.title;
    const quizScore = body.quizScore ?? body.quiz_score;

    // Bước 1: course phải tồn tại.
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Không tìm thấy khóa học');

    // Bước 1a: PHẢI đã ghi danh khoá này (lỗ hổng BB2-7, MEDIUM, đã chứng
    // minh khai thác được trên môi trường thật).
    //
    // Trước đây endpoint chỉ kiểm tra course tồn tại + lessonNo hợp lệ, KHÔNG
    // hề kiểm tra Enrollment — gọi thẳng POST /api/lessons/:n/complete với
    // courseId của MỘT KHOÁ BẤT KỲ (kể cả chưa đăng ký) vẫn cộng XP/streak
    // bình thường. Đo thật: 6 request tới các khoá chưa ghi danh (python,
    // java) cộng liền +60 XP; tổng toàn bộ bài học farmable được ngay lập
    // tức lên tới ~4460 XP, đủ vượt bảng xếp hạng bằng một script vài phút —
    // và còn ghi "tiến độ" giả cho một khoá chưa từng đăng ký.
    //
    // Cùng thông điệp/kiểu lỗi với courses.service.ts#rateCourse (chỗ khác
    // đã có sẵn đúng kiểm tra này) để giữ nhất quán trải nghiệm lỗi trong
    // toàn hệ thống.
    const enrolled = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrolled) {
      throw new ForbiddenException(
        'Bạn cần đăng ký khoá học trước khi hoàn thành bài học',
      );
    }

    // Bước 1b: CHẶN số thứ tự bài học nằm ngoài khoá học.
    // Không có kiểm tra này thì gọi /api/lessons/<số bất kỳ>/complete sẽ tạo ra
    // một bài học mới và cộng XP — đổi số là farm XP vô hạn, đồng thời bơm phình
    // bảng lessons bằng dữ liệu rác.
    if (
      !Number.isInteger(lessonNo) ||
      lessonNo < 1 ||
      (course.lessonCount > 0 && lessonNo > course.lessonCount)
    ) {
      throw new BadRequestException(
        `Số thứ tự bài học không hợp lệ (khoá này có ${course.lessonCount} bài)`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lesson = await this.resolveLesson(
        tx,
        courseId,
        lessonNo,
        lessonTitle,
      );
      const lessonId = lesson.id;

      // XP do SERVER quyết định, không lấy theo lời khai của client.
      // Trước đây dùng thẳng body.xpEarned (chỉ chặn <= 500), nên client sửa
      // payload là tự thưởng cho mình gấp 10 lần mỗi bài. Giá trị chuẩn nằm ở
      // cột lessons.xp_reward; bài chưa cấu hình (=0) thì dùng mặc định.
      const xpGain =
        lesson.xpReward > 0 ? Math.min(lesson.xpReward, MAX_XP) : DEFAULT_XP;

      // Bước 2: CHIẾM QUYỀN "người hoàn thành đầu tiên" một cách NGUYÊN TỬ.
      //
      // Bản cũ đọc trạng thái rồi mới ghi (findUnique -> upsert). Ở mức cô lập
      // READ COMMITTED (mặc định của Postgres), hai request giống hệt nhau gửi
      // song song (bấm đúp, client tự thử lại) đều đọc ra "chưa hoàn thành" rồi
      // CẢ HAI cùng cộng XP. Ở đây dùng compare-and-set: Postgres đánh giá lại
      // điều kiện WHERE sau khi khoá dòng, nên đúng MỘT request thắng.
      const created = await tx.lessonProgress.createMany({
        data: [
          {
            userId,
            lessonId,
            courseId,
            status: 'completed',
            quizScore: quizScore ?? 0,
            xpEarned: xpGain,
          },
        ],
        skipDuplicates: true,
      });

      let isFirstCompletion = created.count === 1;

      if (!isFirstCompletion) {
        const claimed = await tx.lessonProgress.updateMany({
          where: { userId, lessonId, status: { not: 'completed' } },
          data: {
            status: 'completed',
            xpEarned: xpGain,
            ...(quizScore !== undefined ? { quizScore } : {}),
          },
        });
        isFirstCompletion = claimed.count === 1;

        if (!isFirstCompletion) {
          // Đã hoàn thành từ trước: không cộng thưởng nữa, chỉ nâng điểm nếu
          // lần này cao hơn (không bao giờ hạ thành tích đã đạt).
          await tx.lessonProgress.updateMany({
            where: { userId, lessonId, xpEarned: { lt: xpGain } },
            data: { xpEarned: xpGain },
          });
          if (quizScore !== undefined) {
            await tx.lessonProgress.updateMany({
              where: { userId, lessonId, quizScore: { lt: quizScore } },
              data: { quizScore },
            });
          }
        }
      }

      const alreadyCompleted = !isFirstCompletion;

      // Bước 4: tính lại tiến độ khoá học.
      const progress = await this.courses.recomputeProgress(
        tx,
        userId,
        courseId,
        course.lessonCount,
      );

      // Bước 5-6: CHỈ khi lần đầu hoàn thành mới cộng XP/gems/streak.
      let newStreak: number | null = null;

      if (!alreadyCompleted) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { streak: true, lastStudyDate: true },
        });

        const today = new Date();
        newStreak = this.streak.computeNewStreak(
          user?.lastStudyDate,
          user?.streak ?? 0,
          today,
        );

        await tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: xpGain },
            gems: { increment: xpGain },
            streak: newStreak,
            // toStudyDate: cột @db.Date lưu ở UTC midnight, ghi thẳng new Date() sẽ lệch ngày.
            lastStudyDate: toStudyDate(today),
          },
        });

        // Bước 6: log XP theo ngày (cộng dồn nếu đã có bản ghi hôm nay).
        const logDate = toStudyDate(today);
        const existingLog = await tx.userDailyXpLog.findFirst({
          where: { userId, logDate },
        });
        if (existingLog) {
          await tx.userDailyXpLog.update({
            where: { id: existingLog.id },
            data: { xpEarned: { increment: xpGain } },
          });
        } else {
          await tx.userDailyXpLog.create({
            data: { userId, logDate, xpEarned: xpGain },
          });
        }
      }

      return {
        completedLessons: progress.completedLessons,
        progress: progress.progress,
        xpGain,
        newStreak,
        alreadyCompleted,
      };
    }, TX_OPTIONS);

    // Trao thành tích SAU KHI transaction đã commit.
    //
    // Trước đây bước này nằm TRONG transaction: nó quét toàn bảng achievements
    // rồi ghi từng dòng, thêm 5-7 vòng gọi DB (mỗi vòng ~237ms tới Neon) trong
    // khi transaction vẫn đang GIỮ một connection của pool. Với pool 50, chỉ
    // vài chục người hoàn thành bài cùng lúc là cạn connection và toàn hệ thống
    // đứng. Thành tích là dữ liệu suy ra được nên tách ra ngoài là an toàn:
    // lỗi ở đây không được phép làm mất XP đã cộng.
    let awarded: unknown[] = [];
    if (!result.alreadyCompleted) {
      try {
        awarded = await this.achievements.checkAndAwardAchievements(userId);
      } catch (e) {
        this.logger.warn(
          `Trao thành tích thất bại cho user ${userId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    // Shape khớp bản Django (lessons/views.py): camelCase, xpGained = 0 khi
    // đã hoàn thành trước đó.
    return {
      ok: true,
      completedLessons: result.completedLessons,
      progress: result.progress,
      xpGained: result.alreadyCompleted ? 0 : result.xpGain,
      newAchievements: awarded,
      // Field bổ sung ngoài Django, hữu ích cho FE hiện tại:
      streak: result.newStreak,
      alreadyCompleted: result.alreadyCompleted,
    };
  }
}
