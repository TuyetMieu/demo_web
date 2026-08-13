/** Task 158 — map chữ cái đầu của tên sang emoji cố định. */
const AVATAR_MAP: Record<string, string> = {
  a: '🦊',
  b: '🐻',
  c: '🐱',
  d: '🐶',
  e: '🦅',
  f: '🦉',
  g: '🐸',
  h: '🐹',
  i: '🦎',
  j: '🐬',
  k: '🐨',
  l: '🦁',
  m: '🐵',
  n: '🦄',
  o: '🦦',
  p: '🐧',
  q: '🦆',
  r: '🐰',
  s: '🦈',
  t: '🐯',
  u: '🦡',
  v: '🦋',
  w: '🐺',
  x: '🦖',
  y: '🐥',
  z: '🦓',
};

export function avatarForName(name?: string | null): string {
  const first = name?.trim()?.[0]?.toLowerCase();
  return (first && AVATAR_MAP[first]) || '🙂';
}

/**
 * Task 159 — heuristic nhận diện tài khoản test/dev để ẩn danh trên bảng xếp hạng.
 * Cố ý giữ đơn giản: chỉ chặn các mẫu tên rõ ràng là dữ liệu thử.
 */
export function looksLikeTestName(name?: string | null): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  if (n.length === 0) return true;

  const patterns = [
    /^test/i,
    /^demo/i,
    /^dev\b/i,
    /^admin$/i,
    /^user\d*$/i,
    /^abc/i,
    /^aaa/i,
    /^qwe/i,
    /^asd/i,
    /^e2e/i,
    /^sample/i,
  ];
  return patterns.some((p) => p.test(n));
}

/** Tên hiển thị: tài khoản test bị ẩn danh thành 'Học viên #id'. */
export function displayNameFor(
  name: string | null | undefined,
  id: number,
): string {
  return looksLikeTestName(name) ? `Học viên #${id}` : (name as string);
}
