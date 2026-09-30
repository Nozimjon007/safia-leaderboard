import { describe, expect, it } from 'vitest';
import {
  CLAN_MISSION_WEEKLY_CAP_PER_MEMBER,
  CLAN_POINT_VALUES,
  computeClanContributionEvents,
  computeClanRoster,
  computeClanStandings,
  totalPointsForMember,
} from './clanPoints';
import { CLAN_IDS, type ClanId } from './clans';
import { buildDemoDataset } from '../data/demoData';
import { DEFAULT_SCORING_CONFIG, type CategoryKey, type LeaderboardDataset, type Member, type MemberScores } from '../data/types';
import { listSeasons, seasonCloseMs, seasonOf, SEASON_APPROVAL_GRACE_MS } from './seasons';

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

function member(id: string, role = 'Baker'): Member {
  return { id, name: id, area: 'Site 1', shift: 'S1', role, avatarPhoto: null, fullBodyPhoto: null };
}

describe('computeClanContributionEvents — craft-mission points', () => {
  const weekCount = 6;
  const season = seasonOf(2026, 3); // Q3 2026
  const alice = member('alice', 'Baker'); // Baker thresholds: output=4, precision=4, kaizen=3, attendance=4

  const scores = flatScores(weekCount, 50);
  setWeeks(scores, 'load', [0, 1, 2, 3], 95); // completes the output mission (non-kaizen)
  setWeeks(scores, 'concern', [0, 1, 2, 3], 80); // clears the output safety floor every qualifying week
  setWeeks(scores, 'kaizen', [0, 1, 2], 90); // completes the kaizen mission

  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06', // Q3 2026's own first Monday
    weekCount,
    members: [alice],
    scores: { alice: scores },
  };

  const events = computeClanContributionEvents(dataset, DEFAULT_SCORING_CONFIG, season);

  it('awards role_milestone points for a completed non-kaizen mission', () => {
    const e = events.alice.find((ev) => ev.reason === 'role_milestone');
    expect(e).toBeDefined();
    expect(e!.points).toBe(CLAN_POINT_VALUES.role_milestone);
    expect(e!.points).toBe(10);
  });

  it('awards process_improvement points for a completed kaizen mission', () => {
    const e = events.alice.find((ev) => ev.reason === 'process_improvement');
    expect(e).toBeDefined();
    expect(e!.points).toBe(CLAN_POINT_VALUES.process_improvement);
    expect(e!.points).toBe(25);
  });

  it('never produces achievement or coaching points for a still-current (unapproved) season', () => {
    expect(events.alice.some((ev) => ev.reason === 'quality_achievement' || ev.reason === 'coaching_contribution')).toBe(false);
  });

  it('totals exactly the sum of its events', () => {
    // role_milestone(10) + process_improvement(25) + steady_output clan_mission(3 x 4 weeks) — the
    // same weeks that complete the output craft mission also qualify for the steady_output weekly
    // clan mission, since both share the same load/concern thresholds by design.
    expect(totalPointsForMember(events.alice)).toBe(47);
  });
});

describe('computeClanContributionEvents — weekly clan mission cap', () => {
  const weekCount = 6;
  const season = seasonOf(2026, 3);
  const bob = member('bob', 'Baker');

  const scores = flatScores(weekCount, 50);
  // Week 0: both missions qualify (clean_sweep needs concern>=85; steady_output needs load>=88 + concern>=70).
  setWeeks(scores, 'load', [0], 90);
  setWeeks(scores, 'concern', [0], 90);
  // Week 1: only clean_sweep qualifies (load stays at the flat baseline of 50).
  setWeeks(scores, 'concern', [1], 90);

  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06',
    weekCount,
    members: [bob],
    scores: { bob: scores },
  };

  const events = computeClanContributionEvents(dataset, DEFAULT_SCORING_CONFIG, season);
  const week0 = events.bob.filter((e) => e.weekIndex === 0);
  const week1 = events.bob.filter((e) => e.weekIndex === 1);

  it('records one event per qualifying mission', () => {
    expect(week0.map((e) => e.missionId).sort()).toEqual(['clean_sweep', 'steady_output']);
    expect(week1.map((e) => e.missionId)).toEqual(['clean_sweep']);
  });

  it('clips the combined week total to the per-member weekly cap when both missions qualify', () => {
    const total = week0.reduce((s, e) => s + e.points, 0);
    expect(total).toBe(CLAN_MISSION_WEEKLY_CAP_PER_MEMBER);
    expect(total).toBeLessThan(CLAN_POINT_VALUES.clan_mission * 2); // would be 6 uncapped
  });

  it('never caps a week where only one mission qualifies', () => {
    expect(week1[0].points).toBe(CLAN_POINT_VALUES.clan_mission);
  });
});

