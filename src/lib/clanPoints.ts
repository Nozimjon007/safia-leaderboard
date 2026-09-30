/**
 * Clan contribution points — entirely derived from data that already exists elsewhere in this app
 * (Craft Path mission completions, season achievements, the Team Mentor season distinction) plus one
 * new, genuinely repeatable mechanic (weekly clan missions). There is no separate persisted "clan
 * points" event stream: every point here traces back to a real scored week or an already-computed
 * badge, exactly like Craft Paths' own anti-gaming guarantee (see craftPaths.ts's module docs).
 *
 * Configurable demo point values below — proposed starting values, not official Safia policy (see
 * clan_points_disclaimer in the i18n dictionaries).
 *
 * Two different "verified/approved" gates are deliberately reused rather than invented:
 *  - Craft-mission and weekly-clan-mission points are real the moment their underlying week is
 *    scored, so they accrue live all season (visible weekly progress, per the spec).
 *  - Achievement and Team Mentor points only land once the season itself is approved
 *    (isSeasonApproved) — the same "no winners before approval" rule this app already applies to
 *    rewards and achievement badges. Until then a season's clan standings show only the live
 *    craft/mission portion.
 */
import type { AchievementId, CategoryKey, LeaderboardDataset, Member, ScoringConfig } from '../data/types';
import type { Season } from './seasons';
import { isSeasonApproved } from './seasons';
import { computeCraftPathProgress, computeSeasonDistinctions } from './craftPaths';
import { computeAllAchievements } from './achievements';
import { weekIndexesInRange, weekStartISO } from './dates';
import type { ClanId } from './clans';
import { membersOfClan } from './clans';

export type ClanPointReason = 'role_milestone' | 'process_improvement' | 'quality_achievement' | 'coaching_contribution' | 'clan_mission';

/** Starting demo values — see module docs. */
export const CLAN_POINT_VALUES: Record<ClanPointReason, number> = {
  role_milestone: 10, // any completed craft mission outside kaizen
  process_improvement: 25, // a completed kaizen-concept craft mission
  quality_achievement: 15, // each earned season achievement badge
  coaching_contribution: 15, // holding the season's Team Mentor distinction (once per season)
  clan_mission: 3, // per qualifying weekly clan mission, before the weekly cap below
};

/** The one repeatable-within-season point source (weekly clan missions) is capped per member per
 * week, so neither a high-volume role nor a member grinding every mission every week can dominate
 * clan standings alone — "fair" here means bounded, not unlimited (see spec requirement). */
export const CLAN_MISSION_WEEKLY_CAP_PER_MEMBER = 5;

export interface WeeklyClanMissionDef {
  id: 'clean_sweep' | 'steady_output';
  category: CategoryKey;
  threshold: number;
  /** Mirrors craftPaths.ts's OUTPUT_SAFE_CONCERN_FLOOR: a strong-output week only counts when
   * safety/vigilance didn't drop to get there — no reward for unsafe speed here either. */
  requiresConcernFloor?: number;
}

/** Two cooperative weekly clan missions — proposed demo content, not official Safia programs. */
export const WEEKLY_CLAN_MISSIONS: readonly WeeklyClanMissionDef[] = [
  { id: 'clean_sweep', category: 'concern', threshold: 85 },
  { id: 'steady_output', category: 'load', threshold: 88, requiresConcernFloor: 70 },
];

export interface ClanContributionEvent {
  memberId: string;
  points: number;
  reason: ClanPointReason;
  /** Which weekly clan mission, only set when reason === 'clan_mission'. */
  missionId?: WeeklyClanMissionDef['id'];
  /** Which achievement badge, only set when reason === 'quality_achievement' — keeps the activity
   * log traceable to a specific badge even though every badge is worth the same points. */
  achievementId?: AchievementId;
  /** The real date this event's underlying activity happened — a scored week for craft/clan-mission
   * points, or the season's end date for achievements and Team Mentor (which only resolve once). */
  dateISO: string;
  weekIndex: number | null;
}

