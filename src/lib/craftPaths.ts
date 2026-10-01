/**
 * Leadership Passport — four leadership paths, layered entirely on top of the same weekly category
 * scores everything else in this app already uses. There is no separate "achievement feed" or
 * random-event generator here: every milestone is earned from a real, already-scored week meeting a
 * real threshold. That's the anti-gaming guarantee by construction —
 *   - a week with no score never counts (missing data can never earn or cost anything — see
 *     qualifyingWeeks below, which only ever looks at present values);
 *   - "strong output" (`output`) requires a real safety/vigilance floor in the *same* week
 *     (OUTPUT_SAFE_CONCERN_FLOOR), so raw speed/volume alone can never earn a milestone;
 *   - every milestone maps to one already-published, already-verified scoring category, never a raw
 *     activity count — nothing here rewards rushing a handover or logging unnecessary issue reports,
 *     and every member is scored the same 0-100 way regardless of their team's size;
 *   - nothing here is a self-reported or unverifiable action.
 *
 * The four paths, their milestones, thresholds, and the four season distinctions below are a
 * clearly-labeled proposed model, not an official Safia program — see craft_path_disclaimer in the
 * i18n dictionaries, shown everywhere this is presented.
 */
import type { CategoryKey, LeaderboardDataset, Member, ScoringConfig, XpTier } from '../data/types';
import type { Season } from './seasons';
import { isSeasonApproved } from './seasons';
import { weekIndexesInRange } from '../lib/dates';
import { computePeriodStats, competitionRank } from './scoring';

export type CraftConcept = 'output' | 'precision' | 'kaizen' | 'vigilance' | 'attendance';

export const CRAFT_CONCEPT_CATEGORY: Record<CraftConcept, CategoryKey> = {
  output: 'load',
  precision: 'control',
  kaizen: 'kaizen',
  vigilance: 'concern',
  attendance: 'attendance',
};

const ALL_CONCEPTS: readonly CraftConcept[] = ['output', 'precision', 'kaizen', 'vigilance', 'attendance'];

/** A qualifying week's score threshold, per concept — unchanged from the single-path model; only
 * how many such weeks a given milestone asks for (below) varies by tier. */
export const CONCEPT_THRESHOLD: Record<CraftConcept, number> = {
  output: 90,
  precision: 90,
  kaizen: 88,
  vigilance: 90,
  attendance: 97,
};

/** A strong `output` week only counts when concern (safety/vigilance) didn't drop to get there —
 * the concrete anti-gaming rule for "no reward for unsafe speed" (see module docs). */
const OUTPUT_SAFE_CONCERN_FLOOR = 70;

export type LeadershipPathId = 'shift_excellence' | 'people_coach' | 'quality_safety' | 'problem_solver';

export const LEADERSHIP_PATH_IDS: readonly LeadershipPathId[] = ['shift_excellence', 'people_coach', 'quality_safety', 'problem_solver'];

export interface CraftMissionDef {
  /** Stable, unique id — never reused, so a member's earned-milestone history stays meaningful even
   * if these definitions are later retuned. */
  id: string;
  pathId: LeadershipPathId;
  concept: CraftConcept;
  /** Qualifying weeks needed within one season to earn this milestone. */
  threshold: number;
}

function pathMission(pathId: LeadershipPathId, concept: CraftConcept, threshold: number): CraftMissionDef {
  return { id: `${pathId}_${concept}_${threshold}`, pathId, concept, threshold };
}

export interface LeadershipPathDef {
  id: LeadershipPathId;
  /** Ordered easiest to hardest — "a small number of progressively more meaningful milestones". */
  missions: readonly CraftMissionDef[];
}

/**
 * Four leadership paths for the one role this product ranks (team leaders only — see
 * data/demoData.ts's scope note). Every milestone maps to a scoring category a team leader can
 * actually influence directly, reusing the same five categories and thresholds the rest of the app
 * already scores on; nothing here changes a real business formula, and no path invents a metric that
 * doesn't already exist elsewhere on the leaderboard:
 *  - Shift Excellence: output (Workload) for steady coordination, attendance (Attendance) for a
 *    dependable handover — two different real skills, so it's the one path with two concepts.
 *  - People Coach: precision (Supervision) at two thresholds — this category IS oversight of
 *    others' work, the closest verified proxy this dataset has for coaching quality.
 *  - Quality & Safety: vigilance (Concern) at two thresholds — unchanged concept, leadership framing.
 *  - Problem Solver: kaizen (Kaizen) at two thresholds — approved process improvements, unchanged.
 */
