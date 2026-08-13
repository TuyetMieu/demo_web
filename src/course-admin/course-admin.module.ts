import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { emptyToUndefined } from 'src/auth/dto/register.dto';
import { CourseLevel, Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminGuard } from 'src/common/guards/admin/admin.guard';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';

/** Giá trị hợp lệ của enum course_level trong DB. */
export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const LEVEL_MESSAGE = 'Cấp độ phải là beginner, intermediate hoặc advanced';

/**
 * Các trường mô tả KHÔNG có cột riêng trong bảng courses (chỉ có id, title,
 * level, rating, lessons, instructor_id, xp_reward, is_published, content_meta,
 * language, accent_color). Chúng được gom vào cột JSONB content_meta — spec cấm
 * tuyệt đối việc chạy migration đổi cấu trúc DB dùng chung với bản Django.
 */
export const COURSE_META_FIELDS = [
  'subtitle',
  'description',
  'duration',
  'tag',
  'image',
  'color',
] as const;

/**
 * Form quản trị gửi 10 trường; DTO cũ chỉ khai 7 và dùng camelCase `accentColor`
 * trong khi form gửi `accent_color` -> forbidNonWhitelisted làm MỌI thao tác
 * thêm/sửa khoá học đều 400. Khai đủ theo đúng tên form gửi.
 */
export class CreateCourseDto {
  @IsString({ message: 'Thiếu mã khoá học' }) id!: string;
  @IsOptional() @IsString() title?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(COURSE_LEVELS, { message: LEVEL_MESSAGE })
  level?: string;

  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() accent_color?: string;
  /** Bí danh camelCase, giữ cho client cũ. */
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsInt() xp_reward?: number;
  @IsOptional() @IsInt() instructorId?: number;

  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() color?: string;
}

export class UpdateCourseDto {
  /** Form PUT gửi kèm id trong body; chấp nhận rồi bỏ qua (id lấy từ URL). */
  @IsOptional() @IsString() id?: string;

  @IsOptional() @IsString() title?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(COURSE_LEVELS, { message: LEVEL_MESSAGE })
  level?: string;

  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() accent_color?: string;
  @IsOptional() @IsString() accentColor?: string;
  @IsOptional() @IsInt() xp_reward?: number;

  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() duration?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() color?: string;
}

export class CreateLessonDto {
  @IsString({ message: 'Thiếu mã khoá học' }) course_id!: string;
  @IsInt({ message: 'Thiếu thứ tự bài học' }) sort_order!: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() module?: string;
  /** Nội dung bài giảng -> lưu vào cột content_json (bảng không có cột `content`). */
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() lesson_code?: string;
  @IsOptional() @IsInt() xp_reward?: number;
}

export class UpdateLessonDto {
  /** Form PUT gửi kèm course_id; chấp nhận rồi bỏ qua (bài học không đổi khoá). */
  @IsOptional() @IsString() course_id?: string;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() lesson_code?: string;
  @IsOptional()
  @IsInt({ message: 'Thứ tự bài học phải là số' })
  sort_order?: number;
  @IsOptional() @IsInt() xp_reward?: number;
}

/**
 * Gom các trường mô tả (không có cột riêng) thành object cho content_meta.
 * Trả null nếu request không gửi trường nào -> giữ nguyên content_meta cũ.
 */
function pickCourseMeta(
  dto: CreateCourseDto | UpdateCourseDto,
): Record<string, string> | null {
  const meta: Record<string, string> = {};
  for (const key of COURSE_META_FIELDS) {
    const value = (dto as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim() !== '') {
      meta[key] = value;
    }
  }
  return Object.keys(meta).length ? meta : null;
}

/**
 * Nội dung bài giảng từ ô textarea -> content_json.
 * Nếu admin dán JSON hợp lệ thì lưu nguyên cấu trúc (để tương thích với dạng
 * {step_1, step_2:{mcq:[...]}} mà QuizzesModule đọc khi sinh quiz ôn tập);
 * còn lại bọc thành {text} để không mất dữ liệu. Trả null = không đổi.
 */
function parseLessonContent(content?: string): Prisma.InputJsonValue | null {
  if (content === undefined) return null;
  const trimmed = content.trim();
  if (trimmed === '') return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as Prisma.InputJsonValue;
    } catch {
      // Không phải JSON hợp lệ -> rơi xuống nhánh bọc text bên dưới.
    }
  }
  return { text: trimmed };
}

