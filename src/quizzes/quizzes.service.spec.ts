import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizzesService } from './quizzes.service';

const SNAPSHOT = [
  { question: 'Q1', options: ['a', 'b'], correct: 0, explanation: 'vì a' },
  { question: 'Q2', options: ['x', 'y'], correct: 1 },
];

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      lessonProgress: { findMany: jest.fn() },
      lesson: { findMany: jest.fn() },
      quiz: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      reviewQuizResult: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const mod = await Test.createTestingModule({
      providers: [QuizzesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(QuizzesService);
  });

  // ---------- Task 135 ----------
  describe('KHÔNG BAO GIỜ lộ đáp án ở mọi nhánh', () => {
    it('generateQuiz: response không chứa correct/explanation, nhưng DB có', async () => {
      prisma.lessonProgress.findMany.mockResolvedValue([{ lessonId: 1 }]);
      prisma.lesson.findMany.mockResolvedValue([
        {
          contentJson: {
            step_2: { mcq: [...SNAPSHOT, ...SNAPSHOT, ...SNAPSHOT] },
          },
        },
      ]);
      prisma.quiz.create.mockResolvedValue({ id: 9 });

      const res: any = await service.generateQuiz(1, 'c1');

      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain('correct');
      expect(serialized).not.toContain('explanation');
      // Nhưng snapshot lưu DB PHẢI còn đáp án để chấm điểm server-side.
      const saved = JSON.stringify(
        prisma.quiz.create.mock.calls[0][0].data.questionsJson,
      );
      expect(saved).toContain('correct');
    });

    it('getQuiz khi CHƯA nộp: vẫn giấu đáp án', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });

      const res: any = await service.getQuiz(1, 9);
      expect(JSON.stringify(res)).not.toContain('correct');
    });
  });

  describe('submitQuiz', () => {
    it('chấm theo SNAPSHOT trong DB, bỏ qua điểm client gửi', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });

      // Client trả lời: câu 1 đúng (0), câu 2 sai (0 thay vì 1).
      const res: any = await service.submitQuiz(1, 9, [0, 0]);

      expect(res.score).toBe(1);
      expect(res.total).toBe(2);
      expect(prisma.reviewQuizResult.create).toHaveBeenCalled();
    });

    it('quiz của người khác -> 403', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 999,
        status: 'generated',
        questionsJson: SNAPSHOT,
      });
      await expect(service.submitQuiz(1, 9, [])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('đã nộp rồi -> 409, không ghi kết quả lần 2', async () => {
      prisma.quiz.findUnique.mockResolvedValue({
        id: 9,
        userId: 1,
        status: 'submitted',
        questionsJson: SNAPSHOT,
      });
      await expect(service.submitQuiz(1, 9, [])).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.reviewQuizResult.create).not.toHaveBeenCalled();
    });
  });

  it('getQuiz của người khác -> 404 (không tiết lộ quiz tồn tại)', async () => {
    prisma.quiz.findUnique.mockResolvedValue({
      id: 9,
      userId: 999,
      status: 'generated',
      questionsJson: SNAPSHOT,
    });
    await expect(service.getQuiz(1, 9)).rejects.toThrow(NotFoundException);
  });
});
