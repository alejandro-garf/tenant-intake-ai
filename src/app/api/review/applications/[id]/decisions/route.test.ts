import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as dbConnection from '@/db/connection';
import * as getCurrentUser from '@/lib/get-current-user';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/db/connection');
vi.mock('@/lib/get-current-user');

describe('/api/review/applications/[id]/decisions GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated reviewer session with TOTP
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'reviewer@example.com',
        role: 'reviewer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: true,
    });
  });

  it('returns 200 with decisions when authenticated as reviewer', async () => {
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        application_id: 99,
        reviewer_email: 'reviewer@example.com',
        decision: 'approved',
        notes: 'All verified',
        decided_at: '2024-01-01T00:00:00Z',
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/review/applications/99/decisions');
    const params = Promise.resolve({ id: '99' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]?.decision).toBe('approved');
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/review/applications/99/decisions');
    const params = Promise.resolve({ id: '99' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not a reviewer', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'applicant@example.com',
        role: 'applicant',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: true,
    });

    const request = new NextRequest('http://localhost:3000/api/review/applications/99/decisions');
    const params = Promise.resolve({ id: '99' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 403 when TOTP is not verified', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'reviewer@example.com',
        role: 'reviewer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    const request = new NextRequest('http://localhost:3000/api/review/applications/99/decisions');
    const params = Promise.resolve({ id: '99' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('TOTP verification required');
  });

  it('returns 400 when application ID is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/review/applications/abc/decisions');
    const params = Promise.resolve({ id: 'abc' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid application ID');
  });
});
