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
import { IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';

// Django (lessons/views.py) đọc courseId TRƯỚC rồi mới fallback course_id;
// xpEarned/quizScore/lessonTitle là camelCase. Nhận cả 2 dạng để khớp FE hiện có.
export class CompleteLessonDto {
  @IsOptional() @IsString() courseId?: string;
  @IsOptional() @IsString() course_id?: string;

  @IsOptional() @IsString() lessonTitle?: string;
  @IsOptional() @IsString() title?: string;

  @IsOptional() @IsInt() xpEarned?: number;
  @IsOptional() @IsInt() xp?: number;

  @IsOptional() @IsInt() quizScore?: number;
  @IsOptional() @IsInt() quiz_score?: number;
}

@Controller()
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  /** Nội dung bài học (content_json) cho Studio — chỉ học viên đã ghi danh. */
  @Get('courses/:courseId/lessons/:lessonNo/content')
  content(
    @CurrentUserId() userId: number,
    @Param('courseId') courseId: string,
    @Param('lessonNo', ParseIntPipe) lessonNo: number,
  ) {
    return this.lessons.getLessonContent(userId, courseId, lessonNo);
  }

  // ---------- Task 117 ----------
  @Post('lessons/:lessonNo/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUserId() userId: number,
    @Param('lessonNo', ParseIntPipe) lessonNo: number,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.lessons.completeLesson(userId, lessonNo, dto);
  }
}
