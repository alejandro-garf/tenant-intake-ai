import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/get-current-user';
import { verifyUserTOTPCode } from '@/lib/totp';
import { markSessionTOTPVerified } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Verify a TOTP code for an already-enrolled user.
 * This is used during login to complete the second factor.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Only reviewers need TOTP
    if (user.role !== 'reviewer') {
      return NextResponse.json({ error: 'TOTP is only required for reviewers' }, { status: 403 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Verify the code
    const isValid = await verifyUserTOTPCode(user.id, code);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Mark the session as TOTP-verified
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      await markSessionTOTPVerified(sessionToken);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return NextResponse.json({ error: 'Failed to verify TOTP' }, { status: 500 });
  }
}