describe('computeClanStandings', () => {
  const season = seasonOf(2026, 3);
  const roleMembers = {
    gold: member('m_gold'),
    saf: member('m_saf'),
    cin: member('m_cin'),
    hon: member('m_hon'),
  };
  const clanAssignments: Record<string, ClanId> = {
    m_gold: 'golden_crust',
    m_saf: 'saffron_rise',
    m_cin: 'cinnamon_hearth',
    m_hon: 'honey_bloom',
  };

  function scoresFor(completeOutput: boolean, completeKaizen: boolean): MemberScores {
    const s = flatScores(6, 50);
    if (completeOutput) {
      setWeeks(s, 'load', [0, 1, 2, 3], 95);
      setWeeks(s, 'concern', [0, 1, 2, 3], 80);
    }
    if (completeKaizen) setWeeks(s, 'kaizen', [0, 1, 2], 90);
    return s;
  }

  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06',
    weekCount: 6,
    members: Object.values(roleMembers),
    scores: {
      m_gold: scoresFor(true, false), // 10 pts
      m_saf: scoresFor(false, true), // 25 pts
      m_cin: scoresFor(true, true), // 35 pts
      m_hon: scoresFor(false, false), // 0 pts
    },
  };

  const standings = computeClanStandings(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, CLAN_IDS, season, null);

  it('ranks clans by average points per member, richest first', () => {
    expect(standings.map((s) => s.clanId)).toEqual(['cinnamon_hearth', 'saffron_rise', 'golden_crust', 'honey_bloom']);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });

  it('computes totalPoints and averagePoints correctly for a single-member clan', () => {
    // 35 craft-mission points + 12 from the steady_output weekly clan mission (see the craft-mission
    // describe block above for why the two overlap).
    const cin = standings.find((s) => s.clanId === 'cinnamon_hearth')!;
    expect(cin.totalPoints).toBe(47);
    expect(cin.memberCount).toBe(1);
    expect(cin.averagePoints).toBe(47);
  });

  it('reports no movement without a comparable previous season', () => {
    expect(standings.every((s) => s.move === null)).toBe(true);
  });

  it('surfaces leading contributors', () => {
    const cin = standings.find((s) => s.clanId === 'cinnamon_hearth')!;
    expect(cin.leadingContributors[0]).toEqual({ memberId: 'm_cin', points: 47 });
  });

  it('computes movement vs. a previous season using the previousRank - rank convention', () => {
    // A shared, earlier anchor so both Q2 and Q3 2026 resolve to real (disjoint) week indices in the
    // same score arrays: 2026-03-30 is the Monday on/before Q2's start, and Q3's own first Monday
    // (2026-07-06, per the fixtures above) lands at week index 14 from that anchor.
    const previousSeason = seasonOf(2026, 2);
    const firstWeekStart = '2026-03-30';
    const weekCount = 28;
    const q3 = [14, 15, 16, 17];

    function q3Scores(completeOutput: boolean, completeKaizen: boolean): MemberScores {
      const s = flatScores(weekCount, 50);
      if (completeOutput) {
        setWeeks(s, 'load', q3, 95);
        setWeeks(s, 'concern', q3, 80);
      }
      if (completeKaizen) setWeeks(s, 'kaizen', q3.slice(0, 3), 90);
      return s;
    }

    // Layer distinct Q2 activity on top of each member's existing Q3-only fixture, so the previous
    // season's ranking is fully determined by real point differences rather than a tie broken only
    // by clan-id alphabetical order: honey_bloom clearly on top, cinnamon_hearth left at zero (the
    // exact inverse of the current-season fixture above, where honey_bloom was the sole zero).
    const honScores = q3Scores(false, false);
    setWeeks(honScores, 'load', [1, 2, 3, 4], 95);
    setWeeks(honScores, 'concern', [1, 2, 3, 4], 80);
    setWeeks(honScores, 'kaizen', [1, 2, 3], 90); // completes both missions in Q2: 10 + 25 + a clan-mission bonus

    const goldScores = q3Scores(true, false);
    setWeeks(goldScores, 'kaizen', [1, 2, 3], 90); // completes the kaizen mission in Q2: +25

    const safScores = q3Scores(false, true);
    setWeeks(safScores, 'concern', [1], 90); // one qualifying clean_sweep week in Q2: +3, short of any mission threshold

    const prevDataset: LeaderboardDataset = {
      sourceLabel: 'Demo',
      firstWeekStart,
      weekCount,
      members: Object.values(roleMembers),
      scores: {
        m_gold: goldScores,
        m_saf: safScores,
        m_cin: q3Scores(true, true), // left flat in Q2 — the previous season's sole zero
        m_hon: honScores,
      },
    };
    // Evaluated just after Q2 closes (but still inside its own approval grace window) so Q2's
    // achievement/attendance points stay withheld — otherwise every member's trivially-full
    // attendance in this flat fixture would earn a real-wall-clock-dependent achievement bonus
    // once Q2 naturally becomes approved, which isn't what this test is about.
    const nowMs = seasonCloseMs(previousSeason) + 1000;
    const withMovement = computeClanStandings(prevDataset, DEFAULT_SCORING_CONFIG, clanAssignments, CLAN_IDS, season, previousSeason, nowMs);
    const cin = withMovement.find((s) => s.clanId === 'cinnamon_hearth')!; // previously last (0 pts), now first
    const hon = withMovement.find((s) => s.clanId === 'honey_bloom')!; // previously first, now last (0 pts)
    expect(cin.rank).toBe(1);
    expect(cin.move).toBe(3); // previousRank(4) - rank(1)
    expect(hon.rank).toBe(4);
    expect(hon.move).toBe(-3); // previousRank(1) - rank(4)
  });
});

