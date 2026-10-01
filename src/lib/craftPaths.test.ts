import { describe, expect, it } from 'vitest';
import {
  computeCraftMastery,
  computeCraftPathProgress,
  computeLeadershipPathsProgress,
  computeRoleRank,
  computeSeasonDistinctions,
  craftPathForRole,
  qualifyingWeeks,
} from './craftPaths';
import { DEFAULT_SCORING_CONFIG, type CategoryKey, type LeaderboardDataset, type Member, type MemberScores } from '../data/types';
import { seasonOf } from './seasons';

const CATS: CategoryKey[] = ['load', 'control', 'kaizen', 'concern', 'attendance'];

function flatScores(weekCount: number, value: number | null): MemberScores {
  const out = {} as MemberScores;
  for (const c of CATS) out[c] = new Array(weekCount).fill(value) as (number | null)[];
  return out;
}

function setWeeks(scores: MemberScores, category: CategoryKey, weeks: number[], value: number) {
  const arr = [...scores[category]];
  for (const w of weeks) arr[w] = value;
  (scores as Record<CategoryKey, (number | null)[]>)[category] = arr;
}

function member(id: string, role: string): Member {
  return { id, name: id, area: 'Site 1', shift: 'S1', role, avatarPhoto: null, fullBodyPhoto: null };
}

describe('qualifyingWeeks', () => {
  const weekCount = 6;
  const scores = flatScores(weekCount, 50);
  // Strong output (load>=90) in weeks 0,1,2,3 — but concern only clears the safety floor (>=70) in 0,1,2.
  setWeeks(scores, 'load', [0, 1, 2, 3], 95);
  setWeeks(scores, 'concern', [0, 1, 2], 80);
  setWeeks(scores, 'concern', [3], 50); // stays below the floor
  const dataset: LeaderboardDataset = { sourceLabel: 'Demo', firstWeekStart: '2026-07-06', weekCount, members: [member('alice', 'Team Leader')], scores: { alice: scores } };

  it('counts a strong-output week only when paired with a safety/vigilance floor (anti-gaming)', () => {
    const weeks = qualifyingWeeks(dataset, 'alice', [0, 1, 2, 3, 4, 5], 'output');
    expect(weeks).toEqual([0, 1, 2]); // week 3 excluded despite load>=90
  });

  it('never counts a missing (null) week toward any concept', () => {
    const gapped = flatScores(weekCount, null);
    setWeeks(gapped, 'kaizen', [0, 1], 95);
    const ds: LeaderboardDataset = { ...dataset, scores: { alice: gapped } };
    const weeks = qualifyingWeeks(ds, 'alice', [0, 1, 2, 3, 4, 5], 'kaizen');
    expect(weeks).toEqual([0, 1]);
  });
});

describe('computeCraftPathProgress', () => {
  const weekCount = 6;
  const scores = flatScores(weekCount, 50);
  setWeeks(scores, 'load', [0, 1, 2, 3, 4], 95); // 5 strong-load weeks
  setWeeks(scores, 'concern', [0, 1, 2, 4], 80); // but only 4 of those are safety-paired (week 3 stays low)
  setWeeks(scores, 'attendance', [0, 1, 2, 3, 4], 99); // 5 reliable weeks
  const alice = member('alice', 'Team Leader');
  const season = seasonOf(2026, 3);
  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06', // Q3 2026's own first Monday, so all 6 week indices fall inside the season
    weekCount,
    members: [alice],
    scores: { alice: scores },
  };

  it("resolves the member's path from their role", () => {
    expect(craftPathForRole('Team Leader')?.role).toBe('Team Leader');
    expect(craftPathForRole('Nonexistent Role')).toBeNull();
  });

  it('marks a mission complete once its threshold of qualifying weeks is reached, and records which week completed it', () => {
    const progress = computeCraftPathProgress(dataset, alice, season)!;
    const output = progress.missions.find((m) => m.def.concept === 'output')!;
    // Qualifying output weeks: 0,1,2,4 (week 3 fails the safety floor) — threshold is 4, so complete at the 4th, week 4.
    expect(output.current).toBe(4);
    expect(output.complete).toBe(true);
    expect(output.earnedWeekIndex).toBe(4);

    const attendance = progress.missions.find((m) => m.def.concept === 'attendance')!;
    expect(attendance.complete).toBe(true); // 5 qualifying weeks >= threshold 4

    const precision = progress.missions.find((m) => m.def.concept === 'precision')!;
    expect(precision.complete).toBe(false);
    expect(precision.current).toBe(0);
    expect(precision.earnedWeekIndex).toBeNull();
  });

  it('caps starsEarned/starsPossible to the full 8-milestone set (4 paths x 2 tiers)', () => {
    const progress = computeCraftPathProgress(dataset, alice, season)!;
    expect(progress.starsPossible).toBe(8);
    expect(progress.starsEarned).toBe(2); // output + attendance only
  });

  it('never over-reports current progress past a mission’s own threshold', () => {
    const progress = computeCraftPathProgress(dataset, alice, season)!;
    const attendance = progress.missions.find((m) => m.def.concept === 'attendance')!;
    expect(attendance.current).toBeLessThanOrEqual(attendance.def.threshold);
  });
});

