/**
 * Task 179 — kiểm tra '@name' theo RANH GIỚI TỪ, không phải substring.
 *
 * Sheet 3: user tên 'An' KHÔNG được thông báo khi ai đó gõ '@Anh'.
 * Ký tự có dấu tiếng Việt phải tính là CHỮ (nên '@An' + 'h' -> không khớp,
 * và '@Anh' phải khớp đúng user 'Anh').
 */

// \p{L} = mọi ký tự chữ Unicode (gồm cả ký tự có dấu), \p{N} = chữ số.
const WORD_CHAR = /[\p{L}\p{N}_]/u;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isNameMentioned(content: string, name: string): boolean {
  if (!content || !name?.trim()) return false;

  const target = name.trim();
  const pattern = new RegExp(`@${escapeRegex(target)}`, 'giu');

  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    const after = content[m.index + m[0].length];
    // Khớp nếu đứng cuối chuỗi HOẶC ký tự kế tiếp không phải chữ/số/gạch dưới.
    if (after === undefined || !WORD_CHAR.test(after)) return true;
  }
  return false;
}
