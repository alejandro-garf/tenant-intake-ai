import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    // Create response
    const response = NextResponse.json({ message: 'Signed out successfully' });

    // Clear session cookie
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
}