describe('computeCraftMastery', () => {
  // A member with exactly one output-mission star in an approved past season, and (separately) enough
  // strong weeks in the still-open current season to have earned a star there too *if* it counted.
  const weekCount = 40;
  const scores = flatScores(weekCount, 50);
  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-01-05', // a Monday at/near the start of Q1 2026
    weekCount,
    members: [member('alice', 'Team Leader')],
    scores: { alice: scores },
  };
  const q1 = seasonOf(2026, 1); // approved relative to the fixed "now" below
  const q3 = seasonOf(2026, 3); // still open relative to the fixed "now" below
  const fixedNowMs = Date.parse('2026-08-15T00:00:00+05:00'); // inside Q3, long past Q1's close+grace

  it('counts stars only from approved seasons, never an in-progress one', () => {
    // Give Alice 4 qualifying output weeks inside Q1 2026 (weeks 0-3) and 4 inside Q3 2026 (weeks 26-29).
    const withStars = flatScores(weekCount, 50);
    setWeeks(withStars, 'load', [0, 1, 2, 3], 95);
    setWeeks(withStars, 'concern', [0, 1, 2, 3], 80);
    setWeeks(withStars, 'load', [26, 27, 28, 29], 95);
    setWeeks(withStars, 'concern', [26, 27, 28, 29], 80);
    const ds: LeaderboardDataset = { ...dataset, scores: { alice: withStars } };

    const mastery = computeCraftMastery(ds, member('alice', 'Team Leader'), [q1, q3], fixedNowMs);
    expect(mastery.totalStars).toBe(1); // Q1's output star only — Q3's is real progress but not yet "career"
  });

  it('has no stars, bronze tier, with nothing earned', () => {
    const mastery = computeCraftMastery(dataset, member('alice', 'Team Leader'), [q1, q3], fixedNowMs);
    expect(mastery.totalStars).toBe(0);
    expect(mastery.tier).toBe('bronze');
    expect(mastery.toNextTier).toBe(8);
    expect(mastery.nextTier).toBe('silver');
  });
});

describe('computeLeadershipPathsProgress', () => {
  const weekCount = 13;
  const scores = flatScores(weekCount, 50);
  // 3 qualifying precision (Supervision) weeks: clears people_coach's tier-1 (threshold 3) but not
  // its tier-2 (threshold 6).
  setWeeks(scores, 'control', [0, 1, 2], 95);
  const alice = member('alice', 'Team Leader');
  const season = seasonOf(2026, 3);
  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06',
    weekCount,
    members: [alice],
    scores: { alice: scores },
  };

  it('groups the flat 8-milestone set back into its four paths', () => {
    const paths = computeLeadershipPathsProgress(dataset, alice, season)!;
    expect(paths.map((p) => p.pathId)).toEqual(['shift_excellence', 'people_coach', 'quality_safety', 'problem_solver']);
    for (const p of paths) expect(p.starsPossible).toBe(2); // two tiers each
  });

  it('can complete a path’s easier tier without its harder one, independently of the other three paths', () => {
    const paths = computeLeadershipPathsProgress(dataset, alice, season)!;
    const coach = paths.find((p) => p.pathId === 'people_coach')!;
    expect(coach.starsEarned).toBe(1);
    expect(coach.missions[0].complete).toBe(true); // threshold 3
    expect(coach.missions[1].complete).toBe(false); // threshold 6
    for (const other of paths.filter((p) => p.pathId !== 'people_coach')) expect(other.starsEarned).toBe(0);
  });
});

