import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from './demoData';
import { CATEGORY_KEYS } from './types';
import { listSeasons } from '../lib/seasons';
import { mondayOfISO } from '../lib/dates';

describe('buildDemoDataset', () => {
  const dataset = buildDemoDataset();

  it('anchors firstWeekStart to an actual Monday', () => {
    expect(dataset.firstWeekStart).toBe(mondayOfISO(dataset.firstWeekStart));
  });

  it('covers roughly 7 quarters of history (6 past + current)', () => {
    const today = new Date().toISOString().slice(0, 10);
    const seasons = listSeasons(dataset.firstWeekStart, today);
    expect(seasons.length).toBeGreaterThanOrEqual(7);
    expect(seasons.length).toBeLessThanOrEqual(8); // the extra week or two before season 1's Monday can spill into one more quarter
  });

  it('has every score array exactly weekCount long, for every member and category', () => {
    for (const member of dataset.members) {
      for (const c of CATEGORY_KEYS) {
        expect(dataset.scores[member.id][c]).toHaveLength(dataset.weekCount);
      }
    }
  });

  it('has 12 demo members, each with a role and a shift', () => {
    expect(dataset.members).toHaveLength(12);
    for (const m of dataset.members) {
      expect(m.role.length).toBeGreaterThan(0);
      expect(['S1', 'S2']).toContain(m.shift);
    }
  });

  it('spreads members across more than one role (needed for the same-role comparison default)', () => {
    const roles = new Set(dataset.members.map((m) => m.role));
    expect(roles.size).toBeGreaterThan(1);
    for (const role of roles) {
      const count = dataset.members.filter((m) => m.role === role).length;
      expect(count).toBeGreaterThanOrEqual(2); // every role has at least one same-role comparison partner
    }
  });

  it('keeps the deliberate "no data at all" member (aziz) null in every category and week', () => {
    const aziz = dataset.scores.aziz;
    for (const c of CATEGORY_KEYS) {
      expect(aziz[c].every((v) => v == null)).toBe(true);
    }
  });

  it('produces plausible score values (bounded, not NaN) everywhere data exists', () => {
    for (const member of dataset.members) {
      for (const c of CATEGORY_KEYS) {
        for (const v of dataset.scores[member.id][c]) {
          if (v == null) continue;
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(20);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
