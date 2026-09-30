import { describe, expect, it } from 'vitest';
import { balanceForMember, CLAN_WINNER_COINS_PER_MEMBER, computeSeasonCoinAwards, SOLO_COIN_AWARDS, transactionsForMember, type CoinTransaction } from './coins';
import type { ClanId } from './clans';
import { DEFAULT_SCORING_CONFIG, type CategoryKey, type LeaderboardDataset, type Member, type MemberScores } from '../data/types';
import { seasonOf } from './seasons';

const CATS: CategoryKey[] = ['load', 'control', 'kaizen', 'concern', 'attendance'];

function flatScores(weekCount: number, value: number | null): MemberScores {
  const out = {} as MemberScores;
  for (const c of CATS) out[c] = new Array(weekCount).fill(value) as (number | null)[];
  return out;
}

function member(id: string, role = 'Baker'): Member {
  return { id, name: id, area: 'Site 1', shift: 'S1', role, avatarPhoto: null, fullBodyPhoto: null };
}

describe('computeSeasonCoinAwards — solo places', () => {
  const season = seasonOf(2026, 3);
  const weekCount = 6;
  // Six members with strictly descending, distinct overall scores (flat every category) => a clean,
  // untied rank 1-6.
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const scoresByRank = [95, 90, 85, 80, 75, 70];
  const members = ids.map((id) => member(id));
  const scores: Record<string, MemberScores> = {};
  ids.forEach((id, i) => (scores[id] = flatScores(weekCount, scoresByRank[i])));
  const dataset: LeaderboardDataset = { sourceLabel: 'Demo', firstWeekStart: '2026-07-06', weekCount, members, scores };
  const clanAssignments: Record<string, ClanId> = Object.fromEntries(ids.map((id) => [id, 'golden_crust' as ClanId]));

  const awards = computeSeasonCoinAwards(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, season, null);
  const solo = awards.filter((a) => a.reason.startsWith('solo_place_'));

  it('awards exactly the five configured places, in the configured amounts', () => {
    expect(solo).toHaveLength(5);
    expect(solo.find((a) => a.memberId === 'a')?.amount).toBe(SOLO_COIN_AWARDS[1]);
    expect(solo.find((a) => a.memberId === 'b')?.amount).toBe(SOLO_COIN_AWARDS[2]);
    expect(solo.find((a) => a.memberId === 'c')?.amount).toBe(SOLO_COIN_AWARDS[3]);
    expect(solo.find((a) => a.memberId === 'd')?.amount).toBe(SOLO_COIN_AWARDS[4]);
    expect(solo.find((a) => a.memberId === 'e')?.amount).toBe(SOLO_COIN_AWARDS[5]);
  });

  it('never awards a 6th-place (or lower) member', () => {
    expect(solo.some((a) => a.memberId === 'f')).toBe(false);
  });

  it('stamps every award with the season id and its end date', () => {
    for (const a of solo) {
      expect(a.seasonId).toBe(season.id);
      expect(a.dateISO).toBe(season.endISO);
    }
  });

  it('produces deterministic ids — calling it twice yields identical transactions', () => {
    const again = computeSeasonCoinAwards(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, season, null);
    expect(again.filter((a) => a.reason.startsWith('solo_place_'))).toEqual(solo);
  });
});

describe('computeSeasonCoinAwards — tie handling', () => {
  const season = seasonOf(2026, 3);
  const weekCount = 6;
  // alice and bob tie for #1 (competition ranking) — carol must land on #3, not #2.
  const alice = member('alice');
  const bob = member('bob');
  const carol = member('carol');
  const dataset: LeaderboardDataset = {
    sourceLabel: 'Demo',
    firstWeekStart: '2026-07-06',
    weekCount,
    members: [alice, bob, carol],
    scores: { alice: flatScores(weekCount, 90), bob: flatScores(weekCount, 90), carol: flatScores(weekCount, 80) },
  };
  const clanAssignments: Record<string, ClanId> = { alice: 'golden_crust', bob: 'saffron_rise', carol: 'cinnamon_hearth' };
  const awards = computeSeasonCoinAwards(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, season, null);
  const solo = awards.filter((a) => a.reason.startsWith('solo_place_'));

  it('gives both tied members the tied rank amount', () => {
    expect(solo.find((a) => a.memberId === 'alice')).toMatchObject({ reason: 'solo_place_1', amount: SOLO_COIN_AWARDS[1] });
    expect(solo.find((a) => a.memberId === 'bob')).toMatchObject({ reason: 'solo_place_1', amount: SOLO_COIN_AWARDS[1] });
  });

  it('gives the next member their real (skip-aware) rank amount, not the next sequential one', () => {
    expect(solo.find((a) => a.memberId === 'carol')).toMatchObject({ reason: 'solo_place_3', amount: SOLO_COIN_AWARDS[3] });
  });
});