export const LEADERSHIP_PATHS: readonly LeadershipPathDef[] = [
  { id: 'shift_excellence', missions: [pathMission('shift_excellence', 'output', 4), pathMission('shift_excellence', 'attendance', 5)] },
  { id: 'people_coach', missions: [pathMission('people_coach', 'precision', 3), pathMission('people_coach', 'precision', 6)] },
  { id: 'quality_safety', missions: [pathMission('quality_safety', 'vigilance', 4), pathMission('quality_safety', 'vigilance', 7)] },
  { id: 'problem_solver', missions: [pathMission('problem_solver', 'kaizen', 3), pathMission('problem_solver', 'kaizen', 6)] },
] as const;

function allMissionDefs(): readonly CraftMissionDef[] {
  return LEADERSHIP_PATHS.flatMap((p) => p.missions);
}

/** 1 or 2 — this mission's position within its own path's (ordered, easiest-first) milestone list,
 * for building its `leadership_milestone_{pathId}_{tier}_title` translation key. Every path has
 * exactly two today; this stays correct even if that changes. */
export function milestoneTier(def: CraftMissionDef): number {
  const path = LEADERSHIP_PATHS.find((p) => p.id === def.pathId);
  const idx = path?.missions.findIndex((m) => m.id === def.id) ?? -1;
  return idx + 1;
}

/** Back-compat resolver for callers that only need "does this role have a leadership path" plus a
 * `.role` field (the leaderboard's compact star-preview, My Next Move) — never used to look up
 * mission defs directly; use LEADERSHIP_PATHS / allMissionDefs for that. */
export function craftPathForRole(role: string): { role: string } | null {
  return role === 'Team Leader' ? { role } : null;
}

/** The real, already-scored weeks (within `weekIndexes`) that satisfy one concept's threshold —
 * the "explicit demo event" for that concept. A missing week is simply not present here; it is
 * never counted against the member (see module docs). */
export function qualifyingWeeks(dataset: LeaderboardDataset, memberId: string, weekIndexes: readonly number[], concept: CraftConcept): number[] {
  const scores = dataset.scores[memberId];
  const category = CRAFT_CONCEPT_CATEGORY[concept];
  const threshold = CONCEPT_THRESHOLD[concept];
  return weekIndexes.filter((w) => {
    const v = scores[category][w];
    if (v == null) return false;
    if (v < threshold) return false;
    if (concept === 'output' && (scores.concern[w] == null || (scores.concern[w] as number) < OUTPUT_SAFE_CONCERN_FLOOR)) return false;
    return true;
  });
}

/** The short "role-mastery preview" shown in the table/card explorer — enough to show at a glance
 * without recomputing the member's full progress in every consumer. */
export interface CraftPreview {
  role: string;
  stars: number;
  possible: number;
}

export interface CraftMissionProgress {
  def: CraftMissionDef;
  current: number;
  complete: boolean;
  /** The week (within the season) whose qualifying event completed this milestone — "where/when this
   * was earned" — null until `complete`. */
  earnedWeekIndex: number | null;
}

/** Flat progress across every milestone in every path (8 today), in LEADERSHIP_PATHS order — the
 * shape existing consumers (CraftJournal, clan contribution points, My Next Move's "next star")
 * already depend on; see computeLeadershipPathsProgress for the path-grouped view the profile's
 * Leadership Passport uses instead. */
export interface CraftPathProgress {
  role: string;
  missions: CraftMissionProgress[];
  starsEarned: number;
  starsPossible: number;
}

function computeMissionProgress(dataset: LeaderboardDataset, memberId: string, weekIndexes: readonly number[], def: CraftMissionDef): CraftMissionProgress {
  const weeks = qualifyingWeeks(dataset, memberId, weekIndexes, def.concept);
  const complete = weeks.length >= def.threshold;
  return {
    def,
    current: Math.min(weeks.length, def.threshold),
    complete,
    earnedWeekIndex: complete ? weeks[def.threshold - 1] : null,
  };
}

