import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { IsArray } from 'class-validator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { QuizzesService } from './quizzes.service';

export class SubmitQuizDto {
  @IsArray({ message: 'Danh sách câu trả lời không hợp lệ' })
  answers!: unknown[];
}

@Controller()
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  // ---------- Task 131 ----------
  @Post('courses/:id/quiz/generate')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUserId() userId: number, @Param('id') courseId: string) {
    return this.quizzes.generateQuiz(userId, courseId);
  }

  // ---------- Task 141 ----------
  /** Bộ đếm "hôm nay đã học gì" — danh sách bài + số câu hỏi rút được. */
  @Get('quiz/today')
  todayLessons(@CurrentUserId() userId: number) {
    return this.quizzes.getTodayLessons(userId);
  }

  // ---------- Task 142 ----------
  /** Đề tổng hợp từ đúng những bài đã học hôm nay. Không giới hạn số lần. */
  @Post('quiz/generate-today')
  @HttpCode(HttpStatus.OK)
  generateToday(@CurrentUserId() userId: number) {
    return this.quizzes.generateTodayQuiz(userId);
  }

  // ---------- Task 138 ----------
  /**
   * Đề ôn HẰNG NGÀY — không gắn với khoá nào, trộn câu từ mọi khoá đã học.
   * Mỗi ngày học chỉ một đề; đã nộp hôm nay thì trả 400 kèm lời nhắc.
   */
  @Post('quiz/generate-review')
  @HttpCode(HttpStatus.OK)
  generateDailyReview(@CurrentUserId() userId: number) {
    return this.quizzes.generateDailyReviewQuiz(userId);
  }

  // ---------- Task 137 ----------
  /**
   * Đề ôn tập CÓ TRỌNG SỐ — ưu tiên bài học viên hay sai. Là route RIÊNG chứ
   * không phải cờ trên `generate`, để luồng random cũ giữ nguyên hợp đồng.
   * Request/response giống hệt `generate` nên FE dùng chung mã xử lý.
   */
  @Post('courses/:id/quiz/generate-review')
  @HttpCode(HttpStatus.OK)
  generateReview(
    @CurrentUserId() userId: number,
    @Param('id') courseId: string,
  ) {
    return this.quizzes.generateReviewQuiz(userId, courseId);
  }

  // ---------- Task 132 ----------
  @Post('quizzes/:id/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) quizId: number,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzes.submitQuiz(userId, quizId, dto.answers);
  }

  // ---------- Task 133 ----------
  @Get('quizzes/:id')
  get(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) quizId: number,
  ) {
    return this.quizzes.getQuiz(userId, quizId);
  }

  // ---------- Task 134 ----------
  @Get('courses/:id/quiz/history')
  history(@CurrentUserId() userId: number, @Param('id') courseId: string) {
    return this.quizzes.getQuizHistory(userId, courseId);
  }
}
