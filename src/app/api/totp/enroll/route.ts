import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/get-current-user';
import { verifyTOTPCode, saveTOTPSecret } from '@/lib/totp';
import { markSessionTOTPVerified } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Verify and save a TOTP secret during enrollment.
 * User provides the secret they received from /generate and a code from their authenticator.
 * If the code is valid, we save the secret and mark their session as TOTP-verified.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Only reviewers can enroll in TOTP
    if (user.role !== 'reviewer') {
      return NextResponse.json({ error: 'TOTP is only required for reviewers' }, { status: 403 });
    }

    const body = await request.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json({ error: 'Secret and code are required' }, { status: 400 });
    }

    // Verify the code
    const isValid = verifyTOTPCode(secret, code);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Save the secret (encrypted)
    await saveTOTPSecret(user.id, secret);

    // Mark the session as TOTP-verified
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      await markSessionTOTPVerified(sessionToken);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TOTP enrollment error:', error);
    return NextResponse.json({ error: 'Failed to enroll TOTP' }, { status: 500 });
  }
}
