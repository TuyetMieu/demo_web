import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('should be defined', () => {
    expect(new RequestIdMiddleware()).toBeDefined();
  });
});
