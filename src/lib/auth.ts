import { createHash, randomBytes } from 'crypto';
import { getPool } from '@/db/connection';

export type UserRole = 'applicant' | 'reviewer';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  user: User;
  totpVerified: boolean;
}

/**
 * Hash a token using SHA-256 for secure storage.
 * We never store raw tokens, only their hashes.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a cryptographically secure random token.
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get or create a user by email.
 * SECURITY: Role is NEVER user-selected. It comes from the existing user record.
 * If the email doesn't exist, we create an applicant-role user.
 * Reviewer accounts must be provisioned server-side (seed script or admin action).
 */
export async function getOrCreateUser(email: string): Promise<User> {
  const pool = getPool();

  // Try to find existing user
  const existingUser = await pool.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    const user = existingUser.rows[0];
    if (!user) {
      throw new Error('User query returned no data');
    }

    // Return existing user with their assigned role
    return user;
  }

  // Create new user with applicant role (never reviewer)
  const result = await pool.query<User>(
    'INSERT INTO users (email, role) VALUES ($1, $2) RETURNING *',
    [email, 'applicant']
  );

  const newUser = result.rows[0];
  if (!newUser) {
    throw new Error('User creation returned no data');
  }

  return newUser;
}

/**
 * Create a magic link token for a user.
 * Returns the raw token (to send via email) and stores the hash.
 * Token expires in 15 minutes.
 */
export async function createMagicLink(userId: number): Promise<string> {
  const pool = getPool();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await pool.query(
    'INSERT INTO magic_links (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  return token;
}

/**
 * Verify a magic link token and mark it as used.
 * Returns the user if valid, null if invalid/expired/already used.
 */
export async function verifyMagicLink(token: string): Promise<User | null> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  const result = await pool.query<{
    id: number;
    user_id: number;
    expires_at: Date;
    used_at: Date | null;
  }>(
    'SELECT * FROM magic_links WHERE token_hash = $1',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const magicLink = result.rows[0];
  if (!magicLink) {
    return null;
  }

  // Check if already used
  if (magicLink.used_at) {
    return null;
  }

  // Check if expired
  if (new Date() > new Date(magicLink.expires_at)) {
    return null;
  }

  // Mark as used
  await pool.query(
    'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
    [magicLink.id]
  );

  // Get the user
  const userResult = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [magicLink.user_id]
  );

  return userResult.rows[0] || null;
}

/**
 * Create a session for a user.
 * Returns the raw session token (to set in cookie) and stores the hash.
 * Session expires in 30 days.
 *
 * For applicants, totpVerified is always true (they don't need TOTP).
 * For reviewers, totpVerified starts as false and must be set to true after TOTP verification.
 */
export async function createSession(userId: number, totpVerified: boolean = false): Promise<string> {
  const pool = getPool();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await pool.query(
    'INSERT INTO sessions (user_id, session_token_hash, expires_at, totp_verified) VALUES ($1, $2, $3, $4)',
    [userId, tokenHash, expiresAt, totpVerified]
  );

  return token;
}

/**
 * Verify a session token and return the session (user + TOTP verification status) if valid.
 * Returns null if invalid or expired.
 */
export async function verifySession(token: string): Promise<Session | null> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  const result = await pool.query<{
    user_id: number;
    expires_at: Date;
    totp_verified: boolean;
  }>(
    'SELECT * FROM sessions WHERE session_token_hash = $1',
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const session = result.rows[0];
  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date() > new Date(session.expires_at)) {
    // Clean up expired session
    await pool.query(
      'DELETE FROM sessions WHERE session_token_hash = $1',
      [tokenHash]
    );
    return null;
  }

  // Get the user
  const userResult = await pool.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [session.user_id]
  );

  const user = userResult.rows[0];
  if (!user) {
    return null;
  }

  return {
    user,
    totpVerified: session.totp_verified,
  };
}

/**
 * Mark a session as TOTP-verified.
 * This should only be called after the user successfully verifies a TOTP code.
 */
export async function markSessionTOTPVerified(token: string): Promise<void> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  await pool.query(
    'UPDATE sessions SET totp_verified = true WHERE session_token_hash = $1',
    [tokenHash]
  );
}

/**
 * Delete a session (sign out).
 */
export async function deleteSession(token: string): Promise<void> {
  const pool = getPool();
  const tokenHash = hashToken(token);

  await pool.query(
    'DELETE FROM sessions WHERE session_token_hash = $1',
    [tokenHash]
  );
}
