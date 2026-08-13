import { isNameMentioned } from './mention.helper';

describe('isNameMentioned (Task 179 / 195)', () => {
  it("'@An' KHÔNG khớp nhầm khi nội dung là '@Anh'", () => {
    expect(isNameMentioned('chào @Anh nhé', 'An')).toBe(false);
    expect(isNameMentioned('chào @Anh nhé', 'Anh')).toBe(true);
  });

  it('khớp khi đứng cuối chuỗi', () => {
    expect(isNameMentioned('cảm ơn @An', 'An')).toBe(true);
  });

  it('khớp khi theo sau là dấu câu / khoảng trắng', () => {
    expect(isNameMentioned('@An, xem giúp', 'An')).toBe(true);
    expect(isNameMentioned('@An xem giúp', 'An')).toBe(true);
    expect(isNameMentioned('(@An)', 'An')).toBe(true);
  });

  it('ký tự có dấu tiếng Việt tính là CHỮ -> không cắt từ giữa chừng', () => {
    // 'Đứcz' vẫn là 1 từ -> '@Đức' không được coi là mention.
    expect(isNameMentioned('gửi @Đứcz', 'Đức')).toBe(false);
    expect(isNameMentioned('gửi @Đức ạ', 'Đức')).toBe(true);
  });

  it('không phân biệt hoa thường', () => {
    expect(isNameMentioned('hi @an', 'An')).toBe(true);
  });

  it('không khớp khi thiếu @', () => {
    expect(isNameMentioned('An ơi', 'An')).toBe(false);
  });

  it('tên chứa ký tự regex đặc biệt không làm vỡ pattern', () => {
    expect(isNameMentioned('hi @a.b', 'a.b')).toBe(true);
    expect(isNameMentioned('hi @axb', 'a.b')).toBe(false);
  });

  it('input rỗng -> false, không ném lỗi', () => {
    expect(isNameMentioned('', 'An')).toBe(false);
    expect(isNameMentioned('@An', '')).toBe(false);
  });
});
