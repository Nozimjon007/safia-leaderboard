import { describe, expect, it } from 'vitest';
import type { LeaderboardDataset, Member, MemberScores } from '../data/types';
import { DEFAULT_SCORING_CONFIG } from '../data/types';
import { computeWeekChanges, deriveCaption, seasonWeeks, snapshotAt, type MemberWeekChange } from './timeMachine';

const CFG = DEFAULT_SCORING_CONFIG;

function flat(...weekly: number[]): MemberScores {
  return { load: weekly, control: weekly, kaizen: weekly, concern: weekly, attendance: weekly };
}

function member(id: string, name: string): Member {
  return { id, name, area: 'Site 1', shift: 'S1', role: 'Baker', avatarPhoto: null, fullBodyPhoto: null };
}

// A minimal 6-week dataset. The test "season" covers only weeks 0-3 (January);
// weeks 4-5 (February) exist in the dataset but fall outside it — the season-boundary case.
const dataset: LeaderboardDataset = {
  sourceLabel: 'Demo',
  firstWeekStart: '2026-01-05', // a Monday
  weekCount: 6,
  members: [member('alice', 'Alice'), member('bob', 'Bob'), member('carol', 'Carol'), member('dina', 'Dina')],
  scores: {
    alice: flat(70, 70, 70, 70, 70, 70),
    carol: flat(70, 70, 70, 70, 70, 70), // ties alice every week, on purpose
    bob: flat(60, 60, 85, 85, 85, 85), // sustained jump from week 2 on — overtakes by cumulative average at week 3
    dina: {
      load: [50, 55, 55, 55, 55, 55],
      control: [50, 50, 50, 50, 50, 50],
      kaizen: [50, null, 50, 50, 50, 50], // missing exactly one week, one category
      concern: [50, 50, 50, 50, 50, 50],
      attendance: [50, 50, 50, 50, 50, 50],
    },
  },
};

const season = { startISO: '2026-01-01', endISO: '2026-01-31' };

describe('seasonWeeks', () => {
  it('excludes weeks that fall outside the season even though the dataset has more of them (season boundary)', () => {
    expect(seasonWeeks(dataset, season)).toEqual([0, 1, 2, 3]);
  });
});

describe('snapshotAt', () => {
  it('week 1 (offset 0) is a valid cumulative snapshot of just that one week', () => {
    const snap = snapshotAt(dataset, CFG, season, 0);
    expect(snap).not.toBeNull();
    expect(snap!.weekIndex).toBe(0);
    const alice = snap!.result.rows.find((r) => r.member.id === 'alice')!;
    expect(alice.current.overall).toBe(70);
  });

  it('the latest week (offset 3) is a valid cumulative snapshot of the whole season so far', () => {
    const snap = snapshotAt(dataset, CFG, season, 3);
    const bob = snap!.result.rows.find((r) => r.member.id === 'bob')!;
    expect(bob.current.overall).toBeCloseTo((60 + 60 + 85 + 85) / 4, 5);
  });

  it('is null past the season\'s own real weeks — never fabricates a future snapshot', () => {
    expect(snapshotAt(dataset, CFG, season, 4)).toBeNull();
    expect(snapshotAt(dataset, CFG, season, -1)).toBeNull();
  });
});

