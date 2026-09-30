import { describe, expect, it } from 'vitest';
import type { CategoryKey, MemberScores, Member, ScoringConfig } from '../data/types';
import { DEFAULT_SCORING_CONFIG } from '../data/types';
import {
  buildLeaderboard,
  compareMembers,
  competitionRank,
  computeHighlight,
  computePeriodStats,
  filterRowsByQuery,
  mean,
  previousWeekIndexes,
  roundTo1,
  scoreReceipt,
  sortRows,
  strengthsAndWeaknesses,
  weekOverall,
  weightedOverall,
  zoneOf,
} from './scoring';

const CFG: ScoringConfig = DEFAULT_SCORING_CONFIG;

function series(...values: Array<number | null>): number[] | (number | null)[] {
  return values;
}

function makeScores(byCategory: Partial<Record<CategoryKey, Array<number | null>>>): MemberScores {
  const base: MemberScores = {
    load: [],
    control: [],
    kaizen: [],
    concern: [],
    attendance: [],
  };
  return { ...base, ...byCategory } as MemberScores;
}

describe('mean', () => {
  it('skips nulls rather than treating them as zero', () => {
    expect(mean([80, null, 90])).toBe(85);
  });
  it('is null when nothing is present', () => {
    expect(mean([null, null])).toBeNull();
  });
});

describe('weightedOverall', () => {
  it('is a plain mean under equal weights', () => {
    const v = weightedOverall(
      { load: 88, control: 84, kaizen: 89, concern: 85, attendance: 96 },
      CFG.weights,
    );
    expect(v).toBeCloseTo(88.4, 5);
  });
  it('ignores categories with zero weight, even if present', () => {
    const v = weightedOverall(
      { load: 100, control: 0, kaizen: null, concern: null, attendance: null },
      { load: 20, control: 0, kaizen: 20, concern: 20, attendance: 20 },
    );
    expect(v).toBe(100);
  });
  it('is null when no category has both a value and positive weight', () => {
    const v = weightedOverall(
      { load: null, control: null, kaizen: null, concern: null, attendance: null },
      CFG.weights,
    );
    expect(v).toBeNull();
  });
});

describe('scoreReceipt', () => {
  it('every row contribution sums to the overall score, under equal weights', () => {
    const r = scoreReceipt({ load: 88, control: 84, kaizen: 89, concern: 85, attendance: 96 }, CFG.weights);
    const sum = r.rows.reduce((s, row) => s + (row.contribution ?? 0), 0);
    expect(sum).toBeCloseTo(r.overall!, 8);
    expect(r.overall).toBeCloseTo(88.4, 5);
    expect(r.weightTotal).toBe(100);
  });

  it('excludes a missing category from weightTotal and renormalizes the rest, still matching weightedOverall', () => {
    const categories = { load: 90, control: 90, kaizen: null, concern: 90, attendance: 90 };
    const r = scoreReceipt(categories, CFG.weights);
    const kaizenRow = r.rows.find((row) => row.category === 'kaizen')!;
    expect(kaizenRow.contribution).toBeNull(); // excluded, never a fabricated 0
    expect(r.weightTotal).toBe(80); // the four present categories' weights only
    const sum = r.rows.reduce((s, row) => s + (row.contribution ?? 0), 0);
    expect(sum).toBeCloseTo(r.overall!, 8);
    expect(r.overall).toBe(weightedOverall(categories, CFG.weights));
  });

  it('excludes a zero-weight category even when it has a value, matching weightedOverall', () => {
    const r = scoreReceipt(
      { load: 100, control: 50, kaizen: null, concern: null, attendance: null },
      { load: 20, control: 0, kaizen: 20, concern: 20, attendance: 20 },
    );
    const controlRow = r.rows.find((row) => row.category === 'control')!;
    expect(controlRow.contribution).toBeNull();
    expect(r.overall).toBe(100);
  });

  it('is null/empty (never NaN) when nothing is present', () => {
    const r = scoreReceipt({ load: null, control: null, kaizen: null, concern: null, attendance: null }, CFG.weights);
    expect(r.overall).toBeNull();
    expect(r.weightTotal).toBe(0);
    expect(r.rows.every((row) => row.contribution === null)).toBe(true);
  });
});