function craftMissionEvents(dataset: LeaderboardDataset, member: Member, season: Season): ClanContributionEvent[] {
  const progress = computeCraftPathProgress(dataset, member, season);
  if (!progress) return [];
  const out: ClanContributionEvent[] = [];
  for (const m of progress.missions) {
    if (!m.complete || m.earnedWeekIndex == null) continue;
    const kaizen = m.def.concept === 'kaizen';
    out.push({
      memberId: member.id,
      points: kaizen ? CLAN_POINT_VALUES.process_improvement : CLAN_POINT_VALUES.role_milestone,
      reason: kaizen ? 'process_improvement' : 'role_milestone',
      dateISO: weekStartISO(dataset.firstWeekStart, m.earnedWeekIndex),
      weekIndex: m.earnedWeekIndex,
    });
  }
  return out;
}

function weeklyClanMissionEvents(dataset: LeaderboardDataset, member: Member, weekIndexes: readonly number[]): ClanContributionEvent[] {
  const out: ClanContributionEvent[] = [];
  const scores = dataset.scores[member.id];
  for (const w of weekIndexes) {
    let weekTotal = 0;
    for (const def of WEEKLY_CLAN_MISSIONS) {
      const v = scores[def.category][w];
      if (v == null || v < def.threshold) continue;
      if (def.requiresConcernFloor != null) {
        const concern = scores.concern[w];
        if (concern == null || concern < def.requiresConcernFloor) continue;
      }
      const capped = Math.max(0, Math.min(CLAN_POINT_VALUES.clan_mission, CLAN_MISSION_WEEKLY_CAP_PER_MEMBER - weekTotal));
      if (capped <= 0) continue;
      weekTotal += capped;
      out.push({ memberId: member.id, points: capped, reason: 'clan_mission', missionId: def.id, dateISO: weekStartISO(dataset.firstWeekStart, w), weekIndex: w });
    }
  }
  return out;
}

/**
 * Every member's clan-point events for one season — clan-agnostic (keyed only by member id); fold
 * by clan with a clanAssignments map (see computeClanStandings/computeClanRoster below). Achievement
 * and Team Mentor points are empty until the season is approved; craft-mission and weekly-clan-
 * mission points are live all season.
 */
export function computeClanContributionEvents(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  season: Season,
  nowMs: number = Date.now(),
): Record<string, ClanContributionEvent[]> {
  const weekIndexes = weekIndexesInRange(dataset.firstWeekStart, dataset.weekCount, season.startISO, season.endISO);
  const byMember: Record<string, ClanContributionEvent[]> = {};
  for (const member of dataset.members) {
    byMember[member.id] = [...craftMissionEvents(dataset, member, season), ...weeklyClanMissionEvents(dataset, member, weekIndexes)];
  }

  if (isSeasonApproved(season, nowMs)) {
    const achievementsByMember = computeAllAchievements(dataset, config, [season], nowMs);
    for (const member of dataset.members) {
      const earned = achievementsByMember[member.id] ?? [];
      for (const e of earned) {
        byMember[member.id].push({
          memberId: member.id,
          points: CLAN_POINT_VALUES.quality_achievement,
          reason: 'quality_achievement',
          achievementId: e.id,
          dateISO: season.endISO,
          weekIndex: null,
        });
      }
    }

    // previousSeason is only used by computeSeasonDistinctions for its unrelated most_improved_craft
    // distinction — team_mentor never depends on it, so it's safe to omit here.
    const distinctions = computeSeasonDistinctions(dataset, config, season, null);
    const mentor = distinctions.find((d) => d.id === 'team_mentor');
    if (mentor) {
      byMember[mentor.memberId].push({
        memberId: mentor.memberId,
        points: CLAN_POINT_VALUES.coaching_contribution,
        reason: 'coaching_contribution',
        dateISO: season.endISO,
        weekIndex: null,
      });
    }
  }

  return byMember;
}

export function totalPointsForMember(events: readonly ClanContributionEvent[]): number {
  return events.reduce((sum, e) => sum + e.points, 0);
}

export interface ClanMemberContribution {
  member: Member;
  totalPoints: number;
  events: readonly ClanContributionEvent[];
}

