import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { pickRoadmapTemplate } from 'src/user/pick-roadmap-template';
import { BadRequestException } from '@nestjs/common';

/**
 * Sheet 1 của spec (API #41) quy định body là {mermaid_def} và frontend
 * (main.js savePersonalRoadmap) gửi đúng khoá đó. DTO trước chỉ khai `mermaid`
 * nên nút "Lưu lộ trình" luôn 400.
 */
export class SaveRoadmapDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() nodes?: unknown;
  @IsOptional() edges?: unknown;
  @IsOptional() @IsString() mermaid_def?: string;
  /** Bí danh cũ, giữ để không phá client nào đang gửi `mermaid`. */
  @IsOptional() @IsString() mermaid?: string;
}

export class UpdateRoadmapItemDto {
  @IsString({ message: 'Thiếu roadmap_id' })
  roadmap_id!: string;

  @IsOptional() @IsBoolean() done?: boolean;
}

@Injectable()
export class RoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 213 ----------
  async getRoadmaps(userId: number) {
    const [survey, templates] = await Promise.all([
      this.prisma.survey.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Task 211 mô tả "user_id NULL = template hệ thống", nhưng cột roadmaps.user_id
      // hiện là NOT NULL (có FK tới users) nên không biểu diễn được bằng NULL.
      // Dùng source='template' — không cần đổi cấu trúc DB.
      this.prisma.roadMap.findMany({ where: { source: 'template' } }),
    ]);

    const preferred = survey
      ? pickRoadmapTemplate(survey.dataJson as Record<string, string>)
      : null;

    const filtered = preferred
      ? templates.filter((t) => t.title?.toLowerCase().includes(preferred))
      : templates;

    return {
      ok: true,
      template: preferred,
      roadmaps: filtered.length ? filtered : templates,
    };
  }

  // ---------- Task 214 ----------
  async getRoadmapProgress(userId: number, roadmapId?: string) {
    const rows = await this.prisma.roadMapProgress.findMany({
      where: { userId, ...(roadmapId ? { roadmapId } : {}) },
      select: { roadmapId: true, itemId: true, done: true },
    });

    return {
      ok: true,
      doneItems: rows.filter((r) => r.done).map((r) => r.itemId),
      items: rows,
    };
  }

  // ---------- Task 215 ----------
  async getMyRoadmap(userId: number) {
    const rm = await this.prisma.roadMap.findFirst({
      where: { userId, source: { in: ['generated', 'custom'] } },
      orderBy: { updatedAt: 'desc' },
    });

    // Spec (API #40) yêu cầu response PHẲNG {mermaid_def, title, icon, color,
    // nodes, edges} — main.js đọc thẳng data.mermaid_def. Bọc trong {roadmap:…}
    // khiến lộ trình đã lưu không bao giờ tải lại được. Vẫn kèm `roadmap` để
    // tương thích với chỗ nào đang đọc theo kiểu cũ.
    return {
      ok: true,
      mermaid_def: rm?.mermaidDef ?? '',
      title: rm?.title ?? '',
      icon: null,
      color: null,
      nodes: rm?.nodesJson ?? [],
      edges: rm?.edgesJson ?? [],
      roadmap: rm ?? null,
    };
  }

  // ---------- Task 216 ----------
  async saveMyRoadmap(userId: number, dto: SaveRoadmapDto) {
    const id = `u${userId}_custom`;

    const survey = await this.prisma.survey.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    // roadmaps.generated_from_survey_id là FK NOT NULL tới surveys.id — nếu user
    // chưa từng khảo sát mà cứ insert với id=0 sẽ nổ P2003 (500). Trả 400 rõ ràng.
    if (!survey) {
      throw new BadRequestException(
        'Hãy hoàn thành khảo sát định hướng trước khi lưu lộ trình cá nhân',
      );
    }

    const roadmap = await this.prisma.roadMap.upsert({
      where: { id },
      create: {
        id,
        userId,
        generatedFromSurveyId: survey.id,
        source: 'custom',
        title: dto.title ?? 'Lộ trình của tôi',
        nodesJson: dto.nodes ?? [],
        edgesJson: dto.edges ?? [],
        mermaidDef: dto.mermaid_def ?? dto.mermaid ?? null,
      },
      update: {
        title: dto.title ?? 'Lộ trình của tôi',
        nodesJson: dto.nodes ?? [],
        edgesJson: dto.edges ?? [],
        mermaidDef: dto.mermaid_def ?? dto.mermaid ?? null,
      },
    });

    return { ok: true, roadmap };
  }

  // ---------- Task 217 ----------
  async updateRoadmapItem(
    userId: number,
    itemId: string,
    dto: UpdateRoadmapItemDto,
  ) {
    if (!dto.roadmap_id?.trim()) {
      throw new BadRequestException('Thiếu roadmap_id');
    }
    const done = dto.done ?? true;

    await this.prisma.roadMapProgress.upsert({
      where: {
        userId_roadmapId_itemId: {
          userId,
          roadmapId: dto.roadmap_id,
          itemId,
        },
      },
      create: { userId, roadmapId: dto.roadmap_id, itemId, done },
      update: { done, completedAt: new Date() },
    });

    return { ok: true, itemId, done };
  }

  // ---------- Task 218 ----------
  aiRoadmap(): never {
    // STUB giữ nguyên theo bản gốc: tính năng premium chưa mở.
    throw new HttpException(
      {
        error: 'Premium',
        message: 'Tính năng tạo lộ trình bằng AI dành cho tài khoản Premium',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

@Controller()
export class RoadmapController {
  constructor(private readonly roadmap: RoadmapService) {}

  // ---------- Task 219 ----------
  @Get('roadmaps')
  getRoadmaps(@CurrentUserId() userId: number) {
    return this.roadmap.getRoadmaps(userId);
  }

  // ---------- Task 220 ----------
  @Get('roadmap')
  progress(
    @CurrentUserId() userId: number,
    @Query('roadmap_id') roadmapId?: string,
  ) {
    return this.roadmap.getRoadmapProgress(userId, roadmapId);
  }

  // ---------- Task 221 ----------
  @Get('me/roadmap')
  mine(@CurrentUserId() userId: number) {
    return this.roadmap.getMyRoadmap(userId);
  }

  // ---------- Task 222 ----------
  @Post('me/roadmap')
  @HttpCode(HttpStatus.OK)
  save(@CurrentUserId() userId: number, @Body() dto: SaveRoadmapDto) {
    return this.roadmap.saveMyRoadmap(userId, dto);
  }

  // ---------- Task 223 ----------
  @Post('me/roadmap/ai')
  ai() {
    return this.roadmap.aiRoadmap();
  }

  // ---------- Task 224 ----------
  @Put('roadmap/:itemId')
  updateItem(
    @CurrentUserId() userId: number,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoadmapItemDto,
  ) {
    return this.roadmap.updateRoadmapItem(userId, itemId, dto);
  }
}

@Module({
  controllers: [RoadmapController],
  providers: [RoadmapService],
  exports: [RoadmapService],
})
export class RoadmapModule {}
