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
