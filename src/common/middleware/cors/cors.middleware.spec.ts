import { ConfigService } from '@nestjs/config';
import { CorsMiddleware } from './cors.middleware';

describe('CorsMiddleware', () => {
  it('should be defined', () => {
    const configService = {
      get: () => ['http://localhost:4000'],
    } as unknown as ConfigService;

    expect(new CorsMiddleware(configService)).toBeDefined();
  });
});
