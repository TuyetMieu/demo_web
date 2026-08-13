import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let authSession: {
    create: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(async () => {
    authSession = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: { authSession } },
        { provide: ConfigService, useValue: { get: () => '8h' } },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issue', () => {
    it('trả raw token cho client nhưng chỉ lưu HASH xuống DB', async () => {
      const rawToken = await service.issue(42);

      expect(authSession.create).toHaveBeenCalledTimes(1);
      const stored = authSession.create.mock.calls[0][0].data;

      expect(stored.userId).toBe(42);
      // Điểm dễ sai nhất: nếu lỡ lưu raw token thì dòng này fail.
      expect(stored.token).not.toBe(rawToken);
      expect(stored.token).toBe(
        createHash('sha256').update(rawToken).digest('hex'),
      );
    });

    it('đặt hạn 8 giờ kể từ lúc cấp', async () => {
      const before = Date.now();
      await service.issue(1);
      const { expiresAt } = authSession.create.mock.calls[0][0].data;

      const lifetimeMs = expiresAt.getTime() - before;
      expect(lifetimeMs).toBeGreaterThan(8 * 60 * 60 * 1000 - 5_000);
      expect(lifetimeMs).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
    });
  });

  describe('rotateAndBlacklist', () => {
    it('tra DB bằng hash của token, không phải token thô', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, userId: 42 });

      await service.rotateAndBlacklist('raw-token-abc');

      const where = authSession.findFirst.mock.calls[0][0].where;
      expect(where.token).toBe(
        createHash('sha256').update('raw-token-abc').digest('hex'),
      );
      // Hai điều kiện chặn token đã thu hồi / đã hết hạn.
      expect(where.revokedAt).toBeNull();
      expect(where.expiresAt.gt).toBeInstanceOf(Date);
    });

    it('đánh dấu revokedAt cho token cũ rồi cấp token mới khác hẳn', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, userId: 42 });

      const rotated = await service.rotateAndBlacklist('raw-token-abc');

      // CAS: điều kiện revokedAt:null bảo đảm chỉ 1 request song song thắng.
      expect(authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 7, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // Token mới được cấp cho đúng user cũ.
      expect(authSession.create.mock.calls[0][0].data.userId).toBe(42);
      // Trả về userId để AuthService ký access token mà không phải tra DB lần nữa.
      expect(rotated.userId).toBe(42);
      expect(typeof rotated.refreshToken).toBe('string');
      expect(rotated.refreshToken).not.toBe('raw-token-abc');
    });

    it('ném Unauthorized và KHÔNG cấp token mới khi token không hợp lệ', async () => {
      authSession.findFirst.mockResolvedValue(null);

      await expect(service.rotateAndBlacklist('token-rac')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.updateMany).not.toHaveBeenCalled();
      expect(authSession.create).not.toHaveBeenCalled();
    });

    it('ném Unauthorized khi request song song đã rotate trước (count=0)', async () => {
      authSession.findFirst.mockResolvedValue({ id: 7, userId: 42 });
      authSession.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.rotateAndBlacklist('raw-token-abc')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSession.create).not.toHaveBeenCalled();
    });
  });
});
