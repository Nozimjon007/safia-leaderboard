import { useMemo } from 'react';
import type { LeaderboardDataset } from '../data/types';
import { computeClanAssignments, type ClanId } from '../lib/clans';

/** Every member's clan, recomputed only when the dataset itself changes (not on every render) —
 * shared by every page that needs to know "which clan is this person in". */
export function useClanAssignments(dataset: LeaderboardDataset | null): Record<string, ClanId> {
  return useMemo(() => (dataset ? computeClanAssignments(dataset.members) : {}), [dataset]);
}
