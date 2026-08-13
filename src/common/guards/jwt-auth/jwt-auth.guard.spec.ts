import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function createContext(): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('should be defined', () => {
    expect(new JwtAuthGuard(new Reflector())).toBeDefined();
  });

  it('cho qua ngay khi route được đánh dấu @Public(), không chạm tới passport', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;

    const guard = new JwtAuthGuard(reflector);

    // Nếu logic @Public() hỏng, super.canActivate() sẽ chạy và ném lỗi
    // "Unknown authentication strategy" vì passport chưa được setup trong unit test.
    expect(guard.canActivate(createContext())).toBe(true);
  });
});
