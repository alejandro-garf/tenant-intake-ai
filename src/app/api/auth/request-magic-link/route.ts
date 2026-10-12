import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, createMagicLink } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    // Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Get or create user (role determined server-side)
    const user = await getOrCreateUser(email);

    // Create magic link token
    const token = await createMagicLink(user.id);

    // Build magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/api/auth/verify?token=${token}`;

    // Send email - this may throw if sending fails
    try {
      await sendEmail({
        to: email,
        subject: 'Sign in to Tenant Portal',
        html: `
          <h1>Sign in to Tenant Portal</h1>
          <p>Click the link below to sign in. This link will expire in 15 minutes.</p>
          <p><a href="${magicLinkUrl}">Sign in to Tenant Portal</a></p>
          <p>If you didn't request this email, you can safely ignore it.</p>
        `,
      });
    } catch (emailError) {
      // Log full error server-side (without token or URL)
      console.error('Failed to send magic link email:', {
        error: emailError instanceof Error ? emailError.message : String(emailError),
        to: email,
      });

      // Local development only: when the email provider cannot deliver
      // (for example, a provider in test mode that only sends to one address),
      // print the sign-in link to the server terminal so any address can be
      // used on localhost. Never active in test or production.
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n[dev] Magic link for ${email}:\n${magicLinkUrl}\n`);
        return NextResponse.json({
          message: 'Magic link sent to your email',
          devHint: 'Email delivery failed; the sign-in link was printed in the server terminal.',
        });
      }

      // Return generic error to client
      return NextResponse.json(
        { error: 'Could not send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Magic link sent to your email',
    });
  } catch (error) {
    // Log other errors (user creation, token generation, etc.)
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
