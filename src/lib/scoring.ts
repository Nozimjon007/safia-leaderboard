/**
 * Scoring & ranking engine — pure functions, no React, no I/O.
 *
 * Rules implemented here (also shown to users on the "How scoring works" page):
 *
 * R1. A category's score for a period is the mean of the weekly values that
 *     exist in that period. A missing week is skipped, never counted as 0.
 * R2. If a category has no value anywhere in the period, it is left out
 *     (shown as a dash) and the overall score is computed from the remaining
 *     categories — that member's row is flagged "partial".
 * R3. A member with no score at all in the period is not ranked, but stays
 *     visible in an "unranked" list rather than disappearing.
 * R4. Ranking compares scores rounded to one decimal. Equal scores share a
 *     rank (1, 2, 2, 4 — competition ranking), broken by name for display order.
 * R5. Rank movement compares against the previous period of the same length,
 *     immediately before the selected one, within the same shift/area filter.
 *     If that previous period isn't fully covered by the data, no comparison
 *     is shown (move = null) rather than a misleading partial one.
 * R6. Periods snap to whole Monday–Sunday weeks. Search narrows which rows
 *     are *displayed*; it never changes rank numbers or the team average —
 *     those are computed over the full filtered (shift/area) pool first.
 *
 * The overall-score weights and the 80 / 65 zone thresholds are configurable
 * placeholders, not verified business rules — see `types.ts` and the scoring
 * page for why.
 */

import { CATEGORY_KEYS, type CategoryKey } from '../data/types';
import type { Member, MemberScores, MetricKey, ScoringConfig, SortDirection, SortKey, Zone } from '../data/types';