describe('computeSeasonCoinAwards — clan winner', () => {
  const season = seasonOf(2026, 3);
  const weekCount = 6;
  // One high-scoring member in golden_crust, everyone else flat-zero-ish in the other clans — golden_crust wins.
  const goldMembers = ['g1', 'g2'].map((id) => member(id));
  const otherMembers = ['s1', 'c1', 'h1'].map((id) => member(id));
  const members = [...goldMembers, ...otherMembers];
  const scores: Record<string, MemberScores> = {};
  scores.g1 = flatScores(weekCount, 50);
  setKaizen(scores.g1 ?? (scores.g1 = flatScores(weekCount, 50)), [0, 1, 2]);
  scores.g2 = flatScores(weekCount, 50);
  scores.s1 = flatScores(weekCount, 50);
  scores.c1 = flatScores(weekCount, 50);
  scores.h1 = flatScores(weekCount, 50);

  function setKaizen(s: MemberScores, weeks: number[]) {
    const arr = [...s.kaizen];
    for (const w of weeks) arr[w] = 90;
    (s as Record<CategoryKey, (number | null)[]>).kaizen = arr;
  }

  const dataset: LeaderboardDataset = { sourceLabel: 'Demo', firstWeekStart: '2026-07-06', weekCount, members, scores };
  const clanAssignments: Record<string, ClanId> = { g1: 'golden_crust', g2: 'golden_crust', s1: 'saffron_rise', c1: 'cinnamon_hearth', h1: 'honey_bloom' };

  const awards = computeSeasonCoinAwards(dataset, DEFAULT_SCORING_CONFIG, clanAssignments, season, null);
  const clanAwards = awards.filter((a) => a.reason === 'clan_winner');

  it('awards every member of the winning clan, and only that clan', () => {
    expect(clanAwards.map((a) => a.memberId).sort()).toEqual(['g1', 'g2']);
  });

  it('uses the configured per-member clan amount', () => {
    expect(clanAwards.every((a) => a.amount === CLAN_WINNER_COINS_PER_MEMBER)).toBe(true);
  });
});

describe('balanceForMember / transactionsForMember', () => {
  const txs: CoinTransaction[] = [
    { id: '1', memberId: 'alice', seasonId: '2026-q2', amount: 500, reason: 'solo_place_1', dateISO: '2026-06-30' },
    { id: '2', memberId: 'alice', seasonId: '2026-q2', amount: 100, reason: 'clan_winner', dateISO: '2026-06-30' },
    { id: '3', memberId: 'alice', seasonId: '2026-q2', amount: -150, reason: 'shop_redemption', dateISO: '2026-07-02' },
    { id: '4', memberId: 'bob', seasonId: '2026-q2', amount: 350, reason: 'solo_place_2', dateISO: '2026-06-30' },
  ];

  it('sums only the given member’s transactions, including negative debits', () => {
    expect(balanceForMember(txs, 'alice')).toBe(450);
    expect(balanceForMember(txs, 'bob')).toBe(350);
    expect(balanceForMember(txs, 'nobody')).toBe(0);
  });

  it('returns only the given member’s transactions, most recent first', () => {
    const aliceTxs = transactionsForMember(txs, 'alice');
    expect(aliceTxs.map((t) => t.id)).toEqual(['3', '2', '1']);
  });
});
