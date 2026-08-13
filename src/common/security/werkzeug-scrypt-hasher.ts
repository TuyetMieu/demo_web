import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

/**
 * Bản ASYNC là mặc định: scrypt N=32768 tốn ~50-100ms CPU + 32MB RAM mỗi lần —
 * dùng scryptSync sẽ CHẶN event loop, 20 người đăng nhập cùng lúc là toàn bộ
 * request khác (kể cả /health) đứng hình vài giây. crypto.scrypt async chạy
 * trong libuv threadpool nên event loop vẫn phục vụ request khác bình thường.
 */
export class WerkzeugScryptHasher {
  static async encode(password: string, salt?: string): Promise<string> {
    const usedSalt = salt ?? randomBytes(16).toString('hex');

    const derivedKey = await scryptAsync(password, usedSalt, KEY_LENGTH, {
      N,
      r: R,
      p: P,
      maxmem: MAX_MEM,
    });

    return `scrypt:${N}:${R}:${P}$${usedSalt}$${derivedKey.toString('hex')}`;
  }

  /** Bản sync chỉ dành cho unit test/script — KHÔNG dùng trong request handler. */
  static encodeSync(password: string, salt?: string): string {
    const usedSalt = salt ?? randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, usedSalt, KEY_LENGTH, {
      N,
      r: R,
      p: P,
      maxmem: MAX_MEM,
    });
    return `scrypt:${N}:${R}:${P}$${usedSalt}$${derivedKey.toString('hex')}`;
  }

  static async verify(password: string, stored: string): Promise<boolean> {
    const [meta, salt, hashHex] = stored.split('$');
    if (!meta || !salt || !hashHex) return false;

    const [method, nStr, rStr, pStr] = meta.split(':');
    if (method !== 'scrypt') return false;

    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p))
      return false;

    const storedBuf = Buffer.from(hashHex, 'hex');

    const requiredMem = 128 * N * r;
    const maxmem = Math.ceil(requiredMem * 1.5);

    const derivedKey = await scryptAsync(password, salt, storedBuf.length, {
      N,
      r,
      p,
      maxmem,
    });
    if (derivedKey.length !== storedBuf.length) return false;
    return timingSafeEqual(derivedKey, storedBuf);
  }
}
