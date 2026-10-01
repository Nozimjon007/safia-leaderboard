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

  // Safia League ranks team leaders only (a mentor scope correction, see demoData.ts's module docs) —
  // one per site per shift, not padded to any round number, so this checks the real derived count
  // (nine sites x two shifts = 18) instead of asserting a minimum that no longer applies.
  it('has exactly one team leader per site per shift, every member a real leader with a shift', () => {
    expect(dataset.members.length).toBe(18);
    const seen = new Set<string>();
    for (const m of dataset.members) {
      expect(m.role).toBe('Team Leader');
      expect(['S1', 'S2']).toContain(m.shift);
      const slot = `${m.area}|${m.shift}`;
      expect(seen.has(slot)).toBe(false); // exactly one leader per site/shift slot
      seen.add(slot);
    }
  });

  it('keeps the two hand-authored leaders intact, by id, alongside the generated roster', () => {
    const ids = new Set(dataset.members.map((m) => m.id));
    expect(ids.has('otabek')).toBe(true);
    expect(ids.has('nodira')).toBe(true);
  });

  it('has no duplicate member ids or names across the full roster', () => {
    const ids = dataset.members.map((m) => m.id);
    const names = dataset.members.map((m) => m.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every member a null photo, including the two hand-authored leaders — the UI initials-fallback, never a photo', () => {
    expect(dataset.members.length).toBeGreaterThan(0);
    for (const m of dataset.members) {
      expect(m.avatarPhoto).toBeNull();
      expect(m.fullBodyPhoto).toBeNull();
    }
  });

  it('generates the exact same roster and scores on every call — deterministic, no reshuffling on refresh', () => {
    const again = buildDemoDataset();
    expect(again.members.map((m) => m.id)).toEqual(dataset.members.map((m) => m.id));
    expect(again.members.map((m) => m.name)).toEqual(dataset.members.map((m) => m.name));
    expect(again.scores.lead005).toEqual(dataset.scores.lead005);
    expect(again.scores.otabek).toEqual(dataset.scores.otabek);
  });

  it('gives every leader a same-role comparison partner (everyone shares the one Team Leader role)', () => {
    const roles = new Set(dataset.members.map((m) => m.role));
    expect(roles.size).toBe(1);
    expect(dataset.members.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the deliberate "no data at all" member null in every category and week', () => {
    const brandNew = dataset.scores.lead001;
    for (const c of CATEGORY_KEYS) {
      expect(brandNew[c].every((v) => v == null)).toBe(true);
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