describe('computeWeekChanges', () => {
  it('week 1 has no previous snapshot — every change field is null, not zero', () => {
    const changes = computeWeekChanges(dataset, CFG, season, 0);
    for (const c of changes) {
      expect(c.previousRank).toBeNull();
      expect(c.rankMove).toBeNull();
      expect(c.previousOverall).toBeNull();
      for (const cat of Object.values(c.categoryDeltas)) expect(cat).toBeNull();
    }
  });

  it('a tied score: alice and carol share rank 1 at every week, and neither shows a fabricated move', () => {
    const changes = computeWeekChanges(dataset, CFG, season, 2);
    const alice = changes.find((c) => c.memberId === 'alice')!;
    const carol = changes.find((c) => c.memberId === 'carol')!;
    expect(alice.rank).toBe(1);
    expect(carol.rank).toBe(1);
    expect(alice.rankMove).toBe(0);
    expect(carol.rankMove).toBe(0);
  });

  it('the latest week: bob\'s sustained jump finally overtakes the cumulative average and he moves up', () => {
    const changes = computeWeekChanges(dataset, CFG, season, 3);
    const bob = changes.find((c) => c.memberId === 'bob')!;
    expect(bob.previousRank).toBe(3);
    expect(bob.rank).toBe(1);
    expect(bob.rankMove).toBe(2);
    // Bob's raw week-3 values equal his raw week-2 values (both 85) — a real, comparable "no
    // change" delta of 0, correctly distinct from the null used where data is actually missing.
    // The cumulative rank still moved: sustaining 85 finally pulled his season average past 70.
    for (const cat of Object.values(bob.categoryDeltas)) expect(cat).toBe(0);
  });

  it('missing category data: dina\'s kaizen delta is null (not 0) the week it has no value, other categories unaffected', () => {
    const changes = computeWeekChanges(dataset, CFG, season, 1);
    const dina = changes.find((c) => c.memberId === 'dina')!;
    expect(dina.categoryDeltas.kaizen).toBeNull();
    expect(dina.categoryDeltas.load).toBe(5); // 55 - 50
    expect(dina.categoryDeltas.control).toBe(0); // 50 - 50, a real unchanged value, distinct from "missing"
  });
});

describe('deriveCaption', () => {
  const members = [member('a', 'Amina'), member('z', 'Zafar')];

  it('week 1 always reports the season just started, regardless of the data', () => {
    expect(deriveCaption([], members, 0)).toEqual({ kind: 'first_week' });
  });

  it('no positive mover at all falls back to a neutral, honest caption', () => {
    const changes: MemberWeekChange[] = [
      { memberId: 'a', rank: 1, previousRank: 1, rankMove: 0, overall: 80, previousOverall: 80, categoryDeltas: { load: 0, control: null, kaizen: null, concern: null, attendance: null } },
    ];
    expect(deriveCaption(changes, members, 1)).toEqual({ kind: 'no_notable_change' });
  });

  it('picks the biggest positive mover and their single largest category swing', () => {
    const changes: MemberWeekChange[] = [
      { memberId: 'a', rank: 2, previousRank: 2, rankMove: 0, overall: 75, previousOverall: 75, categoryDeltas: { load: null, control: null, kaizen: null, concern: null, attendance: null } },
      {
        memberId: 'z',
        rank: 1,
        previousRank: 4,
        rankMove: 3,
        overall: 88,
        previousOverall: 79,
        categoryDeltas: { load: 2, control: -1, kaizen: 8, concern: null, attendance: 3 },
      },
    ];
    expect(deriveCaption(changes, members, 1)).toEqual({
      kind: 'rank_move',
      memberId: 'z',
      fromRank: 4,
      toRank: 1,
      category: 'kaizen',
      categoryDelta: 8,
    });
  });

  it('breaks a tie in rank-move size by name, deterministically', () => {
    const changes: MemberWeekChange[] = [
      { memberId: 'z', rank: 2, previousRank: 3, rankMove: 1, overall: 80, previousOverall: 78, categoryDeltas: { load: 2, control: null, kaizen: null, concern: null, attendance: null } },
      { memberId: 'a', rank: 1, previousRank: 2, rankMove: 1, overall: 85, previousOverall: 83, categoryDeltas: { load: 2, control: null, kaizen: null, concern: null, attendance: null } },
    ];
    // Amina and Zafar both moved up by 1 — "Amina" sorts first alphabetically.
    expect(deriveCaption(changes, members, 1).kind).toBe('rank_move');
    expect((deriveCaption(changes, members, 1) as { memberId: string }).memberId).toBe('a');
  });
});