/** One clan's full roster, each member's total points and activity log, richest contributor first —
 * feeds both the clan detail page's searchable roster and its "leading contributors" summary. */
export function computeClanRoster(
  dataset: LeaderboardDataset,
  clanAssignments: Record<string, ClanId>,
  clanId: ClanId,
  eventsByMember: Record<string, ClanContributionEvent[]>,
): ClanMemberContribution[] {
  return membersOfClan(dataset.members, clanAssignments, clanId)
    .map((member) => ({ member, totalPoints: totalPointsForMember(eventsByMember[member.id] ?? []), events: eventsByMember[member.id] ?? [] }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.member.id.localeCompare(b.member.id));
}

export interface ClanStanding {
  clanId: ClanId;
  rank: number;
  totalPoints: number;
  memberCount: number;
  /** totalPoints / memberCount — the fair ranking measure (see module docs): standings are ranked by
   * this, not raw totalPoints, so a larger clan can't win by headcount alone. */
  averagePoints: number;
  /** previousRank - rank: positive = moved up. Null with no comparable previous season. */
  move: number | null;
  leadingContributors: readonly { memberId: string; points: number }[];
}

const LEADING_CONTRIBUTORS_SHOWN = 3;

function rankByAverage(clanIds: readonly ClanId[], eventsByMember: Record<string, ClanContributionEvent[]>, clanAssignments: Record<string, ClanId>, members: readonly Member[]): Map<ClanId, number> {
  const totals = new Map<ClanId, { total: number; count: number }>();
  for (const id of clanIds) totals.set(id, { total: 0, count: 0 });
  for (const member of members) {
    const clanId = clanAssignments[member.id];
    if (!clanId) continue;
    const entry = totals.get(clanId);
    if (!entry) continue;
    entry.total += totalPointsForMember(eventsByMember[member.id] ?? []);
    entry.count += 1;
  }
  const ordered = [...clanIds].sort((a, b) => {
    const avgA = totals.get(a)!.count ? totals.get(a)!.total / totals.get(a)!.count : 0;
    const avgB = totals.get(b)!.count ? totals.get(b)!.total / totals.get(b)!.count : 0;
    return avgB - avgA || a.localeCompare(b);
  });
  const ranks = new Map<ClanId, number>();
  ordered.forEach((id, i) => ranks.set(id, i + 1));
  return ranks;
}

/** The four clans' season standings — ranked by average points per member (fair measure), with each
 * clan's raw total, member count, movement vs. the previous comparable season, and top contributors. */
export function computeClanStandings(
  dataset: LeaderboardDataset,
  config: ScoringConfig,
  clanAssignments: Record<string, ClanId>,
  clanIds: readonly ClanId[],
  season: Season,
  previousSeason: Season | null,
  nowMs: number = Date.now(),
): ClanStanding[] {
  const eventsByMember = computeClanContributionEvents(dataset, config, season, nowMs);
  const currentRanks = rankByAverage(clanIds, eventsByMember, clanAssignments, dataset.members);

  let previousRanks: Map<ClanId, number> | null = null;
  if (previousSeason) {
    const prevEvents = computeClanContributionEvents(dataset, config, previousSeason, nowMs);
    previousRanks = rankByAverage(clanIds, prevEvents, clanAssignments, dataset.members);
  }

  const standings: ClanStanding[] = clanIds.map((clanId) => {
    const roster = computeClanRoster(dataset, clanAssignments, clanId, eventsByMember);
    const totalPoints = roster.reduce((sum, r) => sum + r.totalPoints, 0);
    const memberCount = roster.length;
    const rank = currentRanks.get(clanId) ?? clanIds.length;
    const previousRank = previousRanks?.get(clanId) ?? null;
    return {
      clanId,
      rank,
      totalPoints,
      memberCount,
      averagePoints: memberCount ? totalPoints / memberCount : 0,
      move: previousRank != null ? previousRank - rank : null,
      leadingContributors: roster.slice(0, LEADING_CONTRIBUTORS_SHOWN).map((r) => ({ memberId: r.member.id, points: r.totalPoints })),
    };
  });

  return standings.sort((a, b) => a.rank - b.rank);
}
