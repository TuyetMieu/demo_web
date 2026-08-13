import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { avatarForName, displayNameFor } from './leaderboard.helpers';

const TOP_N = 20;

interface RankRow {
  id: number;
  name: string | null;
  value: number;
  rank: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Task 153-154 ----------
  async fetchTopWeekly(userId: number) {
    // Tuần bắt đầu từ THỨ HAI (ISO week) — date_trunc('week') của Postgres
    // đã dùng thứ 2 làm mốc, khớp yêu cầu spec.
    const rows = await this.prisma.$queryRaw<
      Array<RankRow & { is_me: boolean }>
    >(
      Prisma.sql`
        WITH weekly AS (
          SELECT l.user_id,
                 SUM(l.xp_earned)::int AS value
          FROM user_daily_xp_logs l
          WHERE l.log_date >= date_trunc('week', CURRENT_DATE)
          GROUP BY l.user_id
        ), ranked AS (
          SELECT w.user_id AS id,
                 u.name,
                 w.value,
                 RANK() OVER (ORDER BY w.value DESC)::int AS rank
          FROM weekly w
          JOIN users u ON u.id = w.user_id
        )
        -- Lấy top N VÀ dòng của chính mình trong CÙNG một câu lệnh,
        -- tránh 2 roundtrip và tránh lệch rank giữa 2 lần query.
        SELECT id, name, value, rank, (id = ${userId}) AS is_me
        FROM ranked
        WHERE rank <= ${TOP_N} OR id = ${userId}
        ORDER BY rank ASC
      `,
    );

    return this.buildResponse(rows, userId);
  }

  // ---------- Task 155-156 ----------
  async fetchTopBy(userId: number, orderCol: string) {
    // Whitelist BẮT BUỘC: giá trị này ghép thẳng vào SQL, không tham số hoá được
    // tên cột -> nhận input tự do sẽ thành lỗ hổng SQL injection.
    const col = orderCol === 'streak' ? 'streak' : 'xp';
    const column = col === 'streak' ? Prisma.sql`u.streak` : Prisma.sql`u.xp`;

    // Tách làm 2 truy vấn RẺ thay vì một window function quét toàn bảng.
    //
    // Bản cũ chạy RANK() OVER (ORDER BY xp DESC) trên TOÀN BỘ bảng users rồi mới
    // lọc top N — Postgres buộc phải sắp xếp toàn bộ người dùng ở mọi lần gọi,
    // không dùng được index và không có LIMIT. Với 10.000 người dùng và bảng xếp
    // hạng được mở thường xuyên, đây là truy vấn nặng nhất hệ thống.
    //
    // Cách mới: (1) lấy top N bằng ORDER BY ... LIMIT (dùng được index);
    // (2) tính hạng của riêng người đang xem bằng một phép COUNT.
    const [top, meRows] = await Promise.all([
      this.prisma.$queryRaw<Array<RankRow>>(
        Prisma.sql`
          SELECT u.id, u.name, ${column}::int AS value,
                 (ROW_NUMBER() OVER (ORDER BY ${column} DESC))::int AS rank
          FROM users u
          ORDER BY ${column} DESC
          LIMIT ${TOP_N}
        `,
      ),
      this.prisma.$queryRaw<Array<RankRow>>(
        Prisma.sql`
          SELECT u.id, u.name, ${column}::int AS value,
                 (SELECT count(*) + 1 FROM users x WHERE ${
                   col === 'streak' ? Prisma.sql`x.streak` : Prisma.sql`x.xp`
                 } > ${column})::int AS rank
          FROM users u
          WHERE u.id = ${userId}
        `,
      ),
    ]);

    const rows: Array<RankRow & { is_me: boolean }> = top.map((r) => ({
      ...r,
      is_me: r.id === userId,
    }));

    // Người đang xem không nằm trong top -> nối thêm vào cuối để FE vẫn hiện
    // được hạng của họ (giữ nguyên hành vi cũ).
    if (meRows.length && !rows.some((r) => r.id === userId)) {
      rows.push({ ...meRows[0], is_me: true });
    }

    return this.buildResponse(rows, userId);
  }

  // ---------- Task 157 ----------
  async buildFriends(userId: number) {
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: {
        followee: { select: { id: true, name: true, xp: true, streak: true } },
      },
    });

    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, xp: true, streak: true },
    });

    // Gộp bản thân vào danh sách bạn bè rồi mới xếp hạng — nếu không, user
    // không thấy mình đứng đâu so với người mình theo dõi.
    const merged = [...follows.map((f) => f.followee), ...(me ? [me] : [])];
    merged.sort((a, b) => b.xp - a.xp);

    const entries = merged.map((u, i) => ({
      id: u.id,
      name: displayNameFor(u.name, u.id),
      avatar: avatarForName(u.name),
      value: u.xp,
      streak: u.streak,
      rank: i + 1,
      is_me: u.id === userId,
    }));

    return {
      ok: true,
      type: 'friends',
      entries,
      me: entries.find((e) => e.is_me) ?? null,
    };
  }

  // ---------- Task 160 ----------
  async getLeaderboard(userId: number, type?: string) {
    if (type === 'friends') return this.buildFriends(userId);
    if (type === 'streak') return this.fetchTopBy(userId, 'streak');
    if (type === 'weekly') return this.fetchTopWeekly(userId);
    return this.fetchTopBy(userId, 'xp');
  }

  private buildResponse(
    rows: Array<RankRow & { is_me: boolean }>,
    userId: number,
  ) {
    const entries = rows.map((r) => ({
      id: r.id,
      name: displayNameFor(r.name, r.id),
      avatar: avatarForName(r.name),
      value: Number(r.value),
      rank: Number(r.rank),
      is_me: r.id === userId,
    }));

    return {
      ok: true,
      entries: entries.filter((e) => e.rank <= TOP_N),
      me: entries.find((e) => e.is_me) ?? null,
    };
  }
}
