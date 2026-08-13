import { Module } from '@nestjs/common';
import { AchievementsModule } from 'src/achievements/achievements.module';
import { LessonsModule } from 'src/lessons/lessons.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  // LessonsModule export StreakService — dùng CHUNG, không khai lại instance mới.
  imports: [LessonsModule, AchievementsModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
