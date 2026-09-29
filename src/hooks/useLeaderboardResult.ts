import { useMemo } from 'react';
import type { LeaderboardDataset, ScoringConfig } from '../data/types';
import type { LeaderboardFilters } from './useLeaderboardFilters';
import { buildLeaderboard, type LeaderboardResult } from '../lib/scoring';
import { weekIndexesInRange } from '../lib/dates';

/** Ranked rows + team stats for the current filter pool (shift/area/period), shared by the leaderboard and member-profile pages. */
export function useLeaderboardResult(
  dataset: LeaderboardDataset | null,
  filters: LeaderboardFilters,
  config: ScoringConfig,
): LeaderboardResult | null {
  return useMemo(() => {
    if (!dataset) return null;
    const pool = dataset.members.filter(
      (m) => (filters.shift === 'all' || m.shift === filters.shift) && (filters.area === 'all' || m.area === filters.area),
    );
    const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, filters.fromISO, filters.toISO);
    return buildLeaderboard({
      members: pool,
      scores: dataset.scores,
      weekIndexes,
      weekCount: dataset.weekCount,
      metric: filters.metric,
      config,
    });
  }, [dataset, filters.shift, filters.area, filters.fromISO, filters.toISO, filters.metric, config]);
}

/** Areas present in the dataset, sorted, for the area filter's option list. */
export function useAreaOptions(dataset: LeaderboardDataset | null): string[] {
  return useMemo(() => {
    if (!dataset) return [];
    return Array.from(new Set(dataset.members.map((m) => m.area))).sort((a, b) => a.localeCompare(b));
  }, [dataset]);
}
