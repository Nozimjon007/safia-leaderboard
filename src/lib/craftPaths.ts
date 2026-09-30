/**
 * Craft Paths — a role-based progression feature, layered entirely on top of the same weekly
 * category scores everything else in this app already uses. There is no separate "achievement
 * feed" or random-event generator here: every craft star is earned from a real, already-scored
 * week meeting a real threshold. That's the anti-gaming guarantee by construction —
 *   - a week with no score never counts (missing data can never earn or cost anything — see
 *     qualifyingWeeks below, which only ever looks at present values);
 *   - "strong output" (`output`) requires a real safety/vigilance floor in the *same* week
 *     (OUTPUT_SAFE_CONCERN_FLOOR), so raw speed/volume alone can never earn a star;
 *   - every concept maps to one already-published, already-verified scoring category — nothing
 *     here is a self-reported or unverifiable action.
 *
 * Like the rest of the demo dataset, the six paths, their missions, thresholds and the four
 * season distinctions below are a clearly-labeled proposed model, not an official Safia program —
 * see craft_path_disclaimer in the i18n dictionaries, shown everywhere this is presented.
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

/** A qualifying week's score threshold, per concept. */
const CONCEPT_THRESHOLD: Record<CraftConcept, number> = {
  output: 90,
  precision: 90,
  kaizen: 88,
  vigilance: 90,
  attendance: 97,
};

/** A strong `output` week only counts when concern (safety/vigilance) didn't drop to get there —
 * the concrete anti-gaming rule for "no reward for unsafe speed" (see module docs). */
const OUTPUT_SAFE_CONCERN_FLOOR = 70;

export interface CraftMissionDef {
  /** Stable id, unique within its path — e.g. "baker_output". Never reused across roles even when
   * the concept repeats, so a member's earned-star history stays meaningful if their role changes. */
  id: string;
  concept: CraftConcept;
  /** Qualifying weeks needed within one season to earn this mission's star. */
  threshold: number;
}

export interface CraftPathDef {
  role: string;
  missions: readonly CraftMissionDef[];
}

function mission(role: string, concept: CraftConcept, threshold: number): CraftMissionDef {
  return { id: `${role.toLowerCase().replace(/\s+/g, '_')}_${concept}`, concept, threshold };
}

/** One path per role actually present in the demo roster (see data/demoData.ts) — adapted, not
 * invented: each path picks the 4 concepts that most plausibly matter for that job, at a threshold
 * that's meaningful but reachable within one ~13-week season. */
export const CRAFT_PATHS: readonly CraftPathDef[] = [
  {
    role: 'Baker',
    missions: [mission('Baker', 'output', 4), mission('Baker', 'precision', 4), mission('Baker', 'kaizen', 3), mission('Baker', 'attendance', 4)],
  },
  {
    role: 'Decorator',
    missions: [
      mission('Decorator', 'precision', 4),
      mission('Decorator', 'kaizen', 3),
      mission('Decorator', 'vigilance', 3),
      mission('Decorator', 'attendance', 4),
    ],
  },
  {
    role: 'Shift Lead',
    missions: [
      mission('Shift Lead', 'vigilance', 4),
      mission('Shift Lead', 'kaizen', 4),
      mission('Shift Lead', 'attendance', 4),
      mission('Shift Lead', 'output', 3),
    ],
  },
  {
    role: 'Packer',
    missions: [
      mission('Packer', 'output', 4),
      mission('Packer', 'precision', 4),
      mission('Packer', 'vigilance', 3),
      mission('Packer', 'attendance', 4),
    ],
  },
  {
    role: 'Cashier',
    missions: [
      mission('Cashier', 'precision', 4),
      mission('Cashier', 'vigilance', 4),
      mission('Cashier', 'kaizen', 3),
      mission('Cashier', 'attendance', 4),
    ],
  },
  {
    role: 'Delivery',
    missions: [
      mission('Delivery', 'output', 4),
      mission('Delivery', 'vigilance', 4),
      mission('Delivery', 'kaizen', 3),
      mission('Delivery', 'attendance', 4),
    ],
  },
] as const;

export function craftPathForRole(role: string): CraftPathDef | null {
  return CRAFT_PATHS.find((p) => p.role === role) ?? null;
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
 * without recomputing the member's full CraftPathProgress in every consumer. */
export interface CraftPreview {
  role: string;
  stars: number;
  possible: number;
}

export interface CraftMissionProgress {
  def: CraftMissionDef;
  current: number;
  complete: boolean;
  /** The week (within the season) whose qualifying event completed this mission — "where/when this
   * star was earned" — null until `complete`. */
  earnedWeekIndex: number | null;
}

export interface CraftPathProgress {
  role: string;
  missions: CraftMissionProgress[];
  starsEarned: number;
  starsPossible: number;
}

/** One member's Craft Path progress for one season — null if their role has no defined path (should
 * not happen for the demo roster, but a real data source's role list won't always match). */
export function computeCraftPathProgress(dataset: LeaderboardDataset, member: Member, season: Season): CraftPathProgress | null {
  const path = craftPathForRole(member.role);
  if (!path) return null;
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);

  const missions: CraftMissionProgress[] = path.missions.map((def) => {
    const weeks = qualifyingWeeks(dataset, member.id, weekIndexes, def.concept);
    const complete = weeks.length >= def.threshold;
    return {
      def,
      current: Math.min(weeks.length, def.threshold),
      complete,
      earnedWeekIndex: complete ? weeks[def.threshold - 1] : null,
    };
  });

  return { role: path.role, missions, starsEarned: missions.filter((m) => m.complete).length, starsPossible: missions.length };
}

export interface CraftMastery {
  totalStars: number;
  tier: XpTier;
  /** Stars still needed to reach the next tier, and its name — both null at the top tier. */
  toNextTier: number | null;
  nextTier: XpTier | null;
}

/** Configurable lifetime thresholds — see module docs on this being a proposed, not official, model. */
const CAREER_TIER_THRESHOLDS: readonly { tier: XpTier; min: number }[] = [
  { tier: 'platinum', min: 24 },
  { tier: 'gold', min: 12 },
  { tier: 'silver', min: 5 },
  { tier: 'bronze', min: 0 },
];

/** Lifetime mastery — summed only from *approved* seasons (see lib/seasons.ts's isSeasonApproved),
 * so a still-live season's in-progress stars never inflate a permanent career record before they're
 * final, exactly like this app's rewards/achievements. */
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
  // real skill growth, distinct from the existing reward's rank-gain measure.
  if (previousSeason) {
    const prevWeeks = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, previousSeason.startISO, previousSeason.endISO);
    if (prevWeeks.length) {
      let best: { memberId: string; delta: number } | null = null;
      for (const m of dataset.members) {
        const path = craftPathForRole(m.role);
        if (!path) continue;
        const countFor = (weeks: readonly number[]) =>
          path.missions.reduce((sum, def) => sum + qualifyingWeeks(dataset, m.id, weeks, def.concept).length, 0);
        const delta = countFor(weekIndexes) - countFor(prevWeeks);
        if (delta > 0 && (!best || delta > best.delta)) best = { memberId: m.id, delta };
      }
      if (best) out.push({ id: 'most_improved_craft', memberId: best.memberId });
    }
  }

  return out;
}
