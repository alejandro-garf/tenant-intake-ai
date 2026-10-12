import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import * as dbConnection from '@/db/connection';
import * as getCurrentUser from '@/lib/get-current-user';
import type { ApplicationDraft } from '@/app/apply/types';

// Mock dependencies
vi.mock('@/db/connection');
vi.mock('@/lib/get-current-user');

describe('/api/drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock authenticated applicant session
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
  });

  it('creates a new draft on first save with stable IDs', async () => {
    const mockPropertyId = 'property-123';
    const mockApplicationId = 42;
    const mockMemberId = 100;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query (none found)
      .mockResolvedValueOnce([])
      // Mock application insert
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Mock existing members query (empty on first save)
      .mockResolvedValueOnce([])
      // Mock household member insert
      .mockResolvedValueOnce([{ id: mockMemberId }])
      // Mock existing income sources query (empty)
      .mockResolvedValueOnce([])
      // Mock income source insert (no RETURNING)
      .mockResolvedValueOnce([])
      // Mock existing assets query (empty)
      .mockResolvedValueOnce([])
      // Mock asset insert (no RETURNING)
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
      ],
      incomeSources: [
        {
          id: 'income-uuid-1',
          householdMemberId: 'member-uuid-1',
          sourceType: 'employment',
          employerPayerName: 'Acme Corp',
          amount: 3000,
          frequency: 'monthly',
        },
      ],
      assets: [
        {
          id: 'asset-uuid-1',
          householdMemberId: 'member-uuid-1',
          assetType: 'checking',
          cashValue: 5000,
          annualIncome: 10,
        },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockApplicationId);
    expect(data.message).toBe('Draft created');

    // Verify the INSERT query included stable_id
    const memberInsert = vi.mocked(dbConnection.query).mock.calls.find(
      (call) => call[0]?.includes('INSERT INTO household_members')
    );
    expect(memberInsert).toBeDefined();
    expect(memberInsert?.[1]).toContain('member-uuid-1'); // stable_id is passed

    const incomeInsert = vi.mocked(dbConnection.query).mock.calls.find(
      (call) => call[0]?.includes('INSERT INTO income_sources')
    );
    expect(incomeInsert).toBeDefined();
    expect(incomeInsert?.[1]).toContain('income-uuid-1'); // stable_id is passed

    const assetInsert = vi.mocked(dbConnection.query).mock.calls.find(
      (call) => call[0]?.includes('INSERT INTO assets')
    );
    expect(assetInsert).toBeDefined();
    expect(assetInsert?.[1]).toContain('asset-uuid-1'); // stable_id is passed
  });

  it('saving draft twice with no changes results in zero DELETEs and zero INSERTs', async () => {
    const mockPropertyId = 'property-123';
    const existingDraftId = 42;
    const existingMemberId = 100;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query (found!)
      .mockResolvedValueOnce([{ id: existingDraftId }])
      // Mock UPDATE applications
      .mockResolvedValueOnce([])
      // Mock existing members query (returns existing member with stable_id)
      .mockResolvedValueOnce([{ id: existingMemberId, stable_id: 'member-uuid-1' }])
      // Mock UPDATE household_members (existing member)
      .mockResolvedValueOnce([])
      // Mock existing income sources query
      .mockResolvedValueOnce([{ id: 200, household_member_id: existingMemberId, stable_id: 'income-uuid-1' }])
      // Mock UPDATE income_sources
      .mockResolvedValueOnce([])
      // Mock existing assets query
      .mockResolvedValueOnce([{ id: 300, household_member_id: existingMemberId, stable_id: 'asset-uuid-1' }])
      // Mock UPDATE assets
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
      ],
      incomeSources: [
        {
          id: 'income-uuid-1',
          householdMemberId: 'member-uuid-1',
          sourceType: 'employment',
          employerPayerName: 'Acme Corp',
          amount: 3000,
          frequency: 'monthly',
        },
      ],
      assets: [
        {
          id: 'asset-uuid-1',
          householdMemberId: 'member-uuid-1',
          assetType: 'checking',
          cashValue: 5000,
          annualIncome: 10,
        },
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(existingDraftId);
    expect(data.message).toBe('Draft updated');

    // Verify NO DELETE calls
    const deleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE')
    );
    expect(deleteCalls.length).toBe(0);

    // Verify NO INSERT calls (only UPDATEs)
    const insertCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('INSERT INTO household_members') ||
               call[0]?.includes('INSERT INTO income_sources') ||
               call[0]?.includes('INSERT INTO assets')
    );
    expect(insertCalls.length).toBe(0);

    // Verify UPDATE calls were made
    const updateCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('UPDATE household_members') ||
               call[0]?.includes('UPDATE income_sources') ||
               call[0]?.includes('UPDATE assets')
    );
    expect(updateCalls.length).toBe(3); // One for each entity type
  });

  it('editing one member\'s name updates only that row and leaves others\' IDs unchanged', async () => {
    const mockPropertyId = 'property-123';
    const existingDraftId = 42;
    const member1Id = 100;
    const member2Id = 101;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: existingDraftId }])
      // Mock UPDATE applications
      .mockResolvedValueOnce([])
      // Mock existing members query (two members)
      .mockResolvedValueOnce([
        { id: member1Id, stable_id: 'member-uuid-1' },
        { id: member2Id, stable_id: 'member-uuid-2' }
      ])
      // Mock UPDATE for member 1 (name changed)
      .mockResolvedValueOnce([])
      // Mock UPDATE for member 2 (no changes)
      .mockResolvedValueOnce([])
      // Mock existing income sources query (empty)
      .mockResolvedValueOnce([])
      // Mock existing assets query (empty)
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'Jane Doe', // Changed from John to Jane
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
        {
          id: 'member-uuid-2',
          name: 'Bob Smith', // Unchanged
          dateOfBirth: '1985-05-15',
          relationship: 'spouse',
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify both members were UPDATEd (not deleted and recreated)
    const updateCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('UPDATE household_members')
    );
    expect(updateCalls.length).toBe(2);

    // Verify first member UPDATE has new name
    expect(updateCalls[0]?.[1]).toContain('Jane Doe');
    expect(updateCalls[0]?.[1]).toContain(member1Id); // Same DB ID

    // Verify second member UPDATE has original name
    expect(updateCalls[1]?.[1]).toContain('Bob Smith');
    expect(updateCalls[1]?.[1]).toContain(member2Id); // Same DB ID

    // Verify NO DELETE calls for members
    const deleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM household_members')
    );
    expect(deleteCalls.length).toBe(0);
  });

  it('removing one member deletes only that row', async () => {
    const mockPropertyId = 'property-123';
    const existingDraftId = 42;
    const member1Id = 100;
    const member2Id = 101;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: existingDraftId }])
      // Mock UPDATE applications
      .mockResolvedValueOnce([])
      // Mock existing members query (two members)
      .mockResolvedValueOnce([
        { id: member1Id, stable_id: 'member-uuid-1' },
        { id: member2Id, stable_id: 'member-uuid-2' }
      ])
      // Mock UPDATE for member 1 (still exists)
      .mockResolvedValueOnce([])
      // Mock DELETE for member 2 (removed)
      .mockResolvedValueOnce([])
      // Mock existing income sources query (empty)
      .mockResolvedValueOnce([])
      // Mock existing assets query (empty)
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
        // member-uuid-2 removed
      ],
      incomeSources: [],
      assets: [],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify UPDATE for remaining member
    const updateCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('UPDATE household_members')
    );
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0]?.[1]).toContain(member1Id);

    // Verify DELETE for removed member
    const deleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM household_members')
    );
    expect(deleteCalls.length).toBe(1);
    expect(deleteCalls[0]?.[1]).toEqual([member2Id]); // Only member 2 deleted
  });

  it('removing member also removes associated income sources and assets (cascade)', async () => {
    const mockPropertyId = 'property-123';
    const existingDraftId = 42;
    const member1Id = 100;
    const member2Id = 101;
    const income1Id = 200;
    const income2Id = 201;
    const asset1Id = 300;
    const asset2Id = 301;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: existingDraftId }])
      // Mock UPDATE applications
      .mockResolvedValueOnce([])
      // Mock existing members query (two members)
      .mockResolvedValueOnce([
        { id: member1Id, stable_id: 'member-uuid-1' },
        { id: member2Id, stable_id: 'member-uuid-2' }
      ])
      // Mock UPDATE for member 1 (still exists)
      .mockResolvedValueOnce([])
      // Mock DELETE for member 2 (removed)
      .mockResolvedValueOnce([])
      // Mock existing income sources query (member 1 has income-1, member 2 has income-2)
      .mockResolvedValueOnce([
        { id: income1Id, household_member_id: member1Id, stable_id: 'income-uuid-1' },
        { id: income2Id, household_member_id: member2Id, stable_id: 'income-uuid-2' }
      ])
      // Mock UPDATE for income 1 (still exists, member 1 still exists)
      .mockResolvedValueOnce([])
      // Mock DELETE for income 2 (member 2 was removed, so this is also removed)
      .mockResolvedValueOnce([])
      // Mock existing assets query (member 1 has asset-1, member 2 has asset-2)
      .mockResolvedValueOnce([
        { id: asset1Id, household_member_id: member1Id, stable_id: 'asset-uuid-1' },
        { id: asset2Id, household_member_id: member2Id, stable_id: 'asset-uuid-2' }
      ])
      // Mock UPDATE for asset 1 (still exists, member 1 still exists)
      .mockResolvedValueOnce([])
      // Mock DELETE for asset 2 (member 2 was removed, so this is also removed)
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'John Doe',
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
        // member-uuid-2 removed (cascade delete income and assets)
      ],
      incomeSources: [
        {
          id: 'income-uuid-1',
          householdMemberId: 'member-uuid-1',
          sourceType: 'employment',
          amount: 3000,
          frequency: 'monthly',
        },
        // income-uuid-2 removed (belonged to member-uuid-2)
      ],
      assets: [
        {
          id: 'asset-uuid-1',
          householdMemberId: 'member-uuid-1',
          assetType: 'checking',
          cashValue: 5000,
          annualIncome: 10,
        },
        // asset-uuid-2 removed (belonged to member-uuid-2)
      ],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify DELETE for removed member
    const memberDeleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM household_members')
    );
    expect(memberDeleteCalls.length).toBe(1);
    expect(memberDeleteCalls[0]?.[1]).toEqual([member2Id]);

    // Verify DELETE for removed income source (cascade from member)
    const incomeDeleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM income_sources')
    );
    expect(incomeDeleteCalls.length).toBe(1);
    expect(incomeDeleteCalls[0]?.[1]).toEqual([income2Id]);

    // Verify DELETE for removed asset (cascade from member)
    const assetDeleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM assets')
    );
    expect(assetDeleteCalls.length).toBe(1);
    expect(assetDeleteCalls[0]?.[1]).toEqual([asset2Id]);
  });

  it('document attached to member survives draft save (member ID stable)', async () => {
    const mockPropertyId = 'property-123';
    const existingDraftId = 42;
    const existingMemberId = 100;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query (found!)
      .mockResolvedValueOnce([{ id: existingDraftId }])
      // Mock UPDATE applications
      .mockResolvedValueOnce([])
      // Mock existing members query (returns existing member with stable_id)
      .mockResolvedValueOnce([{ id: existingMemberId, stable_id: 'member-uuid-1' }])
      // Mock UPDATE household_members (member still has same DB ID)
      .mockResolvedValueOnce([])
      // Mock existing income sources query (empty)
      .mockResolvedValueOnce([])
      // Mock existing assets query (empty)
      .mockResolvedValueOnce([]);

    const draftData: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'John Doe Updated', // Name changed, but member still exists
          dateOfBirth: '1990-01-01',
          relationship: 'head',
          isFullTimeStudent: false,
          ssnLast4: '1234',
        },
      ],
      incomeSources: [],
      assets: [],
    };

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify member was UPDATEd (not deleted)
    const updateCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('UPDATE household_members')
    );
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0]?.[1]).toContain(existingMemberId); // SAME DB ID

    // Verify NO DELETE for this member (documents referencing this ID survive)
    const deleteCalls = vi.mocked(dbConnection.query).mock.calls.filter(
      (call) => call[0]?.includes('DELETE FROM household_members')
    );
    expect(deleteCalls.length).toBe(0);

    // Key assertion: The household_member.id (100) remains unchanged,
    // so any documents.household_member_id = 100 foreign key references survive.
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ household: [], incomeSources: [], assets: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 500 when no property is found', async () => {
    // Mock property query returning empty
    vi.mocked(dbConnection.query).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify({ household: [], incomeSources: [], assets: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('No property found');
  });

  it('GET /api/drafts returns empty draft when none exists', async () => {
    const mockPropertyId = 'property-123';

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query (none found)
      .mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      household: [],
      incomeSources: [],
      assets: [],
    });
  });

  it('GET /api/drafts returns saved draft with household, income, and assets', async () => {
    const mockPropertyId = 'property-123';
    const mockApplicationId = 42;

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Mock household members query
      .mockResolvedValueOnce([
        {
          stable_id: 'member-uuid-1',
          name: 'John Doe',
          date_of_birth: '1990-01-01',
          relationship: 'head',
          is_full_time_student: false,
          student_exemption_type: null,
          ssn_last_4: '1234',
        },
      ])
      // Mock income sources query
      .mockResolvedValueOnce([
        {
          stable_id: 'income-uuid-1',
          member_stable_id: 'member-uuid-1',
          source_type: 'employment',
          employer_payer_name: 'Acme Corp',
          amount: 3000,
          frequency: 'monthly',
        },
      ])
      // Mock assets query
      .mockResolvedValueOnce([
        {
          stable_id: 'asset-uuid-1',
          member_stable_id: 'member-uuid-1',
          asset_type: 'checking',
          cash_value: 5000,
          annual_income: 10,
        },
      ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockApplicationId);
    expect(data.household).toHaveLength(1);
    expect(data.household[0]).toEqual({
      id: 'member-uuid-1',
      name: 'John Doe',
      dateOfBirth: '1990-01-01',
      relationship: 'head',
      isFullTimeStudent: false,
      ssnLast4: '1234',
    });
    expect(data.incomeSources).toHaveLength(1);
    expect(data.incomeSources[0]).toEqual({
      id: 'income-uuid-1',
      householdMemberId: 'member-uuid-1',
      sourceType: 'employment',
      employerPayerName: 'Acme Corp',
      amount: 3000,
      frequency: 'monthly',
    });
    expect(data.assets).toHaveLength(1);
    expect(data.assets[0]).toEqual({
      id: 'asset-uuid-1',
      householdMemberId: 'member-uuid-1',
      assetType: 'checking',
      cashValue: 5000,
      annualIncome: 10,
    });
  });

  it('roundtrip: saving a draft then loading it returns the same data with stable_ids', async () => {
    const mockPropertyId = 'property-123';
    const mockApplicationId = 42;
    const mockMemberId = 100;

    const originalDraft: ApplicationDraft = {
      household: [
        {
          id: 'member-uuid-1',
          name: 'Jane Smith',
          dateOfBirth: '1985-05-15',
          relationship: 'applicant',
          isFullTimeStudent: true,
          studentExemptionType: 'single_parent_with_child',
          ssnLast4: '5678',
        },
      ],
      incomeSources: [
        {
          id: 'income-uuid-1',
          householdMemberId: 'member-uuid-1',
          sourceType: 'social_security',
          employerPayerName: 'SSA',
          amount: 1200,
          frequency: 'monthly',
        },
      ],
      assets: [
        {
          id: 'asset-uuid-1',
          householdMemberId: 'member-uuid-1',
          assetType: 'savings',
          cashValue: 15000,
          annualIncome: 50,
        },
      ],
    };

    // SAVE: Mock POST /api/drafts
    vi.mocked(dbConnection.query)
      // Property query
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Existing draft query (none found, creating new)
      .mockResolvedValueOnce([])
      // Application insert
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Existing members query (empty)
      .mockResolvedValueOnce([])
      // Household member insert
      .mockResolvedValueOnce([{ id: mockMemberId }])
      // Existing income sources query (empty)
      .mockResolvedValueOnce([])
      // Income source insert
      .mockResolvedValueOnce([])
      // Existing assets query (empty)
      .mockResolvedValueOnce([])
      // Asset insert
      .mockResolvedValueOnce([]);

    const saveRequest = new NextRequest('http://localhost:3000/api/drafts', {
      method: 'POST',
      body: JSON.stringify(originalDraft),
    });

    const saveResponse = await POST(saveRequest);
    expect(saveResponse.status).toBe(200);

    vi.clearAllMocks();

    // LOAD: Mock GET /api/drafts
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

    vi.mocked(dbConnection.query)
      // Property query
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Existing draft query
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Household members query
      .mockResolvedValueOnce([
        {
          stable_id: 'member-uuid-1',
          name: 'Jane Smith',
          date_of_birth: '1985-05-15',
          relationship: 'applicant',
          is_full_time_student: true,
          student_exemption_type: 'single_parent_with_child',
          ssn_last_4: '5678',
        },
      ])
      // Income sources query
      .mockResolvedValueOnce([
        {
          stable_id: 'income-uuid-1',
          member_stable_id: 'member-uuid-1',
          source_type: 'social_security',
          employer_payer_name: 'SSA',
          amount: 1200,
          frequency: 'monthly',
        },
      ])
      // Assets query
      .mockResolvedValueOnce([
        {
          stable_id: 'asset-uuid-1',
          member_stable_id: 'member-uuid-1',
          asset_type: 'savings',
          cash_value: 15000,
          annual_income: 50,
        },
      ]);

    const loadResponse = await GET();
    const loadedDraft = await loadResponse.json();

    expect(loadResponse.status).toBe(200);

    // Verify roundtrip: loaded draft matches original draft structure
    expect(loadedDraft.household).toEqual(originalDraft.household);
    expect(loadedDraft.incomeSources).toEqual(originalDraft.incomeSources);
    expect(loadedDraft.assets).toEqual(originalDraft.assets);

    // Verify stable_ids are preserved (this is critical for UPSERT logic)
    expect(loadedDraft.household[0]?.id).toBe('member-uuid-1');
    expect(loadedDraft.incomeSources[0]?.id).toBe('income-uuid-1');
    expect(loadedDraft.assets[0]?.id).toBe('asset-uuid-1');
  });

  it('GET /api/drafts normalizes Date objects to YYYY-MM-DD without timezone shift', async () => {
    const mockPropertyId = 'property-123';
    const mockApplicationId = 42;

    // Simulate Postgres returning a Date object for date_of_birth
    // CRITICAL TEST: 1986-05-06 in PST should NOT become 1986-05-05
    const johnDOB = new Date(1986, 4, 6); // May 6, 1986 (month is 0-indexed)

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Mock household members query with Date object
      .mockResolvedValueOnce([
        {
          stable_id: 'member-john',
          name: 'John Smith',
          date_of_birth: johnDOB,
          relationship: 'applicant',
          is_full_time_student: false,
          student_exemption_type: null,
          ssn_last_4: '5678',
        },
      ])
      // Mock empty income sources
      .mockResolvedValueOnce([])
      // Mock empty assets
      .mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.household).toHaveLength(1);
    expect(data.household[0].dateOfBirth).toBe('1986-05-06');
  });

  it('GET /api/drafts normalizes ISO timestamp strings to YYYY-MM-DD', async () => {
    const mockPropertyId = 'property-123';
    const mockApplicationId = 42;

    // Simulate database driver returning ISO timestamp string
    const isoTimestamp = '2002-06-07T07:00:00.000Z';

    // Mock property query
    vi.mocked(dbConnection.query)
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Mock existing draft query
      .mockResolvedValueOnce([{ id: mockApplicationId }])
      // Mock household members query with ISO timestamp
      .mockResolvedValueOnce([
        {
          stable_id: 'member-jane',
          name: 'Jane Doe',
          date_of_birth: isoTimestamp,
          relationship: 'child',
          is_full_time_student: true,
          student_exemption_type: 'single_parent_with_child',
          ssn_last_4: null,
        },
      ])
      // Mock empty income sources
      .mockResolvedValueOnce([])
      // Mock empty assets
      .mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.household).toHaveLength(1);
    // Should normalize to YYYY-MM-DD (exact day depends on local timezone)
    expect(data.household[0].dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("POST /api/drafts - versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock getCurrentSession to return a valid session
    vi.mocked(getCurrentUser.getCurrentSession).mockResolvedValue({
      user: {
        id: 1,
        email: "applicant@example.com",
        role: "applicant",
        created_at: new Date(),
        updated_at: new Date(),
      },
      totpVerified: false,
    });
  });

  it("creates version 2 draft after submitting version 1 (no constraint violation)", async () => {
    const mockPropertyId = "property-123";
    const mockApplicationIdV2 = 99;

    const draft = {
      household: [
        {
          id: "member-1",
          name: "Jane Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    // Simulate: applicant already has a submitted v1 application
    // POST /api/drafts should create a new draft with version 2

    // Mock queries in sequence
    vi.mocked(dbConnection.query)
      // Property query
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Check for existing draft - none exists (v1 is submitted, not draft)
      .mockResolvedValueOnce([])
      // INSERT new draft with version = MAX(version) + 1
      // Simulates: MAX(version) = 1 (from submitted v1), so new version = 2
      .mockResolvedValueOnce([{ id: mockApplicationIdV2 }])
      // Get existing members (empty for new draft)
      .mockResolvedValueOnce([])
      // Insert household member
      .mockResolvedValueOnce([{ id: 100 }])
      // Get existing income sources (empty)
      .mockResolvedValueOnce([])
      // Get existing assets (empty)
      .mockResolvedValueOnce([]);

    const request = new Request("http://localhost/api/drafts", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(mockApplicationIdV2);
    expect(data.message).toBe("Draft created");

    // Verify INSERT query was called with subquery for version
    const insertCall = vi.mocked(dbConnection.query).mock.calls.find(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("INSERT INTO applications") &&
        call[0].includes("MAX(version)")
    );

    expect(insertCall).toBeDefined();
    expect(insertCall?.[0]).toContain("COALESCE");
    expect(insertCall?.[0]).toContain("SELECT MAX(version) FROM applications");
  });

  it("returns 409 on version constraint violation with clear message", async () => {
    const mockPropertyId = "property-123";

    const draft = {
      household: [
        {
          id: "member-1",
          name: "Jane Doe",
          dateOfBirth: "1990-01-01",
          relationship: "applicant",
          isFullTimeStudent: false,
        },
      ],
      incomeSources: [],
      assets: [],
    };

    // Mock queries in sequence
    vi.mocked(dbConnection.query)
      // Property query
      .mockResolvedValueOnce([{ id: mockPropertyId }])
      // Check for existing draft
      .mockResolvedValueOnce([])
      // INSERT fails with unique constraint violation
      .mockRejectedValueOnce(
        new Error(
          'duplicate key value violates unique constraint "applications_property_id_applicant_email_version_key"'
        )
      );

    const request = new Request("http://localhost/api/drafts", {
      method: "POST",
      body: JSON.stringify(draft),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain("Version conflict");
    expect(data.error).toContain("Please refresh and try again");
  });
});
