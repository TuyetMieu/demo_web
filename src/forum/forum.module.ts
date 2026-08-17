import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
// import type: JwtPayload là interface, dùng trong signature có decorator nên
// isolatedModules + emitDecoratorMetadata bắt buộc import dạng type-only.
import type { JwtPayload } from 'src/common/guards/jwt-auth/jwt.strategy';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ForumService } from './forum.service';

// Giới hạn độ dài: không có trần thì một request đơn lẻ có thể nhét bài viết
// hàng trăm KB vào DB, và mọi lần tải feed sau đó đều kéo nguyên khối đó về.
const MAX_CONTENT = 10_000;
const MAX_TITLE = 300;
const MAX_CATEGORY = 50;

export class CreatePostDto {
  @IsString({ message: 'Nội dung bài viết không được để trống' })
  @MaxLength(MAX_CONTENT, {
    message: `Nội dung không được vượt quá ${MAX_CONTENT} ký tự`,
  })
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TITLE, {
    message: `Tiêu đề không được vượt quá ${MAX_TITLE} ký tự`,
  })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CATEGORY, {
    message: `Danh mục không được vượt quá ${MAX_CATEGORY} ký tự`,
  })
  category?: string;
}

// Cùng trần độ dài với CreatePostDto: không giới hạn thì route PUT trở thành
// đường vòng để nhét nội dung quá khổ vào DB.
export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(MAX_CONTENT, {
    message: `Nội dung không được vượt quá ${MAX_CONTENT} ký tự`,
  })
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TITLE, {
    message: `Tiêu đề không được vượt quá ${MAX_TITLE} ký tự`,
  })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CATEGORY, {
    message: `Danh mục không được vượt quá ${MAX_CATEGORY} ký tự`,
  })
  category?: string;
}

/**
 * Sheet 1 của spec (API #51, #54) quy định body là {reaction} — frontend gửi
 * đúng như vậy. DTO trước đây chỉ khai `type` nên MỌI lượt thả cảm xúc đều bị
 * 400 (FE lại cập nhật DOM lạc quan nên người dùng tưởng đã thả được).
 * Vẫn chấp nhận `type` để không phá client cũ nào đang gửi khoá đó.
 */
export class ReactDto {
  @IsOptional()
  @IsString({ message: 'Loại cảm xúc không hợp lệ' })
  reaction?: string;

  @IsOptional()
  @IsString({ message: 'Loại cảm xúc không hợp lệ' })
  type?: string;
}

export class CreateCommentDto {
  @IsString({ message: 'Nội dung bình luận không được để trống' })
  @MaxLength(MAX_CONTENT, {
    message: `Bình luận không được vượt quá ${MAX_CONTENT} ký tự`,
  })
  content!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parent_comment_id?: number;
}

export class UpdateCommentDto {
  @IsString({ message: 'Nội dung bình luận không được để trống' })
  @MaxLength(MAX_CONTENT, {
    message: `Bình luận không được vượt quá ${MAX_CONTENT} ký tự`,
  })
  content!: string;
}

/**
 * Chuẩn hoá tham số ?page= từ query string.
 *
 * Number('abc') = NaN; NaN đi vào phép tính skip khiến Prisma nhận skip: NaN và
 * ném lỗi -> người dùng gõ nhầm URL là nhận 500. Số thập phân hay số âm cũng
 * không hợp lệ. Quy về số nguyên >= 1, và chặn trần để ?page=99999999 không
 * biến thành OFFSET khổng lồ bắt Postgres quét bảng vô ích.
 */
function parsePage(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.floor(n)), 10_000);
}

@Controller()
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  private isAdmin(u: JwtPayload): boolean {
    return u?.role === 'admin';
  }

  // ---------- Task 183 ----------
  @Get('posts')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('mine') mine?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
  ) {
    return this.forum.listPosts(user.sub, {
      category,
      mine,
      sort,
      page: parsePage(page),
    });
  }

  // ---------- Task 184 ----------
  @Post('posts')
  @HttpCode(HttpStatus.OK)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) {
    return this.forum.createPost(user.sub, dto);
  }

  // ---------- Task 185 ----------
  @Get('posts/:id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.forum.getPostDetail(user.sub, id);
  }

  // ---------- Task 186 ----------
  @Put('posts/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.forum.updatePost(user.sub, this.isAdmin(user), id, dto);
  }

  // ---------- Task 187 ----------
  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.forum.deletePost(user.sub, this.isAdmin(user), id);
  }

  // ---------- Task 188 ----------
  @Post('posts/:id/react')
  @HttpCode(HttpStatus.OK)
  reactPost(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactDto,
  ) {
    return this.forum.togglePostReaction(
      user.sub,
      id,
      dto.reaction ?? dto.type ?? '',
    );
  }

  // ---------- Task 189 ----------
  @Get('posts/:id/comments')
  comments(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
  ) {
    return this.forum.listComments(user.sub, id, parsePage(page));
  }

  // ---------- Task 190 ----------
  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.OK)
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.createComment(user.sub, id, dto);
  }

  // ---------- Task 191 ----------
  @Post('comments/:id/react')
  @HttpCode(HttpStatus.OK)
  reactComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactDto,
  ) {
    return this.forum.toggleCommentReaction(
      user.sub,
      id,
      dto.reaction ?? dto.type ?? '',
    );
  }

  // ---------- Task 192 ----------
  @Put('comments/:id')
  editComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.forum.updateComment(
      user.sub,
      this.isAdmin(user),
      id,
      dto.content,
    );
  }

  // ---------- Task 193 ----------
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  removeComment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.forum.deleteComment(user.sub, this.isAdmin(user), id);
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
