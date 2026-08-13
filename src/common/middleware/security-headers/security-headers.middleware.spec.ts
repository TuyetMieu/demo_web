import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware', () => {
  it('should be defined', () => {
    expect(new SecurityHeadersMiddleware()).toBeDefined();
  });
});
