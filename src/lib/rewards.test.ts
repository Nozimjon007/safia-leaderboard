import { describe, expect, it } from 'vitest';
import { buildDemoDataset } from '../data/demoData';
import { DEFAULT_SCORING_CONFIG } from '../data/types';
import { listSeasons } from './seasons';
import { computeAllSeasonRewards, rewardsForMember } from './rewards';

describe('computeAllSeasonRewards (against the real demo dataset)', () => {
  const dataset = buildDemoDataset();
  const today = new Date().toISOString().slice(0, 10);
  const seasons = listSeasons(dataset.firstWeekStart, today);
  const rewards = computeAllSeasonRewards(dataset, DEFAULT_SCORING_CONFIG, seasons);

  it('never includes the current (incomplete) season', () => {
    const currentSeasonId = seasons[seasons.length - 1].id;
    expect(rewards.some((r) => r.seasonId === currentSeasonId)).toBe(false);
  });

  it('awards at most one of each place per completed season', () => {
    const bySeason = new Map<string, string[]>();
    for (const r of rewards) {
      if (r.rewardId === 'most_improved') continue;
      const key = r.seasonId;
      const list = bySeason.get(key) ?? [];
      list.push(r.rewardId);
      bySeason.set(key, list);
    }
    for (const [, ids] of bySeason) {
      expect(new Set(ids).size).toBe(ids.length); // no duplicate place within a season
    }
  });

  it('rewardsForMember only returns that member\'s rows', () => {
    const someMemberId = dataset.members[0].id;
    const mine = rewardsForMember(rewards, someMemberId);
    expect(mine.every((r) => r.memberId === someMemberId)).toBe(true);
  });

  it('never rewards the member with no data at all', () => {
    expect(rewardsForMember(rewards, 'aziz')).toEqual([]);
  });
});
