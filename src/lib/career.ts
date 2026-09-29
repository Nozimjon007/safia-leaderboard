/**
 * Career-card derivations — pure functions over `Member.dateJoinedISO` /
 * `Member.careerHistory` (hand-authored demo HR facts, see demoData.ts) and
 * real computed achievement data. Nothing here invents a fact: a member with
 * no `dateJoinedISO` gets an empty timeline and no highlight, never a
 * fabricated one.
 */
import type { AchievementId, CareerStep, EarnedAchievement, Member } from '../data/types';
import { addDaysISO } from './dates';
import { bestAchievement } from './achievements';

export interface CareerTimelineStep {
  role: string;
  startISO: string;
  /** null = ongoing (this is the member's current role). */
  endISO: string | null;
}

type CareerMember = Pick<Member, 'role' | 'dateJoinedISO' | 'careerHistory'>;

/** Past steps plus a synthesized "current role" step, oldest first. Empty when hire date is unknown. */
export function careerTimeline(member: CareerMember): CareerTimelineStep[] {
  if (!member.dateJoinedISO) return [];
  const past = member.careerHistory ?? [];
  const steps: CareerTimelineStep[] = past.map((s: CareerStep) => ({ role: s.role, startISO: s.startISO, endISO: s.endISO }));
  const currentStart = past.length ? addDaysISO(past[past.length - 1].endISO, 1) : member.dateJoinedISO;
  steps.push({ role: member.role, startISO: currentStart, endISO: null });
  return steps;
}

export interface TenureBreakdown {
  years: number;
  months: number;
}

/** Whole years/months of service between hire date and `todayISO`. Never negative. */
export function tenureBreakdown(dateJoinedISO: string, todayISO: string): TenureBreakdown {
  const [jy, jm, jd] = dateJoinedISO.split('-').map(Number);
  const [ty, tm, td] = todayISO.split('-').map(Number);
  let totalMonths = (ty - jy) * 12 + (tm - jm);
  if (td < jd) totalMonths -= 1;
  totalMonths = Math.max(0, totalMonths);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

export type CareerHighlight =
  | { type: 'promotion'; role: string; dateISO: string }
  | { type: 'achievement'; id: AchievementId; seasonId: string };

/**
 * The one data-backed "career highlight" line for a member: their strongest
 * earned achievement if they have one, otherwise their most recent promotion,
 * otherwise null (hidden — never a fabricated placeholder).
 */
export function deriveCareerHighlight(member: CareerMember, earned: readonly EarnedAchievement[]): CareerHighlight | null {
  const achievement = bestAchievement(earned);
  if (achievement) return { type: 'achievement', id: achievement.id, seasonId: achievement.seasonId };

  const timeline = careerTimeline(member);
  if (timeline.length > 1) {
    const current = timeline[timeline.length - 1];
    return { type: 'promotion', role: current.role, dateISO: current.startISO };
  }
  return null;
}
