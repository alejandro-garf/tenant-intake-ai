import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { TOTP } from 'otpauth';
import QRCode from 'qrcode';
import { getPool } from '@/db/connection';

/**
 * Encryption key derivation from environment variable.
 * SECURITY: TOTP_ENCRYPTION_KEY must be set in .env.local and never committed.
 * Use a strong random key: openssl rand -hex 32
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOTP_ENCRYPTION_KEY must be set in environment');
  }
  // Derive a 32-byte key using scrypt
  return scryptSync(key, 'totp-salt', 32);
}

/**
 * Encrypt a TOTP secret for storage.
 * Uses AES-256-GCM with a random IV for each encryption.
 * Returns format: iv:authTag:encryptedData (all hex-encoded)
 */
function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Store as iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a TOTP secret from storage.
 * Expects format: iv:authTag:encryptedData (all hex-encoded)
 */
function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const parts = encryptedSecret.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }

  const iv = Buffer.from(parts[0] ?? '', 'hex');
  const authTag = Buffer.from(parts[1] ?? '', 'hex');
  const encrypted = parts[2] ?? '';

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret and a data URL for the QR code.
 * The secret is NOT saved to the database yet - that happens after verification.
 */
export async function generateTOTPSecret(userId: number, email: string): Promise<{
  secret: string;
  qrCodeDataURL: string;
}> {
  // Generate a random secret
  const totp = new TOTP({
    issuer: 'Tenant Portal',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;

  // Generate QR code
  const otpauthURL = totp.toString();
  const qrCodeDataURL = await QRCode.toDataURL(otpauthURL);

  return { secret, qrCodeDataURL };
}

/**
 * Verify a TOTP code against a secret.
 * Returns true if the code is valid (with a window of ±1 period for clock drift).
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  const totp = new TOTP({
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  // Verify with a window of ±1 period (90 seconds total)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Save a verified TOTP secret to the database (encrypted).
 * This should only be called after the user has successfully verified a code.
 */
export async function saveTOTPSecret(userId: number, secret: string): Promise<void> {
  const pool = getPool();
  const encryptedSecret = encryptSecret(secret);

  await pool.query(
    `INSERT INTO totp_secrets (user_id, encrypted_secret, is_verified, verified_at)
     VALUES ($1, $2, true, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET encrypted_secret = $2, is_verified = true, verified_at = NOW()`,
    [userId, encryptedSecret]
  );
}

/**
 * Get a user's TOTP secret (decrypted).
 * Returns null if the user has no TOTP secret or it's not verified.
 */
export async function getTOTPSecret(userId: number): Promise<string | null> {
  const pool = getPool();

  const result = await pool.query<{
    encrypted_secret: string;
    is_verified: boolean;
  }>(
    'SELECT encrypted_secret, is_verified FROM totp_secrets WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  if (!row || !row.is_verified) {
    return null;
  }

  return decryptSecret(row.encrypted_secret);
}

/**
 * Check if a user has TOTP enabled and verified.
 */
export async function hasTOTPEnabled(userId: number): Promise<boolean> {
  const pool = getPool();

  const result = await pool.query<{ is_verified: boolean }>(
    'SELECT is_verified FROM totp_secrets WHERE user_id = $1',
    [userId]
  );

  return result.rows.length > 0 && (result.rows[0]?.is_verified ?? false);
}

/**
 * Verify a TOTP code for a user.
 * Returns true if the code is valid.
 */
export async function verifyUserTOTPCode(userId: number, code: string): Promise<boolean> {
  const secret = await getTOTPSecret(userId);
  if (!secret) {
    return false;
  }

  return verifyTOTPCode(secret, code);
}
