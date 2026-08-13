import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { CoursesService } from './courses.service';

export class RateCourseDto {
  @IsString({ message: 'Thiếu mã khoá học' })
  course_id!: string;

  @IsInt({ message: 'Đánh giá phải từ 1 đến 5 sao' })
  @Min(1, { message: 'Đánh giá phải từ 1 đến 5 sao' })
  @Max(5, { message: 'Đánh giá phải từ 1 đến 5 sao' })
  rating!: number;
}

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // ---------- Task 98 ----------
  @Get('courses')
  list(
    @CurrentUserId() userId: number,
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('language') language?: string,
  ) {
    return this.courses.listCourses(userId, q, level, language);
  }

  // ---------- Task 99 ----------
  @Get('enrolled')
  enrolled(@CurrentUserId() userId: number) {
    return this.courses.getEnrolled(userId);
  }

  // ---------- Task 100 ----------
  @Get('courses-enrolled')
  coursesEnrolled(@CurrentUserId() userId: number) {
    return this.courses.getCoursesEnrolled(userId);
  }

  // ---------- Task 101 ----------
  @Post('courses/:id/enroll')
  @HttpCode(HttpStatus.OK)
  enroll(@CurrentUserId() userId: number, @Param('id') courseId: string) {
    return this.courses.enroll(userId, courseId);
  }

  // ---------- Task 102 ----------
  @Delete('courses/:id/enroll')
  @HttpCode(HttpStatus.OK)
  unenroll(@CurrentUserId() userId: number, @Param('id') courseId: string) {
    return this.courses.unenroll(userId, courseId);
  }

  // ---------- Task 103 ----------
  @Post('course/rating')
  @HttpCode(HttpStatus.OK)
  rate(@CurrentUserId() userId: number, @Body() dto: RateCourseDto) {
    return this.courses.rateCourse(userId, dto.course_id, dto.rating);
  }

  // ---------- Task 104 ----------
  @Get('course/:id/rating')
  rating(@Param('id') courseId: string) {
    return this.courses.getCourseRating(courseId);
  }

  // ---------- Task 105 ----------
  @Get('skills')
  skills(@CurrentUserId() userId: number) {
    return this.courses.getSkills(userId);
  }
}
