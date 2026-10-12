import { cookies } from 'next/headers';
import { verifySession, type Session } from './auth';

/**
 * Get the current authenticated session from the session cookie.
 * This is a server-side only function for use in Server Components and API routes.
 * Returns null if not authenticated.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;

  if (!sessionToken) {
    return null;
  }

  return verifySession(sessionToken);
}
