import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import oauthConfig from './config/oauth.config';
import throttleConfig from './config/throttle.config';
import geminiConfig from './config/gemini.config';
import { HealthController } from './health/health.controller';
import { ApiGetwayModule } from './api-getway/api-getway.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { AchievementsModule } from './achievements/achievements.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { StatsModule } from './stats/stats.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ForumModule } from './forum/forum.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { CourseAdminModule } from './course-admin/course-admin.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    ApiGetwayModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [appConfig, jwtConfig, oauthConfig, throttleConfig, geminiConfig],
    }),
    UserModule,
    AuthModule,
    CoursesModule,
    LessonsModule,
    AchievementsModule,
    QuizzesModule,
    StatsModule,
    LeaderboardModule,
    NotificationsModule,
    ForumModule,
    RoadmapModule,
    CourseAdminModule,
    ChatbotModule,
  ],
  controllers: [HealthController],
})
// Middleware (RequestId/SecurityHeaders/Cors) do ApiGetwayModule đăng ký DUY NHẤT
// một lần — trước đây AppModule đăng ký lặp làm mọi request chạy CORS 2 lần và
// preflight OPTIONS bị xử lý trên response đã end.
export class AppModule {}
