import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  formatDateRange,
  formatShortDate,
  mondayOfISO,
  sundayOfISO,
  weekEndISO,
  weekIndexesInRange,
  weekStartISO,
} from './dates';

describe('mondayOfISO / sundayOfISO', () => {
  it('snaps a mid-week date back to its Monday', () => {
    expect(mondayOfISO('2026-06-11')).toBe('2026-06-08'); // Thursday -> Monday
  });
  it('leaves a Monday unchanged', () => {
    expect(mondayOfISO('2026-06-08')).toBe('2026-06-08');
  });
  it('snaps forward to Sunday', () => {
    expect(sundayOfISO('2026-06-08')).toBe('2026-06-14');
  });
});

describe('weekStartISO / weekEndISO', () => {
  it('computes the Monday and Sunday of the nth week from an origin Monday', () => {
    expect(weekStartISO('2026-06-08', 2)).toBe('2026-06-22');
    expect(weekEndISO('2026-06-08', 2)).toBe('2026-06-28');
  });
});

describe('weekIndexesInRange', () => {
  it('includes only weeks whose Monday falls within the range', () => {
    // week 2 Monday = 06-22, week 3 Monday = 06-29, week 4 Monday = 07-06 (outside the range)
    const idx = weekIndexesInRange('2026-06-08', 8, '2026-06-22', '2026-07-05');
    expect(idx).toEqual([2, 3]);
  });
  it('is empty when the range excludes every week', () => {
    expect(weekIndexesInRange('2026-06-08', 4, '2025-01-01', '2025-01-31')).toEqual([]);
  });
});

describe('addDaysISO', () => {
  it('crosses month and year boundaries correctly', () => {
    expect(addDaysISO('2026-12-30', 5)).toBe('2027-01-04');
  });
});

describe('formatShortDate / formatDateRange', () => {
  it('formats a short day.month', () => {
    expect(formatShortDate('2026-06-08')).toBe('08.06');
  });
  it('omits the year on the start when both ends share a year', () => {
    expect(formatDateRange('2026-06-08', '2026-06-14', 'en')).toBe('8 Jun - 14 Jun 2026');
  });
  it('includes both years when the range spans a year boundary', () => {
    expect(formatDateRange('2025-12-29', '2026-01-04', 'en')).toBe('29 Dec 2025 - 4 Jan 2026');
  });
});
