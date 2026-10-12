import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, createSession } from '@/lib/auth';
import { hasTOTPEnabled } from '@/lib/totp';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
    }

    // Verify the magic link
    const user = await verifyMagicLink(token);

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=expired-or-invalid', request.url));
    }

    // For applicants: TOTP is always verified (they don't need it)
    // For reviewers: check if they have TOTP enabled
    let totpVerified = user.role === 'applicant';
    let redirectUrl = '/apply';

    if (user.role === 'reviewer') {
      const totpEnabled = await hasTOTPEnabled(user.id);

      if (totpEnabled) {
        // Reviewer has TOTP - create unverified session, redirect to TOTP verification
        totpVerified = false;
        redirectUrl = '/auth/totp-verify';
      } else {
        // Reviewer doesn't have TOTP yet - redirect to enrollment
        totpVerified = false;
        redirectUrl = '/auth/totp-enroll';
      }
    }

    // Create session
    const sessionToken = await createSession(user.id, totpVerified);

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set httpOnly session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Magic link verification error:', error);
    return NextResponse.redirect(new URL('/login?error=verification-failed', request.url));
  }
}
