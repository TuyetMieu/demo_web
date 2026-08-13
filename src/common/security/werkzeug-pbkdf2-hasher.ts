import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

const ITERATIONS = 600_000;
const DIGEST = 'sha256';
const KEY_LENGTH = 64;

export class WerkzeugPBKDF2Hasher {
  static async encode(password: string, salt?: string): Promise<string> {
    const usedSalt = salt ?? randomBytes(16).toString('hex');
    const derivedKey = await pbkdf2Async(
      password,
      usedSalt,
      ITERATIONS,
      KEY_LENGTH,
      DIGEST,
    );
    return `pbkdf2:${DIGEST}:${ITERATIONS}$${usedSalt}$${derivedKey.toString('hex')}`;
  }

  static async verify(password: string, stored: string): Promise<boolean> {
    const [meta, salt, hashHex] = stored.split('$');
    if (!meta || !salt || !hashHex) return false;

    const [method, digest, iterStr] = meta.split(':');
    if (method !== 'pbkdf2') return false;

    const iterations = Number(iterStr);
    if (!Number.isInteger(iterations)) return false;

    const storedBuf = Buffer.from(hashHex, 'hex');
    const derivedKey = await pbkdf2Async(
      password,
      salt,
      iterations,
      storedBuf.length,
      digest,
    );

    if (derivedKey.length !== storedBuf.length) return false;
    return timingSafeEqual(derivedKey, storedBuf);
  }
}
