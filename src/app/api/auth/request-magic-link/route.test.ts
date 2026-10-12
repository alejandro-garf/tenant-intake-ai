import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import * as authLib from '@/lib/auth';
import * as emailLib from '@/lib/email';

// Mock the auth and email libraries
vi.mock('@/lib/auth');
vi.mock('@/lib/email');

describe('/api/auth/request-magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when email sending fails', async () => {
    // Mock successful user creation and token generation
    vi.mocked(authLib.getOrCreateUser).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'applicant',
      created_at: new Date(),
      updated_at: new Date(),
    });

    vi.mocked(authLib.createMagicLink).mockResolvedValue('test-token-123');

    // Mock email sending to fail
    vi.mocked(emailLib.sendEmail).mockRejectedValue(
      new Error('Failed to send email: Unverified domain')
    );

    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/auth/request-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // Call the route handler
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(500);
    expect(data.error).toBe('Could not send email. Please try again.');

    // Verify sendEmail was called
    expect(emailLib.sendEmail).toHaveBeenCalledOnce();
  });

  it('returns 200 when email sending succeeds', async () => {
    // Mock successful user creation and token generation
    vi.mocked(authLib.getOrCreateUser).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'applicant',
      created_at: new Date(),
      updated_at: new Date(),
    });

    vi.mocked(authLib.createMagicLink).mockResolvedValue('test-token-123');

    // Mock email sending to succeed
    vi.mocked(emailLib.sendEmail).mockResolvedValue(undefined);

    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/auth/request-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // Call the route handler
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(data.message).toBe('Magic link sent to your email');

    // Verify sendEmail was called
    expect(emailLib.sendEmail).toHaveBeenCalledOnce();
  });

  it('returns 400 for invalid email', async () => {
    // Create a mock request with invalid email
    const request = new NextRequest('http://localhost:3000/api/auth/request-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    // Call the route handler
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(400);
    expect(data.error).toBe('Valid email is required');

    // Verify sendEmail was not called
    expect(emailLib.sendEmail).not.toHaveBeenCalled();
  });

  it('returns 500 when user creation fails', async () => {
    // Mock user creation to fail
    vi.mocked(authLib.getOrCreateUser).mockRejectedValue(
      new Error('Database connection failed')
    );

    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/auth/request-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // Call the route handler
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process request');

    // Verify sendEmail was not called
    expect(emailLib.sendEmail).not.toHaveBeenCalled();
  });
});
