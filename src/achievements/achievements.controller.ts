import { Controller, Get } from '@nestjs/common';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';

@Controller()
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  // ---------- Task 152 ----------
  @Get('achievements')
  list(@CurrentUserId() userId: number) {
    return this.achievements.listForUser(userId);
  }
}
