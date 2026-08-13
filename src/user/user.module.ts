import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  // AuthModule export CachedUserService — cần để invalidate cache sau khi update user.
  imports: [AuthModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