describe('computePeriodStats (R1/R2: missing weeks skipped, missing categories flagged)', () => {
  it('averages only the weeks that have data', () => {
    const scores = makeScores({ load: series(80, null, 90, 100) as (number | null)[] });
    const stats = computePeriodStats(scores, [0, 1, 2, 3], CFG);
    expect(stats.categories.load).toBe(90); // (80+90+100)/3, week 1 skipped
  });
  it('flags a category missing for the whole period and excludes it from overall', () => {
    const scores = makeScores({
      load: [null, null],
      control: [80, 80],
      kaizen: [80, 80],
      concern: [80, 80],
      attendance: [80, 80],
    });
    const stats = computePeriodStats(scores, [0, 1], CFG);
    expect(stats.missingCategories).toEqual(['load']);
    expect(stats.overall).toBe(80); // remaining four categories, all 80
  });
  it('is fully unranked (overall null) when every category is empty in the period', () => {
    const scores = makeScores({});
    const stats = computePeriodStats(scores, [0, 1], CFG);
    expect(stats.overall).toBeNull();
    expect(stats.missingCategories).toHaveLength(5);
  });
});

describe('zoneOf', () => {
  it('is good at/above the green threshold', () => {
    expect(zoneOf(80, CFG)).toBe('good');
    expect(zoneOf(80.04, CFG)).toBe('good');
  });
  it('is low below the attention threshold', () => {
    expect(zoneOf(64.9, CFG)).toBe('low');
  });
  it('is mid strictly between the two thresholds', () => {
    expect(zoneOf(65, CFG)).toBe('mid');
    expect(zoneOf(79.9, CFG)).toBe('mid');
  });
  it('is na for a null value (no data), never counted as low', () => {
    expect(zoneOf(null, CFG)).toBe('na');
  });
});

describe('competitionRank (R4: ties share a rank, rounded to one decimal)', () => {
  it('gives equal ranks to equal (rounded) values, then continues from the count', () => {
    const map = competitionRank([
      { id: 'a', value: 90 },
      { id: 'b', value: 90 },
      { id: 'c', value: 80 },
    ]);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(1);
    expect(map.get('c')).toBe(3); // not 2 — competition ranking skips to the count
  });
  it('treats values that round to the same first decimal as tied', () => {
    const map = competitionRank([
      { id: 'a', value: 90.02 },
      { id: 'b', value: 90.04 },
    ]);
    expect(map.get('a')).toBe(map.get('b'));
  });
  it('leaves null-valued entries out of the map (R3: unranked)', () => {
    const map = competitionRank([
      { id: 'a', value: 90 },
      { id: 'b', value: null },
    ]);
    expect(map.has('b')).toBe(false);
    expect(map.get('a')).toBe(1);
  });
});

describe('previousWeekIndexes (R5)', () => {
  it('returns the equal-length block immediately before the selection', () => {
    expect(previousWeekIndexes([8, 9, 10, 11])).toEqual([4, 5, 6, 7]);
  });
  it('is null when that block would fall before week 0 — no silent partial comparison', () => {
    expect(previousWeekIndexes([0, 1, 2, 3])).toBeNull();
  });
  it('is null for an empty selection', () => {
    expect(previousWeekIndexes([])).toBeNull();
  });
});

describe('roundTo1', () => {
  it('rounds half-up to one decimal', () => {
    expect(roundTo1(88.449)).toBe(88.4);
    expect(roundTo1(88.451)).toBe(88.5);
  });
});

const M = (id: string, name: string, area: string, shift: 'S1' | 'S2' = 'S1'): Member => ({
  id,
  name,
  area,
  shift,
  role: 'Baker',
  avatarPhoto: null,
  fullBodyPhoto: null,
});

