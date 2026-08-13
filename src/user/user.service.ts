import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { checkPassword } from 'src/common/security/check-password';
import { WerkzeugScryptHasher } from 'src/common/security/werkzeug-scrypt-hasher';
import { CachedUserService } from 'src/auth/cached-user.service';
import { ChangePasswordDto, SurveyDto, UpdateProfileDto } from './dto/user.dto';
import { pickRoadmapTemplate } from './pick-roadmap-template';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cachedUsers: CachedUserService,
  ) {}

  // ---------- Task 66 ----------
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Loại bỏ password khỏi response — không bao giờ trả hash ra ngoài.
    const { password: _password, ...safe } = user;
    return {
      ...safe,
      needs_questionnaire: !user.questionnaireCompleted,
      first_login: !user.questionnaireCompleted,
    };
  }

  // ---------- Task 67 ----------
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    // Chuẩn hoá giống AuthService: cột email @unique là case-sensitive, không
    // lowercase thì 'Victim@Gmail.com' lách được kiểm tra trùng.
    if (dto.email !== undefined) {
      dto = { ...dto, email: dto.email?.trim().toLowerCase() };
    }
    // Chỉ chặn khi email/phone thuộc về NGƯỜI KHÁC — loại trừ chính mình,
    // nếu không user submit lại chính email của mình cũng bị 400.
    if (dto.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
        select: { id: true },
      });
      if (taken) throw new BadRequestException('Email đã được sử dụng');
    }

    if (dto.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new BadRequestException('Số điện thoại đã được sử dụng');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.birthday !== undefined) {
      data.birthday = dto.birthday ? new Date(dto.birthday) : null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    this.cachedUsers.invalidate(userId);

    const { password: _password, ...safe } = updated;
    return { ok: true, user: safe };
  }

  // ---------- Task 68 ----------
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // checkPassword tự nhận diện scrypt:/pbkdf2:/plaintext legacy.
    if (!(await checkPassword(user.password, dto.current))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashed = await WerkzeugScryptHasher.encode(dto.new);

    // Đổi mật khẩu PHẢI thu hồi mọi phiên đăng nhập cũ.
    //
    // Trước đây chỉ ghi mật khẩu mới, còn refresh token cũ vẫn dùng được tới 8
    // giờ. Kịch bản thật: token của nạn nhân bị lộ (máy dùng chung, XSS), nạn
    // nhân phát hiện và đổi mật khẩu — nhưng kẻ tấn công vẫn tiếp tục gọi
    // /auth/refresh để tự gia hạn vô thời hạn. Đổi mật khẩu khi đó thành thao
    // tác vô nghĩa về mặt an ninh.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashed },
      });
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    this.cachedUsers.invalidate(userId);

    return {
      ok: true,
      // Báo cho client biết các phiên khác đã bị đăng xuất để hiển thị thông báo.
      sessions_revoked: true,
    };
  }

  // ---------- Task 69 ----------
  async followUser(followerId: number, followeeId: number) {
    if (followerId === followeeId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: followeeId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy người dùng');

    // Đã follow rồi thì bỏ qua (ON CONFLICT DO NOTHING), không ném lỗi.
    const existed = await this.prisma.userFollow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    if (!existed) {
      await this.prisma.userFollow.create({ data: { followerId, followeeId } });
    }

    return { ok: true };
  }

  // ---------- Task 70 ----------
  async unfollowUser(followerId: number, followeeId: number) {
    await this.prisma.userFollow.deleteMany({
      where: { followerId, followeeId },
    });
    return { ok: true };
  }

  // ---------- Task 71 ----------
  async getFollowing(userId: number) {
    const rows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        followee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            xp: true,
            streak: true,
          },
        },
      },
    });

    return {
      ok: true,
      following: rows.map((r) => ({
        id: r.followee.id,
        name: r.followee.name,
        avatar: r.followee.avatar,
        xp: r.followee.xp,
        streak: r.followee.streak,
        followedAt: r.createdAt,
      })),
    };
  }

  // ---------- Task 73-74 ----------
  async submitSurvey(userId: number, dto: SurveyDto) {
    const template = pickRoadmapTemplate(dto);
    // ID cố định theo user -> gọi lại nhiều lần chỉ update, không sinh bản trùng.
    const roadmapId = `u${userId}_generated`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Bước 1: lưu survey + đánh dấu đã hoàn thành khảo sát.
      const survey = await tx.survey.create({
        data: { userId, dataJson: dto as unknown as Prisma.InputJsonValue },
      });

      await tx.user.update({
        where: { id: userId },
        data: { questionnaireCompleted: true },
      });

      // Bước 2: sinh roadmap cá nhân từ template (idempotent).
      await tx.roadMap.upsert({
        where: { id: roadmapId },
        create: {
          id: roadmapId,
          userId,
          generatedFromSurveyId: survey.id,
          source: 'generated',
          title: template ? `Lộ trình ${template}` : 'Lộ trình cá nhân',
          nodesJson: [],
          edgesJson: [],
        },
        update: {
          generatedFromSurveyId: survey.id,
          title: template ? `Lộ trình ${template}` : 'Lộ trình cá nhân',
        },
      });

      return { ok: true, template, roadmap_id: roadmapId };
    });

    this.cachedUsers.invalidate(userId);
    return result;
  }
}
