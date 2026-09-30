/**
 * Domain model for the leaderboard.
 *
 * This file is the contract between the UI and whatever supplies the data —
 * today that's `data/demoData.ts` (synthetic, clearly labeled), later a real
 * API. Nothing in `components/` or `pages/` should import from `demoData.ts`
 * directly; everything goes through `DataSource` (see `dataSource.ts`).
 */

/** The five scored categories. Original Uzbek/Russian labels live in the i18n dictionaries. */
export type CategoryKey = 'load' | 'control' | 'kaizen' | 'concern' | 'attendance';

export const CATEGORY_KEYS: readonly CategoryKey[] = ['load', 'control', 'kaizen', 'concern', 'attendance'];

export type ShiftId = 'S1' | 'S2';

export const SHIFT_IDS: readonly ShiftId[] = ['S1', 'S2'];

export interface Member {
  id: string;
  name: string;
  /** Team / section identifier, e.g. "Area 2". Shown as the "team/area" facet. */
  area: string;
  shift: ShiftId;
  /** Job role, e.g. "Baker". Demo data only — see demoData.ts. Used to default two-employee comparisons to the same role. */
  role: string;
  /**
   * Compact photo — the small circular avatar (header, cards, table, compare
   * tray). null renders as an initials circle. The demo dataset's photos are
   * AI-generated synthetic faces (nobody real) used only to preview the
   * portrait-focused layout — see public/portraits/README.md for sourcing.
   * No real Safia employee photos exist; a production data source should
   * only ever set this from an approved, real staff photo.
   */
  avatarPhoto: string | null;
  /**
   * Full-length (head-to-shoes) photo for the podium cards and the Career
   * Card hero — distinct from `avatarPhoto` because a face crop and a
   * head-to-shoes photo are different assets, not the same image at a
   * different size. null renders a full-body silhouette placeholder rather
   * than stretching the avatar crop. The demo dataset's photos are unrelated
   * stock-photography models (not the person in `avatarPhoto`, not a Safia
   * employee) — see public/fullbody/README.md for sourcing/licensing. A
   * production data source should only ever set this from an approved, real
   * staff photo of the *same* employee as `avatarPhoto`.
   */
  fullBodyPhoto: string | null;
  /** ISO date first hired, e.g. "2019-03-04". Demo data only — see demoData.ts. Omit/null when unknown; never inferred. */
  dateJoinedISO?: string | null;
  /**
   * Prior roles held before the current one, oldest first, chronological and
   * non-overlapping (each step's `endISO` is the day before the next step's
   * `startISO`, and before the current role's start). Demo data only, and
   * intentionally present for only some members — a promotion story isn't
   * invented for everyone. The UI hides the career-journey timeline entirely
   * when this is empty rather than implying every employee has one.
   */
  careerHistory?: readonly CareerStep[];
}

/** One prior role era in a member's career history — see `Member.careerHistory`. */
export interface CareerStep {
  role: string;
  /** ISO date this role began. */
  startISO: string;
  /** ISO date this role ended (the day before the next step, or the current role, began). */
  endISO: string;
}

/** One value per week, indexed from `LeaderboardDataset.firstWeekStart`. `null` = no data recorded that week — never treated as 0. */
export type WeeklySeries = ReadonlyArray<number | null>;

export type MemberScores = Record<CategoryKey, WeeklySeries>;

export interface LeaderboardDataset {
  sourceLabel: 'Demo' | 'Live';
  /** ISO date (YYYY-MM-DD) of the Monday that starts week 0. */
  firstWeekStart: string;
  weekCount: number;
  members: Member[];
  scores: Record<string, MemberScores>;
}

export interface ScoringWeights extends Record<CategoryKey, number> {}

export interface ScoringConfig {
  weights: ScoringWeights;
  /** Overall score at or above this is the green/good zone. */
  greenThreshold: number;
  /** Overall score below this is the attention/low zone. */
  attentionThreshold: number;
}

/**
 * Equal weights and the 80/65 thresholds are placeholders, not verified
 * business rules — see the "How scoring works" page. Evidence in the
 * reference dashboard (a rank-1 member with category scores 88/84/89/85/96,
 * plain average 88.4, but an overall score of 89.1) proves the real formula
 * is not a plain average; the actual weights are still unknown.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: { load: 20, control: 20, kaizen: 20, concern: 20, attendance: 20 },
  greenThreshold: 80,
  attentionThreshold: 65,
};

export type Zone = 'good' | 'mid' | 'low' | 'na';

export type SortKey = 'rank' | 'name' | 'overall' | 'move' | CategoryKey;
export type SortDirection = 'asc' | 'desc';

export type MetricKey = 'overall' | CategoryKey;

export type LeaderboardView = 'table' | 'cards';

/** The season-results hero's Solo/Clans toggle — see components/leaderboard/BoardModeToggle. */
export type BoardMode = 'solo' | 'clans';

/**
 * Achievement/badge and reward definitions.
 *
 * There is no official Safia achievement or reward catalog. These IDs are a
 * small, fixed set of rule-based badges computed from real scoring data
 * (never fabricated per-member flags) — see `lib/achievements.ts` for the
 * exact rule behind each one. Every place they're shown is labeled as demo
 * content pending real Safia criteria.
 */
export type AchievementId = 'champion' | 'podium' | 'most_improved' | 'green_streak' | 'full_attendance' | 'category_leader';

export interface EarnedAchievement {
  id: AchievementId;
  seasonId: string;
  /** Extra context for badges that need it, e.g. the category key for 'category_leader'. */
  detail?: string;
}

/** first/second/third place, plus one achievement-based reward category. */
export type RewardId = 'place_1' | 'place_2' | 'place_3' | 'most_improved';

export interface SeasonReward {
  seasonId: string;
  rewardId: RewardId;
  memberId: string;
}

/** Lifetime XP tier — explicitly a separate, optional, demo-only system from season score/rank (see README). */
export type XpTier = 'bronze' | 'silver' | 'gold' | 'platinum';
