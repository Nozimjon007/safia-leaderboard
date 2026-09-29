import { useMemo } from 'react';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import type { Season } from '../lib/seasons';
import { isSeasonComplete } from '../lib/seasons';
import { computeAllAchievements } from '../lib/achievements';
import { computeAllSeasonRewards, rewardsForMember } from '../lib/rewards';
import { buildLeaderboard } from '../lib/scoring';
import { weekIndexesInRange } from '../lib/dates';
import { lifetimePoints } from '../lib/xpTier';

export interface SeasonHistoryEntry {
  season: Season;
  rank: number | null;
  overall: number | null;
  rankedCount: number;
  isComplete: boolean;
}

export interface MemberProgress {
  earnedAchievements: ReturnType<typeof computeAllAchievements>[string];
  myRewards: ReturnType<typeof rewardsForMember>;
  seasonHistory: SeasonHistoryEntry[];
  xpPoints: number;
}

/** Everything the "My Progress" sections of a member profile need, computed once and memoized. */
export function useMemberProgress(
  dataset: LeaderboardDataset | null,
  config: ScoringConfig,
  seasons: readonly Season[] | null,
  memberId: string | null,
): MemberProgress | null {
  return useMemo(() => {
    if (!dataset || !seasons || !memberId) return null;

    const achievementsByMember = computeAllAchievements(dataset, config, seasons);
    const allRewards = computeAllSeasonRewards(dataset, config, seasons);

    const seasonHistory: SeasonHistoryEntry[] = seasons.map((season) => {
      const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
      const complete = isSeasonComplete(season);
      if (!weekIndexes.length) return { season, rank: null, overall: null, rankedCount: 0, isComplete: complete };
      const result = buildLeaderboard({
        members: dataset.members,
        scores: dataset.scores,
        weekIndexes,
        weekCount: dataset.weekCount,
        metric: 'overall',
        config,
      });
      const row = result.rows.find((r) => r.member.id === memberId);
      return {
        season,
        rank: row?.rank ?? null,
        overall: row?.current.overall ?? null,
        rankedCount: result.rows.filter((r) => r.rank != null).length,
        isComplete: complete,
      };
    });

    const completedOveralls = seasonHistory.filter((h) => h.isComplete).map((h) => h.overall);

    return {
      earnedAchievements: achievementsByMember[memberId] ?? [],
      myRewards: rewardsForMember(allRewards, memberId),
      seasonHistory,
      xpPoints: lifetimePoints(completedOveralls),
    };
  }, [dataset, config, seasons, memberId]);
}