export function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Mean of the non-null values; null if none exist (R1/R2). */
export function mean(values: ReadonlyArray<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

export interface PeriodStats {
  categories: Record<CategoryKey, number | null>;
  overall: number | null;
  /** Categories with no data anywhere in the period (R2). */
  missingCategories: CategoryKey[];
}

/** Weighted mean over categories that both have a value and a positive weight. */
export function weightedOverall(
  categoryValues: Record<CategoryKey, number | null>,
  weights: Record<CategoryKey, number>,
): number | null {
  let sum = 0;
  let weightTotal = 0;
  for (const c of CATEGORY_KEYS) {
    const v = categoryValues[c];
    const w = Number(weights[c]) || 0;
    if (v != null && w > 0) {
      sum += v * w;
      weightTotal += w;
    }
  }
  return weightTotal > 0 ? sum / weightTotal : null;
}

/** A single week's overall score (used for sparklines and history charts). */
export function weekOverall(scores: MemberScores, weekIndex: number, config: ScoringConfig): number | null {
  const cats = {} as Record<CategoryKey, number | null>;
  for (const c of CATEGORY_KEYS) cats[c] = scores[c][weekIndex] ?? null;
  return weightedOverall(cats, config.weights);
}

/** Per-category and overall stats for a member across the given week indexes (R1/R2). */
export function computePeriodStats(
  scores: MemberScores,
  weekIndexes: readonly number[],
  config: ScoringConfig,
): PeriodStats {
  const categories = {} as Record<CategoryKey, number | null>;
  for (const c of CATEGORY_KEYS) {
    categories[c] = mean(weekIndexes.map((i) => scores[c][i] ?? null));
  }
  return {
    categories,
    overall: weightedOverall(categories, config.weights),
    missingCategories: CATEGORY_KEYS.filter((c) => categories[c] == null),
  };
}

export function metricValue(stats: PeriodStats, metric: MetricKey): number | null {
  return metric === 'overall' ? stats.overall : stats.categories[metric];
}

export function zoneOf(value: number | null, config: ScoringConfig): Zone {
  if (value == null) return 'na';
  if (value >= config.greenThreshold) return 'good';
  if (value < config.attentionThreshold) return 'low';
  return 'mid';
}

/**
 * Competition ranking (1, 2, 2, 4) on values rounded to one decimal (R4).
 * Entries with a null value are left out of the map — the caller treats a
 * missing map entry as "unranked" (R3).
 */
export function competitionRank(items: ReadonlyArray<{ id: string; value: number | null }>): Map<string, number> {
  const present = items
    .filter((x): x is { id: string; value: number } => x.value != null)
    .map((x) => ({ id: x.id, r: roundTo1(x.value) }));
  const map = new Map<string, number>();
  for (const item of present) {
    const better = present.filter((other) => other.r > item.r).length;
    map.set(item.id, 1 + better);
  }
  return map;
}

/** The previous period of equal length immediately before `weekIndexes`, or null if not fully in range (R5). */
export function previousWeekIndexes(weekIndexes: readonly number[]): number[] | null {
  if (!weekIndexes.length) return null;
  const n = weekIndexes.length;
  const first = weekIndexes[0];
  const prevFirst = first - n;
  if (prevFirst < 0) return null;
  return Array.from({ length: n }, (_, k) => prevFirst + k);
}

export interface LeaderboardRow {
  member: Member;
  current: PeriodStats;
  previous: PeriodStats | null;
  /** Rank by the selected metric within the filtered pool; null = unranked (R3). */
  rank: number | null;
  previousRank: number | null;
  /** previousRank - rank: positive = moved up (improved). Null when no comparable previous period (R5). */
  move: number | null;
  /** Up to 8 weekly overall scores ending at the period's last week, for the trend sparkline. */
  trend: ReadonlyArray<number | null>;
}

export interface TeamStats {
  average: number | null;
  previousAverage: number | null;
  /** Members with a score in the period (the denominator shown next to zone counts). */
  scoredCount: number;
  greenCount: number;
  attentionCount: number;
  categoryAverages: Record<CategoryKey, number | null>;
  previousCategoryAverages: Record<CategoryKey, number | null>;
}

export interface LeaderboardResult {
  rows: LeaderboardRow[];
  weekIndexes: number[];
  previousWeekIndexes: number[] | null;
  team: TeamStats;
  topImprovement: LeaderboardRow | null;
}

export interface BuildLeaderboardParams {
  members: readonly Member[];
  scores: Record<string, MemberScores>;
  weekIndexes: readonly number[];
  weekCount: number;
  metric: MetricKey;
  config: ScoringConfig;
  trendLookbackWeeks?: number;
}

function trendWeeks(
  scores: MemberScores,
  weekIndexes: readonly number[],
  weekCount: number,
  config: ScoringConfig,
  lookback: number,
): Array<number | null> {
  const end = weekIndexes.length ? weekIndexes[weekIndexes.length - 1] : weekCount - 1;
  const start = Math.max(0, end - (lookback - 1));
  const out: Array<number | null> = [];
  for (let i = start; i <= end; i++) out.push(weekOverall(scores, i, config));
  return out;
}

/** Builds ranked rows + team stats for an already-filtered (shift/area) member pool. */
export function buildLeaderboard(params: BuildLeaderboardParams): LeaderboardResult {
  const { members, scores, weekIndexes, weekCount, metric, config, trendLookbackWeeks = 8 } = params;
  const prevIdx = previousWeekIndexes(weekIndexes);

  const base = members.map((member) => {
    const memberScores = scores[member.id];
    const current = computePeriodStats(memberScores, weekIndexes, config);
    const previous = prevIdx ? computePeriodStats(memberScores, prevIdx, config) : null;
    return { member, current, previous };
  });

  const currentRanks = competitionRank(base.map((r) => ({ id: r.member.id, value: metricValue(r.current, metric) })));
  const previousRanks = prevIdx
    ? competitionRank(base.map((r) => ({ id: r.member.id, value: r.previous ? metricValue(r.previous, metric) : null })))
    : new Map<string, number>();

  const rows: LeaderboardRow[] = base.map(({ member, current, previous }) => {
    const rank = currentRanks.get(member.id) ?? null;
    const previousRank = previousRanks.get(member.id) ?? null;
    const move = rank != null && previousRank != null ? previousRank - rank : null;
    return {
      member,
      current,
      previous,
      rank,
      previousRank,
      move,
      trend: trendWeeks(scores[member.id], weekIndexes, weekCount, config, trendLookbackWeeks),
    };
  });

  rows.sort((a, b) => {
    const ra = a.rank ?? Number.POSITIVE_INFINITY;
    const rb = b.rank ?? Number.POSITIVE_INFINITY;
    return ra - rb || a.member.name.localeCompare(b.member.name);
  });

  const categoryAverages = {} as Record<CategoryKey, number | null>;
  const previousCategoryAverages = {} as Record<CategoryKey, number | null>;
  for (const c of CATEGORY_KEYS) {
    categoryAverages[c] = mean(rows.map((r) => r.current.categories[c]));
    previousCategoryAverages[c] = prevIdx ? mean(rows.map((r) => r.previous?.categories[c] ?? null)) : null;
  }
  const scoredRows = rows.filter((r) => r.current.overall != null);
  const team: TeamStats = {
    average: mean(rows.map((r) => r.current.overall)),
    previousAverage: prevIdx ? mean(rows.map((r) => r.previous?.overall ?? null)) : null,
    scoredCount: scoredRows.length,
    greenCount: scoredRows.filter((r) => zoneOf(r.current.overall, config) === 'good').length,
    attentionCount: scoredRows.filter((r) => zoneOf(r.current.overall, config) === 'low').length,
    categoryAverages,
    previousCategoryAverages,
  };

  const topImprovement =
    rows
      .filter((r) => r.move != null && r.move > 0)
      .sort((a, b) => (b.move as number) - (a.move as number) || (a.rank as number) - (b.rank as number))[0] ?? null;

  return { rows, weekIndexes: [...weekIndexes], previousWeekIndexes: prevIdx, team, topImprovement };
}

/** Weekly rank (by `metric`) for every member in `members`, over the last `lookback` weeks ending at the period's last selected week. */
export function weeklyRankSeries(
  members: readonly Member[],
  scores: Record<string, MemberScores>,
  weekIndexes: readonly number[],
  weekCount: number,
  metric: MetricKey,
  config: ScoringConfig,
  lookback = 8,
): { fromWeek: number; toWeek: number; seriesByMemberId: Record<string, Array<number | null>> } {
  const toWeek = weekIndexes.length ? weekIndexes[weekIndexes.length - 1] : weekCount - 1;
  const fromWeek = Math.max(0, toWeek - lookback + 1);
  const seriesByMemberId: Record<string, Array<number | null>> = {};
  members.forEach((m) => (seriesByMemberId[m.id] = []));
  for (let w = fromWeek; w <= toWeek; w++) {
    const values = members.map((m) => ({
      id: m.id,
      value: metric === 'overall' ? weekOverall(scores[m.id], w, config) : (scores[m.id][metric][w] ?? null),
    }));
    const ranks = competitionRank(values);
    members.forEach((m) => seriesByMemberId[m.id].push(ranks.get(m.id) ?? null));
  }
  return { fromWeek, toWeek, seriesByMemberId };
}

export function sortRows(rows: readonly LeaderboardRow[], key: SortKey, direction: SortDirection): LeaderboardRow[] {
  const mul = direction === 'asc' ? 1 : -1;
  const valueOf = (row: LeaderboardRow): number | string | null => {
    switch (key) {
      case 'rank':
        return row.rank;
      case 'name':
        return row.member.name.toLowerCase();
      case 'overall':
        return row.current.overall;
      case 'move':
        return row.move;
      default:
        return row.current.categories[key];
    }
  };
  return [...rows].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (va == null && vb == null) return a.member.name.localeCompare(b.member.name);
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number);
    return cmp !== 0 ? cmp * mul : a.member.name.localeCompare(b.member.name);
  });
}