/** One member's flat milestone progress for one season — null if their role has no defined path
 * (should not happen for the demo roster, but a real data source's role list won't always match). */
export function computeCraftPathProgress(dataset: LeaderboardDataset, member: Member, season: Season): CraftPathProgress | null {
  if (!craftPathForRole(member.role)) return null;
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  const missions = allMissionDefs().map((def) => computeMissionProgress(dataset, member.id, weekIndexes, def));
  return { role: member.role, missions, starsEarned: missions.filter((m) => m.complete).length, starsPossible: missions.length };
}

export interface LeadershipPathProgress {
  pathId: LeadershipPathId;
  missions: CraftMissionProgress[];
  starsEarned: number;
  starsPossible: number;
}

/** The Leadership Passport's own view: the same computation as computeCraftPathProgress, grouped
 * back into its four paths — one call, one source of truth, no duplicate scoring logic. */
export function computeLeadershipPathsProgress(dataset: LeaderboardDataset, member: Member, season: Season): LeadershipPathProgress[] | null {
  const progress = computeCraftPathProgress(dataset, member, season);
  if (!progress) return null;
  return LEADERSHIP_PATHS.map((path) => {
    const missions = progress.missions.filter((m) => m.def.pathId === path.id);
    return { pathId: path.id, missions, starsEarned: missions.filter((m) => m.complete).length, starsPossible: missions.length };
  });
}

/** The one concrete, verified task standing between a member and their next milestone — the first
 * incomplete mission in path order, or null once every milestone this season is already complete.
 * "Exact" and "verified" in the sense My Next Move / the profile's "next milestone" callout promise:
 * current/threshold both come straight from real qualifying weeks already counted above, never an
 * estimate. */
export function nextCraftMissionGoal(progress: CraftPathProgress | null): CraftMissionProgress | null {
  return progress?.missions.find((m) => !m.complete) ?? null;
}

export interface CraftMastery {
  totalStars: number;
  tier: XpTier;
  /** Milestones still needed to reach the next tier, and its name — both null at the top tier. */
  toNextTier: number | null;
  nextTier: XpTier | null;
}

/** Configurable lifetime thresholds — see module docs on this being a proposed, not official, model.
 * Scaled from the original single-path model's 0/5/12/24 to keep the same rough pacing (seasons to
 * reach each tier) now that there are 8 possible milestones a season instead of 5, not 5/5 * 8. */
const CAREER_TIER_THRESHOLDS: readonly { tier: XpTier; min: number }[] = [
  { tier: 'platinum', min: 40 },
  { tier: 'gold', min: 20 },
  { tier: 'silver', min: 8 },
  { tier: 'bronze', min: 0 },
];

/** Lifetime mastery — summed only from *approved* seasons (see lib/seasons.ts's isSeasonApproved),
 * so a still-live season's in-progress milestones never inflate a permanent career record before
 * they're final, exactly like this app's rewards/achievements. */
export function computeCraftMastery(dataset: LeaderboardDataset, member: Member, seasons: readonly Season[], nowMs: number = Date.now()): CraftMastery {
  let totalStars = 0;
  for (const season of seasons) {
    if (!isSeasonApproved(season, nowMs)) continue;
    const progress = computeCraftPathProgress(dataset, member, season);
    if (progress) totalStars += progress.starsEarned;
  }
  const tier = CAREER_TIER_THRESHOLDS.find((t) => totalStars >= t.min)?.tier ?? 'bronze';
  const currentIdx = CAREER_TIER_THRESHOLDS.findIndex((t) => t.tier === tier);
  const next = currentIdx > 0 ? CAREER_TIER_THRESHOLDS[currentIdx - 1] : null;
  return { totalStars, tier, toNextTier: next ? next.min - totalStars : null, nextTier: next?.tier ?? null };
}

export interface RoleRank {
  rank: number | null;
  total: number;
}

/** Rank among same-role peers only (by overall score, same convention as the season's main rank),
 * for the period covered by `weekIndexes` — "role rank alongside overall rank". */
