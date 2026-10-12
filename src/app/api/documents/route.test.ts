import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as getCurrentUser from '@/lib/get-current-user';
import * as dbConnection from '@/db/connection';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/get-current-user');
vi.mock('@/db/connection');

describe('/api/documents GET', () => {
  const mockPool = {
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dbConnection.getPool).mockReturnValue(mockPool as any);
  });

  it('returns 200 with documents for applicant viewing their own application', async () => {
    // Mock applicant session
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'applicant@example.com',
        role: 'applicant',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    // Mock application check - applicant owns this application
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          applicant_email: 'applicant@example.com',
          status: 'draft',
        },
      ],
    });

    // Mock documents fetch
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          document_type: 'income_verification',
          original_filename: 'paystub.pdf',
          file_size: 12345,
          content_type: 'application/pdf',
          uploaded_at: '2024-01-01T00:00:00Z',
          household_member_id: null,
          income_source_id: null,
          uploaded_by_email: 'applicant@example.com',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documents).toHaveLength(1);
    expect(data.documents[0]?.filename).toBe('paystub.pdf');
  });

  it('returns 403 when applicant tries to view another applicant\'s documents', async () => {
    // Mock applicant session
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'applicant@example.com',
        role: 'applicant',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    // Mock application check - different applicant owns this application
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          applicant_email: 'otherapplicant@example.com',
          status: 'draft',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('You can only view documents on your own applications');
  });

  it('returns 200 for reviewer with TOTP verification', async () => {
    // Mock reviewer session with TOTP
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 2,
        email: 'reviewer@example.com',
        role: 'reviewer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: true,
    });

    // Mock application check
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          applicant_email: 'applicant@example.com',
          status: 'submitted',
        },
      ],
    });

    // Mock documents fetch
    mockPool.query.mockResolvedValueOnce({
      rows: [],
    });

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=1');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('returns 403 when reviewer has not verified TOTP', async () => {
    // Mock reviewer session without TOTP
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 2,
        email: 'reviewer@example.com',
        role: 'reviewer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    // Mock application check
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          applicant_email: 'applicant@example.com',
          status: 'submitted',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('TOTP verification required for reviewers');
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('returns 400 when applicationId is missing', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'applicant@example.com',
        role: 'applicant',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    const request = new NextRequest('http://localhost:3000/api/documents');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('applicationId query parameter is required');
  });

  it('returns 404 when application is not found', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: 'applicant@example.com',
        role: 'applicant',
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });

    // Mock application not found
    mockPool.query.mockResolvedValueOnce({
      rows: [],
    });

    const request = new NextRequest('http://localhost:3000/api/documents?applicationId=999');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Application not found');
  });
});
