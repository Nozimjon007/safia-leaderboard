import { describe, expect, it } from 'vitest';
import {
  currentSeasonIndex,
  isSeasonComplete,
  listSeasons,
  quarterOf,
  seasonBounds,
  seasonCloseMs,
  seasonCountdown,
  seasonId,
} from './seasons';
import { weekIndexesInRange, weekStartISO } from './dates';

describe('quarterOf', () => {
  it('maps a date to its calendar quarter', () => {
    expect(quarterOf('2026-09-28')).toEqual({ year: 2026, quarter: 3 });
    expect(quarterOf('2026-01-01')).toEqual({ year: 2026, quarter: 1 });
    expect(quarterOf('2026-12-31')).toEqual({ year: 2026, quarter: 4 });
    expect(quarterOf('2026-04-01')).toEqual({ year: 2026, quarter: 2 });
  });
});

describe('seasonBounds', () => {
  it('computes exact calendar-quarter start/end dates', () => {
    expect(seasonBounds(2026, 1)).toEqual({ startISO: '2026-01-01', endISO: '2026-03-31' });
    expect(seasonBounds(2026, 2)).toEqual({ startISO: '2026-04-01', endISO: '2026-06-30' });
    expect(seasonBounds(2026, 3)).toEqual({ startISO: '2026-07-01', endISO: '2026-09-30' });
    expect(seasonBounds(2026, 4)).toEqual({ startISO: '2026-10-01', endISO: '2026-12-31' });
  });

  it('rolls Q4 into the next year correctly', () => {
    const q4 = seasonBounds(2026, 4);
    expect(q4.endISO).toBe('2026-12-31');
  });
});

describe('seasonId', () => {
  it('is a stable, sortable id', () => {
    expect(seasonId(2026, 3)).toBe('2026-q3');
  });
});

describe('listSeasons', () => {
  it('enumerates every quarter between two dates, oldest first', () => {
    const seasons = listSeasons('2025-01-01', '2026-09-28');
    expect(seasons.map((s) => s.id)).toEqual([
      '2025-q1', '2025-q2', '2025-q3', '2025-q4', '2026-q1', '2026-q2', '2026-q3',
    ]);
  });

  it('is a single season when both dates fall in the same quarter', () => {
    expect(listSeasons('2026-07-05', '2026-08-20').map((s) => s.id)).toEqual(['2026-q3']);
  });
});

describe('week-to-season assignment at a boundary', () => {
  // firstWeekStart is a Monday; week 12's Monday (2026-03-30) is the week that straddles
  // Q1/Q2 2026 — Mon 30 Mar through Sun 5 Apr, i.e. 2 days in Q1 and 5 days in Q2.
  const firstWeekStart = '2026-01-05';
  const weekCount = 20;
  const q1 = seasonBounds(2026, 1);
  const q2 = seasonBounds(2026, 2);

  it('assigns a boundary-straddling week to the quarter containing its Monday, not the other', () => {
    expect(weekStartISO(firstWeekStart, 12)).toBe('2026-03-30');
    const q1Weeks = weekIndexesInRange(firstWeekStart, weekCount, q1.startISO, q1.endISO);
    const q2Weeks = weekIndexesInRange(firstWeekStart, weekCount, q2.startISO, q2.endISO);
    expect(q1Weeks).toContain(12);
    expect(q2Weeks).not.toContain(12);
  });

  it('never double-counts or drops the boundary week — the two quarters partition it exactly once', () => {
    const q1Weeks = weekIndexesInRange(firstWeekStart, weekCount, q1.startISO, q1.endISO);
    const q2Weeks = weekIndexesInRange(firstWeekStart, weekCount, q2.startISO, q2.endISO);
    const overlap = q1Weeks.filter((w) => q2Weeks.includes(w));
    expect(overlap).toEqual([]);
    // Q2's first counted week starts exactly 7 days after Q1's last one — no gap, no double week.
    expect(Math.min(...q2Weeks)).toBe(Math.max(...q1Weeks) + 1);
  });

  it("a closed season's own week range never changes as the dataset grows more weeks later", () => {
    const shortRange = weekIndexesInRange(firstWeekStart, 14, q1.startISO, q1.endISO);
    const longRangeMuchLater = weekIndexesInRange(firstWeekStart, 200, q1.startISO, q1.endISO);
    expect(longRangeMuchLater).toEqual(shortRange);
  });
});

describe('seasonCloseMs (Asia/Tashkent)', () => {
  it('closes at the start of the day after the season end, Tashkent-local', () => {
    const closeMs = seasonCloseMs({ endISO: '2026-09-30' });
    expect(closeMs).toBe(Date.parse('2026-10-01T00:00:00+05:00'));
  });
});

describe('isSeasonComplete', () => {
  it('is true once "now" is past the close instant', () => {
    const season = { endISO: '2020-01-01' };
    expect(isSeasonComplete(season, Date.now())).toBe(true);
  });
  it('is false for a season closing in the future', () => {
    const season = { endISO: '2099-01-01' };
    expect(isSeasonComplete(season, Date.now())).toBe(false);
  });
  it('is false one millisecond before close and true at the close instant', () => {
    const season = { endISO: '2026-09-30' };
    const close = seasonCloseMs(season);
    expect(isSeasonComplete(season, close - 1)).toBe(false);
    expect(isSeasonComplete(season, close)).toBe(true);
  });
});

describe('currentSeasonIndex', () => {
  it('finds the season containing "now"', () => {
    const seasons = listSeasons('2025-01-01', '2026-09-28');
    const nowMs = Date.parse('2026-08-15T12:00:00+05:00'); // inside 2026-q3
    expect(currentSeasonIndex(seasons, nowMs)).toBe(seasons.findIndex((s) => s.id === '2026-q3'));
  });
  it('falls back to the last season when "now" is after the whole range', () => {
    const seasons = listSeasons('2025-01-01', '2025-12-31');
    const farFuture = Date.parse('2030-01-01T00:00:00+05:00');
    expect(currentSeasonIndex(seasons, farFuture)).toBe(seasons.length - 1);
  });
});

describe('seasonCountdown', () => {
  const season = { startISO: '2026-07-01', endISO: '2026-09-30' };

  it('is 0% progress and full time remaining right at season start', () => {
    const c = seasonCountdown(season, seasonCloseMs({ endISO: '2026-06-30' })); // = season start instant
    expect(c.progress).toBeCloseTo(0, 5);
    expect(c.isComplete).toBe(false);
  });

  it('is fully complete (progress 1, zero remaining) at and after the close instant', () => {
    const c = seasonCountdown(season, seasonCloseMs(season));
    expect(c.progress).toBe(1);
    expect(c.totalMs).toBe(0);
    expect(c.isComplete).toBe(true);
  });

  it('reports a sane days/hours breakdown two days before close', () => {
    const twoDaysBefore = seasonCloseMs(season) - 2 * 86_400_000 - 3 * 3_600_000; // 2 days, 3 hours out
    const c = seasonCountdown(season, twoDaysBefore);
    expect(c.days).toBe(2);
    expect(c.hours).toBe(3);
    expect(c.isComplete).toBe(false);
  });
});