describe('computeRoleRank', () => {
  const weekCount = 4;
  const aliceScores = flatScores(weekCount, 90); // strong Baker
  const bobScores = flatScores(weekCount, 50); // weaker Baker
  const caraScores = flatScores(weekCount, 99); // strongest overall, but a Decorator — must not affect Baker ranks
  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06',
    weekCount,
    members: [member('alice', 'Baker'), member('bob', 'Baker'), member('cara', 'Decorator')],
    scores: { alice: aliceScores, bob: bobScores, cara: caraScores },
  };
  const weekIndexes = [0, 1, 2, 3];

  it('ranks a member only against same-role peers, excluding everyone else', () => {
    const aliceRank = computeRoleRank(dataset, DEFAULT_SCORING_CONFIG, weekIndexes, 'alice');
    expect(aliceRank).toEqual({ rank: 1, total: 2 }); // total=2: alice+bob, not cara
    const bobRank = computeRoleRank(dataset, DEFAULT_SCORING_CONFIG, weekIndexes, 'bob');
    expect(bobRank).toEqual({ rank: 2, total: 2 });
  });
});

describe('computeSeasonDistinctions', () => {
  it('awards Quality Guardian to the highest-control member and Kaizen Champion to the highest-kaizen member, and never the same distinction twice', () => {
    const weekCount = 13;
    const a = flatScores(weekCount, 50);
    setWeeks(a, 'control', [0, 1, 2, 3, 4], 98);
    const b = flatScores(weekCount, 50);
    setWeeks(b, 'kaizen', [0, 1, 2, 3, 4], 98);
    const dataset: LeaderboardDataset = {
      sourceLabel: 'Demo',
      firstWeekStart: '2026-07-06',
      weekCount,
      members: [member('a', 'Baker'), member('b', 'Decorator')],
      scores: { a, b },
    };
    const season = seasonOf(2026, 3);
    const distinctions = computeSeasonDistinctions(dataset, DEFAULT_SCORING_CONFIG, season, null);

    const qg = distinctions.find((d) => d.id === 'quality_guardian');
    const kc = distinctions.find((d) => d.id === 'kaizen_champion');
    expect(qg?.memberId).toBe('a');
    expect(kc?.memberId).toBe('b');

    const ids = distinctions.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('awards Most Improved (Craft) only to someone with a real gain in qualifying craft events vs. the previous season', () => {
    const weekCount = 26;
    const scores = flatScores(weekCount, 50);
    // Previous season (weeks 0-12): no qualifying weeks. Current season (weeks 13-25): 4 strong, safe-output weeks.
    setWeeks(scores, 'load', [13, 14, 15, 16], 95);
    setWeeks(scores, 'concern', [13, 14, 15, 16], 80);
    const dataset: LeaderboardDataset = {
      sourceLabel: 'Demo',
      firstWeekStart: '2026-01-05',
      weekCount,
      members: [member('grower', 'Team Leader')],
      scores: { grower: scores },
    };
    const prev = seasonOf(2026, 1);
    const cur = seasonOf(2026, 2);
    const distinctions = computeSeasonDistinctions(dataset, DEFAULT_SCORING_CONFIG, cur, prev);
    expect(distinctions.find((d) => d.id === 'most_improved_craft')?.memberId).toBe('grower');
  });

  it('returns no distinctions for a season with no scored weeks', () => {
    const dataset: LeaderboardDataset = {
      sourceLabel: 'Demo',
      firstWeekStart: '2027-01-04',
      weekCount: 1,
      members: [member('a', 'Baker')],
      scores: { a: flatScores(1, 50) },
    };
    const distinctions = computeSeasonDistinctions(dataset, DEFAULT_SCORING_CONFIG, seasonOf(2026, 3), null);
    expect(distinctions).toEqual([]);
  });
});
