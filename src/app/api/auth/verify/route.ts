import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, createSession } from '@/lib/auth';

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

    // Sign-in is the magic link alone, for every role.
    // The session is created fully verified so reviewer routes open directly.
    const redirectUrl = user.role === 'reviewer' ? '/review' : '/apply';
    const sessionToken = await createSession(user.id, true);

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
