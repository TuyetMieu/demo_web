import { StreakService, toStudyDate } from './streak.service';

describe('StreakService.computeNewStreak (Task 118)', () => {
  const svc = new StreakService();
  const today = new Date(2026, 7, 6); // 06/08/2026
  // Mô phỏng giá trị đọc từ cột @db.Date (Prisma trả về UTC midnight).
  const d = (day: number) => toStudyDate(new Date(2026, 7, day));

  it('chưa học bao giờ -> bắt đầu chuỗi = 1', () => {
    expect(svc.computeNewStreak(null, 0, today)).toBe(1);
    expect(svc.computeNewStreak(undefined, 99, today)).toBe(1);
  });

  it('học liên tục từ hôm qua -> +1', () => {
    expect(svc.computeNewStreak(d(5), 4, today)).toBe(5);
  });

  it('ĐÃ học hôm nay -> GIỮ NGUYÊN, không cộng 2 lần trong ngày', () => {
    expect(svc.computeNewStreak(d(6), 7, today)).toBe(7);
  });

  it('học hôm nay nhưng streak đang 0 -> về 1 (không giữ 0)', () => {
    expect(svc.computeNewStreak(d(6), 0, today)).toBe(1);
  });

  it('bỏ quá 1 ngày -> reset về 1', () => {
    expect(svc.computeNewStreak(d(4), 10, today)).toBe(1);
    expect(svc.computeNewStreak(d(1), 30, today)).toBe(1);
  });

  it('so sánh theo NGÀY, bỏ qua giờ phút', () => {
    const lateYesterday = toStudyDate(new Date(2026, 7, 5, 23, 59));
    const earlyToday = new Date(2026, 7, 6, 0, 1);
    // Chỉ cách nhau 2 phút nhưng khác ngày -> vẫn tính là +1.
    expect(svc.computeNewStreak(lateYesterday, 3, earlyToday)).toBe(4);
  });

  it('isStreakActive: hôm nay/hôm qua = còn hiệu lực, xa hơn = mất', () => {
    expect(svc.isStreakActive(d(6), today)).toBe(true);
    expect(svc.isStreakActive(d(5), today)).toBe(true);
    expect(svc.isStreakActive(d(4), today)).toBe(false);
    expect(svc.isStreakActive(null, today)).toBe(false);
  });
});
