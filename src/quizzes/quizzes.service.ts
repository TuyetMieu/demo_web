import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

const MIN_POOL = 5;
const SAMPLE_MIN = 5;
const SAMPLE_MAX = 10;
const HISTORY_LIMIT = 50;

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number | string;
  explanation?: string;
}

@Injectable()
export class QuizzesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 122-125 ----------
  async generateQuiz(userId: number, courseId: string) {
    // Bước 1: chỉ lấy bài ĐÃ hoàn thành và có nội dung step_2.
    const done = await this.prisma.lessonProgress.findMany({
      where: { userId, courseId, status: 'completed' },
      select: { lessonId: true },
    });
    if (done.length === 0) {
      throw new BadRequestException(
        'Bạn cần hoàn thành ít nhất một bài học trước khi làm quiz',
      );
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: done.map((d) => d.lessonId) }, courseId },
      select: { contentJson: true },
    });

    // Bước 2: gom pool câu hỏi, hỗ trợ 2 dạng cấu trúc.
    const pool = this.collectQuestions(lessons.map((l) => l.contentJson));
    if (pool.length < MIN_POOL) {
      throw new BadRequestException(
        'Chưa đủ câu hỏi để tạo quiz, hãy hoàn thành thêm bài học',
      );
    }

    // Bước 3: random sample, lưu SNAPSHOT kèm đáp án vào DB.
    const size = Math.min(
      SAMPLE_MAX,
      Math.max(SAMPLE_MIN, Math.min(pool.length, SAMPLE_MAX)),
    );
    const picked = this.sample(pool, size);

    const quiz = await this.prisma.quiz.create({
      data: {
        userId,
        courseId,
        status: 'generated',
        questionsJson: picked as unknown as Prisma.InputJsonValue,
      },
    });

    // Bước 4: STRIP đáp án trước khi trả FE (Sheet 3: lộ đáp án = gian lận điểm).
    return {
      ok: true,
      quiz_id: quiz.id,
      questions: this.stripAnswers(picked),
    };
  }

  // ---------- Task 126-128 ----------
  async submitQuiz(userId: number, quizId: number, answers: unknown[]) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Không tìm thấy quiz');

    // Bước 1: chỉ chủ sở hữu, và chỉ nộp được 1 lần.
    if (quiz.userId !== userId) {
      throw new ForbiddenException('Không có quyền truy cập quiz này');
    }
    if (quiz.status === 'submitted') {
      throw new ConflictException('Quiz này đã được nộp');
    }

    // Bước 2: chấm điểm theo SNAPSHOT trong DB, KHÔNG tin dữ liệu client gửi.
    const questions = quiz.questionsJson as unknown as QuizQuestion[];
    let score = 0;
    const detail = questions.map((q, i) => {
      const given = answers?.[i];
      const correct = this.isCorrect(q.correct, given);
      if (correct) score += 1;
      return {
        question: q.question,
        given: given ?? null,
        correct: q.correct,
        is_correct: correct,
        explanation: q.explanation ?? null,
      };
    });

    // Bước 3: lưu kết quả + đổi trạng thái trong CÙNG transaction.
    await this.prisma.$transaction(async (tx) => {
      await tx.reviewQuizResult.create({
        data: {
          quizId,
          userId,
          score,
          total: questions.length,
          answersJson: detail,
        },
      });
      await tx.quiz.update({
        where: { id: quizId },
        data: { status: 'submitted' },
      });
    });

    return { ok: true, score, total: questions.length, detail };
  }

  // ---------- Task 129 ----------
  async getQuiz(userId: number, quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    // 404 (không phải 403) cho quiz của người khác — không tiết lộ quiz đó tồn tại.
    if (!quiz || quiz.userId !== userId) {
      throw new NotFoundException('Không tìm thấy quiz');
    }

    const questions = quiz.questionsJson as unknown as QuizQuestion[];

    if (quiz.status !== 'submitted') {
      // CHƯA nộp -> vẫn phải giấu đáp án.
      return {
        ok: true,
        quiz_id: quiz.id,
        status: quiz.status,
        questions: this.stripAnswers(questions),
      };
    }

    const result = await this.prisma.reviewQuizResult.findFirst({
      where: { quizId, userId },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      ok: true,
      quiz_id: quiz.id,
      status: quiz.status,
      score: result?.score ?? 0,
      total: result?.total ?? questions.length,
      detail: result?.answersJson ?? [],
    };
  }

  // ---------- Task 130 ----------
  async getQuizHistory(userId: number, courseId: string) {
    const rows = await this.prisma.reviewQuizResult.findMany({
      where: { userId, quiz: { courseId } },
      orderBy: { submittedAt: 'desc' },
      take: HISTORY_LIMIT,
      select: {
        id: true,
        quizId: true,
        score: true,
        total: true,
        submittedAt: true,
      },
    });
    return { ok: true, history: rows };
  }

  // ---------- helpers ----------

  /** Hỗ trợ 2 dạng: { mcq: [...] } hoặc câu hỏi đơn nằm thẳng trong step_2. */
  private collectQuestions(contents: unknown[]): QuizQuestion[] {
    const pool: QuizQuestion[] = [];

    for (const raw of contents) {
      const step2 = (raw as Record<string, any>)?.step_2;
      if (!step2) continue;

      if (Array.isArray(step2.mcq)) {
        for (const q of step2.mcq) {
          if (this.isValidQuestion(q)) pool.push(q);
        }
      } else if (this.isValidQuestion(step2)) {
        pool.push(step2);
      }
    }
    return pool;
  }

  private isValidQuestion(q: unknown): q is QuizQuestion {
    const x = q as QuizQuestion;
    return (
      !!x &&
      typeof x.question === 'string' &&
      Array.isArray(x.options) &&
      x.correct !== undefined
    );
  }

  /** Fisher-Yates rồi cắt — tránh sort(() => Math.random()) vốn lệch phân phối. */
  private sample<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  /** Bỏ 'correct' và 'explanation' — dùng ở MỌI nhánh trả câu hỏi cho FE. */
  private stripAnswers(questions: QuizQuestion[]) {
    return questions.map((q, i) => ({
      index: i,
      question: q.question,
      options: q.options,
    }));
  }

  private isCorrect(expected: number | string, given: unknown): boolean {
    if (given === undefined || given === null) return false;
    return (
      String(expected).trim().toLowerCase() ===
      String(given).trim().toLowerCase()
    );
  }
}
