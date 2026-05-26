import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// New key: scrypt-derived (production-grade KDF)
const SALT = 'atlas_encryption_salt_value_must_be_stable';
const KEY = crypto.scryptSync(env.ENCRYPTION_KEY, SALT, 32);

// Legacy key: padEnd-derived (used before production hardening)
const LEGACY_KEY = Buffer.from(env.ENCRYPTION_KEY.padEnd(32).slice(0, 32));

/**
 * Encrypt sensitive data (e.g. DB passwords)
 * Always uses the new scrypt-derived key.
 * Returns: iv:tag:encrypted (hex encoded)
 */
export const encrypt = (plaintext: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
};

/**
 * Internal: attempt decryption with a specific key
 */
const decryptWithKey = (encryptedData: string, key: Buffer): string => {
  const [ivHex, tagHex, encryptedHex] = encryptedData.split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
};

/**
 * Decrypt sensitive data.
 * Tries the new scrypt key first; if it fails, falls back to the legacy key
 * (for credentials encrypted before the production hardening upgrade).
 */
export const decrypt = (encryptedData: string): string => {
  try {
    return decryptWithKey(encryptedData, KEY);
  } catch {
    // Fallback: try legacy key for pre-upgrade data
    return decryptWithKey(encryptedData, LEGACY_KEY);
  }
};

/**
 * Hash password with bcrypt-like salt (use bcrypt for passwords, this for other data)
 */
export const hashString = (input: string): string => {
  return crypto.createHash('sha256').update(input + env.ENCRYPTION_KEY).digest('hex');
};

