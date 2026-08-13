import { Module } from '@nestjs/common';
import { AchievementsModule } from 'src/achievements/achievements.module';
import { CoursesModule } from 'src/courses/courses.module';
import { StreakService } from 'src/common/streak/streak.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [CoursesModule, AchievementsModule],
  controllers: [LessonsController],
  // StreakService khai ở đây và export để StatsModule (completeMission) dùng lại
  // cùng một instance logic — Sheet 3 yêu cầu KHÔNG viết lặp 2 nơi.
  providers: [LessonsService, StreakService],
  exports: [LessonsService, StreakService],
})
export class LessonsModule {}
