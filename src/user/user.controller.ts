import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { ChangePasswordDto, SurveyDto, UpdateProfileDto } from './dto/user.dto';
import { UserService } from './user.service';

// Path khai báo tương đối; prefix '/api' + version do gateway áp tập trung
// (api-getway.setup.ts) — module nghiệp vụ không tự gắn prefix.
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ---------- Task 75 ----------
  @Get('user')
  getProfile(@CurrentUserId() userId: number) {
    return this.userService.getProfile(userId);
  }

  // ---------- Task 76 ----------
  @Put('user')
  updateProfile(
    @CurrentUserId() userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  // ---------- Task 77 ----------
  @Put('user/password')
  changePassword(
    @CurrentUserId() userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, dto);
  }

  // ---------- Task 78 ----------
  @Post('users/:id/follow')
  @HttpCode(HttpStatus.OK)
  follow(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) targetId: number,
  ) {
    return this.userService.followUser(userId, targetId);
  }

  // ---------- Task 79 ----------
  @Delete('users/:id/follow')
  @HttpCode(HttpStatus.OK)
  unfollow(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) targetId: number,
  ) {
    return this.userService.unfollowUser(userId, targetId);
  }

  // ---------- Task 80 ----------
  @Get('users/:id/following')
  getFollowing(@Param('id', ParseIntPipe) targetId: number) {
    return this.userService.getFollowing(targetId);
  }

  // ---------- Task 81 ----------
  @Post('survey')
  @HttpCode(HttpStatus.OK)
  submitSurvey(@CurrentUserId() userId: number, @Body() dto: SurveyDto) {
    return this.userService.submitSurvey(userId, dto);
  }
}
