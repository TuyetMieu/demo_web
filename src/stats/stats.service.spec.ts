import { parseTimeSpent } from './stats.service';

describe('parseTimeSpent (Task 138)', () => {
  it("parse chuỗi dạng '12.5h' ra số giờ", () => {
    expect(parseTimeSpent('12.5h')).toBe(12.5);
    expect(parseTimeSpent('3h')).toBe(3);
    expect(parseTimeSpent('0.5 h')).toBe(0.5);
  });

  it('nhận luôn kiểu number', () => {
    expect(parseTimeSpent(42)).toBe(42);
  });

  it('giá trị rỗng/không parse được -> 0 (không NaN)', () => {
    expect(parseTimeSpent(null)).toBe(0);
    expect(parseTimeSpent(undefined)).toBe(0);
    expect(parseTimeSpent('')).toBe(0);
    expect(parseTimeSpent('abc')).toBe(0);
    expect(parseTimeSpent({})).toBe(0);
  });

  it('clamp trong khoảng 0..500', () => {
    expect(parseTimeSpent('9999h')).toBe(500);
    expect(parseTimeSpent('-5h')).toBe(0);
    expect(parseTimeSpent(1000)).toBe(500);
  });
});
