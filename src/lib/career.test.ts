import { describe, expect, it } from 'vitest';
import { careerTimeline, deriveCareerHighlight, tenureBreakdown } from './career';
import type { EarnedAchievement } from '../data/types';

describe('careerTimeline', () => {
  it('is empty when hire date is unknown', () => {
    expect(careerTimeline({ role: 'Baker', dateJoinedISO: null, careerHistory: undefined })).toEqual([]);
  });

  it('synthesizes a single ongoing step when there is no prior history', () => {
    const steps = careerTimeline({ role: 'Baker', dateJoinedISO: '2020-01-01', careerHistory: undefined });
    expect(steps).toEqual([{ role: 'Baker', startISO: '2020-01-01', endISO: null }]);
  });

  it('appends the current role right after the last recorded step', () => {
    const steps = careerTimeline({
      role: 'Shift Lead',
      dateJoinedISO: '2018-11-12',
      careerHistory: [{ role: 'Baker', startISO: '2018-11-12', endISO: '2022-05-31' }],
    });
    expect(steps).toEqual([
      { role: 'Baker', startISO: '2018-11-12', endISO: '2022-05-31' },
      { role: 'Shift Lead', startISO: '2022-06-01', endISO: null },
    ]);
  });

  it('chains multiple promotions in order', () => {
    const steps = careerTimeline({
      role: 'Shift Lead',
      dateJoinedISO: '2017-09-01',
      careerHistory: [
        { role: 'Packer', startISO: '2017-09-01', endISO: '2020-02-29' },
        { role: 'Cashier', startISO: '2020-03-01', endISO: '2022-07-31' },
      ],
    });
    expect(steps.map((s) => s.role)).toEqual(['Packer', 'Cashier', 'Shift Lead']);
    expect(steps[2].startISO).toBe('2022-08-01');
    expect(steps[2].endISO).toBeNull();
  });
});

describe('tenureBreakdown', () => {
  it('computes whole years and months', () => {
    expect(tenureBreakdown('2019-03-04', '2026-09-28')).toEqual({ years: 7, months: 6 });
  });

  it('does not round up when the anniversary day has not arrived yet this month', () => {
    expect(tenureBreakdown('2020-07-20', '2026-07-19')).toEqual({ years: 5, months: 11 });
  });

  it('never goes negative for a same-day hire', () => {
    expect(tenureBreakdown('2026-09-28', '2026-09-28')).toEqual({ years: 0, months: 0 });
  });
});

describe('deriveCareerHighlight', () => {
  const member = { role: 'Baker', dateJoinedISO: '2019-03-04', careerHistory: undefined };

  it('is null with no achievements and no promotion history', () => {
    expect(deriveCareerHighlight(member, [])).toBeNull();
  });

  it('falls back to the most recent promotion when there are no achievements', () => {
    const promoted = {
      role: 'Shift Lead',
      dateJoinedISO: '2018-11-12',
      careerHistory: [{ role: 'Baker' as const, startISO: '2018-11-12', endISO: '2022-05-31' }],
    };
    expect(deriveCareerHighlight(promoted, [])).toEqual({ type: 'promotion', role: 'Shift Lead', dateISO: '2022-06-01' });
  });

  it('prefers the highest-priority earned achievement over a promotion', () => {
    const promoted = {
      role: 'Shift Lead',
      dateJoinedISO: '2018-11-12',
      careerHistory: [{ role: 'Baker' as const, startISO: '2018-11-12', endISO: '2022-05-31' }],
    };
    const earned: EarnedAchievement[] = [{ id: 'podium', seasonId: '2026-q1' }];
    expect(deriveCareerHighlight(promoted, earned)).toEqual({ type: 'achievement', id: 'podium', seasonId: '2026-q1' });
  });

  it('picks champion over podium when both are earned', () => {
    const earned: EarnedAchievement[] = [
      { id: 'podium', seasonId: '2026-q2' },
      { id: 'champion', seasonId: '2026-q1' },
    ];
    expect(deriveCareerHighlight(member, earned)).toEqual({ type: 'achievement', id: 'champion', seasonId: '2026-q1' });
  });

  it('picks the most recent season when the same achievement was earned more than once', () => {
    const earned: EarnedAchievement[] = [
      { id: 'champion', seasonId: '2025-q2' },
      { id: 'champion', seasonId: '2026-q1' },
    ];
    expect(deriveCareerHighlight(member, earned)).toEqual({ type: 'achievement', id: 'champion', seasonId: '2026-q1' });
  });
});
