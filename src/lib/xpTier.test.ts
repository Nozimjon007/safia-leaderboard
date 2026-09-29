import { describe, expect, it } from 'vitest';
import { computeXpTier, lifetimePoints, pointsToNextTier, XP_TIER_THRESHOLDS } from './xpTier';

describe('computeXpTier', () => {
  it('maps points to the right tier at each boundary', () => {
    expect(computeXpTier(0)).toBe('bronze');
    expect(computeXpTier(XP_TIER_THRESHOLDS.silver - 1)).toBe('bronze');
    expect(computeXpTier(XP_TIER_THRESHOLDS.silver)).toBe('silver');
    expect(computeXpTier(XP_TIER_THRESHOLDS.gold)).toBe('gold');
    expect(computeXpTier(XP_TIER_THRESHOLDS.platinum)).toBe('platinum');
    expect(computeXpTier(999999)).toBe('platinum');
  });
});

describe('lifetimePoints', () => {
  it('sums non-null season overalls and skips nulls (never treats a missing season as zero achievement... but as zero contribution)', () => {
    expect(lifetimePoints([80, 90, null, 70])).toBe(240);
  });
  it('is 0 for a member with no completed-season data at all', () => {
    expect(lifetimePoints([null, null])).toBe(0);
  });
});

describe('pointsToNextTier', () => {
  it('returns null once already at the top tier', () => {
    expect(pointsToNextTier(XP_TIER_THRESHOLDS.platinum)).toBeNull();
  });
  it('reports the remaining distance to the next tier', () => {
    const r = pointsToNextTier(XP_TIER_THRESHOLDS.silver);
    expect(r?.tier).toBe('gold');
    expect(r?.remaining).toBe(XP_TIER_THRESHOLDS.gold - XP_TIER_THRESHOLDS.silver);
  });
});
