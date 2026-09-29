/**
 * Seasonal rewards — proposed/demo content.
 *
 * Safia has not supplied an official prize list, so `REWARD_IDS` below is a
 * small, configurable placeholder set (1st/2nd/3rd place + one
 * achievement-based category). The UI must always present these as
 * **proposed, not a promise from Safia** — never as confirmed prizes.
 *
 * Winners are computed from each completed season's *finalized* standings
 * (the same `buildLeaderboard` call the achievements engine and the
 * leaderboard itself use) — a season's winners never change once it has
 * closed, and the in-progress season never appears here.
 */
import type { LeaderboardDataset, RewardId, ScoringConfig, SeasonReward } from '../data/types';
import type { Season } from './seasons';
import { isSeasonComplete } from './seasons';
import { buildLeaderboard } from './scoring';
import { weekIndexesInRange } from './dates';

export const REWARD_IDS: readonly RewardId[] = ['place_1', 'place_2', 'place_3', 'most_improved'];

export function computeSeasonRewards(dataset: LeaderboardDataset, config: ScoringConfig, season: Season): SeasonReward[] {
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  if (!weekIndexes.length) return [];

  const result = buildLeaderboard({
    members: dataset.members,
    scores: dataset.scores,
    weekIndexes,
    weekCount: dataset.weekCount,
    metric: 'overall',
    config,
  });

  const rewards: SeasonReward[] = [];
  for (const row of result.rows) {
    if (row.rank === 1) rewards.push({ seasonId: season.id, rewardId: 'place_1', memberId: row.member.id });
    else if (row.rank === 2) rewards.push({ seasonId: season.id, rewardId: 'place_2', memberId: row.member.id });
    else if (row.rank === 3) rewards.push({ seasonId: season.id, rewardId: 'place_3', memberId: row.member.id });
  }
  if (result.topImprovement) {
    rewards.push({ seasonId: season.id, rewardId: 'most_improved', memberId: result.topImprovement.member.id });
  }
  return rewards;
}

/** Every reward from every *completed* season, oldest first. The current season is never included. */
export function computeAllSeasonRewards(dataset: LeaderboardDataset, config: ScoringConfig, seasons: readonly Season[]): SeasonReward[] {
  return seasons.filter((s) => isSeasonComplete(s)).flatMap((s) => computeSeasonRewards(dataset, config, s));
}

export function rewardsForMember(all: readonly SeasonReward[], memberId: string): SeasonReward[] {
  return all.filter((r) => r.memberId === memberId);
}