describe('buildLeaderboard', () => {
  const members: Member[] = [M('a', 'Aziza', 'Area 1'), M('b', 'Bekzod', 'Area 1'), M('c', 'Coming Soon', 'Area 2')];
  const scores: Record<string, MemberScores> = {
    a: makeScores({
      load: [90, 90], control: [90, 90], kaizen: [90, 90], concern: [90, 90], attendance: [90, 90],
    }),
    b: makeScores({
      load: [70, 70], control: [70, 70], kaizen: [70, 70], concern: [70, 70], attendance: [70, 70],
    }),
    c: makeScores({}), // no data at all -> unranked
  };

  it('ranks members by the selected metric and leaves no-data members unranked but present', () => {
    const result = buildLeaderboard({
      members,
      scores,
      weekIndexes: [0, 1],
      weekCount: 2,
      metric: 'overall',
      config: CFG,
    });
    const byId = Object.fromEntries(result.rows.map((r) => [r.member.id, r]));
    expect(byId.a.rank).toBe(1);
    expect(byId.b.rank).toBe(2);
    expect(byId.c.rank).toBeNull();
    expect(result.team.scoredCount).toBe(2);
  });

  it('has no rank movement and no previous team average without a full previous period (R5)', () => {
    const result = buildLeaderboard({
      members,
      scores,
      weekIndexes: [0, 1],
      weekCount: 2,
      metric: 'overall',
      config: CFG,
    });
    expect(result.previousWeekIndexes).toBeNull();
    expect(result.rows.every((r) => r.move === null)).toBe(true);
    expect(result.team.previousAverage).toBeNull();
  });

  it('overallRank stays put even when a category metric genuinely flips the display order', () => {
    // x: strong overall (90 avg) but weak attendance (60). y: weaker overall (70 avg) but strong attendance (95).
    const flipMembers: Member[] = [M('x', 'Xander', 'Area 1'), M('y', 'Yelena', 'Area 1')];
    const flipScores: Record<string, MemberScores> = {
      x: makeScores({ load: [95], control: [95], kaizen: [95], concern: [95], attendance: [60] }),
      y: makeScores({ load: [65], control: [65], kaizen: [65], concern: [65], attendance: [95] }),
    };
    const byOverall = buildLeaderboard({ members: flipMembers, scores: flipScores, weekIndexes: [0], weekCount: 1, metric: 'overall', config: CFG });
    const byAttendance = buildLeaderboard({ members: flipMembers, scores: flipScores, weekIndexes: [0], weekCount: 1, metric: 'attendance', config: CFG });

    // Sanity: attendance really does flip who's #1 in `rank` (the display-metric rank).
    expect(byOverall.rows.find((r) => r.member.id === 'x')!.rank).toBe(1);
    expect(byAttendance.rows.find((r) => r.member.id === 'y')!.rank).toBe(1);

    // But overallRank agrees with the overall-built result in both cases — never rewritten by the metric choice.
    for (const id of ['x', 'y']) {
      const expected = byOverall.rows.find((r) => r.member.id === id)!.overallRank;
      expect(byAttendance.rows.find((r) => r.member.id === id)!.overallRank).toBe(expected);
    }
    expect(byOverall.rows.find((r) => r.member.id === 'x')!.overallRank).toBe(1);
  });

  it('overallRank never changes when built with a different display metric (the "sorting by Attendance" bug)', () => {
    const byOverall = buildLeaderboard({ members, scores, weekIndexes: [0, 1], weekCount: 2, metric: 'overall', config: CFG });
    const byAttendance = buildLeaderboard({ members, scores, weekIndexes: [0, 1], weekCount: 2, metric: 'attendance', config: CFG });
    for (const id of ['a', 'b', 'c']) {
      const ra = byOverall.rows.find((r) => r.member.id === id)!;
      const rb = byAttendance.rows.find((r) => r.member.id === id)!;
      expect(rb.overallRank).toBe(ra.overallRank);
      expect(rb.overallRank).toBe(ra.rank); // and matches the plain rank when metric already is 'overall'
    }
  });

  it('computes rank movement once a full previous period exists', () => {
    const fourWeekScores: Record<string, MemberScores> = {
      a: makeScores({
        load: [60, 60, 95, 95], control: [60, 60, 95, 95], kaizen: [60, 60, 95, 95],
        concern: [60, 60, 95, 95], attendance: [60, 60, 95, 95],
      }),
      b: makeScores({
        load: [90, 90, 70, 70], control: [90, 90, 70, 70], kaizen: [90, 90, 70, 70],
        concern: [90, 90, 70, 70], attendance: [90, 90, 70, 70],
      }),
      c: makeScores({}),
    };
    const result = buildLeaderboard({
      members,
      scores: fourWeekScores,
      weekIndexes: [2, 3],
      weekCount: 4,
      metric: 'overall',
      config: CFG,
    });
    const byId = Object.fromEntries(result.rows.map((r) => [r.member.id, r]));
    // a was rank 2 previously (60 < 90), now rank 1 (95 > 70): moved up 1.
    expect(byId.a.previousRank).toBe(2);
    expect(byId.a.rank).toBe(1);
    expect(byId.a.move).toBe(1);
    expect(byId.b.move).toBe(-1);
    expect(result.topImprovement?.member.id).toBe('a');
  });
});

