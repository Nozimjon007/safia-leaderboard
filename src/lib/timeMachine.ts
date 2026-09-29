/**
 * Season Time Machine — pure functions over one season's weeks.
 *
 * Two different kinds of "this week" value are deliberately kept separate
 * here, per the corrected time model:
 *  - a **cumulative snapshot** (season start through week N) is what a rank
 *    or overall score means — the same `buildLeaderboard` window logic used
 *    everywhere else in the app, just re-run at each slider position;
 *  - a **single-week delta** (this week's own raw category value minus the
 *    previous week's) is what a caption like "attendance rose 8 points"
 *    means — comparing two individual weekly data points, never comparing
 *    two cumulative averages (which would blur a one-week swing across the
 *    whole season-to-date).
 *
 * Nothing here recomputes or overrides a *completed* season's standings —
 * `snapshotAt` is just `buildLeaderboard` over a prefix of that season's own
 * fixed week list (see lib/seasons.ts), so a finished season's last slider
 * position always matches its real, already-finalized standings exactly.
 */
import type { CategoryKey, LeaderboardDataset, Member, ScoringConfig } from '../data/types';
import { CATEGORY_KEYS } from '../data/types';
import { buildLeaderboard, roundTo1, type LeaderboardResult } from './scoring';
import { weekIndexesInRange, weekStartISO } from './dates';
import type { Season } from './seasons';

/** A season's own week indexes into the dataset, oldest first — the Time Machine's 13-ish slider stops. */
export function seasonWeeks(dataset: Pick<LeaderboardDataset, 'firstWeekStart' | 'weekCount'>, season: Pick<Season, 'startISO' | 'endISO'>): number[] {
  return weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
}

export interface TimeMachineSnapshot {
  /** 0-based position within the season's own week list. */
  seasonOffset: number;
  /** Absolute dataset week index for this slider position. */
  weekIndex: number;
  dateISO: string;
  result: LeaderboardResult;
}

/** The cumulative (season start → this week, inclusive) standings at one slider position, or null past the season's real data. */
export function snapshotAt(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  season: Pick<Season, 'startISO' | 'endISO'>,
  seasonOffset: number,
): TimeMachineSnapshot | null {
  const weeks = seasonWeeks(dataset, season);
  if (seasonOffset < 0 || seasonOffset >= weeks.length) return null;
  const cumulative = weeks.slice(0, seasonOffset + 1);
  const result = buildLeaderboard({
    members: dataset.members,
    scores: dataset.scores,
    weekIndexes: cumulative,
    weekCount: dataset.weekCount,
    metric: 'overall',
    config,
  });
  return { seasonOffset, weekIndex: weeks[seasonOffset], dateISO: weekStartISO(dataset.firstWeekStart, weeks[seasonOffset]), result };
}

export interface MemberWeekChange {
  memberId: string;
  rank: number | null;
  previousRank: number | null;
  /** previousRank - rank: positive = moved up. Null with no previous snapshot (week 1) or either side unranked. */
  rankMove: number | null;
  overall: number | null;
  previousOverall: number | null;
  /** This week's own raw value minus last week's, per category. Null (never 0) when either side is missing data. */
  categoryDeltas: Record<CategoryKey, number | null>;
}

/** Per-member week-over-week change at one slider position. Empty before the season has any weeks. */
export function computeWeekChanges(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  season: Pick<Season, 'startISO' | 'endISO'>,
  seasonOffset: number,
): MemberWeekChange[] {
  const current = snapshotAt(dataset, config, season, seasonOffset);
  if (!current) return [];
  const previous = seasonOffset > 0 ? snapshotAt(dataset, config, season, seasonOffset - 1) : null;
  const weeks = seasonWeeks(dataset, season);
  const thisWeekIndex = weeks[seasonOffset];
  const prevWeekIndex = seasonOffset > 0 ? weeks[seasonOffset - 1] : null;

  return current.result.rows.map((row): MemberWeekChange => {
    const prevRow = previous?.result.rows.find((r) => r.member.id === row.member.id) ?? null;
    const categoryDeltas = {} as Record<CategoryKey, number | null>;
    for (const c of CATEGORY_KEYS) {
      const curVal = dataset.scores[row.member.id][c][thisWeekIndex];
      const prevVal = prevWeekIndex != null ? dataset.scores[row.member.id][c][prevWeekIndex] : null;
      categoryDeltas[c] = curVal != null && prevVal != null ? roundTo1(curVal - prevVal) : null;
    }
    return {
      memberId: row.member.id,
      rank: row.rank,
      previousRank: prevRow?.rank ?? null,
      rankMove: row.rank != null && prevRow?.rank != null ? prevRow.rank - row.rank : null,
      overall: row.current.overall,
      previousOverall: prevRow?.current.overall ?? null,
      categoryDeltas,
    };
  });
}

export type TimeMachineCaption =
  | { kind: 'first_week' }
  | { kind: 'no_notable_change' }
  | { kind: 'rank_move'; memberId: string; fromRank: number; toRank: number; category: CategoryKey | null; categoryDelta: number | null };

/**
 * One factual caption for a slider position: whoever moved up the most this
 * week, with their single biggest category swing if any category has
 * comparable data. Ties broken by member name (same convention as rank ties
 * elsewhere). Never invents a move or a category swing that isn't in the
 * computed changes — no previous snapshot or no positive mover both fall
 * back to an honest neutral caption instead.
 */
export function deriveCaption(changes: readonly MemberWeekChange[], members: readonly Member[], seasonOffset: number): TimeMachineCaption {
  if (seasonOffset === 0) return { kind: 'first_week' };

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const movedUp = changes.filter((c) => c.rankMove != null && c.rankMove > 0 && c.previousRank != null && c.rank != null);
  if (!movedUp.length) return { kind: 'no_notable_change' };

  const best = movedUp.reduce((a, b) => {
    if (b.rankMove! !== a.rankMove!) return b.rankMove! > a.rankMove! ? b : a;
    return nameOf(b.memberId) < nameOf(a.memberId) ? b : a;
  });

  let bestCategory: CategoryKey | null = null;
  let bestDelta = 0;
  for (const c of CATEGORY_KEYS) {
    const d = best.categoryDeltas[c];
    if (d != null && Math.abs(d) > Math.abs(bestDelta)) {
      bestDelta = d;
      bestCategory = c;
    }
  }

  return {
    kind: 'rank_move',
    memberId: best.memberId,
    fromRank: best.previousRank!,
    toRank: best.rank!,
    category: bestCategory,
    categoryDelta: bestCategory ? bestDelta : null,
  };
}
