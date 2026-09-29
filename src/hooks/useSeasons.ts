import { useMemo } from 'react';
import type { LeaderboardDataset } from '../data/types';
import { currentSeasonIndex, listSeasons, type Season } from '../lib/seasons';

export interface SeasonsInfo {
  seasons: Season[];
  currentIndex: number;
  currentSeason: Season;
}

/** Every season the dataset covers, oldest first, plus which one "now" falls in. Recomputes only when the dataset changes. */
export function useSeasons(dataset: LeaderboardDataset | null): SeasonsInfo | null {
  return useMemo(() => {
    if (!dataset) return null;
    const today = new Date().toISOString().slice(0, 10);
    const seasons = listSeasons(dataset.firstWeekStart, today);
    const currentIndex = currentSeasonIndex(seasons);
    return { seasons, currentIndex, currentSeason: seasons[currentIndex] };
  }, [dataset]);
}