@Injectable()
export class CourseAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 226 ----------
  async listCourses() {
    const courses = await this.prisma.course.findMany({
      orderBy: { id: 'asc' },
    });
    return { ok: true, courses };
  }

  // ---------- Task 227 ----------
  async createCourse(dto: CreateCourseDto, creatorId: number) {
    // id do người tạo tự đặt -> phải check trùng TRƯỚC, tránh lỗi 500 từ DB.
    const existed = await this.prisma.course.findUnique({
      where: { id: dto.id },
    });
    if (existed) throw new ConflictException('Mã khoá học đã tồn tại');

    const meta = pickCourseMeta(dto);

    const course = await this.prisma.course.create({
      data: {
        id: dto.id,
        title: dto.title ?? null,
        level: (dto.level as CourseLevel) ?? null,
        language: dto.language ?? null,
        accentColor: dto.accent_color ?? dto.accentColor ?? null,
        rating: 0,
        lessonCount: 0,
        // Mặc định instructor = admin đang tạo khoá (trước đây hardcode id 1 —
        // nổ FK trên DB không có user 1, hoặc gán nhầm giảng viên).
        instructorId: dto.instructorId ?? creatorId,
        xp_reward: dto.xp_reward ?? 0,
        ...(meta ? { contentMeta: meta } : {}),
      },
    });
    return { ok: true, course };
  }

  // ---------- Task 228 ----------
  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.requireCourse(id);

    // SET động: chỉ cập nhật field CÓ trong body, không ghi đè field vắng mặt
    // thành null (đây là điểm khác biệt giữa PUT ngây thơ và PATCH đúng nghĩa).
    const data: Prisma.CourseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.level !== undefined) data.level = dto.level as CourseLevel;
    if (dto.language !== undefined) data.language = dto.language;
    const accent = dto.accent_color ?? dto.accentColor;
    if (accent !== undefined) data.accentColor = accent;
    if (dto.xp_reward !== undefined) data.xp_reward = dto.xp_reward;

    // Trường mô tả không có cột riêng -> gộp vào content_meta, hợp nhất với giá
    // trị cũ để không xoá mất khoá mà lần cập nhật này không gửi.
    const meta = pickCourseMeta(dto);
    if (meta) {
      const current = await this.prisma.course.findUnique({
        where: { id },
        select: { contentMeta: true },
      });
      const merged = {
        ...((current?.contentMeta as Record<string, unknown>) ?? {}),
        ...meta,
      };
      data.contentMeta = merged as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Không có trường nào để cập nhật');
    }

    const course = await this.prisma.course.update({ where: { id }, data });
    return { ok: true, course };
  }

  // ---------- Task 229 ----------
  async deleteCourse(id: string) {
    await this.requireCourse(id);

    const enrolled = await this.prisma.enrollment.count({
      where: { courseId: id },
    });
    if (enrolled > 0) {
      throw new ConflictException(
        `Không thể xoá: còn ${enrolled} lượt đăng ký trong khoá học này`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.deleteMany({ where: { courseId: id } });
      await tx.course.delete({ where: { id } });
    });

    return { ok: true };
  }

  // ---------- Task 230 ----------
  async listLessonsByCourse(courseId: string) {
    await this.requireCourse(courseId);
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { ok: true, lessons };
  }

  // ---------- Task 231 ----------
  async createLesson(dto: CreateLessonDto) {
    await this.requireCourse(dto.course_id);

    const lesson = await this.prisma.lesson.create({
      data: {
        courseId: dto.course_id,
        sortOrder: dto.sort_order,
        title: dto.title ?? null,
        module: dto.module ?? null,
        lessonCode: dto.lesson_code ?? null,
        xpReward: dto.xp_reward ?? 0,
        // Bảng lessons không có cột `content` — nội dung vào content_json.
        ...(parseLessonContent(dto.content) !== null
          ? { contentJson: parseLessonContent(dto.content)! }
          : {}),
      },
    });

    await this.syncLessonCount(dto.course_id);
    return { ok: true, lesson };
  }

  // ---------- Task 232 ----------
  async updateLesson(id: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const data: Prisma.LessonUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.module !== undefined) data.module = dto.module;
    if (dto.lesson_code !== undefined) data.lessonCode = dto.lesson_code;
    if (dto.sort_order !== undefined) data.sortOrder = dto.sort_order;
    if (dto.xp_reward !== undefined) data.xpReward = dto.xp_reward;
    const content = parseLessonContent(dto.content);
    if (content !== null) data.contentJson = content;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Không có trường nào để cập nhật');
    }

    const updated = await this.prisma.lesson.update({ where: { id }, data });
    await this.syncLessonCount(lesson.courseId);
    return { ok: true, lesson: updated };
  }

  // ---------- Task 233 ----------
  async deleteLesson(id: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    await this.prisma.$transaction(async (tx) => {
      await tx.lessonProgress.deleteMany({ where: { lessonId: id } });
      await tx.lesson.delete({ where: { id } });
    });

    await this.syncLessonCount(lesson.courseId);
    return { ok: true };
  }

  /** Đồng bộ courses.lessons = COUNT(*) thực tế sau mọi thay đổi bài học. */
  private async syncLessonCount(courseId: string) {
    const lessonCount = await this.prisma.lesson.count({ where: { courseId } });
    await this.prisma.course.update({
      where: { id: courseId },
      data: { lessonCount },
    });
  }

  private async requireCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Không tìm thấy khoá học');
    return course;
  }
}

// ---------- Task 225: AdminGuard áp cho TOÀN BỘ route trong module ----------
@Controller('admin')
@UseGuards(AdminGuard)
export class CourseAdminController {
  constructor(private readonly admin: CourseAdminService) {}

  @Get('courses') // Task 234
  listCourses() {
    return this.admin.listCourses();
  }

  @Post('courses') // Task 235
  @HttpCode(HttpStatus.OK)
  createCourse(@Body() dto: CreateCourseDto, @CurrentUserId() userId: number) {
    return this.admin.createCourse(dto, userId);
  }

  @Put('courses/:id') // Task 236
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.admin.updateCourse(id, dto);
  }

  @Delete('courses/:id') // Task 237
  @HttpCode(HttpStatus.OK)
  deleteCourse(@Param('id') id: string) {
    return this.admin.deleteCourse(id);
  }

  @Get('courses/:id/lessons') // Task 238
  listLessons(@Param('id') id: string) {
    return this.admin.listLessonsByCourse(id);
  }

  @Post('lessons') // Task 239
  @HttpCode(HttpStatus.OK)
  createLesson(@Body() dto: CreateLessonDto) {
    return this.admin.createLesson(dto);
  }

  @Put('lessons/:id') // Task 240
  updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.admin.updateLesson(id, dto);
  }

  @Delete('lessons/:id') // Task 241
  @HttpCode(HttpStatus.OK)
  deleteLesson(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteLesson(id);
  }
}

@Module({
  controllers: [CourseAdminController],
  providers: [CourseAdminService],
  exports: [CourseAdminService],
})
export class CourseAdminModule {}
