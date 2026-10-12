import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import * as dbConnection from '@/db/connection';
import * as getCurrentUser from '@/lib/get-current-user';

// Mock dependencies
vi.mock('@/db/connection');
vi.mock('@/lib/get-current-user');

describe('/api/review/queue', () => {
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

  it('returns 200 with properly formatted JSONB failure_reasons (modern data)', async () => {
    // Mock query to return JSONB data as array (how pg returns it)
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        applicant_email: 'test@example.com',
        applicant_name: 'Test User',
        submitted_at: '2024-01-01T00:00:00Z',
        household_size: 3,
        screening_passed: false,
        screening_failure_reasons: ['Gross income $78,025 exceeds cap of $50,000'], // JSONB returns as array
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]?.screeningFailureReasons).toEqual([
      'Gross income $78,025 exceeds cap of $50,000',
    ]);
    expect(data[0]?.screeningFailureCount).toBe(1);
  });

  it('returns 200 and gracefully handles legacy plain string failure_reasons', async () => {
    // Mock query to return plain string (legacy bad data)
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        applicant_email: 'test@example.com',
        applicant_name: 'Test User',
        submitted_at: '2024-01-01T00:00:00Z',
        household_size: 3,
        screening_passed: false,
        screening_failure_reasons: 'Gross income exceeds cap', // Plain string, not JSON
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    // Should wrap plain string in array
    expect(data[0]?.screeningFailureReasons).toEqual(['Gross income exceeds cap']);
    expect(data[0]?.screeningFailureCount).toBe(1);
  });

  it('returns 200 and gracefully handles JSON string failure_reasons (legacy)', async () => {
    // Mock query to return JSON string (what would happen with old JSON.stringify)
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        applicant_email: 'test@example.com',
        applicant_name: 'Test User',
        submitted_at: '2024-01-01T00:00:00Z',
        household_size: 3,
        screening_passed: false,
        screening_failure_reasons: '["Income too high", "Asset threshold exceeded"]', // JSON string
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    // Should parse JSON string into array
    expect(data[0]?.screeningFailureReasons).toEqual([
      'Income too high',
      'Asset threshold exceeded',
    ]);
    expect(data[0]?.screeningFailureCount).toBe(2);
  });

  it('returns 200 with null failure_reasons when application passed screening', async () => {
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        applicant_email: 'test@example.com',
        applicant_name: 'Test User',
        submitted_at: '2024-01-01T00:00:00Z',
        household_size: 2,
        screening_passed: true,
        screening_failure_reasons: null,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]?.screeningFailureReasons).toBeNull();
    expect(data[0]?.screeningFailureCount).toBe(0);
  });

  it('returns 200 even when one application has malformed failure_reasons', async () => {
    // Mock query to return multiple applications, one with good data, one malformed
    vi.mocked(dbConnection.query).mockResolvedValue([
      {
        id: 1,
        applicant_email: 'test1@example.com',
        applicant_name: 'Test User 1',
        submitted_at: '2024-01-01T00:00:00Z',
        household_size: 3,
        screening_passed: false,
        screening_failure_reasons: ['Income exceeds cap'], // Good data
      },
      {
        id: 2,
        applicant_email: 'test2@example.com',
        applicant_name: 'Test User 2',
        submitted_at: '2024-01-02T00:00:00Z',
        household_size: 2,
        screening_passed: false,
        screening_failure_reasons: 'Malformed data', // Will be wrapped
      },
    ]);

    const response = await GET();
    const data = await response.json();

    // Should not 500, should return both applications
    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]?.screeningFailureReasons).toEqual(['Income exceeds cap']);
    expect(data[1]?.screeningFailureReasons).toEqual(['Malformed data']);
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue(null);

    const response = await GET();
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

    const response = await GET();
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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('TOTP verification required');
  });
});