describe('sortRows / filterRowsByQuery', () => {
  const members: Member[] = [M('a', 'Zamira', 'North'), M('b', 'Amir', 'South')];
  const scores: Record<string, MemberScores> = {
    a: makeScores({ load: [80], control: [80], kaizen: [80], concern: [80], attendance: [80] }),
    b: makeScores({ load: [90], control: [90], kaizen: [90], concern: [90], attendance: [90] }),
  };
  const rows = buildLeaderboard({ members, scores, weekIndexes: [0], weekCount: 1, metric: 'overall', config: CFG }).rows;

  it('sorts by name ascending independent of rank', () => {
    const sorted = sortRows(rows, 'name', 'asc');
    expect(sorted.map((r) => r.member.name)).toEqual(['Amir', 'Zamira']);
  });

  it('filters by name or area, case-insensitively', () => {
    expect(filterRowsByQuery(rows, 'south')).toHaveLength(1);
    expect(filterRowsByQuery(rows, 'ZAMIRA')).toHaveLength(1);
    expect(filterRowsByQuery(rows, 'nomatch')).toHaveLength(0);
  });
});

describe('strengthsAndWeaknesses', () => {
  it('ranks categories by gap vs team average, best/worst first', () => {
    const { strengths, weaknesses } = strengthsAndWeaknesses(
      { load: 95, control: 60, kaizen: 80, concern: 80, attendance: 80 },
      { load: 80, control: 80, kaizen: 80, concern: 80, attendance: 80 },
      2,
    );
    expect(strengths).toEqual([{ category: 'load', value: 95, gap: 15 }]);
    expect(weaknesses).toEqual([{ category: 'control', value: 60, gap: -20 }]);
  });
});

describe('computeHighlight', () => {
  it('finds the strongest category and the most improved vs previous period', () => {
    const current = computePeriodStats(
      makeScores({ load: [95], control: [70], kaizen: [80], concern: [80], attendance: [80] }),
      [0],
      CFG,
    );
    const previous = computePeriodStats(
      makeScores({ load: [90], control: [70], kaizen: [60], concern: [80], attendance: [80] }),
      [0],
      CFG,
    );
    const h = computeHighlight(current, previous);
    expect(h.strongest?.category).toBe('load');
    expect(h.mostImproved?.category).toBe('kaizen');
    expect(h.mostImproved?.delta).toBe(20);
  });
});

describe('weekOverall', () => {
  it('matches weightedOverall for a single week', () => {
    const scores = makeScores({
      load: [88], control: [84], kaizen: [89], concern: [85], attendance: [96],
    });
    expect(weekOverall(scores, 0, CFG)).toBeCloseTo(88.4, 5);
  });
});

describe('compareMembers', () => {
  it('picks the correct per-category leader and tallies wins/ties', () => {
    const a = makeScores({ load: [90], control: [70], kaizen: [80], concern: [80], attendance: [80] });
    const b = makeScores({ load: [70], control: [90], kaizen: [80], concern: [80], attendance: [80] });
    const cmp = compareMembers(a, b, [0], CFG);
    expect(cmp.categories.find((c) => c.category === 'load')?.leader).toBe('a');
    expect(cmp.categories.find((c) => c.category === 'control')?.leader).toBe('b');
    expect(cmp.categories.find((c) => c.category === 'kaizen')?.leader).toBe('tie');
    expect(cmp.aWins).toBe(1);
    expect(cmp.bWins).toBe(1);
    expect(cmp.ties).toBe(3); // kaizen, concern, attendance
    expect(cmp.overallLeader).toBe('tie'); // both average to 80
  });

  it('treats values that round to the same decimal as a tie, not a leader (R4)', () => {
    const a = makeScores({ load: [80.02], control: [], kaizen: [], concern: [], attendance: [] });
    const b = makeScores({ load: [80.04], control: [], kaizen: [], concern: [], attendance: [] });
    const cmp = compareMembers(a, b, [0], CFG);
    expect(cmp.categories.find((c) => c.category === 'load')?.leader).toBe('tie');
  });

  it('marks a category "na" (not a loss) when either side has no data', () => {
    const a = makeScores({ load: [90], control: [], kaizen: [], concern: [], attendance: [] });
    const b = makeScores({ load: [], control: [80], kaizen: [], concern: [], attendance: [] });
    const cmp = compareMembers(a, b, [0], CFG);
    const load = cmp.categories.find((c) => c.category === 'load');
    const control = cmp.categories.find((c) => c.category === 'control');
    expect(load?.leader).toBe('na');
    expect(load?.b).toBeNull();
    expect(control?.leader).toBe('na');
    expect(cmp.aWins).toBe(0);
    expect(cmp.bWins).toBe(0);
  });

  it('lists categories where neither member has any data', () => {
    const a = makeScores({ load: [90], control: [], kaizen: [], concern: [80], attendance: [80] });
    const b = makeScores({ load: [70], control: [], kaizen: [], concern: [80], attendance: [80] });
    const cmp = compareMembers(a, b, [0], CFG);
    expect(cmp.bothMissing).toEqual(['control', 'kaizen']);
  });
});