export function computeRoleRank(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  weekIndexes: readonly number[],
  memberId: string,
): RoleRank {
  const member = dataset.members.find((m) => m.id === memberId);
  if (!member) return { rank: null, total: 0 };
  const peers = dataset.members.filter((m) => m.role === member.role);
  const ranks = competitionRank(
    peers.map((m) => ({ id: m.id, value: computePeriodStats(dataset.scores[m.id], weekIndexes, config).overall })),
  );
  return { rank: ranks.get(memberId) ?? null, total: peers.length };
}

export type DistinctionId = 'most_improved_craft' | 'quality_guardian' | 'kaizen_champion' | 'team_mentor';

export interface SeasonDistinction {
  id: DistinctionId;
  memberId: string;
}

const MIN_WEEKS_FOR_DISTINCTION = 4;

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function stddev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values) as number;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

/**
 * The four cross-role season distinctions — deliberately separate from both the top-five overall
 * standings and the existing place_1/2/3/most_improved seasonal rewards (lib/rewards.ts): different
 * question ("who grew/specialized/steadied the most"), different data (craft events, category
 * averages, week-to-week consistency), so a member can hold a distinction without being a podium
 * finisher, and vice versa. At most one member per distinction; none are awarded if no one qualifies.
 */
export function computeSeasonDistinctions(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  season: Season,
  previousSeason: Season | null,
): SeasonDistinction[] {
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  if (!weekIndexes.length) return [];
  const out: SeasonDistinction[] = [];

  // Quality Guardian: highest `control` (precision) category average this season.
  // Kaizen Champion: highest `kaizen` category average this season.
  for (const [id, category] of [
    ['quality_guardian', 'control'],
    ['kaizen_champion', 'kaizen'],
  ] as const satisfies readonly [DistinctionId, CategoryKey][]) {
    let best: { memberId: string; value: number } | null = null;
    for (const m of dataset.members) {
      const values = weekIndexes.map((w) => dataset.scores[m.id][category][w]).filter((v): v is number => v != null);
      if (values.length < MIN_WEEKS_FOR_DISTINCTION) continue;
      const avg = mean(values) as number;
      if (!best || avg > best.value) best = { memberId: m.id, value: avg };
    }
    if (best) out.push({ id, memberId: best.memberId });
  }

  // Team Mentor: steadiest overall-score week-to-week (lowest stddev) among members holding at
  // least a mid-zone average — steadiness alone, with no baseline quality floor, isn't mentorship.
  {
    let best: { memberId: string; sd: number } | null = null;
    for (const m of dataset.members) {
      const weekly = weekIndexes
        .map((w) => computePeriodStats(dataset.scores[m.id], [w], config).overall)
        .filter((v): v is number => v != null);
      if (weekly.length < MIN_WEEKS_FOR_DISTINCTION) continue;
      const avg = mean(weekly) as number;
      if (avg < config.attentionThreshold) continue;
      const sd = stddev(weekly);
      if (sd == null) continue;
      if (!best || sd < best.sd) best = { memberId: m.id, sd };
    }
    if (best) out.push({ id: 'team_mentor', memberId: best.memberId });
  }

  // Most Improved (Craft): largest gain in qualifying craft-event count vs. the previous season —
  // real skill growth, distinct from the existing reward's rank-gain measure. Summed per CONCEPT
  // (five, once each), not per milestone def — a concept now backs two milestones (bronze/silver
  // tiers of the same skill), and counting both would double-weight precision/vigilance/kaizen
  // against output/attendance, which only ever back one.
  if (previousSeason) {
    const prevWeeks = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, previousSeason.startISO, previousSeason.endISO);
    if (prevWeeks.length) {
      let best: { memberId: string; delta: number } | null = null;
      for (const m of dataset.members) {
        if (!craftPathForRole(m.role)) continue;
        const countFor = (weeks: readonly number[]) => ALL_CONCEPTS.reduce((sum, concept) => sum + qualifyingWeeks(dataset, m.id, weeks, concept).length, 0);
        const delta = countFor(weekIndexes) - countFor(prevWeeks);
        if (delta > 0 && (!best || delta > best.delta)) best = { memberId: m.id, delta };
      }
      if (best) out.push({ id: 'most_improved_craft', memberId: best.memberId });
    }
  }

  return out;
}
