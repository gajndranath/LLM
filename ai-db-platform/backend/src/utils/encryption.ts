import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY = Buffer.from(env.ENCRYPTION_KEY.padEnd(32).slice(0, 32));

/**
 * Encrypt sensitive data (e.g. DB passwords)
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
 * Decrypt sensitive data
 */
export const decrypt = (encryptedData: string): string => {
  const [ivHex, tagHex, encryptedHex] = encryptedData.split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
};

/**
 * Hash password with bcrypt-like salt (use bcrypt for passwords, this for other data)
 */
export const hashString = (input: string): string => {
  return crypto.createHash('sha256').update(input + env.ENCRYPTION_KEY).digest('hex');
};
