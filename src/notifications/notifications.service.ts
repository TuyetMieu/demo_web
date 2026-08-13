import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

const COALESCE_WINDOW_MIN = 10; // Sheet 3: gộp trong vòng 10 phút
const FEED_LIMIT = 30;

type Db = PrismaService | Prisma.TransactionClient;

export interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body?: string;
  refType?: string;
  refId?: number;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 198 ----------
  async getSettings(userId: number) {
    const s = await this.prisma.notificationSetting.upsert({
      where: { userId },
      create: {
        userId,
        emailNotif: true,
        pushNotif: false,
        studyRemind: true,
        contentUpdate: false,
      },
      update: {},
    });
    return { ok: true, settings: s };
  }

  async updateSettings(
    userId: number,
    dto: Partial<
      Record<
        'emailNotif' | 'pushNotif' | 'studyRemind' | 'contentUpdate',
        boolean
      >
    >,
  ) {
    const s = await this.prisma.notificationSetting.upsert({
      where: { userId },
      create: {
        userId,
        emailNotif: dto.emailNotif ?? true,
        pushNotif: dto.pushNotif ?? false,
        studyRemind: dto.studyRemind ?? true,
        contentUpdate: dto.contentUpdate ?? false,
      },
      update: dto,
    });
    return { ok: true, settings: s };
  }

  // ---------- Task 199-201 ----------
  async notify(input: NotifyInput, db: Db = this.prisma) {
    const since = new Date(Date.now() - COALESCE_WINDOW_MIN * 60_000);

    // Bước 1: tìm thông báo CHƯA ĐỌC cùng (type, ref_type, ref_id) trong cửa sổ gộp.
    const existing = await db.notification.findFirst({
      where: {
        userId: input.userId,
        type: input.type,
        refType: input.refType ?? null,
        refId: input.refId ?? 0,
        isRead: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // Bước 2: gộp — tăng đếm, đổi title dạng số nhiều, đẩy lên đầu feed.
      const nextCount = existing.coalesceCount + 1;
      return db.notification.update({
        where: { id: existing.id },
        data: {
          coalesceCount: nextCount,
          title: this.pluralTitle(input.title, nextCount),
          body: input.body ?? existing.body,
          // bump created_at để nổi lên đầu feed sắp xếp theo thời gian.
          createdAt: new Date(),
        },
      });
    }

    // Bước 3: chưa có -> tạo mới.
    return db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        refType: input.refType ?? null,
        refId: input.refId ?? 0,
      },
    });
  }

  // ---------- Task 202 ----------
  async getFeed(userId: number) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { ok: true, unread, items };
  }

  // ---------- Task 203 ----------
  async getBadge(userId: number) {
    const [unread, latest] = await Promise.all([
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, createdAt: true, isRead: true },
      }),
    ]);
    return { ok: true, unread, latest };
  }

  // ---------- Task 204 ----------
  async markRead(userId: number, id: number) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  /** '1 bình luận mới' -> '{n} bình luận mới' khi gộp. */
  private pluralTitle(base: string, count: number): string {
    const stripped = base.replace(/^\d+\s*/, '');
    return `${count} ${stripped}`;
  }
}