export function filterRowsByQuery(rows: readonly LeaderboardRow[], query: string): LeaderboardRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => r.member.name.toLowerCase().includes(q) || r.member.area.toLowerCase().includes(q));
}

export interface CategoryGap {
  category: CategoryKey;
  value: number;
  /** value - team average for the same category/period. */
  gap: number;
}

/** Up to `limit` categories where the member beats (strengths) or trails (weaknesses) the team average. */
export function strengthsAndWeaknesses(
  categories: Record<CategoryKey, number | null>,
  teamCategories: Record<CategoryKey, number | null>,
  limit = 2,
): { strengths: CategoryGap[]; weaknesses: CategoryGap[] } {
  const gaps: CategoryGap[] = CATEGORY_KEYS.filter((c) => categories[c] != null && teamCategories[c] != null).map(
    (c) => ({ category: c, value: categories[c] as number, gap: (categories[c] as number) - (teamCategories[c] as number) }),
  );
  const strengths = gaps
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, limit);
  const weaknesses = gaps
    .filter((g) => g.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, limit);
  return { strengths, weaknesses };
}

/** Direction of a trend series (e.g. the sparkline): compares the first and last present values. */
export function trendDirection(values: ReadonlyArray<number | null>): { direction: -1 | 0 | 1; delta: number | null } {
  const present = values.filter((v): v is number => v != null);
  if (present.length < 2) return { direction: 0, delta: null };
  const delta = present[present.length - 1] - present[0];
  if (Math.abs(delta) < 0.5) return { direction: 0, delta };
  return { direction: delta > 0 ? 1 : -1, delta };
}