describe('computeClanRoster', () => {
  it('sorts members richest-first and includes their event log', () => {
    const season = seasonOf(2026, 3);
    const a = member('a_member');
    const b = member('b_member');
    const scores = {
      a_member: (() => {
        const s = flatScores(6, 50);
        setWeeks(s, 'kaizen', [0, 1, 2], 90);
        return s;
      })(),
      b_member: flatScores(6, 50),
    };
    const dataset: LeaderboardDataset = { sourceLabel: 'Demo', firstWeekStart: '2026-07-06', weekCount: 6, members: [a, b], scores };
    const clanAssignments: Record<string, ClanId> = { a_member: 'golden_crust', b_member: 'golden_crust' };
    const events = computeClanContributionEvents(dataset, DEFAULT_SCORING_CONFIG, season);
    const roster = computeClanRoster(dataset, clanAssignments, 'golden_crust', events);
    expect(roster.map((r) => r.member.id)).toEqual(['a_member', 'b_member']);
    expect(roster[0].totalPoints).toBe(25);
    expect(roster[0].events.length).toBe(1);
    expect(roster[1].totalPoints).toBe(0);
  });
});

describe('computeClanContributionEvents — approval gating (real demo dataset)', () => {
  const dataset = buildDemoDataset();
  const today = new Date().toISOString().slice(0, 10);
  const seasons = listSeasons(dataset.firstWeekStart, today);
  const pastSeason = seasons[seasons.length - 2];

  it('withholds achievement/coaching points while a season is still inside its approval grace window', () => {
    const justClosed = seasonCloseMs(pastSeason) + 1000;
    const events = computeClanContributionEvents(dataset, DEFAULT_SCORING_CONFIG, pastSeason, justClosed);
    const hasGatedReason = Object.values(events).some((list) => list.some((e) => e.reason === 'quality_achievement' || e.reason === 'coaching_contribution'));
    expect(hasGatedReason).toBe(false);
  });

  it('releases achievement points once the approval grace window has elapsed', () => {
    const approvedAt = seasonCloseMs(pastSeason) + SEASON_APPROVAL_GRACE_MS;
    const events = computeClanContributionEvents(dataset, DEFAULT_SCORING_CONFIG, pastSeason, approvedAt);
    const hasAchievementPoints = Object.values(events).some((list) => list.some((e) => e.reason === 'quality_achievement'));
    expect(hasAchievementPoints).toBe(true);
  });
});
