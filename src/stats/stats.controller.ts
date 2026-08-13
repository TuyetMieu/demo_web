import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { StatsService } from './stats.service';

/**
 * Sheet 1 của spec (API #30) quy định body là {mission_id, condition, action}
 * và frontend gửi đúng vậy (mission_id mang giá trị mã khoá: 'cpp', 'java',
 * 'python', 'htmlcss'). Bảng missions khoá theo (user_id, course_id) nên
 * mission_id CHÍNH LÀ course_id.
 *
 * DTO trước đây chỉ khai `course_id` bắt buộc -> mọi lần hoàn thành nhiệm vụ ở
 * 4 trang bài học đều 400 hai lần (thừa mission_id + thiếu course_id).
 */
export class CompleteMissionDto {
  @IsOptional()
  @IsString({ message: 'Thiếu mã nhiệm vụ' })
  mission_id?: string;

  @IsOptional()
  @IsString({ message: 'Thiếu mã khoá học' })
  course_id?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  action?: string;
}

@Controller()
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  // ---------- Task 144 ----------
  @Get('stats')
  getStats(@CurrentUserId() userId: number) {
    return this.stats.getStats(userId);
  }

  // ---------- Task 145 ----------
  @Get('stats/xp-by-course')
  xpByCourse(@CurrentUserId() userId: number) {
    return this.stats.getXpByCourse(userId);
  }

  // ---------- Task 146 ----------
  @Post('mission/complete')
  @HttpCode(HttpStatus.OK)
  completeMission(
    @CurrentUserId() userId: number,
    @Body() dto: CompleteMissionDto,
  ) {
    const courseId = dto.course_id ?? dto.mission_id;
    if (!courseId) {
      throw new BadRequestException('Thiếu mã nhiệm vụ');
    }
    return this.stats.completeMission(userId, { ...dto, course_id: courseId });
  }

  // ---------- Task 147 ----------
  @Get('streak/review-quiz-status')
  reviewQuizStatus(@CurrentUserId() userId: number) {
    return this.stats.getReviewQuizStatus(userId);
  }
}
