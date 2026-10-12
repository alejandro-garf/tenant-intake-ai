import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/get-current-user';
import { generateTOTPSecret } from '@/lib/totp';

/**
 * Generate a new TOTP secret for the current user.
 * Returns the secret and QR code for enrollment.
 * The secret is NOT saved yet - user must verify a code first.
 */
export async function POST() {
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

    const { secret, qrCodeDataURL } = await generateTOTPSecret(user.id, user.email);

    return NextResponse.json({
      secret,
      qrCodeDataURL,
    });
  } catch (error) {
    console.error('TOTP generation error:', error);
    return NextResponse.json({ error: 'Failed to generate TOTP secret' }, { status: 500 });
  }
}
