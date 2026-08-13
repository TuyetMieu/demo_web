import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CachedUserService } from 'src/auth/cached-user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let cachedUsers: { invalidate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      userFollow: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
    };
    cachedUsers = { invalidate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: CachedUserService, useValue: cachedUsers },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getProfile không bao giờ trả field password ra ngoài', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'A',
      password: 'scrypt:32768:8:1$salt$hash',
      questionnaireCompleted: false,
    });

    const res: any = await service.getProfile(1);
    expect(res).not.toHaveProperty('password');
    expect(res.needs_questionnaire).toBe(true);
  });

  it('updateProfile chặn email đã thuộc về NGƯỜI KHÁC', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 999 });

    await expect(
      service.updateProfile(1, { email: 'taken@x.com' }),
    ).rejects.toThrow(BadRequestException);

    // Điều kiện loại trừ chính mình phải có mặt, nếu không user tự submit lại
    // email của chính mình cũng bị chặn nhầm.
    expect(prisma.user.findFirst.mock.calls[0][0].where.id).toEqual({ not: 1 });
  });

  it('followUser từ chối tự theo dõi chính mình', async () => {
    await expect(service.followUser(7, 7)).rejects.toThrow(BadRequestException);
    expect(prisma.userFollow.create).not.toHaveBeenCalled();
  });

  it('followUser bỏ qua (không lỗi) khi đã follow trước đó', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 2 });
    prisma.userFollow.findUnique.mockResolvedValue({
      followerId: 1,
      followeeId: 2,
    });

    await expect(service.followUser(1, 2)).resolves.toEqual({ ok: true });
    expect(prisma.userFollow.create).not.toHaveBeenCalled();
  });
});