export interface RowHighlight {
  strongest: { category: CategoryKey; value: number } | null;
  mostImproved: { category: CategoryKey; delta: number } | null;
}

/** A one-line "what stands out" summary for a leaderboard card, derived from real per-row data. */
export function computeHighlight(current: PeriodStats, previous: PeriodStats | null): RowHighlight {
  const present = CATEGORY_KEYS.filter((c) => current.categories[c] != null).sort(
    (a, b) => (current.categories[b] as number) - (current.categories[a] as number),
  );
  let mostImproved: RowHighlight['mostImproved'] = null;
  if (previous) {
    for (const c of CATEGORY_KEYS) {
      const cur = current.categories[c];
      const prev = previous.categories[c];
      if (cur != null && prev != null) {
        const delta = cur - prev;
        if (delta > 0 && (!mostImproved || delta > mostImproved.delta)) mostImproved = { category: c, delta };
      }
    }
  }
  return {
    strongest: present[0] ? { category: present[0], value: current.categories[present[0]] as number } : null,
    mostImproved,
  };
}

export type ComparisonSide = 'a' | 'b' | 'tie' | 'na';

export interface ComparisonCategoryEntry {
  category: CategoryKey;
  a: number | null;
  b: number | null;
  /** Who's ahead in this category, rounded to one decimal (R4) so near-equal values read as ties. 'na' when either side has no data. */
  leader: ComparisonSide;
}

export interface MemberComparison {
  a: PeriodStats;
  b: PeriodStats;
  categories: ComparisonCategoryEntry[];
  overallLeader: ComparisonSide;
  aWins: number;
  bWins: number;
  ties: number;
  /** Categories where neither side has data. */
  bothMissing: CategoryKey[];
}

function leaderOf(a: number | null, b: number | null): ComparisonSide {
  if (a == null || b == null) return 'na';
  const ra = roundTo1(a);
  const rb = roundTo1(b);
  if (ra === rb) return 'tie';
  return ra > rb ? 'a' : 'b';
}

/** Head-to-head comparison of two members over the same weeks (so it's a fair, apples-to-apples read regardless of their shift/area). */
export function compareMembers(
  scoresA: MemberScores,
  scoresB: MemberScores,
  weekIndexes: readonly number[],
  config: ScoringConfig,
): MemberComparison {
  const a = computePeriodStats(scoresA, weekIndexes, config);
  const b = computePeriodStats(scoresB, weekIndexes, config);

  const categories: ComparisonCategoryEntry[] = CATEGORY_KEYS.map((c) => ({
    category: c,
    a: a.categories[c],
    b: b.categories[c],
    leader: leaderOf(a.categories[c], b.categories[c]),
  }));

  return {
    a,
    b,
    categories,
    overallLeader: leaderOf(a.overall, b.overall),
    aWins: categories.filter((c) => c.leader === 'a').length,
    bWins: categories.filter((c) => c.leader === 'b').length,
    ties: categories.filter((c) => c.leader === 'tie').length,
    bothMissing: categories.filter((c) => c.leader === 'na' && c.a == null && c.b == null).map((c) => c.category),
  };
}
