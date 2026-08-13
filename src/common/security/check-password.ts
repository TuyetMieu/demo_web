import { timingSafeEqual } from 'crypto';
import { WerkzeugScryptHasher } from './werkzeug-scrypt-hasher';
import { WerkzeugPBKDF2Hasher } from './werkzeug-pbkdf2-hasher';

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function checkPassword(
  stored: string,
  raw: string,
): Promise<boolean> {
  if (stored.startsWith('scrypt:')) {
    return WerkzeugScryptHasher.verify(raw, stored);
  }
  if (stored.startsWith('pbkdf2:')) {
    return WerkzeugPBKDF2Hasher.verify(raw, stored);
  }
  // Legacy: mật khẩu cũ lưu plaintext trực tiếp, chưa từng qua hash.
  return timingSafeStringEqual(stored, raw);
}
