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
      (m) =>
        (filters.shift === 'all' || m.shift === filters.shift) &&
        (filters.area === 'all' || m.area === filters.area) &&
        (filters.role === 'all' || m.role === filters.role),
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
  }, [dataset, filters.shift, filters.area, filters.role, filters.fromISO, filters.toISO, filters.metric, config]);
}

/**
 * The same filter pool and period as `useLeaderboardResult`, but always ranked by 'overall' — used by
 * anything presenting "the season's winners" (top five, podium), so picking a category to sort/display
 * the explorer table by can never change who those are. Still respects shift/area/role (labeled in
 * the UI when non-"all"), just never `filters.metric`.
 */
export function useOverallLeaderboardResult(
  dataset: LeaderboardDataset | null,
  filters: Pick<LeaderboardFilters, 'shift' | 'area' | 'role' | 'fromISO' | 'toISO'>,
  config: ScoringConfig,
): LeaderboardResult | null {
  return useMemo(() => {
    if (!dataset) return null;
    const pool = dataset.members.filter(
      (m) =>
        (filters.shift === 'all' || m.shift === filters.shift) &&
        (filters.area === 'all' || m.area === filters.area) &&
        (filters.role === 'all' || m.role === filters.role),
    );
    const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, filters.fromISO, filters.toISO);
    return buildLeaderboard({
      members: pool,
      scores: dataset.scores,
      weekIndexes,
      weekCount: dataset.weekCount,
      metric: 'overall',
      config,
    });
  }, [dataset, filters.shift, filters.area, filters.role, filters.fromISO, filters.toISO, config]);
}

/** Areas present in the dataset, sorted, for the area filter's option list. */
export function useAreaOptions(dataset: LeaderboardDataset | null): string[] {
  return useMemo(() => {
    if (!dataset) return [];
    return Array.from(new Set(dataset.members.map((m) => m.area))).sort((a, b) => a.localeCompare(b));
  }, [dataset]);
}

/** Roles present in the dataset, sorted, for the role filter's option list. */
export function useRoleOptions(dataset: LeaderboardDataset | null): string[] {
  return useMemo(() => {
    if (!dataset) return [];
    return Array.from(new Set(dataset.members.map((m) => m.role))).sort((a, b) => a.localeCompare(b));
  }, [dataset]);
}
