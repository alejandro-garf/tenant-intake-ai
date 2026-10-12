import { describe, it, expect } from 'vitest';
import { detectOverflow, getOverflowEntries, getFittingEntries } from './overflow';

describe('TIC Form Overflow Detection', () => {
  it('detects no overflow when within limits', () => {
    const result = detectOverflow({
      householdMemberCount: 5,
      incomeSourceCount: 3,
      assetCount: 2,
    });

    expect(result.hasOverflow).toBe(false);
    expect(result.conditions).toHaveLength(0);
  });

  it('detects household member overflow', () => {
    const result = detectOverflow({
      householdMemberCount: 9,
      incomeSourceCount: 3,
      assetCount: 2,
    });

    expect(result.hasOverflow).toBe(true);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual({
      section: 'household',
      limit: 7,
      actual: 9,
      overflow: 2,
      message:
        'Household has 9 members, but TIC form supports only 7. 2 member(s) not included in PDF. Attach additional sheet with remaining members.',
    });
  });

  it('detects income source overflow (7 sources, limit 5)', () => {
    const result = detectOverflow({
      householdMemberCount: 4,
      incomeSourceCount: 7,
      assetCount: 2,
    });

    expect(result.hasOverflow).toBe(true);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual({
      section: 'income',
      limit: 5,
      actual: 7,
      overflow: 2,
      message:
        'Application has 7 income sources, but TIC form supports only 5. 2 income source(s) not included in PDF. Attach additional sheet with remaining income sources.',
    });
  });

  it('detects asset overflow (7 assets, limit 5)', () => {
    const result = detectOverflow({
      householdMemberCount: 4,
      incomeSourceCount: 3,
      assetCount: 7,
    });

    expect(result.hasOverflow).toBe(true);
    expect(result.conditions).toHaveLength(1);
    expect(result.conditions[0]).toEqual({
      section: 'assets',
      limit: 5,
      actual: 7,
      overflow: 2,
      message:
        'Application has 7 assets, but TIC form supports only 5. 2 asset(s) not included in PDF. Attach additional sheet with remaining assets.',
    });
  });

  it('detects multiple overflow conditions simultaneously', () => {
    const result = detectOverflow({
      householdMemberCount: 8,
      incomeSourceCount: 7,
      assetCount: 6,
    });

    expect(result.hasOverflow).toBe(true);
    expect(result.conditions).toHaveLength(3);

    const sections = result.conditions.map((c) => c.section);
    expect(sections).toContain('household');
    expect(sections).toContain('income');
    expect(sections).toContain('assets');
  });

  it('returns overflow entries beyond limit', () => {
    const entries = [
      { id: 1, name: 'Source 1' },
      { id: 2, name: 'Source 2' },
      { id: 3, name: 'Source 3' },
      { id: 4, name: 'Source 4' },
      { id: 5, name: 'Source 5' },
      { id: 6, name: 'Source 6' },
      { id: 7, name: 'Source 7' },
    ];

    const overflow = getOverflowEntries(entries, 5);

    expect(overflow).toHaveLength(2);
    expect(overflow[0]?.id).toBe(6);
    expect(overflow[1]?.id).toBe(7);
  });

  it('returns empty array when no overflow', () => {
    const entries = [
      { id: 1, name: 'Source 1' },
      { id: 2, name: 'Source 2' },
      { id: 3, name: 'Source 3' },
    ];

    const overflow = getOverflowEntries(entries, 5);

    expect(overflow).toHaveLength(0);
  });

  it('returns fitting entries within limit', () => {
    const entries = [
      { id: 1, name: 'Source 1' },
      { id: 2, name: 'Source 2' },
      { id: 3, name: 'Source 3' },
      { id: 4, name: 'Source 4' },
      { id: 5, name: 'Source 5' },
      { id: 6, name: 'Source 6' },
      { id: 7, name: 'Source 7' },
    ];

    const fitting = getFittingEntries(entries, 5);

    expect(fitting).toHaveLength(5);
    expect(fitting[0]?.id).toBe(1);
    expect(fitting[4]?.id).toBe(5);
  });

  it('returns all entries when within limit', () => {
    const entries = [
      { id: 1, name: 'Source 1' },
      { id: 2, name: 'Source 2' },
      { id: 3, name: 'Source 3' },
    ];

    const fitting = getFittingEntries(entries, 5);

    expect(fitting).toHaveLength(3);
    expect(fitting).toEqual(entries);
  });
});
