/**
 * Achievement badges — demo content.
 *
 * There is no official Safia achievement catalog, so this is a small, fixed
 * set of **rule-based** badges computed from real scoring data (never a
 * fabricated per-member flag). Every rule below is deterministic and
 * documented; the UI labels these as demo/illustrative wherever they're
 * shown. Only *approved* seasons are eligible (see lib/seasons.ts) — every
 * rule here declares a "winner" of some kind (#1, category leader, biggest
 * improvement), so none of them fire until a season's approval grace window
 * has elapsed, exactly like its rewards. A season's badges are computed
 * from its frozen standings and never change once computed.
 *
 * Rules:
 * - `champion`        — finished a completed season ranked #1 overall.
 * - `podium`           — finished a completed season ranked #1–#3 overall.
 * - `most_improved`    — was that season's largest rank gain vs. its
 *                         previous period (the same "biggest rank increase"
 *                         the leaderboard's KPI tile surfaces).
 * - `green_streak`     — 4+ consecutive weeks at/above the green-zone
 *                         threshold within one season.
 * - `full_attendance`  — no missing Давомат (attendance) weeks anywhere in
 *                         a season.
 * - `category_leader`  — ranked #1 in a specific category for a season.
 */
import { CATEGORY_KEYS, type AchievementId, type CategoryKey, type EarnedAchievement, type LeaderboardDataset, type ScoringConfig, type XpTier } from '../data/types';
import type { Season } from './seasons';
import { isSeasonApproved } from './seasons';
import { buildLeaderboard, weekOverall } from './scoring';
import { weekIndexesInRange } from './dates';

export const ACHIEVEMENT_IDS: readonly AchievementId[] = [
  'champion',
  'podium',
  'most_improved',
  'green_streak',
  'full_attendance',
  'category_leader',
];

/** Shared icon per achievement, reused everywhere a badge is rendered (profile panel, compact card). */
export const ACHIEVEMENT_GLYPHS: Record<AchievementId, string> = {
  champion: '★', // star
  podium: '▲', // triangle
  most_improved: '↗', // arrow up-right
  green_streak: '●', // dot
  full_attendance: '✓', // check
  category_leader: '◆', // diamond
};

/** A presentational prestige tier for the Leadership Passport's medallion display — reuses the same
 * bronze/silver/gold/platinum vocabulary as Craft Mastery (lib/craftPaths.ts) for one consistent
 * "how prestigious" language across the whole passport, not a second competing scale. This is a
 * demo grouping by ACHIEVEMENT_PRIORITY's own relative-prestige order below, not an official Safia
 * ranking of one achievement over another. */
export const ACHIEVEMENT_TIER: Record<AchievementId, XpTier> = {
  champion: 'platinum',
  podium: 'gold',
  most_improved: 'gold',
  category_leader: 'silver',
  green_streak: 'silver',
  full_attendance: 'bronze',
};

/** Distinct achievement types a member has earned at least once, in the fixed ACHIEVEMENT_IDS order. */
export function earnedAchievementTypes(earned: readonly EarnedAchievement[]): AchievementId[] {
  const present = new Set(earned.map((e) => e.id));
  return ACHIEVEMENT_IDS.filter((id) => present.has(id));
}

const GREEN_STREAK_MIN_WEEKS = 4;

/** All members' earned achievements, across every approved season — computed once per (dataset, config, seasons) triple. */
export function computeAllAchievements(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  seasons: readonly Season[],
  nowMs: number = Date.now(),
): Record<string, EarnedAchievement[]> {
  const byMember: Record<string, EarnedAchievement[]> = {};
  dataset.members.forEach((m) => (byMember[m.id] = []));

  const approvedSeasons = seasons.filter((s) => isSeasonApproved(s, nowMs));

  for (const season of approvedSeasons) {
    const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
    if (!weekIndexes.length) continue;

    const overallResult = buildLeaderboard({
      members: dataset.members,
      scores: dataset.scores,
      weekIndexes,
      weekCount: dataset.weekCount,
      metric: 'overall',
      config,
    });
    for (const row of overallResult.rows) {
      if (row.rank === 1) byMember[row.member.id].push({ id: 'champion', seasonId: season.id });
      if (row.rank != null && row.rank <= 3) byMember[row.member.id].push({ id: 'podium', seasonId: season.id });
    }
    if (overallResult.topImprovement) {
      byMember[overallResult.topImprovement.member.id].push({ id: 'most_improved', seasonId: season.id });
    }

    for (const category of CATEGORY_KEYS) {
      const catResult = buildLeaderboard({
        members: dataset.members,
        scores: dataset.scores,
        weekIndexes,
        weekCount: dataset.weekCount,
        metric: category,
        config,
      });
      const leader = catResult.rows.find((r) => r.rank === 1);
      if (leader) byMember[leader.member.id].push({ id: 'category_leader', seasonId: season.id, detail: category });
    }

    for (const member of dataset.members) {
      const attendance = weekIndexes.map((i) => dataset.scores[member.id].attendance[i]);
      if (attendance.length > 0 && attendance.every((v) => v != null)) {
        byMember[member.id].push({ id: 'full_attendance', seasonId: season.id });
      }

      const weeklyOveralls = weekIndexes.map((i) => weekOverall(dataset.scores[member.id], i, config));
      let streak = 0;
      let maxStreak = 0;
      for (const v of weeklyOveralls) {
        if (v != null && v >= config.greenThreshold) {
          streak += 1;
          maxStreak = Math.max(maxStreak, streak);
        } else {
          streak = 0;
        }
      }
      if (maxStreak >= GREEN_STREAK_MIN_WEEKS) byMember[member.id].push({ id: 'green_streak', seasonId: season.id });
    }
  }

  return byMember;
}

export function mostRecentBySeason(earned: readonly EarnedAchievement[], id: AchievementId): EarnedAchievement | null {
  const matches = earned.filter((e) => e.id === id);
  if (!matches.length) return null;
  return matches.reduce((latest, cur) => (cur.seasonId > latest.seasonId ? cur : latest));
}

export function countOf(earned: readonly EarnedAchievement[], id: AchievementId): number {
  return earned.filter((e) => e.id === id).length;
}

/** For 'category_leader', which categories were actually led (a member could lead more than one). */
export function categoryLeaderDetails(earned: readonly EarnedAchievement[]): CategoryKey[] {
  const set = new Set<CategoryKey>();
  for (const e of earned) if (e.id === 'category_leader' && e.detail) set.add(e.detail as CategoryKey);
  return Array.from(set);
}

// Most-impressive-first: shared by anywhere only one "best" badge can be shown (career highlight,
// podium card emblem) so the ranking can't quietly drift out of sync between those call sites.
export const ACHIEVEMENT_PRIORITY: readonly AchievementId[] = [
  'champion',
  'podium',
  'most_improved',
  'category_leader',
  'green_streak',
  'full_attendance',
];

/** The single highest-priority achievement a member has earned, most recent season wins ties, or null. */
export function bestAchievement(earned: readonly EarnedAchievement[]): EarnedAchievement | null {
  for (const id of ACHIEVEMENT_PRIORITY) {
    const match = mostRecentBySeason(earned, id);
    if (match) return match;
  }
  return null;
}
